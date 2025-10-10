import { Expo } from 'expo-server-sdk';
import prisma from '../prismaclient.js';

// Create a new Expo SDK client
const expo = new Expo();

// Debug logging helper
const DEBUG = process.env.NODE_ENV !== 'production';

function debugLog(action, details) {
  console.log(`\n🔔 ===== NOTIFICATION TRIGGER =====`);
  console.log(`Action: ${action}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Details:`, JSON.stringify(details, null, 2));
  console.log(`=====================================\n`);
}

/**
 * Get push tokens for a specific user
 * @param {number} userId - User ID
 * @param {string} userType - 'customer' or 'provider'
 * @returns {Promise<Array>} Array of active push tokens
 */
export async function getUserPushTokens(userId, userType) {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: {
        user_id: userId,
        user_type: userType,
        is_active: true,
      },
    });
    
    return tokens.map(t => t.expo_push_token);
  } catch (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }
}

/**
 * Send push notification to specific user(s)
 * @param {Object} options - Notification options
 * @param {number|Array} options.userId - User ID or array of user IDs
 * @param {string} options.userType - 'customer' or 'provider'
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Additional data for deep linking
 * @param {number} options.badge - Badge count (optional)
 * @param {string} options.sound - Sound to play (default: 'default')
 * @param {string} options.channelId - Android notification channel (optional)
 * @returns {Promise<Object>} Result with success status and details
 */
export async function sendPushNotification({
  userId,
  userType,
  title,
  body,
  data = {},
  badge = 1,
  sound = 'default',
  channelId = 'default',
}) {
  try {
    // Debug log notification attempt
    debugLog('NOTIFICATION_SEND_ATTEMPT', {
      userId: Array.isArray(userId) ? userId : [userId],
      userType,
      title,
      body,
      data,
    });

    // Handle single user or multiple users
    const userIds = Array.isArray(userId) ? userId : [userId];
    
    // Collect all push tokens for the users
    const allTokens = [];
    for (const id of userIds) {
      const tokens = await getUserPushTokens(id, userType);
      allTokens.push(...tokens);
      
      if (tokens.length > 0) {
        console.log(`✅ Found ${tokens.length} token(s) for ${userType} ID ${id}`);
      } else {
        console.log(`⚠️ No tokens found for ${userType} ID ${id}`);
      }
    }
    
    if (allTokens.length === 0) {
      console.log('❌ No active push tokens found for user(s)');
      return {
        success: false,
        message: 'No active push tokens found',
        sent: 0,
      };
    }
    
    // Create messages for all valid tokens
    const messages = [];
    for (const pushToken of allTokens) {
      // Check if token is valid
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }
      
      messages.push({
        to: pushToken,
        sound: sound,
        title: title,
        body: body,
        data: data,
        badge: badge,
        channelId: channelId,
        priority: 'high',
      });
    }
    
    if (messages.length === 0) {
      return {
        success: false,
        message: 'No valid push tokens found',
        sent: 0,
      };
    }
    
    // Send notifications in chunks (Expo recommends batches of 100)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }
    
    // Update last_used_at for tokens
    await prisma.pushToken.updateMany({
      where: {
        expo_push_token: { in: allTokens },
      },
      data: {
        last_used_at: new Date(),
      },
    });
    
    // Debug log successful send
    console.log(`✅ Successfully sent ${tickets.length} notification(s)`);
    debugLog('NOTIFICATION_SENT_SUCCESS', {
      userId: userIds,
      userType,
      title,
      sentCount: tickets.length,
      ticketIds: tickets.map(t => t.id),
    });
    
    return {
      success: true,
      message: 'Notifications sent successfully',
      sent: tickets.length,
      tickets: tickets,
    };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    debugLog('NOTIFICATION_SEND_ERROR', {
      userId,
      userType,
      title,
      error: error.message,
    });
    return {
      success: false,
      message: error.message,
      sent: 0,
    };
  }
}

/**
 * Send notification for new message
 * @param {number} conversationId - Conversation ID
 * @param {number} senderId - ID of the user sending the message
 * @param {string} senderType - Type of sender ('customer' or 'provider')
 * @param {string} senderName - Display name of sender
 * @param {string} messagePreview - Preview of the message content
 */
