import { PrismaClient } from '@prisma/client';
import diditService from '../services/diditService.js';

const prisma = new PrismaClient();

/**
 * Create a Didit verification session for SIGNUP (no auth required)
 * This is used during the signup flow before the user has a JWT token
 */
export const createSignupVerificationSession = async (req, res) => {
    try {
        const { email, first_name, last_name, callback_url } = req.body;

        // Validate required fields
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if email is already registered
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists'
            });
        }

        // Check Didit configuration
        const config = diditService.checkDiditConfiguration();
        if (!config.isFullyConfigured) {
            return res.status(500).json({
                success: false,
                message: 'Didit verification is not properly configured',
                config
            });
        }

        // Create Didit session with email as identifier (no user ID yet)
        const session = await diditService.createVerificationSession({
            userId: email, // Use email as temporary identifier
            userType: 'signup',
            callbackUrl: callback_url || process.env.DIDIT_CALLBACK_URL || 'https://fixmo.site/verification-complete',
            metadata: {
                email: email,
                name: `${first_name || ''} ${last_name || ''}`.trim() || 'New User',
                signup_flow: true
            }
        });

        // Save the verification session to track it
        try {
            await prisma.diditVerification.create({
                data: {
                    session_id: session.session_id,
                    email: email.toLowerCase(),
                    first_name: first_name || null,
                    last_name: last_name || null,
                    status: 'pending'
                }
            });
        } catch (dbError) {
            console.warn('Could not save verification record:', dbError.message);
            // Continue even if DB save fails - don't block verification
        }

        console.log(`✅ Signup verification session created for ${email}`);

        res.status(200).json({
            success: true,
            message: 'Verification session created successfully',
            data: {
                session_id: session.session_id,
                verification_url: session.session_url,
                status: session.status
            }
        });

    } catch (error) {
        console.error('Error creating signup verification session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create verification session',
            error: error.message
        });
    }
};

/**
 * Create a Didit verification session for a customer (requires auth)
 */
export const createCustomerVerificationSession = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        const { callback_url } = req.body;

        // Check Didit configuration
        const config = diditService.checkDiditConfiguration();
        if (!config.isFullyConfigured) {
            return res.status(500).json({
                success: false,
                message: 'Didit verification is not properly configured',
                config
            });
        }

        // Get customer data
        const customer = await prisma.user.findUnique({
            where: { user_id: userId }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Check if already verified
        if (customer.is_verified && customer.verification_status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Customer is already verified'
            });
        }

        // Create Didit session
        const session = await diditService.createVerificationSession({
            userId: userId,
            userType: 'customer',
            callbackUrl: callback_url || process.env.DIDIT_CALLBACK_URL || 'https://fixmo.site/verification-complete',
            metadata: {
                email: customer.email,
                name: `${customer.first_name} ${customer.last_name}`
            }
        });

        // Update customer with session info
        await prisma.user.update({
            where: { user_id: userId },
            data: {
                verification_status: 'pending',
                verification_submitted_at: new Date()
            }
        });

        res.status(200).json({
            success: true,
            message: 'Verification session created successfully',
            data: {
                session_id: session.session_id,
                verification_url: session.session_url,
                status: session.status
            }
        });

    } catch (error) {
        console.error('Error creating customer verification session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create verification session',
            error: error.message
        });
    }
};

/**
 * Get customer's current verification status from database
 * Used by frontend to check if verification is complete
 */
