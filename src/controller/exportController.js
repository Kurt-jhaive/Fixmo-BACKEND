import prisma from '../prismaclient.js';
import {
    generateUsersCSV,
    generateUsersPDF,
    generateProvidersCSV,
    generateProvidersPDF,
    generateCertificatesCSV,
    generateCertificatesPDF,
    generateAppointmentsCSV,
    generateAppointmentsPDF,
    cleanupOldExports
} from '../services/exportService.js';

// Export Users
export const exportUsers = async (req, res) => {
    try {
        const { format, verification_status, is_activated, is_verified, search, start_date, end_date } = req.query;

        // Build where clause based on filters
        const where = {};
        
        if (verification_status) {
            where.verification_status = verification_status;
        }
        
        if (is_activated !== undefined) {
            where.is_activated = is_activated === 'true';
        }
        
        if (is_verified !== undefined) {
            where.is_verified = is_verified === 'true';
        }
        
        if (search) {
            where.OR = [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { userName: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        if (start_date && end_date) {
            where.created_at = {
                gte: new Date(start_date),
                lte: new Date(end_date)
            };
        }

        // Fetch users with filters
        const users = await prisma.user.findMany({
            where,
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_number: true,
                user_location: true,
                userName: true,
                birthday: true,
                is_verified: true,
                verification_status: true,
                is_activated: true,
                verified_by_admin_id: true,
                deactivated_by_admin_id: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' }
        });

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No users found with the specified filters'
            });
        }

        let fileInfo;

        // Generate file based on format
        if (format === 'csv') {
            fileInfo = await generateUsersCSV(users);
        } else if (format === 'pdf') {
            fileInfo = await generateUsersPDF(users);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid format. Use "csv" or "pdf"'
            });
        }

        // Send file as download
        res.download(fileInfo.filepath, fileInfo.filename, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error downloading file'
                });
            }
        });

        // Cleanup old files after 5 seconds
        setTimeout(() => cleanupOldExports(), 5000);

    } catch (error) {
        console.error('Error exporting users:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting users',
            error: error.message
        });
    }
};

// Export Service Providers
export const exportProviders = async (req, res) => {
    try {
        const { format, verification_status, provider_isActivated, provider_isVerified, search, start_date, end_date } = req.query;

        const where = {};
        
        if (verification_status) {
            where.verification_status = verification_status;
        }
        
        if (provider_isActivated !== undefined) {
            where.provider_isActivated = provider_isActivated === 'true';
        }
        
        if (provider_isVerified !== undefined) {
            where.provider_isVerified = provider_isVerified === 'true';
        }
        
        if (search) {
            where.OR = [
                { provider_first_name: { contains: search, mode: 'insensitive' } },
                { provider_last_name: { contains: search, mode: 'insensitive' } },
                { provider_email: { contains: search, mode: 'insensitive' } },
                { provider_userName: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        if (start_date && end_date) {
            where.created_at = {
                gte: new Date(start_date),
                lte: new Date(end_date)
            };
        }

        const providers = await prisma.serviceProviderDetails.findMany({
            where,
            select: {
                provider_id: true,
                provider_uli: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_email: true,
                provider_phone_number: true,
                provider_location: true,
                provider_userName: true,
                provider_birthday: true,
                provider_isVerified: true,
                verification_status: true,
                provider_isActivated: true,
                provider_rating: true,
                verified_by_admin_id: true,
                deactivated_by_admin_id: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' }
        });

        if (providers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No providers found with the specified filters'
            });
        }

        let fileInfo;

        if (format === 'csv') {
            fileInfo = await generateProvidersCSV(providers);
        } else if (format === 'pdf') {
            fileInfo = await generateProvidersPDF(providers);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid format. Use "csv" or "pdf"'
            });
        }

        res.download(fileInfo.filepath, fileInfo.filename, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error downloading file'
                });
            }
        });

        setTimeout(() => cleanupOldExports(), 5000);

    } catch (error) {
        console.error('Error exporting providers:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting providers',
            error: error.message
        });
    }
};

// Export Certificates
export const exportCertificates = async (req, res) => {
    try {
        const { format, certificate_status, provider_id, search, start_date, end_date } = req.query;

        const where = {};
        
        if (certificate_status) {
            where.certificate_status = certificate_status;
        }
        
        if (provider_id) {
            where.provider_id = parseInt(provider_id);
        }
        
        if (search) {
            where.OR = [
                { certificate_name: { contains: search, mode: 'insensitive' } },
                { certificate_number: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        if (start_date && end_date) {
            where.created_at = {
                gte: new Date(start_date),
                lte: new Date(end_date)
            };
        }

        const certificates = await prisma.certificate.findMany({
            where,
            select: {
                certificate_id: true,
                certificate_name: true,
                certificate_number: true,
                certificate_status: true,
                expiry_date: true,
                reviewed_by_admin_id: true,
                reviewed_at: true,
                created_at: true,
                provider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_uli: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        if (certificates.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No certificates found with the specified filters'
            });
        }

        let fileInfo;

        if (format === 'csv') {
            fileInfo = await generateCertificatesCSV(certificates);
        } else if (format === 'pdf') {
            fileInfo = await generateCertificatesPDF(certificates);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid format. Use "csv" or "pdf"'
            });
        }

        res.download(fileInfo.filepath, fileInfo.filename, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error downloading file'
                });
            }
        });

        setTimeout(() => cleanupOldExports(), 5000);

    } catch (error) {
        console.error('Error exporting certificates:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting certificates',
            error: error.message
        });
    }
};

// Export Appointments
export const exportAppointments = async (req, res) => {
    try {
        const { format, appointment_status, customer_id, provider_id, service_id, search, start_date, end_date } = req.query;

        const where = {};
        
        if (appointment_status) {
            where.appointment_status = appointment_status;
        }
        
        if (customer_id) {
            where.customer_id = parseInt(customer_id);
        }
        
        if (provider_id) {
            where.provider_id = parseInt(provider_id);
        }
        
        if (service_id) {
            where.service_id = parseInt(service_id);
        }
        
        if (start_date && end_date) {
            where.scheduled_date = {
                gte: new Date(start_date),
                lte: new Date(end_date)
            };
        }

        const appointments = await prisma.appointment.findMany({
            where,
            select: {
                appointment_id: true,
                appointment_status: true,
                scheduled_date: true,
                final_price: true,
                cancelled_by_admin_id: true,
                cancellation_reason: true,
                customer_cancellation_reason: true,
                created_at: true,
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_uli: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        if (appointments.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No appointments found with the specified filters'
            });
        }

        let fileInfo;

        if (format === 'csv') {
            fileInfo = await generateAppointmentsCSV(appointments);
        } else if (format === 'pdf') {
            fileInfo = await generateAppointmentsPDF(appointments);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid format. Use "csv" or "pdf"'
            });
        }

        res.download(fileInfo.filepath, fileInfo.filename, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error downloading file'
                });
            }
        });

        setTimeout(() => cleanupOldExports(), 5000);

    } catch (error) {
        console.error('Error exporting appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting appointments',
            error: error.message
        });
    }
};
