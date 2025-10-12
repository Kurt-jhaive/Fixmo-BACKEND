import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { 
    findOrCreateConversation, 
    isMessagingAllowed, 
    getActiveWarrantyExpiry,
    checkAppointmentStatus 
} from '../services/conversationWarrantyService.js';
import notificationService from '../services/notificationService.js';

const prisma = new PrismaClient();

// Store WebSocket server instance
let webSocketServer = null;

export const setWebSocketServer = (wsServer) => {
    webSocketServer = wsServer;
};

// Configure multer for message attachments - Use memory storage for Cloudinary
const storage = multer.memoryStorage();

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
            const { page = 1, limit = 20, includeCompleted } = req.query;

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

            // Build where clause based on user type
            const whereClause = userType === 'customer' 
                ? { customer_id: userId }
                : { provider_id: userId };

            // Only filter out closed/archived conversations if includeCompleted is not true
            if (includeCompleted !== 'true' && includeCompleted !== true) {
                whereClause.status = { not: 'closed' };
            }

            const conversations = await prisma.conversation.findMany({
                where: whereClause,
                include: {
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

            // Check and update conversation statuses based on appointment status
            const conversationsToClose = [];
            const allConversations = [];

            for (const conv of conversations) {
                try {
                    // Check the appointment status for this conversation
                    const appointmentStatus = await checkAppointmentStatus(conv.customer_id, conv.provider_id);
                    
                    // If appointment is completed or cancelled, mark for closing
                    if (appointmentStatus.hasAppointment && !appointmentStatus.canMessage) {
                        conversationsToClose.push(conv.conversation_id);
                        
                        // Include in results if includeCompleted is true
                        allConversations.push({
                            ...conv,
                            appointment_status: appointmentStatus.appointmentStatus || 'completed',
                            is_warranty_active: appointmentStatus.isInWarranty || false,
                            can_message: appointmentStatus.canMessage || false
                        });
                    } else {
                        allConversations.push({
                            ...conv,
                            appointment_status: appointmentStatus.appointmentStatus || 'unknown',
                            is_warranty_active: appointmentStatus.isInWarranty || false,
                            can_message: appointmentStatus.canMessage || false
                        });
                    }
                } catch (error) {
                    console.error(`Error checking appointment status for conversation ${conv.conversation_id}:`, error);
                    // If we can't check the status, keep the conversation
                    allConversations.push({
                        ...conv,
                        appointment_status: 'unknown',
                        is_warranty_active: conv.warranty_expires ? new Date() < new Date(conv.warranty_expires) : false,
                        can_message: true // Default to true if we can't check status
                    });
                }
            }

            // Close conversations for completed appointments
            if (conversationsToClose.length > 0) {
                await prisma.conversation.updateMany({
                    where: {
                        conversation_id: { in: conversationsToClose }
                    },
                    data: {
                        status: 'closed',
                        updated_at: new Date()
                    }
                });
                console.log(`🔒 Auto-closed ${conversationsToClose.length} conversations for completed appointments`);
            }

            // Filter conversations based on includeCompleted parameter
            let finalConversations = allConversations;
            if (includeCompleted !== 'true' && includeCompleted !== true) {
                // Only show conversations that weren't marked to close
                finalConversations = allConversations.filter(conv => 
                    !conversationsToClose.includes(conv.conversation_id)
                );
            }

            // Format conversations
            const formattedConversations = finalConversations.map(conv => ({
                conversation_id: conv.conversation_id,
                participant: userType === 'customer' ? conv.provider : conv.customer,
                last_message: conv.messages[0] || null,
                unread_count: conv._count.messages,
                status: conv.status,
                warranty_expires: conv.warranty_expires,
                appointment_status: conv.appointment_status,
                created_at: conv.created_at,
                last_message_at: conv.last_message_at,
                is_warranty_active: conv.is_warranty_active
            }));

            res.json({
                success: true,
                conversations: formattedConversations,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: formattedConversations.length
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
            const { content, messageType = 'text', replyToId = null } = req.body;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Message content is required'
                });
            }

            // Verify conversation access and determine user type FROM THE CONVERSATION
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

            // IMPORTANT: Determine userType based on conversation, not from request
            // This ensures we always identify the sender correctly
            const userType = conversation.customer_id === userId ? 'customer' : 'provider';
            
            console.log(`\n💬 Message from User ID ${userId} in conversation ${conversationId}`);
            console.log(`👤 User role in this conversation: ${userType}`);
            console.log(`📋 Conversation: customer_id=${conversation.customer_id}, provider_id=${conversation.provider_id}\n`);

            // Check if conversation is still active and within warranty period
            if (conversation.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'This conversation has been closed'
                });
            }

            // Check appointment status and update if needed
            const appointmentStatus = await checkAppointmentStatus(conversation.customer_id, conversation.provider_id);
            
            if (!appointmentStatus.hasAppointment) {
                return res.status(403).json({
                    success: false,
                    message: 'No valid appointment found for this conversation'
                });
            }

            // Check if messaging is allowed (any non-cancelled, non-completed appointment)
            if (!appointmentStatus.canMessage) {
                // If appointment is completed or cancelled, close the conversation
                await prisma.conversation.update({
                    where: { conversation_id: parseInt(conversationId) },
                    data: { 
                        status: 'closed',
                        updated_at: new Date()
                    }
                });

                return res.status(403).json({
                    success: false,
                    message: 'This conversation has been closed - appointment is cancelled or completed'
                });
            }

            // Upload attachment to Cloudinary if provided
            let attachmentUrl = null;
            if (req.file) {
                try {
                    attachmentUrl = await uploadToCloudinary(
                        req.file.buffer,
                        'fixmo/message-attachments',
                        `msg_${userId}_${Date.now()}`
                    );
                } catch (uploadError) {
                    console.error('Error uploading message attachment to Cloudinary:', uploadError);
                    return res.status(500).json({
                        success: false,
                        message: 'Error uploading attachment. Please try again.'
                    });
                }
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

            // Send push notification to the recipient
            try {
                console.log(`\n📱 Preparing push notification for message in conversation ${conversationId}`);
                console.log(`👤 Sender: ${userType} (ID: ${userId})`);
                
                // Get sender name
                let senderName = '';
                if (userType === 'customer') {
                    const customer = await prisma.user.findUnique({
                        where: { user_id: userId },
                        select: { first_name: true, last_name: true }
                    });
                    senderName = customer ? `${customer.first_name} ${customer.last_name}` : 'Someone';
                } else {
                    const provider = await prisma.serviceProviderDetails.findUnique({
                        where: { provider_id: userId },
                        select: { provider_first_name: true, provider_last_name: true }
                    });
                    senderName = provider ? `${provider.provider_first_name} ${provider.provider_last_name}` : 'Provider';
                }

                console.log(`📝 Sender name: ${senderName}`);

                // Get message preview (first 100 characters)
                const messagePreview = content.substring(0, 100);

                // Send notification with sender information
                notificationService.sendNewMessageNotification(
                    parseInt(conversationId),
                    userId,           // senderId
                    userType,         // senderType
                    senderName,       // senderName
                    messagePreview    // messagePreview
                ).catch(err => console.error('❌ Failed to send message notification:', err));

                console.log('✅ Push notification request sent for new message\n');
            } catch (notifError) {
                console.error('❌ Error sending push notification:', notifError);
                // Don't fail the message sending if notification fails
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

    // Create conversation (for customer-provider pair)
    async createConversation(req, res) {
        try {
            const { customerId, providerId } = req.body;
            const userId = req.userId;
            const userType = req.userType || req.body.userType;

            // Validate input
            if (!customerId || !providerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID and Provider ID are required'
                });
            }

            // Verify user has permission to create this conversation
            const requestedCustomerId = parseInt(customerId);
            const requestedProviderId = parseInt(providerId);

            if (userType === 'customer' && userId !== requestedCustomerId) {
                return res.status(403).json({
                    success: false,
                    message: 'Customers can only create conversations for themselves'
                });
            }

            if (userType === 'provider' && userId !== requestedProviderId) {
                return res.status(403).json({
                    success: false,
                    message: 'Providers can only create conversations for themselves'
                });
            }

            // Check if messaging is allowed (any non-cancelled, non-completed appointment)
            const messagingAllowed = await isMessagingAllowed(requestedCustomerId, requestedProviderId);
            if (!messagingAllowed) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot create conversation - no valid appointment found or appointment is cancelled/completed'
                });
            }

            // Get warranty expiry date for the conversation
            const warrantyExpiry = await getActiveWarrantyExpiry(requestedCustomerId, requestedProviderId);

            // Find or create conversation (this function handles duplicates)
            const conversation = await findOrCreateConversation(
                requestedCustomerId,
                requestedProviderId,
                warrantyExpiry
            );

            // Get conversation with related data
            const conversationWithDetails = await prisma.conversation.findUnique({
                where: { conversation_id: conversation.conversation_id },
                include: {
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
                message: 'Conversation ready',
                data: conversationWithDetails
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
                where: { conversation_id: parseInt(conversationId) }
            });

            if (!conversation || 
                (conversation.customer_id !== userId && conversation.provider_id !== userId)) {
                return res.status(404).json({
                    success: false,
                    message: 'Conversation not found or access denied'
                });
            }

            // Check if conversation is still active and within warranty period
            if (conversation.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'This conversation has been closed'
                });
            }

            // Check if messaging is allowed (any non-cancelled, non-completed appointment)
            const messagingAllowed = await isMessagingAllowed(conversation.customer_id, conversation.provider_id);
            if (!messagingAllowed) {
                return res.status(403).json({
                    success: false,
                    message: 'File upload not available - appointment is cancelled or completed'
                });
            }

            // Upload file to Cloudinary
            let attachmentUrl;
            try {
                attachmentUrl = await uploadToCloudinary(
                    req.file.buffer,
                    'fixmo/message-attachments',
                    `msg_file_${userId}_${Date.now()}`
                );
            } catch (uploadError) {
                console.error('Error uploading message file to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading file. Please try again.'
                });
            }

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

    /**
     * Refresh conversation statuses based on active appointments
     * Reopen conversations that have active appointments but are marked as closed
     */
    async refreshConversationStatuses(req, res) {
        try {
            console.log('🔄 Refreshing conversation statuses...');

            // Get all conversations
            const conversations = await prisma.conversation.findMany({
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
            });

            let reopenedCount = 0;
            let closedCount = 0;
            const updates = [];

            for (const conv of conversations) {
                try {
                    // Check appointment status
                    const status = await checkAppointmentStatus(conv.customer_id, conv.provider_id);
                    
                    const shouldBeActive = status.canMessage;
                    const isCurrentlyActive = conv.status === 'active';

                    if (shouldBeActive && !isCurrentlyActive) {
                        // Reopen closed conversation that has active appointments
                        await prisma.conversation.update({
                            where: { conversation_id: conv.conversation_id },
                            data: {
                                status: 'active',
                                updated_at: new Date()
                            }
                        });
                        reopenedCount++;
                        updates.push({
                            conversation_id: conv.conversation_id,
                            action: 'reopened',
                            reason: 'Has active appointments',
                            customer: `${conv.customer.first_name} ${conv.customer.last_name}`,
                            provider: `${conv.provider.provider_first_name} ${conv.provider.provider_last_name}`,
                            appointmentStatus: status.appointmentStatus
                        });
                        console.log(`✅ Reopened conversation ${conv.conversation_id}`);
                    } else if (!shouldBeActive && isCurrentlyActive) {
                        // Close active conversation with no active appointments
                        await prisma.conversation.update({
                            where: { conversation_id: conv.conversation_id },
                            data: {
                                status: 'closed',
                                updated_at: new Date()
                            }
                        });
                        closedCount++;
                        updates.push({
                            conversation_id: conv.conversation_id,
                            action: 'closed',
                            reason: 'No active appointments',
                            customer: `${conv.customer.first_name} ${conv.customer.last_name}`,
                            provider: `${conv.provider.provider_first_name} ${conv.provider.provider_last_name}`,
                            appointmentStatus: status.appointmentStatus
                        });
                        console.log(`🔒 Closed conversation ${conv.conversation_id}`);
                    }
                } catch (error) {
                    console.error(`❌ Error checking conversation ${conv.conversation_id}:`, error);
                }
            }

            // Also update expired warranties
            const expiredWarranties = await prisma.appointment.updateMany({
                where: {
                    appointment_status: 'in-warranty',
                    warranty_expires_at: {
                        lt: new Date()
                    }
                },
                data: {
                    appointment_status: 'completed',
                    completed_at: new Date()
                }
            });

            console.log('✅ Conversation refresh complete');

            res.json({
                success: true,
                message: 'Conversation statuses refreshed',
                data: {
                    totalConversations: conversations.length,
                    reopened: reopenedCount,
                    closed: closedCount,
                    expiredWarrantiesUpdated: expiredWarranties.count,
                    updates: updates
                }
            });

        } catch (error) {
            console.error('Error refreshing conversation statuses:', error);
            res.status(500).json({
                success: false,
                message: 'Error refreshing conversation statuses',
                error: error.message
            });
        }
    }
}

export default new MessageController();