export const getCustomerVerificationStatus = async (req, res) => {
    try {
        const userId = req.userId;

        const customer = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                is_verified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true
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
            data: {
                is_verified: customer.is_verified,
                status: customer.verification_status,
                rejection_reason: customer.rejection_reason,
                submitted_at: customer.verification_submitted_at,
                reviewed_at: customer.verification_reviewed_at
            }
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
 * Get verification session status from Didit API
 */
export const getVerificationSessionStatus = async (req, res) => {
    try {
        const { session_id } = req.params;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const session = await diditService.getVerificationSession(session_id);

        res.status(200).json({
            success: true,
            message: 'Session retrieved successfully',
            data: session.data
        });

    } catch (error) {
        console.error('Error getting verification session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification session',
            error: error.message
        });
    }
};

/**
 * Get verification session status for SIGNUP (no auth required)
 * Frontend polls this during signup to check verification status
 * Also checks for duplicate KYC documents
 */
export const getSignupVerificationStatus = async (req, res) => {
    try {
        const { session_id } = req.params;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const session = await diditService.getVerificationSession(session_id);

        // Map Didit status to simpler response for frontend
        const status = session.data?.status || 'unknown';
        let isApproved = status === 'Approved';
        const isDeclined = status === 'Declined';
        let isPending = !isApproved && !isDeclined;
        let duplicateError = null;

        // If approved, check for duplicate documents
        if (isApproved && session.data) {
            const idVerification = session.data.id_verification || session.data.kyc || {};
            const documentNumber = idVerification.document_number || idVerification.id_number || null;
            const documentType = idVerification.document_type || null;
            const firstName = idVerification.first_name || null;
            const lastName = idVerification.last_name || null;
            const dateOfBirth = idVerification.date_of_birth || null;
            const country = idVerification.country || idVerification.document_country || null;

            // Check for duplicate document number (if available)
            if (documentNumber) {
                const existingVerification = await prisma.diditVerification.findFirst({
                    where: {
                        document_number: documentNumber,
                        status: 'approved',
                        session_id: { not: session_id } // Exclude current session
                    }
                });

                if (existingVerification) {
                    console.log(`❌ Duplicate document detected: ${documentNumber} already used by ${existingVerification.email}`);
                    
                    // Check if there's a registered user with this verification
                    const existingUser = existingVerification.user_id 
                        ? await prisma.user.findUnique({ where: { user_id: existingVerification.user_id } })
                        : null;

                    isApproved = false;
                    isPending = false;
                    duplicateError = {
                        type: 'DUPLICATE_DOCUMENT',
                        message: 'This identity document has already been used to register another account',
                        existing_email: existingVerification.email ? 
                            existingVerification.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null
                    };

                    // Update our record as declined due to duplicate
                    await prisma.diditVerification.updateMany({
                        where: { session_id: session_id },
                        data: { 
                            status: 'declined',
                            document_number: documentNumber,
                            document_type: documentType
                        }
                    });

                    return res.status(200).json({
                        success: true,
                        data: {
                            session_id: session_id,
                            status: 'Duplicate Document',
                            is_approved: false,
                            is_declined: true,
                            is_pending: false,
                            is_duplicate: true,
                            duplicate_error: duplicateError,
                            decline_reasons: ['This identity document has already been used']
                        }
                    });
                }
            }

            // No duplicate found - update verification record with document info
            try {
                await prisma.diditVerification.updateMany({
                    where: { session_id: session_id },
                    data: {
                        status: 'approved',
                        document_number: documentNumber,
                        document_type: documentType,
                        first_name: firstName,
                        last_name: lastName,
                        date_of_birth: dateOfBirth,
                        document_country: country,
                        verified_at: new Date()
                    }
                });
            } catch (dbError) {
                console.warn('Could not update verification record:', dbError.message);
            }
        }

        res.status(200).json({
            success: true,
            data: {
                session_id: session_id,
                status: status,
                is_approved: isApproved,
                is_declined: isDeclined,
                is_pending: isPending,
                is_duplicate: false,
                // Include decision details if available
                decision: session.data?.decision || null,
                decline_reasons: session.data?.decline_reasons || []
            }
        });

    } catch (error) {
        console.error('Error getting signup verification status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get verification status',
            error: error.message
        });
    }
};

/**
 * Didit Webhook Handler
 * Receives verification status updates from Didit (logging only, no DB updates)
 */
export const handleDiditWebhook = async (req, res) => {
    try {
        // Get raw body for signature verification
        const rawBody = req.rawBody;
        const signature = req.get('X-Signature');
        const timestamp = req.get('X-Timestamp');

        // Verify webhook signature
        const isValid = diditService.verifyWebhookSignature(rawBody, signature, timestamp);
        if (!isValid) {
            console.error('❌ Invalid Didit webhook signature');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Parse webhook payload
        const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
        const { session_id, status, vendor_data, webhook_type } = payload;

        console.log(`📥 Didit webhook received: ${webhook_type} - Session: ${session_id} - Status: ${status} - User: ${vendor_data}`);

        // Just acknowledge the webhook - frontend handles the flow
        res.status(200).json({ message: 'Webhook received' });

    } catch (error) {
        console.error('Error processing Didit webhook:', error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
};

/**
 * Admin: Get Didit verification analytics
 */
export const getDiditAnalytics = async (req, res) => {
    try {
        // Check configuration
        const config = diditService.checkDiditConfiguration();
        
        // Get session counts from database
        const customerStats = await prisma.user.groupBy({
            by: ['verification_status'],
            _count: {
                user_id: true
            }
        });

        const providerStats = await prisma.serviceProviderDetails.groupBy({
            by: ['verification_status'],
            _count: {
                provider_id: true
            }
        });

        res.status(200).json({
            success: true,
            data: {
                didit_config: config,
                customers: {
                    by_status: customerStats.reduce((acc, item) => {
                        acc[item.verification_status] = item._count.user_id;
                        return acc;
                    }, {})
                },
                providers: {
                    by_status: providerStats.reduce((acc, item) => {
                        acc[item.verification_status] = item._count.provider_id;
                        return acc;
                    }, {})
                }
            }
        });

    } catch (error) {
        console.error('Error getting Didit analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics',
            error: error.message
        });
    }
};

/**
 * Check Didit configuration status
 */
export const checkDiditConfig = async (req, res) => {
    try {
        const config = diditService.checkDiditConfiguration();

        res.status(200).json({
            success: true,
            message: config.isFullyConfigured 
                ? 'Didit is properly configured' 
                : 'Didit configuration is incomplete',
            data: config
        });

    } catch (error) {
        console.error('Error checking Didit config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check configuration',
            error: error.message
        });
    }
};

export default {
    createSignupVerificationSession,
    getSignupVerificationStatus,
    createCustomerVerificationSession,
    getCustomerVerificationStatus,
    getVerificationSessionStatus,
    handleDiditWebhook,
    getDiditAnalytics,
    checkDiditConfig
};
