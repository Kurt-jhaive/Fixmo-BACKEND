import { Router } from 'express';
import { 
    runManualWarrantyCleanup, 
    getWarrantyJobStatus 
} from '../services/warrantyExpiryJob.js';
import { 
    closeExpiredConversations,
    getActiveWarrantyExpiry 
} from '../services/conversationWarrantyService.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/warranty/status
 * Get warranty cleanup job status
 */
router.get('/status', async (req, res) => {
    try {
        const jobStatus = getWarrantyJobStatus();
        
        // Get some statistics
        const stats = await prisma.conversation.groupBy({
            by: ['status'],
            _count: {
                conversation_id: true
            }
        });

        const warrantyStats = await prisma.conversation.aggregate({
            where: {
                status: 'active',
                warranty_expires: {
                    not: null
                }
            },
            _count: {
                conversation_id: true
            }
        });

        const expiredCount = await prisma.conversation.count({
            where: {
                status: 'active',
                warranty_expires: {
                    lt: new Date()
                }
            }
        });

        res.json({
            success: true,
            job_status: jobStatus,
            statistics: {
                conversations_by_status: stats.reduce((acc, stat) => {
                    acc[stat.status] = stat._count.conversation_id;
                    return acc;
                }, {}),
                active_with_warranty: warrantyStats._count.conversation_id,
                pending_expiry: expiredCount
            }
        });
    } catch (error) {
        console.error('Error getting warranty job status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting warranty job status',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/warranty/cleanup
 * Manually trigger warranty expiry cleanup
 */
router.post('/cleanup', async (req, res) => {
    try {
        console.log('🔧 Manual warranty cleanup triggered by admin');
        
        const expiredConversations = await closeExpiredConversations();
        
        res.json({
            success: true,
            message: 'Warranty expiry cleanup completed',
            results: {
                conversations_closed: expiredConversations.length,
                closed_conversation_ids: expiredConversations.map(c => c.conversation_id),
                details: expiredConversations.map(c => ({
                    conversation_id: c.conversation_id,
                    customer_id: c.customer_id,
                    provider_id: c.provider_id,
                    warranty_expires: c.warranty_expires
                }))
            }
        });
    } catch (error) {
        console.error('Error during manual warranty cleanup:', error);
        res.status(500).json({
            success: false,
            message: 'Error during manual warranty cleanup',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/warranty/expired
 * Get list of conversations with expired warranties
 */
router.get('/expired', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const expiredConversations = await prisma.conversation.findMany({
            where: {
                status: 'active',
                warranty_expires: {
                    lt: new Date()
                }
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                },
                provider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true
                    }
                },
                _count: {
                    select: { messages: true }
                }
            },
            orderBy: { warranty_expires: 'asc' },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        });

        res.json({
            success: true,
            expired_conversations: expiredConversations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: expiredConversations.length
            }
        });
    } catch (error) {
        console.error('Error getting expired conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting expired conversations',
            error: error.message
        });
    }
});

/**
 * GET /api/admin/warranty/upcoming
 * Get conversations expiring soon (next 24 hours)
 */
router.get('/upcoming', async (req, res) => {
    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        const upcomingExpiry = await prisma.conversation.findMany({
            where: {
                status: 'active',
                warranty_expires: {
                    gte: now,
                    lte: tomorrow
                }
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                },
                provider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true
                    }
                }
            },
            orderBy: { warranty_expires: 'asc' }
        });

        res.json({
            success: true,
            upcoming_expiry: upcomingExpiry,
            count: upcomingExpiry.length
        });
    } catch (error) {
        console.error('Error getting upcoming expiry conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting upcoming expiry conversations',
            error: error.message
        });
    }
});

export default router;