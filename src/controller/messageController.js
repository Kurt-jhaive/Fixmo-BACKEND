import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// Store WebSocket server instance
let webSocketServer = null;

export const setWebSocketServer = (wsServer) => {
    webSocketServer = wsServer;
};

// Configure multer for message attachments
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'message-attachments');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const userId = req.userId;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `msg_${userId}_${timestamp}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow images and documents for message attachments
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type for message attachment.'), false);
    }
};

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit for message attachments
    },
    fileFilter: fileFilter
});

class MessageController {
    // Get user's conversations
    async getConversations(req, res) {
        try {
            const userId = req.userId;
            const userType = req.userType || (req.body.userType || req.query.userType); // 'customer' or 'provider'
            const { page = 1, limit = 20 } = req.query;

            if (!userType) {
                return res.status(400).json({ 
                    error: 'User type not specified. Please include userType in request body, query, or ensure token contains userType.' 
                });
            }

            if (!['customer', 'provider'].includes(userType)) {
                return res.status(400).json({ 
                    error: 'Invalid user type. Must be either "customer" or "provider".' 
                });
            }

            const whereClause = userType === 'customer' 
                ? { customer_id: userId }
                : { provider_id: userId };

            const conversations = await prisma.conversation.findMany({
                where: {
                    ...whereClause,
                    status: { not: 'closed' }
                },
                include: {
                    appointment: {
                        select: {
                            appointment_id: true,
                            appointment_status: true,
                            scheduled_date: true,
                            service: {
                                select: {
                                    service_title: true,
                                    service_description: true
                                }
                            }
                        }
                    },
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            profile_photo: true
                        }
                    },
                    provider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_profile_photo: true
                        }
                    },
                    messages: {
                        select: {
                            message_id: true,
                            content: true,
                            message_type: true,
                            sender_type: true,
                            is_read: true,
                            created_at: true
                        },
                        orderBy: { created_at: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: {
                            messages: {
                                where: {
                                    is_read: false,
                                    sender_type: userType === 'customer' ? 'provider' : 'customer'
                                }
                            }
                        }
                    }
                },
                orderBy: { last_message_at: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            });

            // Format conversations
            const formattedConversations = conversations.map(conv => ({
                conversation_id: conv.conversation_id,
                appointment: conv.appointment,
                participant: userType === 'customer' ? conv.provider : conv.customer,
                last_message: conv.messages[0] || null,
                unread_count: conv._count.messages,
                status: conv.status,
                created_at: conv.created_at,
                last_message_at: conv.last_message_at
            }));

            res.json({
                success: true,
                conversations: formattedConversations,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: conversations.length
                }
            });

        } catch (error) {
            console.error('Error fetching conversations:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching conversations'
            });
        }
    }

    // Get messages in a conversation
    async getMessages(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.userId;
            const { page = 1, limit = 50 } = req.query;

            // Verify user has access to this conversation
            const conversation = await prisma.conversation.findUnique({
                where: { conversation_id: parseInt(conversationId) }
            });

            if (!conversation || 
                (conversation.customer_id !== userId && conversation.provider_id !== userId)) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found or access denied'
                });
            }

            const messages = await prisma.message.findMany({
                where: { conversation_id: parseInt(conversationId) },
                include: {
                    replied_to: {
                        select: {
                            message_id: true,
                            content: true,
                            sender_type: true,
                            created_at: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            });

            res.json({
                success: true,
                messages: messages.reverse(), // Reverse to show oldest first
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    has_more: messages.length === parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching messages'
            });
        }
    }

    // Send a message (HTTP endpoint as backup to WebSocket)
    async sendMessage(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.userId;
            const userType = req.userType || req.body.userType;
            const { content, messageType = 'text', replyToId = null } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Message content is required'
                });
            }

            // Verify conversation access
            const conversation = await prisma.conversation.findUnique({
                where: { conversation_id: parseInt(conversationId) },
                include: {
                    appointment: true
                }
            });

            if (!conversation || 
                (conversation.customer_id !== userId && conversation.provider_id !== userId)) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found or access denied'
                });
            }

            // Check if messaging is allowed for this appointment
            const allowedStatuses = ['confirmed', 'in-progress', 'completed'];
            if (!allowedStatuses.includes(conversation.appointment.appointment_status)) {
                return res.status(403).json({
                    success: false,
                    message: 'Messaging not available for this appointment status'
                });
            }

            let attachmentUrl = null;
            if (req.file) {
                attachmentUrl = `/uploads/message-attachments/${req.file.filename}`;
            }

            // Create message
            const message = await prisma.message.create({
                data: {
                    conversation_id: parseInt(conversationId),
                    sender_id: userId,
                    sender_type: userType,
                    content,
                    message_type: messageType,
                    attachment_url: attachmentUrl,
                    replied_to_id: replyToId ? parseInt(replyToId) : null
                },
                include: {
                    replied_to: {
                        select: {
                            message_id: true,
                            content: true,
                            sender_type: true,
                            created_at: true
                        }
                    }
                }
            });

            // Notify WebSocket clients about the new message
            if (webSocketServer) {
                // Broadcast to conversation participants
                webSocketServer.broadcastToConversation(parseInt(conversationId), 'new_message', message);
                
                // Send push notification
                const otherUserId = conversation.customer_id === userId ? conversation.provider_id : conversation.customer_id;
                console.log(`📱 Push notification: New message in conversation ${conversationId}`);
                console.log(`💬 Message sent in conversation ${conversationId} by user ${userId}`);
            }

            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: message
            });

        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending message'
            });
        }
    }

    // Mark messages as read
    async markAsRead(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.userId;
            const { messageIds } = req.body;

            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Message IDs array is required'
                });
            }

            // Update messages as read
            const result = await prisma.message.updateMany({
                where: {
                    message_id: { in: messageIds },
                    conversation_id: parseInt(conversationId),
                    sender_id: { not: userId } // Can't mark own messages as read
                },
                data: { is_read: true }
            });

            res.json({
                success: true,
                message: `${result.count} messages marked as read`
            });

        } catch (error) {
            console.error('Error marking messages as read:', error);
            res.status(500).json({
                success: false,
                message: 'Error marking messages as read'
            });
        }
    }

    // Create conversation (when appointment is confirmed)
    async createConversation(req, res) {
        try {
            const { appointmentId } = req.body;

            // Get appointment details
            const appointment = await prisma.appointment.findUnique({
                where: { appointment_id: appointmentId },
                include: {
                    customer: true,
                    serviceProvider: true
                }
            });

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }

            // Check if conversation already exists
            const existingConversation = await prisma.conversation.findUnique({
                where: { appointment_id: appointmentId }
            });

            if (existingConversation) {
                return res.json({
                    success: true,
                    message: 'Conversation already exists',
                    data: existingConversation
                });
            }

            // Create new conversation
            const conversation = await prisma.conversation.create({
                data: {
                    appointment_id: appointmentId,
                    customer_id: appointment.customer_id,
                    provider_id: appointment.provider_id
                },
                include: {
                    appointment: true,
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            profile_photo: true
                        }
                    },
                    provider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_profile_photo: true
                        }
                    }
                }
            });

            res.status(201).json({
                success: true,
                message: 'Conversation created successfully',
                data: conversation
            });

        } catch (error) {
            console.error('Error creating conversation:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating conversation'
            });
        }
    }

    // Get conversation details
    async getConversationDetails(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.userId;
            const userType = req.userType || req.query.userType;

            console.log('Debug - getConversationDetails:', { conversationId, userId, userType }); // Debug log

            if (!conversationId || isNaN(parseInt(conversationId))) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid conversation ID is required'
                });
            }

            if (!userType) {
                return res.status(400).json({
                    success: false,
                    message: 'User type is required'
                });
            }

            const conversation = await prisma.conversation.findUnique({
                where: {
                    conversation_id: parseInt(conversationId)
                },
                include: {
                    appointment: {
                        include: {
                            service: {
                                select: {
                                    service_title: true,
                                    service_description: true,
                                    service_startingprice: true
                                }
                            }
                        }
                    },
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            profile_photo: true,
                            phone_number: true
                        }
                    },
                    provider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_profile_photo: true,
                            provider_phone_number: true,
                            provider_rating: true
                        }
                    },
                    messages: {
                        orderBy: {
                            created_at: 'asc'
                        }
                    },
                    _count: {
                        select: { messages: true }
                    }
                }
            });

            // Check if user has access to this conversation
            if (conversation && 
                conversation.customer_id !== userId && 
                conversation.provider_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this conversation'
                });
            }

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found or access denied'
                });
            }

            res.json({
                success: true,
                data: conversation
            });

        } catch (error) {
            console.error('Error fetching conversation details:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching conversation details',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Archive conversation
    async archiveConversation(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.userId;

            // Verify user has access to this conversation
            const conversation = await prisma.conversation.findUnique({
                where: { conversation_id: parseInt(conversationId) }
            });

            if (!conversation || 
                (conversation.customer_id !== userId && conversation.provider_id !== userId)) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found or access denied'
                });
            }

            // Update conversation status
            const updatedConversation = await prisma.conversation.update({
                where: { conversation_id: parseInt(conversationId) },
                data: { status: 'archived' }
            });

            res.json({
                success: true,
                message: 'Conversation archived successfully',
                conversation: updatedConversation
            });

        } catch (error) {
            console.error('Error archiving conversation:', error);
            res.status(500).json({
                success: false,
                message: 'Error archiving conversation'
            });
        }
    }

    // Search messages
    async searchMessages(req, res) {
        try {
            const userId = req.userId;
            const userType = req.userType || req.query.userType;
            const { query, conversationId, page = 1, limit = 20 } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const whereClause = {
                content: {
                    contains: query,
                    mode: 'insensitive'
                },
                conversation: {
                    OR: [
                        { customer_id: userId },
                        { provider_id: userId }
                    ]
                }
            };

            if (conversationId) {
                whereClause.conversation_id = parseInt(conversationId);
            }

            const messages = await prisma.message.findMany({
                where: whereClause,
                include: {
                    conversation: {
                        include: {
                            customer: {
                                select: {
                                    user_id: true,
                                    first_name: true,
                                    last_name: true
                                }
                            },
                            provider: {
                                select: {
                                    provider_id: true,
                                    provider_first_name: true,
                                    provider_last_name: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            });

            res.json({
                success: true,
                messages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    has_more: messages.length === parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error searching messages:', error);
            res.status(500).json({
                success: false,
                message: 'Error searching messages'
            });
        }
    }

    // Upload file message (separate endpoint)
    async uploadFileMessage(req, res) {
        try {
            const { conversationId, senderType } = req.body;
            const userId = req.userId;
            const userType = senderType || req.userType;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID is required'
                });
            }

            // Validate file type (only images for now)
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: 'Only image files are allowed'
                });
            }

            // Verify conversation access
            const conversation = await prisma.conversation.findUnique({
                where: { conversation_id: parseInt(conversationId) },
                include: {
                    appointment: true
                }
            });

            if (!conversation || 
                (conversation.customer_id !== userId && conversation.provider_id !== userId)) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found or access denied'
                });
            }

            // Check if messaging is allowed
            const allowedStatuses = ['confirmed', 'in-progress', 'completed'];
            if (!allowedStatuses.includes(conversation.appointment.appointment_status)) {
                return res.status(403).json({
                    success: false,
                    message: 'Messaging not available for this appointment status'
                });
            }

            const attachmentUrl = `/uploads/message-attachments/${req.file.filename}`;

            // Create message with attachment
            const message = await prisma.message.create({
                data: {
                    conversation_id: parseInt(conversationId),
                    sender_id: userId,
                    sender_type: userType,
                    content: '📸 Image attachment',
                    message_type: 'image',
                    attachment_url: attachmentUrl
                }
            });

            // Notify WebSocket clients about the new message
            if (webSocketServer) {
                webSocketServer.broadcastToConversation(parseInt(conversationId), 'new_message', message);
                
                const otherUserId = conversation.customer_id === userId ? conversation.provider_id : conversation.customer_id;
                console.log(`📱 Push notification: New image message in conversation ${conversationId}`);
                console.log(`🖼️ Image message sent in conversation ${conversationId} by user ${userId}`);
            }

            res.status(201).json({
                success: true,
                message: 'File uploaded successfully',
                data: message
            });

        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({
                success: false,
                message: 'Error uploading file'
            });
        }
    }
}

export default new MessageController();
