import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../services/mailer.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import notificationService from '../services/notificationService.js';

const prisma = new PrismaClient();

/**
 * Admin: Get all pending verification requests
 */
export const getPendingVerifications = async (req, res) => {
    try {
        const { type } = req.query; // 'customer', 'provider', or 'all'

        let pendingCustomers = [];
        let pendingProviders = [];

        if (!type || type === 'customer' || type === 'all') {
            pendingCustomers = await prisma.user.findMany({
                where: {
                    verification_status: 'pending',
                    valid_id: { not: null } // Only show those who have submitted ID
                },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                    profile_photo: true,
                    valid_id: true,
                    user_location: true,
                    verification_status: true,
                    verification_submitted_at: true,
                    created_at: true,
                    rejection_reason: true
                },
                orderBy: {
                    verification_submitted_at: 'desc'
                }
            });
        }

        if (!type || type === 'provider' || type === 'all') {
            pendingProviders = await prisma.serviceProviderDetails.findMany({
                where: {
                    verification_status: 'pending',
                    provider_valid_id: { not: null }
                },
                select: {
                    provider_id: true,
                    provider_first_name: true,
                    provider_last_name: true,
                    provider_email: true,
                    provider_phone_number: true,
                    provider_profile_photo: true,
                    provider_valid_id: true,
                    provider_location: true,
                    verification_status: true,
                    verification_submitted_at: true,
                    created_at: true,
                    rejection_reason: true
                },
                include: {
                    provider_certificates: {
                        select: {
                            certificate_id: true,
                            certificate_image: true,
                            created_at: true
                        }
                    }
                },
                orderBy: {
                    verification_submitted_at: 'desc'
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Pending verifications fetched successfully',
            data: {
                customers: pendingCustomers,
                providers: pendingProviders,
                total: {
                    customers: pendingCustomers.length,
                    providers: pendingProviders.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending verifications',
            error: error.message
        });
    }
};

/**
 * Admin: Approve customer verification
 */
export const approveCustomerVerification = async (req, res) => {
    try {
        const { user_id } = req.params;
        const adminId = req.adminId; // From admin auth middleware

        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(user_id) }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const updatedCustomer = await prisma.user.update({
            where: { user_id: parseInt(user_id) },
            data: {
                is_verified: true,
                verification_status: 'approved',
                verification_reviewed_at: new Date(),
                rejection_reason: null
            }
        });

        // Send approval email
        try {
            await sendEmail({
                to: customer.email,
                subject: '✅ Your Fixmo Account Has Been Verified!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4CAF50;">Account Verified Successfully!</h2>
                        <p>Dear ${customer.first_name} ${customer.last_name},</p>
                        <p>Great news! Your Fixmo account has been verified by our admin team.</p>
                        <p>You now have full access to all features of the platform.</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>What's Next?</strong></p>
                            <ul>
                                <li>Browse and book services from verified providers</li>
                                <li>Access warranty protection on completed services</li>
                                <li>Message providers directly through the platform</li>
                            </ul>
                        </div>
                        <p>Thank you for choosing Fixmo!</p>
                        <p style="color: #666; font-size: 12px;">If you have any questions, please contact our support team.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
        }

        // Send push notification
        try {
            notificationService.sendVerificationStatusNotification(
                parseInt(user_id),
                'customer',
                'approved'
            ).catch(err => console.error('Failed to send verification notification:', err));
            console.log('✅ Push notification sent for customer verification approval');
        } catch (notifError) {
            console.error('❌ Error sending push notification:', notifError);
        }

        res.status(200).json({
            success: true,
            message: 'Customer verification approved successfully',
            data: updatedCustomer
        });

    } catch (error) {
        console.error('Error approving customer verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve verification',
            error: error.message
        });
    }
};

/**
 * Admin: Approve provider verification
 */
export const approveProviderVerification = async (req, res) => {
    try {
        const { provider_id } = req.params;
        const adminId = req.adminId;

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        const updatedProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id: parseInt(provider_id) },
            data: {
                provider_isVerified: true,
                verification_status: 'approved',
                verification_reviewed_at: new Date(),
                rejection_reason: null
            }
        });

        // Send approval email
        try {
            await sendEmail({
                to: provider.provider_email,
                subject: '✅ Your Fixmo Provider Account Has Been Verified!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4CAF50;">Provider Account Verified Successfully!</h2>
                        <p>Dear ${provider.provider_first_name} ${provider.provider_last_name},</p>
                        <p>Congratulations! Your Fixmo service provider account has been verified by our admin team.</p>
                        <p>You can now start offering your services and accepting bookings on the platform.</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>What's Next?</strong></p>
                            <ul>
                                <li>Create and manage your service listings</li>
                                <li>Set your availability schedule</li>
                                <li>Receive and accept booking requests</li>
                                <li>Build your reputation with customer ratings</li>
                            </ul>
                        </div>
                        <p>Welcome to the Fixmo provider community!</p>
                        <p style="color: #666; font-size: 12px;">If you have any questions, please contact our support team.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
        }

        // Send push notification
        try {
            notificationService.sendVerificationStatusNotification(
                parseInt(provider_id),
                'provider',
                'approved'
            ).catch(err => console.error('Failed to send verification notification:', err));
            console.log('✅ Push notification sent for provider verification approval');
        } catch (notifError) {
            console.error('❌ Error sending push notification:', notifError);
        }

        res.status(200).json({
            success: true,
            message: 'Provider verification approved successfully',
            data: updatedProvider
        });

    } catch (error) {
        console.error('Error approving provider verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve verification',
            error: error.message
        });
    }
};

/**
 * Admin: Reject customer verification with reason
 */
export const rejectCustomerVerification = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { rejection_reason } = req.body;
        const adminId = req.adminId;

        if (!rejection_reason || rejection_reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(user_id) }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const updatedCustomer = await prisma.user.update({
            where: { user_id: parseInt(user_id) },
            data: {
                is_verified: false,
                verification_status: 'rejected',
                rejection_reason: rejection_reason,
                verification_reviewed_at: new Date()
            }
        });

        // Send rejection email
        try {
            await sendEmail({
                to: customer.email,
                subject: '⚠️ Fixmo Account Verification Update Required',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FF9800;">Verification Update Required</h2>
                        <p>Dear ${customer.first_name} ${customer.last_name},</p>
                        <p>Thank you for submitting your verification documents. Unfortunately, we need you to update your submission.</p>
                        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800;">
                            <p style="margin: 0 0 10px 0;"><strong>Reason for rejection:</strong></p>
                            <p style="margin: 0; color: #555;">${rejection_reason}</p>
                        </div>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>What to do next:</strong></p>
                            <ol style="margin: 10px 0 0 0;">
                                <li>Log in to your Fixmo account</li>
                                <li>Go to your profile settings</li>
                                <li>Click on "Re-submit Verification"</li>
                                <li>Upload updated documents addressing the issue mentioned above</li>
                            </ol>
                        </div>
                        <p>Once you re-submit, our team will review your documents again within 24-48 hours.</p>
                        <p>If you have any questions, please don't hesitate to contact our support team.</p>
                        <p style="color: #666; font-size: 12px;">Thank you for your cooperation!</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }

        // Send push notification
        try {
            notificationService.sendVerificationStatusNotification(
                parseInt(user_id),
                'customer',
                'rejected'
            ).catch(err => console.error('Failed to send verification notification:', err));
            console.log('✅ Push notification sent for customer verification rejection');
        } catch (notifError) {
            console.error('❌ Error sending push notification:', notifError);
        }

        res.status(200).json({
            success: true,
            message: 'Customer verification rejected successfully',
            data: updatedCustomer
        });

    } catch (error) {
        console.error('Error rejecting customer verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject verification',
            error: error.message
        });
    }
};