export async function sendNewMessageNotification(conversationId, senderId, senderType, senderName, messagePreview) {
  try {
    debugLog('MESSAGE_NOTIFICATION_START', {
      conversationId,
      senderId,
      senderType,
      senderName,
      messagePreview: messagePreview.substring(0, 50),
    });

    const conversation = await prisma.conversation.findUnique({
      where: { conversation_id: conversationId },
    });
    
    if (!conversation) {
      console.error('❌ Conversation not found:', conversationId);
      throw new Error('Conversation not found');
    }
    
    // Determine recipient - it's the OTHER person in the conversation
    // If sender is customer, recipient is provider and vice versa
    const recipientId = senderType === 'customer' 
      ? conversation.provider_id 
      : conversation.customer_id;
    const recipientType = senderType === 'customer' ? 'provider' : 'customer';
    
    console.log(`📨 Sending message notification from ${senderType} ${senderId} (${senderName}) to ${recipientType} ${recipientId}`);
    
    return await sendPushNotification({
      userId: recipientId,
      userType: recipientType,
      title: 'New Message',
      body: `${senderName}: ${messagePreview}`,
      data: {
        type: 'message',
        conversationId: conversationId,
        senderName: senderName,
      },
      channelId: 'messages',
    });
  } catch (error) {
    console.error('❌ Error sending message notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification for booking/appointment update
 */
export async function sendBookingUpdateNotification(appointmentId, status, recipientType) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        customer: true,
        serviceProvider: true,
        service: true,
      },
    });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    const isCustomer = recipientType === 'customer';
    const recipientId = isCustomer ? appointment.customer_id : appointment.provider_id;
    
    // Create status-specific messages
    let title = 'Booking Update';
    let body = '';
    
    switch (status) {
      case 'confirmed':
        title = '✅ Booking Confirmed';
        body = isCustomer 
          ? `Your ${appointment.service.service_title} is scheduled for ${new Date(appointment.scheduled_date).toLocaleDateString()}`
          : `New booking: ${appointment.service.service_title} on ${new Date(appointment.scheduled_date).toLocaleDateString()}`;
        break;
      case 'cancelled':
        title = '❌ Booking Cancelled';
        body = isCustomer
          ? `Your booking for ${appointment.service.service_title} has been cancelled`
          : `Customer cancelled their ${appointment.service.service_title} booking`;
        break;
      case 'completed':
        title = '✅ Service Completed';
        body = isCustomer
          ? `Your ${appointment.service.service_title} service is completed. Rate your experience!`
          : `You marked ${appointment.service.service_title} as completed`;
        break;
      case 'rescheduled':
        title = '📅 Booking Rescheduled';
        body = `Your ${appointment.service.service_title} has been rescheduled to ${new Date(appointment.scheduled_date).toLocaleDateString()}`;
        break;
      default:
        body = `Your booking status has been updated to: ${status}`;
    }
    
    return await sendPushNotification({
      userId: recipientId,
      userType: recipientType,
      title: title,
      body: body,
      data: {
        type: 'booking',
        appointmentId: appointmentId,
        status: status,
      },
      channelId: 'bookings',
    });
  } catch (error) {
    console.error('Error sending booking notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification for rating reminder
 */
export async function sendRatingReminderNotification(appointmentId) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        serviceProvider: true,
        service: true,
      },
    });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    return await sendPushNotification({
      userId: appointment.customer_id,
      userType: 'customer',
      title: '⭐ Rate Your Experience',
      body: `How was your service with ${appointment.serviceProvider.provider_first_name} ${appointment.serviceProvider.provider_last_name}?`,
      data: {
        type: 'rating',
        appointmentId: appointmentId,
        providerId: appointment.provider_id,
        providerName: `${appointment.serviceProvider.provider_first_name} ${appointment.serviceProvider.provider_last_name}`,
      },
      channelId: 'appointments',
    });
  } catch (error) {
    console.error('Error sending rating reminder:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification for warranty reminder
 */
export async function sendWarrantyReminderNotification(appointmentId, daysRemaining) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        service: true,
      },
    });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    return await sendPushNotification({
      userId: appointment.customer_id,
      userType: 'customer',
      title: '⏰ Warranty Expiring Soon',
      body: `Your warranty for ${appointment.service.service_title} expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
      data: {
        type: 'warranty',
        appointmentId: appointmentId,
        daysRemaining: daysRemaining,
      },
      channelId: 'appointments',
    });
  } catch (error) {
    console.error('Error sending warranty reminder:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification for backjob application status
 */
export async function sendBackjobStatusNotification(backjobId, status) {
  try {
    const backjob = await prisma.backjobApplication.findUnique({
      where: { backjob_id: backjobId },
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
      },
    });
    
    if (!backjob) {
      throw new Error('Backjob application not found');
    }
    
    let title = 'Backjob Application Update';
    let body = '';
    
    switch (status) {
      case 'approved':
        title = '✅ Backjob Application Approved';
        body = `Your backjob request for ${backjob.appointment.service.service_title} has been approved`;
        break;
      case 'disputed':
        title = '⚠️ Backjob Application Disputed';
        body = `The provider has disputed your backjob request for ${backjob.appointment.service.service_title}`;
        break;
      case 'cancelled-by-admin':
        title = '❌ Backjob Application Cancelled';
        body = `Your backjob request has been cancelled by admin`;
        break;
    }
    
    return await sendPushNotification({
      userId: backjob.customer_id,
      userType: 'customer',
      title: title,
      body: body,
      data: {
        type: 'backjob',
        backjobId: backjobId,
        appointmentId: backjob.appointment_id,
        status: status,
      },
      channelId: 'appointments',
    });
  } catch (error) {
    console.error('Error sending backjob notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification for verification status update
 */
export async function sendVerificationStatusNotification(userId, userType, status, reason = null) {
  try {
    debugLog('VERIFICATION_NOTIFICATION', {
      userId,
      userType,
      status,
      reason,
    });

    let title = 'Verification Update';
    let body = '';
    
    switch (status) {
      case 'approved':
        title = '✅ Verification Approved';
        body = userType === 'customer' 
          ? 'Your account has been verified! You can now book services.'
          : 'Your account has been verified! You can now accept bookings.';
        break;
      case 'rejected':
        title = '❌ Verification Rejected';
        body = reason 
          ? `Verification rejected: ${reason}`
          : 'Your verification was not approved. Please check your profile for more details.';
        break;
    }
    
    return await sendPushNotification({
      userId: userId,
      userType: userType,
      title: title,
      body: body,
      data: {
        type: 'verification',
        status: status,
        reason: reason,
      },
      channelId: 'default',
    });
  } catch (error) {
    console.error('Error sending verification notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification when backjob is assigned to provider
 */
export async function sendBackjobAssignmentNotification(providerId, appointmentId, backjobType) {
  try {
    debugLog('BACKJOB_ASSIGNMENT', {
      providerId,
      appointmentId,
      backjobType,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        service: true,
        customer: true,
      },
    });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    return await sendPushNotification({
      userId: providerId,
      userType: 'provider',
      title: '🔧 New Backjob Assignment',
      body: `You have been assigned a ${backjobType} backjob for ${appointment.service.service_title}`,
      data: {
        type: 'backjob',
        appointmentId: appointmentId,
        backjobType: backjobType,
        customerName: `${appointment.customer.first_name} ${appointment.customer.last_name}`,
      },
      channelId: 'bookings',
    });
  } catch (error) {
    console.error('Error sending backjob assignment notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification for certificate verification status
 */
export async function sendCertificateVerificationNotification(providerId, certificateType, status, reason = null) {
  try {
    debugLog('CERTIFICATE_VERIFICATION', {
      providerId,
      certificateType,
      status,
      reason,
    });

    let title = 'Certificate Update';
    let body = '';
    
    switch (status) {
      case 'approved':
        title = '✅ Certificate Approved';
        body = `Your ${certificateType} certificate has been verified and approved`;
        break;
      case 'rejected':
        title = '❌ Certificate Needs Update';
        body = reason 
          ? `Your ${certificateType} certificate was rejected: ${reason}`
          : `Your ${certificateType} certificate needs to be updated`;
        break;
    }
    
    return await sendPushNotification({
      userId: providerId,
      userType: 'provider',
      title: title,
      body: body,
      data: {
        type: 'certificate',
        certificateType: certificateType,
        status: status,
        reason: reason,
      },
      channelId: 'default',
    });
  } catch (error) {
    console.error('Error sending certificate notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send notification when appointment is completed (to provider)
 */
export async function sendServiceCompletedNotification(providerId, appointmentId) {
  try {
    debugLog('SERVICE_COMPLETED_PROVIDER', {
      providerId,
      appointmentId,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        service: true,
        customer: true,
      },
    });
    
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    
    return await sendPushNotification({
      userId: providerId,
      userType: 'provider',
      title: '🎉 Service Completed',
      body: `You've completed ${appointment.service.service_title} for ${appointment.customer.first_name} ${appointment.customer.last_name}`,
      data: {
        type: 'completion',
        appointmentId: appointmentId,
      },
      channelId: 'bookings',
    });
  } catch (error) {
    console.error('Error sending completion notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Handle receipt information from Expo to check delivery status
 */
export async function handlePushReceipts(tickets) {
  try {
    const receiptIds = tickets
      .filter(ticket => ticket.status === 'ok')
      .map(ticket => ticket.id);
    
    if (receiptIds.length === 0) {
      return;
    }
    
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    
    for (const chunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        
        // Check each receipt for errors
        for (const receiptId in receipts) {
          const receipt = receipts[receiptId];
          
          if (receipt.status === 'error') {
            console.error(`Error with receipt ${receiptId}:`, receipt.message);
            
            // If token is invalid, deactivate it
            if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
              // The token is no longer valid, deactivate it
              console.log('Deactivating invalid token');
              // You would need the token here to deactivate it
              // This is typically handled in a separate job that processes receipts
            }
          }
        }
      } catch (error) {
        console.error('Error fetching receipts:', error);
      }
    }
  } catch (error) {
    console.error('Error handling push receipts:', error);
  }
}

export default {
  getUserPushTokens,
  sendPushNotification,
  sendNewMessageNotification,
  sendBookingUpdateNotification,
  sendRatingReminderNotification,
  sendWarrantyReminderNotification,
  sendBackjobStatusNotification,
  sendVerificationStatusNotification,
  sendBackjobAssignmentNotification,
  sendCertificateVerificationNotification,
  sendServiceCompletedNotification,
  handlePushReceipts,
};
