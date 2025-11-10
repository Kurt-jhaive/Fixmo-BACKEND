import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../services/cloudinaryService.js';

const prisma = new PrismaClient();

// Load certificate-service mappings from JSON
const loadServiceCategoriesData = () => {
    try {
        const filePath = path.join(process.cwd(), 'src', 'public', 'data', 'servicecategories.json');
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading service categories data:', error);
        return [];
    }
};

// Get all services for a provider
export const getProviderServices = async (req, res) => {
    try {
        const providerId = req.userId;
        
        const services = await prisma.serviceListing.findMany({
            where: { 
                provider_id: providerId 
            },
            include: {
                service_photos: {
                    orderBy: {
                        uploadedAt: 'asc'
                    }
                },
                specific_services: {
                    include: {
                        category: true,
                        covered_by_certificates: {
                            include: {
                                certificate: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                service_id: 'desc'
            }
        });

        // Transform the data to match the expected frontend format
        const transformedServices = services.map(service => {
            // Extract certificates from all specific services
            const certificates = [];
            service.specific_services.forEach(specificService => {
                specificService.covered_by_certificates.forEach(coveredService => {
                    if (coveredService.certificate) {
                        certificates.push({
                            certificate_id: coveredService.certificate.certificate_id,
                            certificate_name: coveredService.certificate.certificate_name,
                            certificate_status: coveredService.certificate.certificate_status,
                            expiry_date: coveredService.certificate.expiry_date,
                            certificate_description: coveredService.certificate.certificate_description,
                            certificate_imageURL: coveredService.certificate.certificate_imageURL
                        });
                    }
                });
            });

            return {
                listing_id: service.service_id,
                service_id: service.service_id, // Add both for compatibility
                service_name: service.service_title,
                service_title: service.service_title, // Add both for compatibility
                description: service.service_description,
                service_description: service.service_description, // Add both for compatibility
                service_photos: service.service_photos || [], // New photos array
                price: service.service_startingprice,
                service_startingprice: service.service_startingprice, // Add both for compatibility
                price_per_hour: service.service_startingprice,
                provider_id: service.provider_id,
                is_available: service.servicelisting_isActive, // Use actual field from database
                isActive: service.servicelisting_isActive, // Add for frontend compatibility
                status: service.servicelisting_isActive ? 'active' : 'inactive', // Based on database field
                specific_services: service.specific_services,
                certificates: certificates, // ✅ Flattened certificates array
                certificateId: certificates.length > 0 ? certificates[0].certificate_id : undefined, // ✅ Single certificate ID for compatibility
                certificate_id: certificates.length > 0 ? certificates[0].certificate_id : undefined, // ✅ Alternative field name
                certificate_status: certificates.length > 0 ? certificates[0].certificate_status : undefined, // ✅ Certificate status
                certificate_expiry_date: certificates.length > 0 ? certificates[0].expiry_date : undefined, // ✅ Expiry date
                categories: service.specific_services.map(service => service.category.category_name),
                category_name: service.specific_services.length > 0 ? service.specific_services[0].category.category_name : 'Unknown',
                booking_count: 0 // Default since not tracked in current schema
            };
        });

        res.status(200).json({
            success: true,
            data: transformedServices,
            totalServices: transformedServices.length
        });
    } catch (error) {
        console.error('Error fetching provider services:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching services'
        });
    }
};

// Get a single service by ID
export const getServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;        const service = await prisma.serviceListing.findFirst({
            where: {
                service_id: parseInt(serviceId),
                provider_id: providerId
            },
            include: {
                specific_services: {
                    include: {
                        category: true,
                        covered_by_certificates: {
                            include: {
                                certificate: true
                            }
                        }
                    }
                }
            }
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }

        // Extract and flatten certificates
        const certificates = [];
        service.specific_services.forEach(specificService => {
            specificService.covered_by_certificates.forEach(coveredService => {
                if (coveredService.certificate) {
                    certificates.push({
                        certificate_id: coveredService.certificate.certificate_id,
                        certificate_name: coveredService.certificate.certificate_name,
                        certificate_status: coveredService.certificate.certificate_status,
                        expiry_date: coveredService.certificate.expiry_date,
                        certificate_description: coveredService.certificate.certificate_description,
                        certificate_imageURL: coveredService.certificate.certificate_imageURL
                    });
                }
            });
        });

        res.status(200).json({
            success: true,
            data: {
                ...service,
                certificates: certificates, // ✅ Add flattened certificates array
                certificateId: certificates.length > 0 ? certificates[0].certificate_id : undefined, // ✅ Single certificate ID for compatibility
                certificate_id: certificates.length > 0 ? certificates[0].certificate_id : undefined, // ✅ Alternative field name
                certificate_status: certificates.length > 0 ? certificates[0].certificate_status : undefined, // ✅ Certificate status
                certificate_expiry_date: certificates.length > 0 ? certificates[0].expiry_date : undefined // ✅ Expiry date
            }
        });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching service'
        });
    }
};