/**
 * Admin: Reject provider verification with reason
 */
export const rejectProviderVerification = async (req, res) => {
    try {
        const { provider_id } = req.params;
        const { rejection_reason } = req.body;
        const adminId = req.adminId;

        if (!rejection_reason || rejection_reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        const updatedProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id: parseInt(provider_id) },
            data: {
                provider_isVerified: false,
                verification_status: 'rejected',
                rejection_reason: rejection_reason,
                verification_reviewed_at: new Date()
            }
        });

        // Send rejection email
        try {
            await sendEmail({
                to: provider.provider_email,
                subject: '⚠️ Fixmo Provider Verification Update Required',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FF9800;">Verification Update Required</h2>
                        <p>Dear ${provider.provider_first_name} ${provider.provider_last_name},</p>
                        <p>Thank you for submitting your verification documents. Unfortunately, we need you to update your submission.</p>
                        <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800;">
                            <p style="margin: 0 0 10px 0;"><strong>Reason for rejection:</strong></p>
                            <p style="margin: 0; color: #555;">${rejection_reason}</p>
                        </div>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>What to do next:</strong></p>
                            <ol style="margin: 10px 0 0 0;">
                                <li>Log in to your Fixmo provider account</li>
                                <li>Go to your profile settings</li>
                                <li>Click on "Re-submit Verification"</li>
                                <li>Upload updated documents and certificates addressing the issue mentioned above</li>
                            </ol>
                        </div>
                        <p>Once you re-submit, our team will review your documents again within 24-48 hours.</p>
                        <p>If you have any questions, please don't hesitate to contact our support team.</p>
                        <p style="color: #666; font-size: 12px;">Thank you for your cooperation!</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }

        // Send push notification
        try {
            notificationService.sendVerificationStatusNotification(
                parseInt(provider_id),
                'provider',
                'rejected'
            ).catch(err => console.error('Failed to send verification notification:', err));
            console.log('✅ Push notification sent for provider verification rejection');
        } catch (notifError) {
            console.error('❌ Error sending push notification:', notifError);
        }

        res.status(200).json({
            success: true,
            message: 'Provider verification rejected successfully',
            data: updatedProvider
        });

    } catch (error) {
        console.error('Error rejecting provider verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject verification',
            error: error.message
        });
    }
};

