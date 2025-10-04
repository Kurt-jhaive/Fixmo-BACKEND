import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { 
    sendUserApprovalEmail, 
    sendProviderApprovalEmail, 
    sendCertificateApprovalEmail,
    sendUserDeactivationEmail,
    sendProviderDeactivationEmail,
    sendUserRejectionEmail,
    sendProviderRejectionEmail,
    sendCertificateRejectionEmail,
    sendAdminInvitationEmail,
    sendAdminPasswordResetEmail
} from '../services/mailer.js';

const prisma = new PrismaClient();

class AdminController {
    // Utility function to fix image paths
    static fixImagePath(path) {
        if (!path) return null;
        
        // If path already starts with /uploads/, return as is
        if (path.startsWith('/uploads/')) {
            return path;
        }
        
        // If path starts with uploads\ or uploads/, normalize and add leading slash
        if (path.startsWith('uploads\\') || path.startsWith('uploads/')) {
            return '/' + path.replace(/\\/g, '/');
        }
        
        // Otherwise, assume it's a relative path and add /uploads/ prefix
        return `/uploads/${path.replace(/\\/g, '/')}`;
    }

    // Admin Authentication
    async adminLogin(req, res) {
        try {
            const { username, password } = req.body;

            // Validate input
            if (!username || !password) {
                return res.status(400).json({ 
                    message: 'Username and password are required' 
                });
            }

            // Find admin by username or email
            const admin = await prisma.admin.findFirst({
                where: {
                    OR: [
                        { admin_username: username },
                        { admin_email: username }
                    ]
                }
            });

            if (!admin) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Check if admin is active
            if (!admin.is_active) {
                return res.status(401).json({ 
                    message: 'Account is deactivated. Please contact super admin.' 
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, admin.admin_password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Update last login
            await prisma.admin.update({
                where: { admin_id: admin.admin_id },
                data: { last_login: new Date() }
            });

            // Generate JWT token
            const token = jwt.sign(
                { 
                    adminId: admin.admin_id, 
                    username: admin.admin_username,
                    role: admin.admin_role
                },
                process.env.JWT_SECRET || 'your-jwt-secret',
                { expiresIn: '24h' }
            );

            // Prepare response
            const response = {
                message: 'Login successful',
                token,
                admin: {
                    id: admin.admin_id,
                    username: admin.admin_username,
                    email: admin.admin_email,
                    name: admin.admin_name,
                    role: admin.admin_role,
                    is_active: admin.is_active
                }
            };

            // Add password change flag if required
            if (admin.must_change_password) {
                response.must_change_password = true;
                response.message = 'Login successful. Password change required.';
            }

            res.json(response);
        } catch (error) {
            console.error('Error in admin login:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async adminLogout(req, res) {
        try {
            res.json({ message: 'Logout successful' });
        } catch (error) {
            console.error('Error in admin logout:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Dashboard Statistics
    async getDashboardStats(req, res) {
        try {
            const [
                totalUsers,
                totalProviders,
                totalCertificates,
                totalBookings,
                pendingUsers,
                pendingProviders,
                pendingCertificates,
                activeBookings
            ] = await Promise.all([
                prisma.user.count(),
                prisma.serviceProviderDetails.count(),
                prisma.certificate.count(),
                prisma.appointment.count(),
                prisma.user.count({ where: { is_verified: false } }),
                prisma.serviceProviderDetails.count({ where: { provider_isVerified: false } }),
                prisma.certificate.count({ where: { certificate_status: 'Pending' } }),
                prisma.appointment.count({ 
                    where: { 
                        appointment_status: { 
                            in: ['pending', 'confirmed', 'in-progress'] 
                        } 
                    } 
                })
            ]);

            res.json({
                totalUsers,
                totalProviders,
                totalCertificates,
                totalBookings,
                pendingUsers,
                pendingProviders,
                pendingCertificates,
                activeBookings
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Recent Activity
    async getRecentActivity(req, res) {
        try {
            const activities = [];

            // Get recent user registrations
            const recentUsers = await prisma.user.findMany({
                where: { is_verified: false },
                orderBy: { created_at: 'desc' },
                take: 5,
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    created_at: true
                }
            });

            recentUsers.forEach(user => {
                activities.push({
                    type: 'user',
                    title: 'New User Registration',
                    description: `${user.first_name} ${user.last_name} registered and is pending verification`,
                    created_at: user.created_at
                });
            });

            // Get recent provider registrations
            const recentProviders = await prisma.serviceProviderDetails.findMany({
                where: { provider_isVerified: false },
                orderBy: { created_at: 'desc' },
                take: 5,
                select: {
                    provider_id: true,
                    provider_first_name: true,
                    provider_last_name: true,
                    created_at: true
                }
            });

            recentProviders.forEach(provider => {
                activities.push({
                    type: 'provider',
                    title: 'New Provider Registration',
                    description: `${provider.provider_first_name} ${provider.provider_last_name} registered and is pending verification`,
                    created_at: provider.created_at
                });
            });

            // Get recent certificate submissions
            const recentCertificates = await prisma.certificate.findMany({
                where: { certificate_status: 'Pending' },
                orderBy: { created_at: 'desc' },
                take: 5,
                include: {
                    provider: {
                        select: {
                            provider_first_name: true,
                            provider_last_name: true
                        }
                    }
                }
            });

            recentCertificates.forEach(cert => {
                activities.push({
                    type: 'certificate',
                    title: 'New Certificate Submission',
                    description: `${cert.provider.provider_first_name} ${cert.provider.provider_last_name} submitted ${cert.certificate_name}`,
                    created_at: cert.created_at
                });
            });

            // Sort all activities by date
            activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            res.json({ activities: activities.slice(0, 10) });
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // User Management
    async getUsers(req, res) {
        try {
            const users = await prisma.user.findMany({
                orderBy: { created_at: 'desc' },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                    profile_photo: true,
                    valid_id: true,
                    userName: true,
                    is_verified: true,
                    verification_status: true,
                    rejection_reason: true,
                    verification_submitted_at: true,
                    verification_reviewed_at: true,
                    is_activated: true,
                    created_at: true
                }
            });

        const usersWithFixedPaths = users.map(user => ({
            ...user,
            profile_photo: AdminController.fixImagePath(user.profile_photo),
            valid_id: AdminController.fixImagePath(user.valid_id)
        }));

            res.json({ users: usersWithFixedPaths });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getUserById(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(userId) },
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                    profile_photo: true,
                    valid_id: true,
                    user_location: true,
                    exact_location: true,
                    userName: true,
                    is_verified: true,
                    verification_status: true,
                    rejection_reason: true,
                    verification_submitted_at: true,
                    verification_reviewed_at: true,
                    is_activated: true,
                    birthday: true,
                    created_at: true
                }
            });

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const userWithFixedPaths = {
                ...user,
                profile_photo: AdminController.fixImagePath(user.profile_photo),
                valid_id: AdminController.fixImagePath(user.valid_id)
            };

            res.json({ user: userWithFixedPaths });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async verifyUser(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.update({
                where: { user_id: parseInt(userId) },
                data: { 
                    is_verified: true,
                    verification_status: 'approved',
                    rejection_reason: null,
                    verification_reviewed_at: new Date()
                }
            });

            // Send approval email
            try {
                await sendUserApprovalEmail(user.email, {
                    firstName: user.first_name,
                    lastName: user.last_name,
                    userName: user.userName
                });
            } catch (emailError) {
                console.error('Error sending user approval email:', emailError);
                // Don't fail the verification if email fails
            }

            res.json({ message: 'User verified successfully', user });
        } catch (error) {
            console.error('Error verifying user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async activateUser(req, res) {
        try {
            const { userId } = req.params;

            const user = await prisma.user.update({
                where: { user_id: parseInt(userId) },
                data: { is_activated: true }
            });

            res.json({ message: 'User activated successfully', user });
        } catch (error) {
            console.error('Error activating user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async deactivateUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ message: 'Deactivation reason is required' });
            }

            const user = await prisma.user.update({
                where: { user_id: parseInt(userId) },
                data: { 
                    is_activated: false,
                    user_reason: reason
                }
            });

            // Send deactivation email
            try {
                await sendUserDeactivationEmail(user.email, {
                    firstName: user.first_name,
                    lastName: user.last_name,
                    userName: user.userName
                }, reason);
            } catch (emailError) {
                console.error('Error sending user deactivation email:', emailError);
                // Don't fail the deactivation if email fails
            }

            res.json({ message: 'User deactivated successfully', user });
        } catch (error) {
            console.error('Error deactivating user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async rejectUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ message: 'Rejection reason is required' });
            }

            const user = await prisma.user.update({
                where: { user_id: parseInt(userId) },
                data: { 
                    is_verified: false,
                    verification_status: 'rejected',
                    rejection_reason: reason,
                    user_reason: reason,
                    verification_reviewed_at: new Date()
                }
            });

            // Send rejection email
            try {
                await sendUserRejectionEmail(user.email, {
                    firstName: user.first_name,
                    lastName: user.last_name,
                    userName: user.userName
                }, reason);
            } catch (emailError) {
                console.error('Error sending user rejection email:', emailError);
                // Don't fail the rejection if email fails
            }

            res.json({ message: 'User verification rejected', user });
        } catch (error) {
            console.error('Error rejecting user:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Provider Management
    async getProviders(req, res) {
        try {
            const providers = await prisma.serviceProviderDetails.findMany({
                orderBy: { created_at: 'desc' },
                select: {
                    provider_id: true,
                    provider_first_name: true,
                    provider_last_name: true,
                    provider_email: true,
                    provider_phone_number: true,
                    provider_profile_photo: true,
                    provider_valid_id: true,
                    provider_userName: true,
                    provider_isVerified: true,
                    verification_status: true,
                    rejection_reason: true,
                    verification_submitted_at: true,
                    verification_reviewed_at: true,
                    provider_isActivated: true,
                    provider_rating: true,
                    created_at: true
                }
            });

            const providersWithFixedPaths = providers.map(provider => ({
                ...provider,
                provider_profile_photo: AdminController.fixImagePath(provider.provider_profile_photo),
                provider_valid_id: AdminController.fixImagePath(provider.provider_valid_id)
            }));

            res.json({ providers: providersWithFixedPaths });
        } catch (error) {
            console.error('Error fetching providers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getProviderById(req, res) {
        try {
            const { providerId } = req.params;

            const provider = await prisma.serviceProviderDetails.findUnique({
                where: { provider_id: parseInt(providerId) },
                include: {
                    provider_certificates: {
                        select: {
                            certificate_id: true,
                            certificate_name: true,
                            certificate_number: true,
                            certificate_status: true,
                            created_at: true
                        }
                    }
                }
            });

            if (!provider) {
                return res.status(404).json({ message: 'Provider not found' });
            }

            const providerWithFixedPaths = {
                ...provider,
                provider_profile_photo: AdminController.fixImagePath(provider.provider_profile_photo),
                provider_valid_id: AdminController.fixImagePath(provider.provider_valid_id),
                certificates: provider.provider_certificates
            };

            res.json({ provider: providerWithFixedPaths });
        } catch (error) {
            console.error('Error fetching provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async verifyProvider(req, res) {
        try {
            const { providerId } = req.params;

            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: parseInt(providerId) },
                data: { 
                    provider_isVerified: true,
                    verification_status: 'approved',
                    rejection_reason: null,
                    verification_reviewed_at: new Date()
                }
            });

            // Send approval email
            try {
                await sendProviderApprovalEmail(provider.provider_email, {
                    firstName: provider.provider_firstname,
                    lastName: provider.provider_lastname,
                    businessName: provider.business_name
                });
            } catch (emailError) {
                console.error('Error sending provider approval email:', emailError);
                // Don't fail the verification if email fails
            }

            res.json({ message: 'Provider verified successfully', provider });
        } catch (error) {
            console.error('Error verifying provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async activateProvider(req, res) {
        try {
            const { providerId } = req.params;

            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: parseInt(providerId) },
                data: { provider_isActivated: true }
            });

            res.json({ message: 'Provider activated successfully', provider });
        } catch (error) {
            console.error('Error activating provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async deactivateProvider(req, res) {
        try {
            const { providerId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ message: 'Deactivation reason is required' });
            }

            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: parseInt(providerId) },
                data: { 
                    provider_isActivated: false,
                    provider_reason: reason
                }
            });

            // Send deactivation email
            try {
                await sendProviderDeactivationEmail(provider.provider_email, {
                    firstName: provider.provider_firstname,
                    lastName: provider.provider_lastname,
                    businessName: provider.business_name
                }, reason);
            } catch (emailError) {
                console.error('Error sending provider deactivation email:', emailError);
                // Don't fail the deactivation if email fails
            }

            res.json({ message: 'Provider deactivated successfully', provider });
        } catch (error) {
            console.error('Error deactivating provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async rejectProvider(req, res) {
        try {
            const { providerId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ message: 'Rejection reason is required' });
            }

            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: parseInt(providerId) },
                data: { 
                    provider_isVerified: false,
                    verification_status: 'rejected',
                    rejection_reason: reason,
                    provider_reason: reason,
                    verification_reviewed_at: new Date()
                }
            });

            // Send rejection email
            try {
                await sendProviderRejectionEmail(provider.provider_email, {
                    firstName: provider.provider_firstname,
                    lastName: provider.provider_lastname,
                    businessName: provider.business_name
                }, reason);
            } catch (emailError) {
                console.error('Error sending provider rejection email:', emailError);
                // Don't fail the rejection if email fails
            }

            res.json({ message: 'Provider verification rejected', provider });
        } catch (error) {
            console.error('Error rejecting provider:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Certificate Management
    async getCertificates(req, res) {
        try {
            const certificates = await prisma.certificate.findMany({
                orderBy: { created_at: 'desc' },
                include: {
                    provider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true,
                            provider_isVerified: true
                        }
                    }
                }
            });

            const formattedCertificates = certificates.map(cert => ({
                ...cert,
                certificate_file_path: AdminController.fixImagePath(cert.certificate_file_path),
                provider_name: `${cert.provider.provider_first_name} ${cert.provider.provider_last_name}`,
                provider_email: cert.provider.provider_email,
                provider_phone: cert.provider.provider_phone_number,
                provider_verified: cert.provider.provider_isVerified
            }));

            res.json({ certificates: formattedCertificates });
        } catch (error) {
            console.error('Error fetching certificates:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getCertificateById(req, res) {
        try {
            const { certificateId } = req.params;

            const certificate = await prisma.certificate.findUnique({
                where: { certificate_id: parseInt(certificateId) },
                include: {
                    provider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true,
                            provider_isVerified: true
                        }
                    },
                    CoveredService: {
                        include: {
                            specific_service: {
                                select: {
                                    specific_service_title: true,
                                    specific_service_description: true
                                }
                            }
                        }
                    }
                }
            });

            if (!certificate) {
                return res.status(404).json({ message: 'Certificate not found' });
            }

            const formattedCertificate = {
                ...certificate,
                certificate_file_path: AdminController.fixImagePath(certificate.certificate_file_path),
                provider_name: `${certificate.provider.provider_first_name} ${certificate.provider.provider_last_name}`,
                provider_email: certificate.provider.provider_email,
                provider_phone: certificate.provider.provider_phone_number,
                provider_verified: certificate.provider.provider_isVerified,
                covered_services: certificate.CoveredService.map(cs => ({
                    service_title: cs.specific_service.specific_service_title,
                    service_description: cs.specific_service.specific_service_description
                }))
            };

            res.json({ certificate: formattedCertificate });
        } catch (error) {
            console.error('Error fetching certificate:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async approveCertificate(req, res) {
        try {
            const { certificateId } = req.params;

            const certificate = await prisma.certificate.update({
                where: { certificate_id: parseInt(certificateId) },
                data: { certificate_status: 'Approved' },
                include: {
                    provider: true
                }
            });

            // Send approval email
            try {
                await sendCertificateApprovalEmail(certificate.provider.provider_email, {
                    firstName: certificate.provider.provider_firstname,
                    lastName: certificate.provider.provider_lastname,
                    businessName: certificate.provider.business_name,
                    certificateName: certificate.certificate_name || 'Certificate'
                });
            } catch (emailError) {
                console.error('Error sending certificate approval email:', emailError);
                // Don't fail the approval if email fails
            }

            res.json({ message: 'Certificate approved successfully', certificate });
        } catch (error) {
            console.error('Error approving certificate:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async rejectCertificate(req, res) {
        try {
            const { certificateId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ message: 'Rejection reason is required' });
            }

            const certificate = await prisma.certificate.update({
                where: { certificate_id: parseInt(certificateId) },
                data: { 
                    certificate_status: 'Rejected',
                    certificate_reason: reason
                },
                include: {
                    provider: true
                }
            });

            // Send rejection email
            try {
                await sendCertificateRejectionEmail(certificate.provider.provider_email, {
                    firstName: certificate.provider.provider_firstname,
                    lastName: certificate.provider.provider_lastname,
                    businessName: certificate.provider.business_name,
                    certificateName: certificate.certificate_name || 'Certificate'
                }, reason);
            } catch (emailError) {
                console.error('Error sending certificate rejection email:', emailError);
                // Don't fail the rejection if email fails
            }

            res.json({ message: 'Certificate rejected successfully', certificate });
        } catch (error) {
            console.error('Error rejecting certificate:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Booking Management
    async getBookings(req, res) {
        try {
            const [total, pending, completed, cancelled] = await Promise.all([
                prisma.appointment.count(),
                prisma.appointment.count({ where: { appointment_status: 'pending' } }),
                prisma.appointment.count({ where: { appointment_status: 'completed' } }),
                prisma.appointment.count({ where: { appointment_status: 'cancelled' } })
            ]);

            res.json({ total, pending, completed, cancelled });
        } catch (error) {
            console.error('Error fetching bookings:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Legacy methods - keeping for backward compatibility
    async verifyServiceProvider(req, res) {
        const { provider_isVerified, provider_id } = req.body;

        try {
            const verifyProvider = await prisma.serviceProviderDetails.update({
                where: { provider_id },
                data: { provider_isVerified }
            });
            res.status(200).json({ message: 'Service provider verification status updated successfully', data: verifyProvider });
        } catch (error) {
            console.error('Error updating service provider verification status:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async verifyCustomer(req, res) {
        const { customer_isVerified, user_id } = req.body;

        try {
            const verifyCustomer = await prisma.user.update({
                where: { user_id },
                data: { is_verified: customer_isVerified }
            });
            res.status(200).json({ message: 'Customer verification status updated successfully', data: verifyCustomer });
        } catch (error) {
            console.error('Error updating customer verification status:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getUnverifiedServiceProviders(req, res) {
        try {
            const unverifiedProviders = await prisma.serviceProviderDetails.findMany({
                where: {
                    provider_isVerified: false
                },
                orderBy: {
                    created_at: 'desc'
                },
                include: {
                    provider_certificates: true,
                }
            });

            res.status(200).json({
                message: 'Fetched unverified service providers',
                data: unverifiedProviders
            });
        } catch (error) {
            console.error('Error fetching unverified service providers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    async getUnverifiedCustomers(req, res) {
        try {
            const unverifiedCustomers = await prisma.user.findMany({
                where: {
                    is_verified: false
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            res.status(200).json({
                message: 'Fetched unverified customers',
                data: unverifiedCustomers
            });
        } catch (error) {
            console.error('Error fetching unverified customers:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Admin Password Management
    async changePassword(req, res) {
        try {
            const { current_password, new_password } = req.body;
            const adminId = req.admin.admin_id;

            // Validate input
            if (!current_password || !new_password) {
                return res.status(400).json({ 
                    message: 'Current password and new password are required' 
                });
            }

            // Password strength validation
            if (new_password.length < 8) {
                return res.status(400).json({ 
                    message: 'New password must be at least 8 characters long' 
                });
            }

            // Check password complexity (at least one uppercase, lowercase, number, special char)
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
            if (!passwordRegex.test(new_password)) {
                return res.status(400).json({ 
                    message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
                });
            }

            // Get current admin data
            const admin = await prisma.admin.findUnique({
                where: { admin_id: adminId }
            });

            if (!admin) {
                return res.status(404).json({ message: 'Admin not found' });
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(current_password, admin.admin_password);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            // Check if new password is different from current
            const isSamePassword = await bcrypt.compare(new_password, admin.admin_password);
            if (isSamePassword) {
                return res.status(400).json({ 
                    message: 'New password must be different from current password' 
                });
            }

            // Hash new password
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
            const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

            // Update password and clear must_change_password flag
            await prisma.admin.update({
                where: { admin_id: adminId },
                data: {
                    admin_password: hashedNewPassword,
                    must_change_password: false
                }
            });

            res.json({ 
                message: 'Password changed successfully' 
            });

        } catch (error) {
            console.error('Error changing admin password:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Admin Management (Super Admin Only)
    async inviteAdmin(req, res) {
        try {
            const { email, name, role = 'admin' } = req.body;

            // Validate input
            if (!email || !name) {
                return res.status(400).json({ 
                    message: 'Email and name are required' 
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ 
                    message: 'Invalid email format' 
                });
            }

            // Validate role
            const validRoles = ['admin', 'super_admin'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ 
                    message: 'Invalid role. Must be admin or super_admin' 
                });
            }

            // Check if admin with email already exists
            const existingAdmin = await prisma.admin.findUnique({
                where: { admin_email: email }
            });

            if (existingAdmin) {
                return res.status(400).json({ 
                    message: 'Admin with this email already exists' 
                });
            }

            // Generate username from email
            const username = email.split('@')[0].toLowerCase() + '_' + Date.now();

            // Generate random temporary password
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
            let tempPassword = '';
            for (let i = 0; i < 12; i++) {
                tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // Hash the temporary password
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
            const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

            // Create new admin
            const newAdmin = await prisma.admin.create({
                data: {
                    admin_username: username,
                    admin_email: email,
                    admin_password: hashedPassword,
                    admin_name: name,
                    admin_role: role,
                    is_active: true,
                    must_change_password: true
                }
            });

            // Send invitation email
            try {
                const invitedByAdmin = await prisma.admin.findUnique({
                    where: { admin_id: req.admin.admin_id }
                });

                await sendAdminInvitationEmail(email, {
                    name: name,
                    username: username,
                    temporaryPassword: tempPassword,
                    role: role,
                    invitedBy: invitedByAdmin?.admin_name || 'Super Admin'
                });
            } catch (emailError) {
                console.error('Error sending invitation email:', emailError);
                // Don't fail the admin creation if email fails
            }

            res.status(201).json({
                message: 'Admin invited successfully and invitation email sent',
                admin: {
                    id: newAdmin.admin_id,
                    username: newAdmin.admin_username,
                    email: newAdmin.admin_email,
                    name: newAdmin.admin_name,
                    role: newAdmin.admin_role,
                    is_active: newAdmin.is_active
                },
                note: 'Invitation email sent with login credentials'
            });

        } catch (error) {
            console.error('Error inviting admin:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Get all admins (Super Admin Only)
    async getAllAdmins(req, res) {
        try {
            const admins = await prisma.admin.findMany({
                select: {
                    admin_id: true,
                    admin_username: true,
                    admin_email: true,
                    admin_name: true,
                    admin_role: true,
                    is_active: true,
                    must_change_password: true,
                    created_at: true,
                    last_login: true
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            res.json({
                message: 'Admins fetched successfully',
                data: admins
            });

        } catch (error) {
            console.error('Error fetching admins:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Deactivate/Activate admin (Super Admin Only)
    async toggleAdminStatus(req, res) {
        try {
            const { admin_id } = req.params;
            const { is_active } = req.body;

            // Validate input
            if (typeof is_active !== 'boolean') {
                return res.status(400).json({ 
                    message: 'is_active must be a boolean value' 
                });
            }

            // Check if admin exists
            const targetAdmin = await prisma.admin.findUnique({
                where: { admin_id: parseInt(admin_id) }
            });

            if (!targetAdmin) {
                return res.status(404).json({ message: 'Admin not found' });
            }

            // Prevent super admin from deactivating themselves
            if (targetAdmin.admin_id === req.admin.admin_id && !is_active) {
                return res.status(400).json({ 
                    message: 'Cannot deactivate your own account' 
                });
            }

            // Prevent deactivating the last super admin
            if (targetAdmin.admin_role === 'super_admin' && !is_active) {
                const superAdminCount = await prisma.admin.count({
                    where: { 
                        admin_role: 'super_admin',
                        is_active: true 
                    }
                });

                if (superAdminCount <= 1) {
                    return res.status(400).json({ 
                        message: 'Cannot deactivate the last super admin' 
                    });
                }
            }

            // Update admin status
            const updatedAdmin = await prisma.admin.update({
                where: { admin_id: parseInt(admin_id) },
                data: { is_active },
                select: {
                    admin_id: true,
                    admin_username: true,
                    admin_email: true,
                    admin_name: true,
                    admin_role: true,
                    is_active: true
                }
            });

            res.json({
                message: `Admin ${is_active ? 'activated' : 'deactivated'} successfully`,
                admin: updatedAdmin
            });

        } catch (error) {
            console.error('Error toggling admin status:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Reset Admin Password (Super Admin Only)
    async resetAdminPassword(req, res) {
        try {
            const { admin_id } = req.params;
            const { reason } = req.body;

            // Validate admin ID
            if (!admin_id || isNaN(parseInt(admin_id))) {
                return res.status(400).json({ 
                    message: 'Valid admin ID is required' 
                });
            }

            // Find the admin to reset password for
            const adminToReset = await prisma.admin.findUnique({
                where: { admin_id: parseInt(admin_id) }
            });

            if (!adminToReset) {
                return res.status(404).json({ 
                    message: 'Admin not found' 
                });
            }

            // Prevent super admin from resetting their own password this way
            if (adminToReset.admin_id === req.admin.admin_id) {
                return res.status(400).json({ 
                    message: 'Cannot reset your own password. Use the change password endpoint instead.' 
                });
            }

            // Generate new random temporary password
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
            let newTempPassword = '';
            for (let i = 0; i < 12; i++) {
                newTempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // Hash the new temporary password
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
            const hashedPassword = await bcrypt.hash(newTempPassword, saltRounds);

            // Update admin password and set must_change_password flag
            const updatedAdmin = await prisma.admin.update({
                where: { admin_id: parseInt(admin_id) },
                data: {
                    admin_password: hashedPassword,
                    must_change_password: true
                },
                select: {
                    admin_id: true,
                    admin_username: true,
                    admin_email: true,
                    admin_name: true,
                    admin_role: true,
                    is_active: true,
                    must_change_password: true
                }
            });

            // Get the admin who performed the reset
            const resetByAdmin = await prisma.admin.findUnique({
                where: { admin_id: req.admin.admin_id }
            });

            // Send password reset notification email
            try {
                await sendAdminPasswordResetEmail(updatedAdmin.admin_email, {
                    name: updatedAdmin.admin_name,
                    username: updatedAdmin.admin_username,
                    newTemporaryPassword: newTempPassword,
                    resetBy: resetByAdmin?.admin_name || 'Super Admin',
                    reason: reason || 'Password reset requested by administrator'
                });
            } catch (emailError) {
                console.error('Error sending password reset email:', emailError);
                // Don't fail the password reset if email fails
            }

            res.json({
                message: 'Admin password reset successfully and notification email sent',
                admin: {
                    id: updatedAdmin.admin_id,
                    username: updatedAdmin.admin_username,
                    email: updatedAdmin.admin_email,
                    name: updatedAdmin.admin_name,
                    role: updatedAdmin.admin_role,
                    is_active: updatedAdmin.is_active,
                    must_change_password: updatedAdmin.must_change_password
                },
                note: 'Password reset notification email sent to admin'
            });

        } catch (error) {
            console.error('Error resetting admin password:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

export default new AdminController();
