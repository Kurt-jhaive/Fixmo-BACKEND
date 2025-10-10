import express from 'express';
import notificationController from '../controller/notificationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/notifications/register-token
 * @desc    Register or update push notification token for a user
 * @access  Private (requires authentication)
 * @body    { expoPushToken: string, userType: string, deviceInfo?: { platform, deviceName, osVersion } }
 */
router.post('/register-token', notificationController.registerPushToken);

/**
 * @route   DELETE /api/notifications/remove-token
 * @desc    Remove/deactivate a push notification token
 * @access  Private
 * @body    { expoPushToken: string }
 */
router.delete('/remove-token', notificationController.removePushToken);

/**
 * @route   GET /api/notifications/my-tokens
 * @desc    Get all active push tokens for current user
 * @access  Private
 * @query   userType: string ('customer' or 'provider')
 */
router.get('/my-tokens', notificationController.getMyTokens);

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification to current user
 * @access  Private
 * @body    { userType: string, title?: string, body?: string }
 */
router.post('/test', notificationController.sendTestNotification);

/**
 * @route   POST /api/notifications/send
 * @desc    Send custom notification (for internal/admin use)
 * @access  Private
 * @body    { userId: number, userType: string, title: string, body: string, data?: object, badge?: number, sound?: string, channelId?: string }
 */
router.post('/send', notificationController.sendNotification);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics for current user
 * @access  Private
 * @query   userType: string ('customer' or 'provider')
 */
router.get('/stats', notificationController.getNotificationStats);

/**
 * @route   POST /api/notifications/batch-send
 * @desc    Batch send notifications to multiple users (admin/system use)
 * @access  Private
 * @body    { recipients: Array<{userId, userType}>, title: string, body: string, data?: object, channelId?: string }
 */
router.post('/batch-send', notificationController.batchSendNotifications);

export default router;
