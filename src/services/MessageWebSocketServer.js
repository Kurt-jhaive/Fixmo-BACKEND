import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class MessageWebSocketServer {
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.activeUsers = new Map(); // Store active users: userId -> socketId
        this.userRooms = new Map(); // Store user rooms: userId -> Set of conversationIds
        
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);
            
            // Set initial authentication state
            socket.isAuthenticated = false;
            socket.userId = null;
            socket.userType = null;

            // Handle user authentication
            socket.on('authenticate', async (data) => {
                try {
                    console.log('🔐 Authentication attempt for socket:', socket.id);
                    await this.authenticateUser(socket, data);
                } catch (error) {
                    console.error('Authentication error:', error.message);
                    socket.emit('authentication_failed', { 
                        error: 'Authentication failed',
                        details: error.message 
                    });
                }
            });

            // Handle joining conversation - check authentication first
            socket.on('join_conversation', async (data) => {
                console.log('Join conversation data:', data);
                
                // Check authentication status first
                if (!socket.isAuthenticated || !socket.userId) {
                    console.log('Socket not authenticated:', { 
                        isAuthenticated: socket.isAuthenticated, 
                        userId: socket.userId 
                    });
                    socket.emit('join_conversation_failed', { 
                        error: 'User not authenticated. Please authenticate first.' 
                    });
                    return;
                }

                try {
                    await this.joinConversation(socket, data);
                } catch (error) {
                    console.error('Join conversation error:', error);
                    
                    // Determine error type for better frontend handling
                    const isClosed = error.message.includes('closed');
                    const isExpired = error.message.includes('expired');
                    
                    socket.emit('join_conversation_failed', { 
                        error: error.message,
                        conversationId: data.conversationId,
                        reason: isClosed ? 'closed' : (isExpired ? 'expired' : 'unknown')
                    });
                }
            });

            // Handle leaving conversation
            socket.on('leave_conversation', async (data) => {
                try {
                    await this.leaveConversation(socket, data);
                } catch (error) {
                    console.error('Leave conversation error:', error);
                }
            });

            // Handle sending message
            socket.on('send_message', async (data) => {
                try {
                    await this.sendMessage(socket, data);
                } catch (error) {
                    console.error('Send message error:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            });

            // Handle message read status
            socket.on('mark_as_read', async (data) => {
                try {
                    await this.markAsRead(socket, data);
                } catch (error) {
                    console.error('Mark as read error:', error);
                }
            });

            // Handle typing indicator
            socket.on('typing_start', (data) => {
                this.handleTyping(socket, data, true);
            });

            socket.on('typing_stop', (data) => {
                this.handleTyping(socket, data, false);
            });

            // Handle user going online/offline
            socket.on('user_online', (data) => {
                this.updateUserStatus(socket, 'online');
            });

            socket.on('user_offline', (data) => {
                this.updateUserStatus(socket, 'offline');
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });
        });
    }

    async authenticateUser(socket, data) {
        const { token, userType } = data; // userType: 'customer' or 'provider'
        
        if (!token) {
            throw new Error('No token provided');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id;

            // Verify user exists and get user info
            let user;
            if (userType === 'customer') {
                user = await prisma.user.findUnique({
                    where: { user_id: userId },
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        is_verified: true,
                        is_activated: true
                    }
                });
            } else if (userType === 'provider') {
                user = await prisma.serviceProviderDetails.findUnique({
                    where: { provider_id: userId },
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_isVerified: true,
                        provider_isActivated: true
                    }
                });
            }

            if (!user) {
                throw new Error('User not found');
            }

            // Store user info in socket
            socket.userId = userId;
            socket.userType = userType;
            socket.userInfo = user;
            socket.isAuthenticated = true; // Set authentication flag

            // Add to active users
            this.activeUsers.set(userId, socket.id);
            this.userRooms.set(userId, new Set());

            // Join user to their conversations
            await this.joinUserConversations(socket);

            socket.emit('authenticated', {
                success: true,
                userId: userId,
                userType: userType,
                user: user,
                socketId: socket.id
            });

            console.log(`✅ User authenticated: ${userId} (${userType}) - Socket: ${socket.id}`);

        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    async joinUserConversations(socket) {
        try {
            // Get all conversations for this user
            const conversations = await prisma.conversation.findMany({
                where: {
                    OR: [
                        { customer_id: socket.userId, ...(socket.userType === 'customer' ? {} : { provider_id: { not: socket.userId } }) },
                        { provider_id: socket.userId, ...(socket.userType === 'provider' ? {} : { customer_id: { not: socket.userId } }) }
                    ],
                    status: 'active'
                },
                select: { conversation_id: true }
            });

            // Join socket to conversation rooms
            conversations.forEach(conv => {
                const roomName = `conversation_${conv.conversation_id}`;
                socket.join(roomName);
                this.userRooms.get(socket.userId).add(conv.conversation_id);
            });

            console.log(`📨 User ${socket.userId} joined ${conversations.length} conversations`);
        } catch (error) {
            console.error('Error joining user conversations:', error);
        }
    }

    async joinConversation(socket, data) {
        const { conversationId } = data;
        const userId = socket.userId; // Use authenticated user ID
        const userType = socket.userType;

        if (!conversationId) {
            throw new Error('Conversation ID is required');
        }

        console.log(`👥 User ${userId} (${userType}) attempting to join conversation ${conversationId}`);

        try {
            // Verify user has access to this conversation
            const conversation = await prisma.conversation.findFirst({
                where: {
                    conversation_id: parseInt(conversationId),
                    OR: [
                        { customer_id: socket.userId },
                        { provider_id: socket.userId }
                    ]
                },
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

            if (!conversation) {
                throw new Error('Conversation not found or access denied');
            }

            // Check if conversation is closed or not active
            if (conversation.status === 'closed') {
                throw new Error('This conversation has been closed and is no longer available for messaging');
            }

            if (conversation.status !== 'active') {
                throw new Error(`Conversation is ${conversation.status} and not available for messaging`);
            }

            // Check if there are any active appointments with warranties
            // Don't rely solely on conversation.warranty_expires as it might be outdated
            const activeAppointments = await prisma.appointment.findMany({
                where: {
                    customer_id: conversation.customer_id,
                    provider_id: conversation.provider_id,
                    appointment_status: { 
                        in: ['scheduled', 'confirmed', 'On the Way', 'in-progress', 'finished', 'in-warranty', 'backjob'] 
                    }
                },
                select: {
                    appointment_id: true,
                    appointment_status: true,
                    warranty_expires_at: true
                }
            });

            // Check if ANY appointment has an active warranty
            const now = new Date();
            const hasActiveWarranty = activeAppointments.some(apt => {
                if (apt.appointment_status === 'in-warranty' || apt.appointment_status === 'backjob') {
                    // Check if warranty has not expired
                    if (apt.warranty_expires_at) {
                        return now <= apt.warranty_expires_at;
                    }
                    // If in-warranty but no expiry date, allow messaging
                    return true;
                }
                // For other active statuses (scheduled, in-progress, etc.), allow messaging
                return true;
            });

            if (!hasActiveWarranty) {
                throw new Error('All warranties have expired for this conversation');
            }

            const roomName = `conversation_${conversationId}`;
            socket.join(roomName);
            this.userRooms.get(socket.userId).add(conversationId);
            socket.currentConversation = conversationId;

            // Send success response
            socket.emit('joined_conversation', {
                success: true,
                conversationId: parseInt(conversationId),
                roomName: roomName,
                message: 'Successfully joined conversation'
            });

            // Notify other participants that user joined
            socket.to(roomName).emit('user_joined_conversation', {
                userId: socket.userId,
                userType: socket.userType,
                userInfo: socket.userInfo
            });

            console.log(`✅ User ${socket.userId} (${socket.userType}) successfully joined conversation ${conversationId}`);

        } catch (error) {
            console.error('Error in joinConversation:', error);
            throw error;
        }
    }

    async leaveConversation(socket, data) {
        const { conversationId } = data;
        const roomName = `conversation_${conversationId}`;
        
        socket.leave(roomName);
        if (this.userRooms.has(socket.userId)) {
            this.userRooms.get(socket.userId).delete(conversationId);
        }

        // Notify other participants
        socket.to(roomName).emit('user_left_conversation', {
            userId: socket.userId,
            userType: socket.userType
        });

        console.log(`👋 User ${socket.userId} left conversation ${conversationId}`);
    }

    async sendMessage(socket, data) {
        const { conversationId, content, messageType = 'text', attachmentUrl = null, replyToId = null } = data;

        if (!socket.userId || !conversationId || !content) {
            throw new Error('Missing required message data');
        }

        // Verify conversation access
        const conversation = await prisma.conversation.findFirst({
            where: {
                conversation_id: conversationId,
                OR: [
                    { customer_id: socket.userId },
                    { provider_id: socket.userId }
                ]
            }
        });

        if (!conversation) {
            throw new Error('Conversation not found or access denied');
        }

        // Create message in database
        const message = await prisma.message.create({
            data: {
                conversation_id: conversationId,
                sender_id: socket.userId,
                sender_type: socket.userType,
                content,
                message_type: messageType,
                attachment_url: attachmentUrl,
                replied_to_id: replyToId
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

        // Broadcast message to conversation room
        const roomName = `conversation_${conversationId}`;
        const messageData = {
            ...message,
            sender_info: socket.userInfo
        };

        this.io.to(roomName).emit('new_message', messageData);

        // Send push notification to offline users
        await this.sendPushNotification(conversation, message, socket.userId);

        console.log(`💬 Message sent in conversation ${conversationId} by user ${socket.userId}`);
    }

    async markAsRead(socket, data) {
        const { messageIds, conversationId } = data;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return;
        }

        try {
            // Update messages as read
            await prisma.message.updateMany({
                where: {
                    message_id: { in: messageIds },
                    conversation_id: conversationId,
                    sender_id: { not: socket.userId } // Can't mark own messages as read
                },
                data: { is_read: true }
            });

            // Notify sender about read status
            const roomName = `conversation_${conversationId}`;
            socket.to(roomName).emit('messages_read', {
                messageIds,
                readBy: socket.userId,
                userType: socket.userType
            });

            console.log(`📖 ${messageIds.length} messages marked as read by user ${socket.userId}`);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    handleTyping(socket, data, isTyping) {
        const { conversationId } = data;
        const roomName = `conversation_${conversationId}`;
        
        socket.to(roomName).emit('typing_status', {
            userId: socket.userId,
            userType: socket.userType,
            isTyping,
            conversationId
        });
    }

    updateUserStatus(socket, status) {
        // Broadcast user status to all their conversations
        const userRooms = this.userRooms.get(socket.userId);
        if (userRooms) {
            userRooms.forEach(conversationId => {
                const roomName = `conversation_${conversationId}`;
                socket.to(roomName).emit('user_status_changed', {
                    userId: socket.userId,
                    userType: socket.userType,
                    status,
                    timestamp: new Date()
                });
            });
        }
    }

    handleDisconnection(socket) {
        if (socket.userId) {
            this.activeUsers.delete(socket.userId);
            this.userRooms.delete(socket.userId);
            this.updateUserStatus(socket, 'offline');
            console.log(`🔌 User ${socket.userId} disconnected`);
        }
    }

    async getConversationMessages(conversationId, limit = 50, offset = 0) {
        return await prisma.message.findMany({
            where: { conversation_id: conversationId },
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
            take: limit,
            skip: offset
        });
    }

    async sendPushNotification(conversation, message, senderId) {
        // Implement push notification logic here
        // This could integrate with Firebase, OneSignal, or other push services
        console.log(`📱 Push notification: New message in conversation ${conversation.conversation_id}`);
    }

    // Get online users in a conversation
    getOnlineUsersInConversation(conversationId) {
        const roomName = `conversation_${conversationId}`;
        const room = this.io.sockets.adapter.rooms.get(roomName);
        
        if (!room) return [];

        const onlineUsers = [];
        room.forEach(socketId => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket && socket.userId) {
                onlineUsers.push({
                    userId: socket.userId,
                    userType: socket.userType,
                    userInfo: socket.userInfo
                });
            }
        });

        return onlineUsers;
    }

    // Send message to specific user
    async sendMessageToUser(userId, event, data) {
        const socketId = this.activeUsers.get(userId);
        if (socketId) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit(event, data);
                return true;
            }
        }
        return false;
    }

    // Broadcast message to conversation room (for external API calls)
    async broadcastToConversation(conversationId, event, data) {
        const roomName = `conversation_${conversationId}`;
        this.io.to(roomName).emit(event, data);
        console.log(`📡 Broadcasting ${event} to ${roomName}`);
    }
}

export default MessageWebSocketServer;