// Create a new service
export const createService = async (req, res) => {
    try {
        const providerId = req.userId;
        const {
            service_title,
            service_description,
            service_startingprice,
            warranty, // Warranty days (optional)
            warranty_days, // Alternative field name for warranty
            certificate_id, // Single certificate ID (primary)
            certificate_ids // Array of certificate IDs (fallback for compatibility)
        } = req.body;

        // Accept either warranty or warranty_days field name
        const warrantyValue = warranty ?? warranty_days;

        // Handle certificate_id - accept both single and array format
        let certificateIdsArray = [];
        if (certificate_id) {
            certificateIdsArray = [parseInt(certificate_id)];
        } else if (certificate_ids && Array.isArray(certificate_ids)) {
            certificateIdsArray = certificate_ids.map(id => parseInt(id));
        }

        console.log('Create service request:', {
            providerId,
            service_title,
            service_description,
            service_startingprice,
            warranty: warrantyValue,
            certificate_id,
            certificate_ids: certificateIdsArray,
        });

        // Handle multiple photo uploads to Cloudinary
        let servicePhotos = [];
        
        if (req.files && req.files.length > 0) {
            // Validate maximum 5 photos
            if (req.files.length > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 5 photos allowed per service listing.'
                });
            }

            try {
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];
                    const photoUrl = await uploadToCloudinary(
                        file.buffer, 
                        'fixmo/service-photos',
                        `service_${providerId}_${Date.now()}_${i}`
                    );
                    servicePhotos.push(photoUrl);
                }
            } catch (uploadError) {
                console.error('Error uploading service photos to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading service photos. Please try again.'
                });
            }
        }

        // Validation
        if (!service_title || !service_description || !service_startingprice) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required (service_title, service_description, service_startingprice)'
            });
        }

        // Validate certificate is provided
        if (!certificateIdsArray || certificateIdsArray.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one certificate is required to create a service'
            });
        }

        // Validate warranty days if provided
        if (warrantyValue !== undefined && warrantyValue !== null && warrantyValue !== '') {
            const warrantyDays = parseInt(warrantyValue);
            if (isNaN(warrantyDays) || warrantyDays < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Warranty must be a non-negative number (days)'
                });
            }
        }

        // Verify certificates belong to the provider and are approved
        const certificates = await prisma.certificate.findMany({
            where: {
                certificate_id: { in: certificateIdsArray },
                provider_id: providerId
            }
        });

        if (certificates.length !== certificateIdsArray.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more certificates do not belong to you or do not exist.'
            });
        }

        // Check if any certificates are expired
        const expiredCerts = certificates.filter(cert => cert.certificate_status === 'Expired');
        if (expiredCerts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create service with expired certificates. Please renew your certificates first.',
                expired_certificates: expiredCerts.map(c => ({
                    certificate_id: c.certificate_id,
                    certificate_name: c.certificate_name,
                    expiry_date: c.expiry_date
                }))
            });
        }

        // Create the service using nested Prisma create (atomic transaction)
        const newServiceListing = await prisma.serviceListing.create({
            data: {
                // 1. ServiceListing data
                service_title: service_title,
                service_description: service_description,
                service_startingprice: parseFloat(service_startingprice),
                warranty: warrantyValue ? parseInt(warrantyValue) : null,
                provider_id: providerId,

                // 2. Nested create for ServicePhotos
                service_photos: servicePhotos.length > 0 ? {
                    createMany: {
                        data: servicePhotos.map(photoUrl => ({
                            imageUrl: photoUrl
                        }))
                    }
                } : undefined,

                // 3. Nested create for SpecificService
                specific_services: {
                    create: {
                        specific_service_title: service_title,
                        specific_service_description: service_description,
                        category_id: 1, // Default category

                        // 4. Nested create for CoveredService (THE FIX)
                        covered_by_certificates: {
                            createMany: {
                                data: certificateIdsArray.map(certId => ({
                                    certificate_id: certId
                                }))
                            }
                        }
                    }
                }
            },
            // Include the new data in the response to confirm the link
            include: {
                service_photos: true,
                specific_services: {
                    include: {
                        category: true,
                        covered_by_certificates: {
                            include: {
                                certificate: {
                                    select: {
                                        certificate_id: true,
                                        certificate_name: true,
                                        certificate_status: true,
                                        expiry_date: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log('Service created successfully with certificate links:', {
            service_id: newServiceListing.service_id,
            certificates_linked: newServiceListing.specific_services[0]?.covered_by_certificates?.length || 0
        });

        res.status(201).json({
            success: true,
            message: `Service created successfully with ${servicePhotos.length} photos uploaded`,
            service: {
                id: newServiceListing.service_id,
                service_title: newServiceListing.service_title,
                service_description: newServiceListing.service_description,
                service_startingprice: newServiceListing.service_startingprice,
                warranty: newServiceListing.warranty,
                provider_id: newServiceListing.provider_id,
                photos_uploaded: servicePhotos.length,
                service_photos: newServiceListing.service_photos,
                specific_services: newServiceListing.specific_services,
                category: newServiceListing.specific_services[0]?.category,
                certificates: newServiceListing.specific_services[0]?.covered_by_certificates || []
            }
        });

    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating service',
            error: error.message
        });
    }
};

// Update a service
export const updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;
        const {
            service_description,
            service_startingprice,
            warranty, // Warranty days (optional)
            warranty_days, // Alternative field name for warranty
            certificate_ids,
            photos_to_remove // Array of photo IDs to remove (optional)
        } = req.body;

        // Accept either warranty or warranty_days field name
        const warrantyValue = warranty ?? warranty_days;

        // Handle new photo uploads to Cloudinary
        let newServicePhotos = [];
        
        if (req.files && req.files.length > 0) {
            try {
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];
                    const photoUrl = await uploadToCloudinary(
                        file.buffer, 
                        'fixmo/service-photos',
                        `service_${providerId}_${Date.now()}_${i}`
                    );
                    newServicePhotos.push(photoUrl);
                }
            } catch (uploadError) {
                console.error('Error uploading service photos to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading service photos. Please try again.'
                });
            }
        }

        // Validate input
        if (!service_description || !service_startingprice) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required (service_description, service_startingprice).' 
            });
        }

        // Validate warranty days if provided
        if (warrantyValue !== undefined && warrantyValue !== null && warrantyValue !== '') {
            const warrantyDays = parseInt(warrantyValue);
            if (isNaN(warrantyDays) || warrantyDays < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Warranty must be a non-negative number (days)'
                });
            }
        }

        const serviceListingId = parseInt(serviceId);

        // Check if the service exists and belongs to the provider
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                service_id: serviceListingId,
                provider_id: providerId
            },
            include: {
                specific_services: true,
                service_photos: true // Include existing photos
            }
        });

        if (!existingService) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }

        // Validate total photo count (existing + new - removed)
        const photosToRemoveArray = photos_to_remove ? 
            (Array.isArray(photos_to_remove) ? photos_to_remove : JSON.parse(photos_to_remove)) : [];
        const remainingPhotosCount = existingService.service_photos.length - photosToRemoveArray.length;
        const totalPhotosAfterUpdate = remainingPhotosCount + newServicePhotos.length;

        if (totalPhotosAfterUpdate > 5) {
            return res.status(400).json({
                success: false,
                message: `Maximum 5 photos allowed. You currently have ${remainingPhotosCount} photo(s) and are trying to add ${newServicePhotos.length} more.`
            });
        }

        // Update in transaction
        const updatedService = await prisma.$transaction(async (prisma) => {
            // Prepare update data
            const updateData = {
                service_description: service_description.trim(),
                service_startingprice: parseFloat(service_startingprice)
            };

            // Add warranty to update data if provided
            if (warrantyValue !== undefined && warrantyValue !== null && warrantyValue !== '') {
                updateData.warranty = parseInt(warrantyValue);
            }

            // Update the service listing
            const serviceListing = await prisma.serviceListing.update({
                where: { service_id: serviceListingId },
                data: updateData
            });

            // Update the specific service
            if (existingService.specific_services.length > 0) {
                await prisma.specificService.update({
                    where: { specific_service_id: existingService.specific_services[0].specific_service_id },
                    data: {
                        specific_service_description: service_description.trim(),
                    }
                });
            }

            // Handle photo removals
            if (photosToRemoveArray.length > 0) {
                // Get photos to delete from Cloudinary
                const photosToDelete = await prisma.servicePhoto.findMany({
                    where: {
                        id: { in: photosToRemoveArray.map(id => parseInt(id)) },
                        service_id: serviceListingId
                    }
                });

                // Delete from Cloudinary
                for (const photo of photosToDelete) {
                    try {
                        const publicId = extractPublicId(photo.imageUrl);
                        if (publicId) {
                            await deleteFromCloudinary(publicId);
                            console.log(`Deleted photo from Cloudinary: ${publicId}`);
                        }
                    } catch (cloudinaryError) {
                        console.error(`Error deleting photo from Cloudinary:`, cloudinaryError);
                        // Continue with database deletion even if Cloudinary delete fails
                    }
                }

                // Delete from database
                await prisma.servicePhoto.deleteMany({
                    where: {
                        id: { in: photosToRemoveArray.map(id => parseInt(id)) },
                        service_id: serviceListingId
                    }
                });

                console.log(`Removed ${photosToRemoveArray.length} photo(s) from service ${serviceListingId}`);
            }

            // Add new photos
            if (newServicePhotos.length > 0) {
                await prisma.servicePhoto.createMany({
                    data: newServicePhotos.map(photoUrl => ({
                        service_id: serviceListingId,
                        imageUrl: photoUrl
                    }))
                });

                console.log(`Added ${newServicePhotos.length} new photo(s) to service ${serviceListingId}`);
            }

            // Handle certificate updates if provided
            if (certificate_ids && Array.isArray(certificate_ids)) {
                // Remove existing certificate links
                await prisma.coveredService.deleteMany({
                    where: { specific_service_id: existingService.specific_services[0].specific_service_id }
                });

                // Add new certificate links
                if (certificate_ids.length > 0) {
                    await prisma.coveredService.createMany({
                        data: certificate_ids.map(certId => ({
                            specific_service_id: existingService.specific_services[0].specific_service_id,
                            certificate_id: parseInt(certId)
                        }))
                    });
                }
            }

            // Return updated service with all relations
            return await prisma.serviceListing.findUnique({
                where: { service_id: serviceListingId },
                include: {
                    service_photos: true,
                    specific_services: {
                        include: {
                            category: true,
                            covered_by_certificates: {
                                include: {
                                    certificate: true
                                }
                            }
                        }
                    }
                }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            data: updatedService
        });

    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating service',
            error: error.message
        });
    }
};