/**
 * Customer: Get verification status
 */
export const getCustomerVerificationStatus = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware

        const customer = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                is_verified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                valid_id: true,
                profile_photo: true
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Verification status retrieved successfully',
            data: customer
        });

    } catch (error) {
        console.error('Error getting customer verification status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification status',
            error: error.message
        });
    }
};

/**
 * Provider: Get verification status
 */
export const getProviderVerificationStatus = async (req, res) => {
    try {
        const providerId = req.userId; // From auth middleware

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: providerId },
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_email: true,
                provider_isVerified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                provider_valid_id: true,
                provider_profile_photo: true
            },
            include: {
                provider_certificates: {
                    select: {
                        certificate_id: true,
                        certificate_image: true,
                        created_at: true
                    }
                }
            }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Verification status retrieved successfully',
            data: provider
        });

    } catch (error) {
        console.error('Error getting provider verification status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification status',
            error: error.message
        });
    }
};

/**
 * Customer: Re-submit verification (after rejection)
 * Accepts both file uploads and direct Cloudinary URLs
 */
export const resubmitCustomerVerification = async (req, res) => {
    try {
        const userId = req.userId;
        let { 
            valid_id_url, 
            profile_photo_url,
            first_name,
            last_name,
            birthday,
            user_location,
            exact_location
        } = req.body;

        // Check if files are uploaded via multer
        const files = req.files;
        const validIdFile = files?.valid_id?.[0];
        const profilePhotoFile = files?.profile_photo?.[0];

        // Upload files to Cloudinary if provided
        if (validIdFile) {
            try {
                valid_id_url = await uploadToCloudinary(
                    validIdFile.buffer,
                    'fixmo/verification/customers',
                    `customer_id_resubmit_${userId}_${Date.now()}`
                );
            } catch (uploadError) {
                console.error('Error uploading valid ID to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload valid ID image'
                });
            }
        }

        if (profilePhotoFile) {
            try {
                profile_photo_url = await uploadToCloudinary(
                    profilePhotoFile.buffer,
                    'fixmo/verification/customers',
                    `customer_profile_resubmit_${userId}_${Date.now()}`
                );
            } catch (uploadError) {
                console.error('Error uploading profile photo to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload profile photo'
                });
            }
        }

        // Validate that at least valid_id is provided
        if (!valid_id_url) {
            return res.status(400).json({
                success: false,
                message: 'Valid ID image is required (either file or URL)'
            });
        }

        const customer = await prisma.user.findUnique({
            where: { user_id: userId }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Check if customer can resubmit (must be rejected or pending)
        if (customer.verification_status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Your account is already verified'
            });
        }

        // Prepare update data
        const updateData = {
            valid_id: valid_id_url,
            verification_status: 'pending',
            verification_submitted_at: new Date(),
            rejection_reason: null
        };

        // Update profile photo if provided
        if (profile_photo_url) {
            updateData.profile_photo = profile_photo_url;
        }

        // Update additional user fields if provided
        if (first_name) {
            updateData.first_name = first_name;
        }

        if (last_name) {
            updateData.last_name = last_name;
        }

        if (birthday) {
            updateData.birthday = new Date(birthday);
        }

        if (user_location) {
            updateData.user_location = user_location;
        }

        if (exact_location) {
            updateData.exact_location = exact_location;
        }

        const updatedCustomer = await prisma.user.update({
            where: { user_id: userId },
            data: updateData
        });

        // Send notification to admin (optional)
        // You can implement admin notification here

        res.status(200).json({
            success: true,
            message: 'Verification documents re-submitted successfully. Our team will review within 24-48 hours.',
            data: {
                user_id: updatedCustomer.user_id,
                verification_status: updatedCustomer.verification_status,
                verification_submitted_at: updatedCustomer.verification_submitted_at,
                uploaded_via: validIdFile || profilePhotoFile ? 'file_upload' : 'url'
            }
        });

    } catch (error) {
        console.error('Error resubmitting customer verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resubmit verification',
            error: error.message
        });
    }
};

