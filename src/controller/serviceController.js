import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

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
                category: {
                    select: {
                        category_id: true,
                        category_name: true
                    }
                }
            },
            orderBy: {
                service_id: 'desc'
            }
        });

        // Transform the data to match the expected frontend format
        const transformedServices = services.map(service => {
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
                status: service.servicelisting_isActive ? 'active' : 'inactive', // Based on database field
                category_name: service.category.category_name,
                category: service.category,
                category_id: service.category_id,
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

        res.status(200).json({
            success: true,
            data: service
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
            category_id
        } = req.body;

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

        console.log('Create service request:', {
            providerId,
            category_id,
            service_title,
            service_description,
            service_startingprice,
            photoCount: servicePhotos.length
        });

        // Validation
        if (!category_id || !service_title || !service_description || !service_startingprice) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required (category_id, service_title, service_description, service_startingprice)'
            });
        }

        // Verify that the category exists
        const category = await prisma.serviceCategory.findUnique({
            where: { category_id: parseInt(category_id) }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found. Please select a valid category.'
            });
        }

        // Check if provider already has a service with the same title and category
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                provider_id: providerId,
                service_title: service_title,
                category_id: parseInt(category_id)
            }
        });

        if (existingService) {
            return res.status(400).json({
                success: false,
                message: `You already have a service titled "${service_title}" in the "${category.category_name}" category. Please use a different title or edit your existing service.`
            });
        }

        // Create the service listing in a transaction
        const newService = await prisma.$transaction(async (prisma) => {
            const serviceListing = await prisma.serviceListing.create({
                data: {
                    service_title: service_title,
                    service_description: service_description,
                    service_startingprice: parseFloat(service_startingprice),
                    provider_id: providerId,
                    category_id: parseInt(category_id)
                }
            });

            // Create service photos if any were uploaded
            if (servicePhotos.length > 0) {
                await prisma.servicePhoto.createMany({
                    data: servicePhotos.map(photoUrl => ({
                        service_id: serviceListing.service_id,
                        imageUrl: photoUrl
                    }))
                });
            }

            // Return the complete service with photos and category
            return await prisma.serviceListing.findUnique({
                where: { service_id: serviceListing.service_id },
                include: {
                    service_photos: true,
                    category: true
                }
            });
        });

        res.status(201).json({
            success: true,
            message: `Service created successfully with ${servicePhotos.length} photos uploaded`,
            service: {
                id: newService.service_id,
                service_title: newService.service_title,
                service_description: newService.service_description,
                service_startingprice: newService.service_startingprice,
                category_id: newService.category_id,
                category_name: newService.category.category_name,
                provider_id: newService.provider_id,
                photos_uploaded: servicePhotos.length,
                service_photos: newService.service_photos
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
            service_title,
            service_description,
            service_startingprice,
            category_id
        } = req.body;

        // Validate input
        if (!service_title || !service_description || !service_startingprice || !category_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required (service_title, service_description, service_startingprice, category_id).' 
            });
        }

        const serviceListingId = parseInt(serviceId);

        // Check if the service exists and belongs to the provider
        const existingService = await prisma.serviceListing.findFirst({
            where: {
                service_id: serviceListingId,
                provider_id: providerId
            }
        });

        if (!existingService) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or access denied'
            });
        }

        // Verify that the category exists
        const category = await prisma.serviceCategory.findUnique({
            where: { category_id: parseInt(category_id) }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found. Please select a valid category.'
            });
        }

        // Update the service listing
        const updatedService = await prisma.serviceListing.update({
            where: { service_id: serviceListingId },
            data: {
                service_title: service_title.trim(),
                service_description: service_description.trim(),
                service_startingprice: parseFloat(service_startingprice),
                category_id: parseInt(category_id)
            },
            include: {
                service_photos: true,
                category: true
            }
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
                category: true,
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
