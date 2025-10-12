import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import notificationService from '../services/notificationService.js';

const prisma = new PrismaClient();

class NotificationController {
  /**
   * Register or update push token for a user
   * POST /api/notifications/register-token
   */
  async registerPushToken(req, res) {
    try {
      const { expoPushToken, deviceInfo } = req.body;
      const userId = req.userId;
      const userType = req.userType || req.body.userType;

      // Validate required fields
      if (!expoPushToken) {
        return res.status(400).json({
          success: false,
          error: 'Expo push token is required',
        });
      }

      if (!userId || !userType) {
        return res.status(400).json({
          success: false,
          error: 'User ID and user type are required',
        });
      }

      if (!['customer', 'provider'].includes(userType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user type. Must be either "customer" or "provider"',
        });
      }

      // Check if token already exists
      const existingToken = await prisma.pushToken.findUnique({
        where: { expo_push_token: expoPushToken },
      });

      let pushToken;

      if (existingToken) {
        // Update existing token
        pushToken = await prisma.pushToken.update({
          where: { expo_push_token: expoPushToken },
          data: {
            user_id: userId,
            user_type: userType,
            device_platform: deviceInfo?.platform || existingToken.device_platform,
            device_name: deviceInfo?.deviceName || existingToken.device_name,
            device_os_version: deviceInfo?.osVersion || existingToken.device_os_version,
            is_active: true,
            last_used_at: new Date(),
            updated_at: new Date(),
          },
        });
      } else {
        // Create new token
        pushToken = await prisma.pushToken.create({
          data: {
            user_id: userId,
            user_type: userType,
            expo_push_token: expoPushToken,
            device_platform: deviceInfo?.platform,
            device_name: deviceInfo?.deviceName,
            device_os_version: deviceInfo?.osVersion,
            is_active: true,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Push token registered successfully',
        data: {
          id: pushToken.id,
          expo_push_token: pushToken.expo_push_token,
          user_id: pushToken.user_id,
          user_type: pushToken.user_type,
        },
      });
    } catch (error) {
      console.error('Error registering push token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to register push token',
        details: error.message,
      });
    }
  }

  /**
   * Remove/deactivate a push token
   * DELETE /api/notifications/remove-token
   */
  async removePushToken(req, res) {
    try {
      const { expoPushToken } = req.body;
      const userId = req.userId;

      if (!expoPushToken) {
        return res.status(400).json({
          success: false,
          error: 'Expo push token is required',
        });
      }

      // Deactivate the token instead of deleting it
      const result = await prisma.pushToken.updateMany({
        where: {
          expo_push_token: expoPushToken,
          user_id: userId,
        },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });

      if (result.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'Push token not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Push token removed successfully',
      });
    } catch (error) {
      console.error('Error removing push token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to remove push token',
        details: error.message,
      });
    }
  }

  /**
   * Get all active tokens for current user
   * GET /api/notifications/my-tokens
   */
  async getMyTokens(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType || req.query.userType;

      if (!userType) {
        return res.status(400).json({
          success: false,
          error: 'User type is required',
        });
      }

      const tokens = await prisma.pushToken.findMany({
        where: {
          user_id: userId,
          user_type: userType,
          is_active: true,
        },
        select: {
          id: true,
          expo_push_token: true,
          device_platform: true,
          device_name: true,
          device_os_version: true,
          created_at: true,
          last_used_at: true,
        },
      });

      return res.status(200).json({
        success: true,
        data: tokens,
        count: tokens.length,
      });
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tokens',
        details: error.message,
      });
    }
  }

  /**
   * Send a test notification
   * POST /api/notifications/test
   */
  async sendTestNotification(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType || req.body.userType;
      const { title = 'Test Notification', body = 'This is a test notification from FixMo' } = req.body;

      if (!userType) {
        return res.status(400).json({
          success: false,
          error: 'User type is required',
        });
      }

      const result = await notificationService.sendPushNotification({
        userId: userId,
        userType: userType,
        title: title,
        body: body,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error sending test notification:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send test notification',
        details: error.message,
      });
    }
  }

  /**
   * Send custom notification (admin or internal use)
   * POST /api/notifications/send
   */
  async sendNotification(req, res) {
    try {
      const {
        userId,
        userType,
        title,
        body,
        data,
        badge,
        sound,
        channelId,
      } = req.body;

      // Validate required fields
      if (!userId || !userType || !title || !body) {
        return res.status(400).json({
          success: false,
          error: 'userId, userType, title, and body are required',
        });
      }

      if (!['customer', 'provider'].includes(userType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user type. Must be either "customer" or "provider"',
        });
      }

      const result = await notificationService.sendPushNotification({
        userId,
        userType,
        title,
        body,
        data: data || {},
        badge: badge || 1,
        sound: sound || 'default',
        channelId: channelId || 'default',
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error sending notification:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        details: error.message,
      });
    }
  }

  /**
   * Get notification statistics for user
   * GET /api/notifications/stats
   */
  async getNotificationStats(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType || req.query.userType;

      if (!userType) {
        return res.status(400).json({
          success: false,
          error: 'User type is required',
        });
      }

      const tokens = await prisma.pushToken.findMany({
        where: {
          user_id: userId,
          user_type: userType,
        },
      });

      const activeTokens = tokens.filter(t => t.is_active);
      const inactiveTokens = tokens.filter(t => !t.is_active);

      return res.status(200).json({
        success: true,
        data: {
          totalTokens: tokens.length,
          activeTokens: activeTokens.length,
          inactiveTokens: inactiveTokens.length,
          devices: activeTokens.map(t => ({
            platform: t.device_platform,
            name: t.device_name,
            lastUsed: t.last_used_at,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch notification statistics',
        details: error.message,
      });
    }
  }

  /**
   * Batch send notifications to multiple users
   * POST /api/notifications/batch-send
   * (For admin or system use)
   */
  async batchSendNotifications(req, res) {
    try {
      const { recipients, title, body, data, channelId } = req.body;

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Recipients array is required',
        });
      }

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          error: 'Title and body are required',
        });
      }

      const results = [];

      for (const recipient of recipients) {
        const { userId, userType } = recipient;

        if (!userId || !userType) {
          results.push({
            userId,
            success: false,
            error: 'Missing userId or userType',
          });
          continue;
        }

        const result = await notificationService.sendPushNotification({
          userId,
          userType,
          title,
          body,
          data: data || {},
          channelId: channelId || 'default',
        });

        results.push({
          userId,
          userType,
          ...result,
        });
      }

      const successCount = results.filter(r => r.success).length;

      return res.status(200).json({
        success: true,
        message: `Sent ${successCount} out of ${recipients.length} notifications`,
        results,
      });
    } catch (error) {
      console.error('Error batch sending notifications:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to batch send notifications',
        details: error.message,
      });
    }
  }
}

export default new NotificationController();