/**
 * Provider: Re-submit verification (after rejection)
 * Accepts both file uploads and direct Cloudinary URLs
 */
export const resubmitProviderVerification = async (req, res) => {
    try {
        const providerId = req.userId;
        let { 
            valid_id_url, 
            profile_photo_url, 
            certificate_urls,
            provider_first_name,
            provider_last_name,
            provider_birthday,
            provider_location,
            exact_location
        } = req.body;

        // Check if files are uploaded via multer
        const files = req.files;
        const validIdFile = files?.valid_id?.[0];
        const profilePhotoFile = files?.profile_photo?.[0];
        const certificateFiles = files?.certificates || [];

        // Upload valid ID to Cloudinary if provided as file
        if (validIdFile) {
            try {
                valid_id_url = await uploadToCloudinary(
                    validIdFile.buffer,
                    'fixmo/verification/providers',
                    `provider_id_resubmit_${providerId}_${Date.now()}`
                );
            } catch (uploadError) {
                console.error('Error uploading valid ID to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload valid ID image'
                });
            }
        }

        // Upload profile photo to Cloudinary if provided as file
        if (profilePhotoFile) {
            try {
                profile_photo_url = await uploadToCloudinary(
                    profilePhotoFile.buffer,
                    'fixmo/verification/providers',
                    `provider_profile_resubmit_${providerId}_${Date.now()}`
                );
            } catch (uploadError) {
                console.error('Error uploading profile photo to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload profile photo'
                });
            }
        }

        // Upload certificates to Cloudinary if provided as files
        if (certificateFiles.length > 0) {
            try {
                certificate_urls = [];
                for (let i = 0; i < certificateFiles.length; i++) {
                    const certUrl = await uploadToCloudinary(
                        certificateFiles[i].buffer,
                        'fixmo/certificates',
                        `provider_cert_${providerId}_${Date.now()}_${i}`
                    );
                    certificate_urls.push(certUrl);
                }
            } catch (uploadError) {
                console.error('Error uploading certificates to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload certificate images'
                });
            }
        }

        // Validate that at least valid_id is provided
        if (!valid_id_url) {
            return res.status(400).json({
                success: false,
                message: 'Valid ID image is required (either file or URL)'
            });
        }

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: providerId }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Check if provider can resubmit
        if (provider.verification_status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Your account is already verified'
            });
        }

        // Prepare update data
        const updateData = {
            provider_valid_id: valid_id_url,
            verification_status: 'pending',
            verification_submitted_at: new Date(),
            rejection_reason: null
        };

        // Update profile photo if provided
        if (profile_photo_url) {
            updateData.provider_profile_photo = profile_photo_url;
        }

        // Update additional provider fields if provided
        if (provider_first_name) {
            updateData.provider_first_name = provider_first_name;
        }

        if (provider_last_name) {
            updateData.provider_last_name = provider_last_name;
        }

        if (provider_birthday) {
            updateData.provider_birthday = new Date(provider_birthday);
        }

        if (provider_location) {
            updateData.provider_location = provider_location;
        }

        if (exact_location) {
            updateData.exact_location = exact_location;
        }

        // Update provider details
        const updatedProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id: providerId },
            data: updateData
        });

        // If new certificates are provided, update them
        if (certificate_urls && Array.isArray(certificate_urls) && certificate_urls.length > 0) {
            // Delete old certificates
            await prisma.certificate.deleteMany({
                where: { provider_id: providerId }
            });

            // Create new certificates
            await prisma.certificate.createMany({
                data: certificate_urls.map(url => ({
                    provider_id: providerId,
                    certificate_image: url
                }))
            });
        }

        res.status(200).json({
            success: true,
            message: 'Verification documents re-submitted successfully. Our team will review within 24-48 hours.',
            data: {
                provider_id: updatedProvider.provider_id,
                verification_status: updatedProvider.verification_status,
                verification_submitted_at: updatedProvider.verification_submitted_at,
                uploaded_via: validIdFile || profilePhotoFile || certificateFiles.length > 0 ? 'file_upload' : 'url',
                certificates_count: certificate_urls?.length || 0
            }
        });

    } catch (error) {
        console.error('Error resubmitting provider verification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resubmit verification',
            error: error.message
        });
    }
};

export default {
    getPendingVerifications,
    approveCustomerVerification,
    approveProviderVerification,
    rejectCustomerVerification,
    rejectProviderVerification,
    getCustomerVerificationStatus,
    getProviderVerificationStatus,
    resubmitCustomerVerification,
    resubmitProviderVerification
};
