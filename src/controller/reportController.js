import prisma from '../prismaclient.js';

// Submit a new report
export const submitReport = async (req, res) => {
    try {
        const {
            reporter_name,
            reporter_email,
            reporter_phone,
            reporter_type,
            report_type,
            subject,
            description,
            attachment_urls,
            priority
        } = req.body;

        // Validation
        if (!reporter_name || !reporter_email || !report_type || !subject || !description) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: reporter_name, reporter_email, report_type, subject, description'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(reporter_email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate report type
        const validReportTypes = [
            'bug',
            'complaint',
            'feedback',
            'account_issue',
            'payment_issue',
            'provider_issue',
            'safety_concern',
            'other'
        ];
        if (!validReportTypes.includes(report_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid report_type. Must be one of: ${validReportTypes.join(', ')}`
            });
        }

        // Validate priority if provided
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        const reportPriority = priority || 'normal';
        if (!validPriorities.includes(reportPriority)) {
            return res.status(400).json({
                success: false,
                message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
            });
        }

        // Get user_id if authenticated
        const user_id = req.userId || null;

        // Create report in database
        const report = await prisma.report.create({
            data: {
                reporter_name,
                reporter_email,
                reporter_phone: reporter_phone || null,
                reporter_type: reporter_type || 'guest',
                user_id,
                report_type,
                subject,
                description,
                attachment_urls: attachment_urls || null,
                priority: reportPriority,
                status: 'pending'
            }
        });

        // Send email notification to admin
        try {
            const { sendReportToAdmin, sendReportConfirmationToReporter } = await import('../services/report-mailer.js');
            
            console.log('📧 Sending report emails...');
            
            // Send to admin (admin can reply directly to reporter)
            await sendReportToAdmin({
                report_id: report.report_id,
                reporter_name: report.reporter_name,
                reporter_email: report.reporter_email,
                reporter_phone: report.reporter_phone,
                reporter_type: report.reporter_type,
                report_type: report.report_type,
                subject: report.subject,
                description: report.description,
                priority: report.priority,
                attachment_urls: report.attachment_urls,
                created_at: report.created_at
            });

            // Send confirmation to reporter
            await sendReportConfirmationToReporter({
                report_id: report.report_id,
                reporter_name: report.reporter_name,
                reporter_email: report.reporter_email,
                report_type: report.report_type,
                subject: report.subject,
                description: report.description,
                created_at: report.created_at
            });

            console.log('✅ Report emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending report emails:', emailError);
            // Don't fail the report submission if email fails
        }

        return res.status(201).json({
            success: true,
            message: 'Report submitted successfully. Admin will review and respond via email.',
            data: {
                report_id: report.report_id,
                reporter_email: report.reporter_email,
                report_type: report.report_type,
                subject: report.subject,
                priority: report.priority,
                status: report.status,
                created_at: report.created_at
            }
        });
    } catch (error) {
        console.error('Error submitting report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error submitting report',
            error: error.message
        });
    }
};

// Admin: Get all reports with filters
export const getAllReports = async (req, res) => {
    try {
        const {
            status,
            report_type,
            priority,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        const where = {};
        
        if (status) {
            where.status = status;
        }
        
        if (report_type) {
            where.report_type = report_type;
        }
        
        if (priority) {
            where.priority = priority;
        }
        
        if (search) {
            where.OR = [
                { subject: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { reporter_name: { contains: search, mode: 'insensitive' } },
                { reporter_email: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Get reports and total count
        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where,
                orderBy: [
                    { priority: 'desc' }, // urgent first
                    { created_at: 'desc' }
                ],
                skip,
                take
            }),
            prisma.report.count({ where })
        ]);

        return res.status(200).json({
            success: true,
            data: reports,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(total / take),
                total_count: total,
                limit: take,
                has_next: parseInt(page) < Math.ceil(total / take),
                has_prev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching reports',
            error: error.message
        });
    }
};

// Admin: Get single report by ID
export const getReportById = async (req, res) => {
    try {
        const { reportId } = req.params;

        const report = await prisma.report.findUnique({
            where: { report_id: parseInt(reportId) }
        });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error fetching report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching report',
            error: error.message
        });
    }
};

// Admin: Update report status
export const updateReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status, admin_notes, resolved_by } = req.body;

        // Validate status
        const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (admin_notes) updateData.admin_notes = admin_notes;
        if (resolved_by) updateData.resolved_by = parseInt(resolved_by);
        
        // Set resolved_at timestamp if marking as resolved or closed
        if (status === 'resolved' || status === 'closed') {
            updateData.resolved_at = new Date();
        }

        const updatedReport = await prisma.report.update({
            where: { report_id: parseInt(reportId) },
            data: updateData
        });

        return res.status(200).json({
            success: true,
            message: 'Report updated successfully',
            data: updatedReport
        });
    } catch (error) {
        console.error('Error updating report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating report',
            error: error.message
        });
    }
};

// Admin: Delete report
export const deleteReport = async (req, res) => {
    try {
        const { reportId } = req.params;

        await prisma.report.delete({
            where: { report_id: parseInt(reportId) }
        });

        return res.status(200).json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting report:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting report',
            error: error.message
        });
    }
};

// Admin: Get report statistics
export const getReportStatistics = async (req, res) => {
    try {
        const [
            totalReports,
            pendingReports,
            inProgressReports,
            resolvedReports,
            byType,
            byPriority
        ] = await Promise.all([
            prisma.report.count(),
            prisma.report.count({ where: { status: 'pending' } }),
            prisma.report.count({ where: { status: 'in_progress' } }),
            prisma.report.count({ where: { status: 'resolved' } }),
            prisma.report.groupBy({
                by: ['report_type'],
                _count: { report_id: true }
            }),
            prisma.report.groupBy({
                by: ['priority'],
                _count: { report_id: true }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                total: totalReports,
                by_status: {
                    pending: pendingReports,
                    in_progress: inProgressReports,
                    resolved: resolvedReports
                },
                by_type: byType.reduce((acc, item) => {
                    acc[item.report_type] = item._count.report_id;
                    return acc;
                }, {}),
                by_priority: byPriority.reduce((acc, item) => {
                    acc[item.priority] = item._count.report_id;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Error fetching report statistics:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching report statistics',
            error: error.message
        });
    }
};
