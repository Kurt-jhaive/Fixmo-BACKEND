/**
 * FixMo Backend - Push Notification Integration Examples
 * 
 * This file contains practical examples of how to integrate push notifications
 * into your existing controllers.
 */

import notificationService from '../services/notificationService.js';

// ============================================================================
// EXAMPLE 1: Message Controller Integration
// ============================================================================

/**
 * Add this to your sendMessage function in messageController.js
 */
export async function sendMessageWithNotification(req, res) {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const userId = req.userId;
    const userType = req.userType;
    
    // Save message to database
    const message = await prisma.message.create({
      data: {
        conversation_id: conversationId,
        sender_id: userId,
        sender_type: userType,
        content: content,
        message_type: 'text',
      },
    });
    
    // Get sender info for notification
    let senderName;
    if (userType === 'customer') {
      const customer = await prisma.user.findUnique({
        where: { user_id: userId },
      });
      senderName = `${customer.first_name} ${customer.last_name}`;
    } else {
      const provider = await prisma.serviceProviderDetails.findUnique({
        where: { provider_id: userId },
      });
      senderName = `${provider.provider_first_name} ${provider.provider_last_name}`;
    }
    
    // Send push notification to recipient
    const messagePreview = content.substring(0, 100);
    await notificationService.sendNewMessageNotification(
      conversationId,
      senderName,
      messagePreview
    );
    
    return res.status(200).json({
      success: true,
      message: message,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

// ============================================================================
// EXAMPLE 2: Appointment Controller Integration
// ============================================================================

/**
 * Add this to your confirmBooking function in appointmentController.js
 */
export async function confirmBookingWithNotification(req, res) {
  try {
    const { appointmentId } = req.params;
    
    // Update appointment status
    const appointment = await prisma.appointment.update({
      where: { appointment_id: parseInt(appointmentId) },
      data: { appointment_status: 'confirmed' },
    });
    
    // Send notification to customer
    await notificationService.sendBookingUpdateNotification(
      parseInt(appointmentId),
      'confirmed',
      'customer'
    );
    
    // Send notification to provider
    await notificationService.sendBookingUpdateNotification(
      parseInt(appointmentId),
      'confirmed',
      'provider'
    );
    
    return res.status(200).json({
      success: true,
      appointment: appointment,
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    return res.status(500).json({ error: 'Failed to confirm booking' });
  }
}

/**
 * Add this to your completeAppointment function
 */
export async function completeAppointmentWithNotification(req, res) {
  try {
    const { appointmentId } = req.params;
    
    // Update appointment status
    const appointment = await prisma.appointment.update({
      where: { appointment_id: parseInt(appointmentId) },
      data: { 
        appointment_status: 'completed',
        completed_at: new Date(),
      },
    });
    
    // Notify customer
    await notificationService.sendBookingUpdateNotification(
      parseInt(appointmentId),
      'completed',
      'customer'
    );
    
    // Send rating reminder after 5 seconds (or schedule for later)
    setTimeout(async () => {
      await notificationService.sendRatingReminderNotification(
        parseInt(appointmentId)
      );
    }, 5000);
    
    return res.status(200).json({
      success: true,
      appointment: appointment,
    });
  } catch (error) {
    console.error('Error completing appointment:', error);
    return res.status(500).json({ error: 'Failed to complete appointment' });
  }
}

/**
 * Add this to your cancelAppointment function
 */
export async function cancelAppointmentWithNotification(req, res) {
  try {
    const { appointmentId } = req.params;
    const { cancellation_reason } = req.body;
    const userType = req.userType;
    
    // Update appointment status
    const appointment = await prisma.appointment.update({
      where: { appointment_id: parseInt(appointmentId) },
      data: { 
        appointment_status: 'cancelled',
        cancellation_reason: cancellation_reason,
      },
    });
    
    // Notify the other party
    const recipientType = userType === 'customer' ? 'provider' : 'customer';
    await notificationService.sendBookingUpdateNotification(
      parseInt(appointmentId),
      'cancelled',
      recipientType
    );
    
    return res.status(200).json({
      success: true,
      appointment: appointment,
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return res.status(500).json({ error: 'Failed to cancel appointment' });
  }
}

// ============================================================================
// EXAMPLE 3: Verification Controller Integration
// ============================================================================

/**
 * Add this to your approveVerification function in verificationController.js
 */
export async function approveVerificationWithNotification(req, res) {
  try {
    const { userId, userType } = req.body;
    
    // Update verification status
    if (userType === 'customer') {
      await prisma.user.update({
        where: { user_id: userId },
        data: { 
          verification_status: 'approved',
          is_verified: true,
          verification_reviewed_at: new Date(),
        },
      });
    } else {
      await prisma.serviceProviderDetails.update({
        where: { provider_id: userId },
        data: { 
          verification_status: 'approved',
          provider_isVerified: true,
          verification_reviewed_at: new Date(),
        },
      });
    }
    
    // Send notification
    await notificationService.sendVerificationStatusNotification(
      userId,
      userType,
      'approved'
    );
    
    return res.status(200).json({
      success: true,
      message: 'Verification approved and user notified',
    });
  } catch (error) {
    console.error('Error approving verification:', error);
    return res.status(500).json({ error: 'Failed to approve verification' });
  }
}

/**
 * Add this to your rejectVerification function
 */
export async function rejectVerificationWithNotification(req, res) {
  try {
    const { userId, userType, rejection_reason } = req.body;
    
    // Update verification status
    if (userType === 'customer') {
      await prisma.user.update({
        where: { user_id: userId },
        data: { 
          verification_status: 'rejected',
          rejection_reason: rejection_reason,
          verification_reviewed_at: new Date(),
        },
      });
    } else {
      await prisma.serviceProviderDetails.update({
        where: { provider_id: userId },
        data: { 
          verification_status: 'rejected',
          rejection_reason: rejection_reason,
          verification_reviewed_at: new Date(),
        },
      });
    }
    
    // Send notification
    await notificationService.sendVerificationStatusNotification(
      userId,
      userType,
      'rejected'
    );
    
    return res.status(200).json({
      success: true,
      message: 'Verification rejected and user notified',
    });
  } catch (error) {
    console.error('Error rejecting verification:', error);
    return res.status(500).json({ error: 'Failed to reject verification' });
  }
}

// ============================================================================
// EXAMPLE 4: Backjob Application Integration
// ============================================================================

/**
 * Add this to your backjob application approval/dispute functions
 */
export async function updateBackjobStatusWithNotification(req, res) {
  try {
    const { backjobId } = req.params;
    const { status } = req.body;
    
    // Update backjob status
    const backjob = await prisma.backjobApplication.update({
      where: { backjob_id: parseInt(backjobId) },
      data: { status: status },
    });
    
    // Send notification if status changed
    if (['approved', 'disputed', 'cancelled-by-admin'].includes(status)) {
      await notificationService.sendBackjobStatusNotification(
        parseInt(backjobId),
        status
      );
    }
    
    return res.status(200).json({
      success: true,
      backjob: backjob,
    });
  } catch (error) {
    console.error('Error updating backjob:', error);
    return res.status(500).json({ error: 'Failed to update backjob' });
  }
}

// ============================================================================
// EXAMPLE 5: Warranty Expiry Job Integration
// ============================================================================

/**
 * Add this to your warranty expiry cron job in warrantyExpiryJob.js
 */
export async function checkWarrantyExpiriesWithNotifications() {
  try {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    // Find appointments with warranty expiring in 2 days
    const expiringAppointments = await prisma.appointment.findMany({
      where: {
        appointment_status: 'in-warranty',
        warranty_expires_at: {
          gte: twoDaysFromNow,
          lt: threeDaysFromNow,
        },
      },
    });
    
    // Send reminder notifications
    for (const appointment of expiringAppointments) {
      await notificationService.sendWarrantyReminderNotification(
        appointment.appointment_id,
        2 // days remaining
      );
    }
    
    console.log(`Sent ${expiringAppointments.length} warranty reminder notifications`);
  } catch (error) {
    console.error('Error checking warranty expiries:', error);
  }
}

// ============================================================================
// EXAMPLE 6: Admin Announcement
// ============================================================================

/**
 * Send announcement to all users or specific group
 */
export async function sendAdminAnnouncement(req, res) {
  try {
    const { title, body, targetUserType, data } = req.body;
    
    // Get all users of the specified type
    let recipients = [];
    
    if (targetUserType === 'customer' || targetUserType === 'all') {
      const customers = await prisma.user.findMany({
        where: { is_activated: true },
        select: { user_id: true },
      });
      recipients.push(...customers.map(c => ({ 
        userId: c.user_id, 
        userType: 'customer' 
      })));
    }
    
    if (targetUserType === 'provider' || targetUserType === 'all') {
      const providers = await prisma.serviceProviderDetails.findMany({
        where: { provider_isActivated: true },
        select: { provider_id: true },
      });
      recipients.push(...providers.map(p => ({ 
        userId: p.provider_id, 
        userType: 'provider' 
      })));
    }
    
    // Send batch notifications
    const result = await notificationService.sendPushNotification({
      userId: recipients.map(r => r.userId),
      userType: recipients[0]?.userType || 'customer',
      title: title,
      body: body,
      data: data || {},
      channelId: 'default',
    });
    
    return res.status(200).json({
      success: true,
      message: `Announcement sent to ${recipients.length} users`,
      result: result,
    });
  } catch (error) {
    console.error('Error sending announcement:', error);
    return res.status(500).json({ error: 'Failed to send announcement' });
  }
}

// ============================================================================
// EXAMPLE 7: Custom Notification Helper
// ============================================================================

/**
 * Generic helper function to send custom notifications
 */
export async function sendCustomNotification({
  userId,
  userType,
  title,
  body,
  notificationType,
  additionalData = {},
}) {
  try {
    const result = await notificationService.sendPushNotification({
      userId: userId,
      userType: userType,
      title: title,
      body: body,
      data: {
        type: notificationType,
        ...additionalData,
      },
      channelId: getChannelForType(notificationType),
    });
    
    return result;
  } catch (error) {
    console.error('Error sending custom notification:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Helper function to determine notification channel based on type
 */
function getChannelForType(type) {
  const channelMap = {
    'message': 'messages',
    'booking': 'bookings',
    'appointment': 'appointments',
    'rating': 'appointments',
    'warranty': 'appointments',
    'verification': 'default',
    'backjob': 'appointments',
    'promotion': 'default',
    'system': 'default',
  };
  
  return channelMap[type] || 'default';
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Import and use in your controller
 */

/*
import notificationService from '../services/notificationService.js';

// In your controller function:
await notificationService.sendBookingUpdateNotification(
  appointmentId,
  'confirmed',
  'customer'
);
*/

/**
 * Example: Error handling with notifications
 */
export async function safelySendNotification(notificationFn, ...args) {
  try {
    const result = await notificationFn(...args);
    if (!result.success) {
      console.error('Notification failed:', result.message);
    }
    return result;
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't throw - notification failures shouldn't break the main flow
    return { success: false, message: error.message };
  }
}

/**
 * Example: Batch notification with progress tracking
 */
export async function sendBatchNotificationsWithProgress(recipients, title, body) {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    errors: [],
  };
  
  for (const recipient of recipients) {
    try {
      const result = await notificationService.sendPushNotification({
        userId: recipient.userId,
        userType: recipient.userType,
        title: title,
        body: body,
        data: recipient.data || {},
      });
      
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({
          userId: recipient.userId,
          error: result.message,
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        userId: recipient.userId,
        error: error.message,
      });
    }
  }
  
  return results;
}

export default {
  sendMessageWithNotification,
  confirmBookingWithNotification,
  completeAppointmentWithNotification,
  cancelAppointmentWithNotification,
  approveVerificationWithNotification,
  rejectVerificationWithNotification,
  updateBackjobStatusWithNotification,
  checkWarrantyExpiriesWithNotifications,
  sendAdminAnnouncement,
  sendCustomNotification,
  safelySendNotification,
  sendBatchNotificationsWithProgress,
};
