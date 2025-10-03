import cron from 'node-cron';
import { closeExpiredConversations } from '../services/conversationWarrantyService.js';

let webSocketServer = null;

/**
 * Set WebSocket server instance for notifications
 */
export const setWebSocketServer = (wsServer) => {
    webSocketServer = wsServer;
};

/**
 * Notify WebSocket clients about conversation closures
 */
const notifyConversationClosure = (conversation) => {
    try {
        if (webSocketServer) {
            // Notify both customer and provider
            const notificationData = {
                type: 'conversation_closed',
                conversation_id: conversation.conversation_id,
                customer_id: conversation.customer_id,
                provider_id: conversation.provider_id,
                warranty_expires: conversation.warranty_expires,
                message: 'This conversation has been closed due to warranty expiry'
            };

            // Send to customer
            webSocketServer.sendToUser(conversation.customer_id, 'customer', notificationData);
            
            // Send to provider  
            webSocketServer.sendToUser(conversation.provider_id, 'provider', notificationData);

            console.log(`📢 WebSocket notifications sent for closed conversation ${conversation.conversation_id}`);
        }
    } catch (error) {
        console.error('Error sending WebSocket notifications for conversation closure:', error);
    }
};

/**
 * Run the warranty expiry cleanup job
 */
const runWarrantyExpiryCleanup = async () => {
    try {
        console.log('🔄 Running warranty expiry cleanup job...');
        
        const expiredConversations = await closeExpiredConversations();
        
        if (expiredConversations.length > 0) {
            console.log(`✅ Warranty expiry cleanup completed. Closed ${expiredConversations.length} conversations.`);
            
            // Send WebSocket notifications for each closed conversation
            expiredConversations.forEach(conversation => {
                notifyConversationClosure(conversation);
            });
            
            // Log summary
            console.log(`📊 Cleanup Summary:`);
            console.log(`   - Conversations closed: ${expiredConversations.length}`);
            console.log(`   - Conversation IDs: ${expiredConversations.map(c => c.conversation_id).join(', ')}`);
        } else {
            console.log('ℹ️  No expired conversations found during cleanup.');
        }
        
    } catch (error) {
        console.error('❌ Error during warranty expiry cleanup:', error);
    }
};

/**
 * Initialize the warranty expiry cleanup job
 * Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
 */
export const initializeWarrantyExpiryJob = () => {
    // Prevent duplicate initialization
    if (global.__warrantyJobInitialized) {
        console.log('ℹ️  Warranty expiry job already initialized (skipping duplicate)');
        return;
    }
    
    console.log('🕐 Initializing warranty expiry cleanup job...');
    
    // Run every hour at minute 0
    cron.schedule('0 * * * *', runWarrantyExpiryCleanup, {
        scheduled: true,
        timezone: "UTC"
    });
    
    console.log('✅ Warranty expiry cleanup job scheduled (runs every hour at minute 0)');
    
    // Mark as initialized to prevent duplicates
    global.__warrantyJobInitialized = true;
    
    // Optional: Run immediately on startup for testing
    if (process.env.NODE_ENV === 'development') {
        console.log('🧪 Development mode: Running initial warranty cleanup...');
        setTimeout(runWarrantyExpiryCleanup, 5000); // Run after 5 seconds
    }
};

/**
 * Manual trigger for warranty expiry cleanup (for admin endpoints)
 */
export const runManualWarrantyCleanup = async () => {
    console.log('🔧 Manual warranty expiry cleanup triggered...');
    await runWarrantyExpiryCleanup();
};

/**
 * Get job status and schedule information
 */
export const getWarrantyJobStatus = () => {
    return {
        name: 'Warranty Expiry Cleanup',
        schedule: 'Every hour at minute 0 (0 * * * *)',
        timezone: 'UTC',
        description: 'Closes conversations where warranty has expired',
        last_run: 'Check application logs',
        manual_trigger_available: true
    };
};

export default {
    initializeWarrantyExpiryJob,
    runManualWarrantyCleanup,
    getWarrantyJobStatus,
    setWebSocketServer
};