// Delete a service
export const deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;

        // Check if service exists and belongs to provider
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                service_id: parseInt(serviceId),
                provider_id: providerId
            }
        });

        if (!existingService) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }

        // Delete the service listing (service_photos will be deleted automatically due to cascade)
        await prisma.serviceListing.delete({
            where: { service_id: parseInt(serviceId) }
        });

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting service'
        });
    }
};

// Toggle service availability
export const toggleServiceAvailability = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const providerId = req.userId;

        // Check if service exists and belongs to provider
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                service_id: parseInt(serviceId),
                provider_id: providerId
            }
        });

        if (!existingService) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }

        // Toggle availability
        const updatedService = await prisma.serviceListing.update({
            where: { service_id: parseInt(serviceId) },
            data: {
                servicelisting_isActive: !existingService.servicelisting_isActive
            },
            include: {
                serviceProvider: true,
                specific_services: {
                    include: {
                        category: true
                    }
                },
                service_photos: true
            }
        });

        res.status(200).json({
            success: true,
            message: `Service ${updatedService.servicelisting_isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedService
        });
    } catch (error) {
        console.error('Error toggling service availability:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating service availability'
        });
    }
};

// Get service categories for dropdown
export const getServiceCategories = async (req, res) => {
    try {
        const categories = await prisma.serviceCategory.findMany({
            select: {
                category_id: true,
                category_name: true
            },
            orderBy: {
                category_name: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
};

// Get provider certificates for dropdown (keeping for backward compatibility)
export const getProviderCertificates = async (req, res) => {
    try {
        const providerId = req.userId;

        const certificates = await prisma.certificate.findMany({
            where: { provider_id: providerId },
            select: {
                certificate_id: true,
                certificate_name: true,
                certificate_file_path: true,
                expiry_date: true
            },
            orderBy: {
                certificate_name: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            data: certificates
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching certificates'
        });
    }
};

// Get certificate-service mappings (keeping for backward compatibility)
export const getCertificateServices = async (req, res) => {
    try {
        const categoriesData = loadServiceCategoriesData();
        res.status(200).json({
            success: true,
            data: categoriesData
        });
    } catch (error) {
        console.error('Error fetching certificate services:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching certificate services',
            error: error.message
        });
    }
};
