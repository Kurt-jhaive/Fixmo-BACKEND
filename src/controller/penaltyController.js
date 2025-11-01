import PenaltyService from '../services/penaltyService.js';
import prisma from '../prismaclient.js';
import { manualPenaltyReset } from '../services/penaltyResetJob.js';

/**
 * Penalty Controller
 * Handles HTTP requests for penalty management
 */

class PenaltyController {
  /**
   * Get penalty information for current user/provider
   */
  static async getMyPenaltyInfo(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType; // 'customer' or 'service_provider'

      let penaltyInfo;
      if (userType === 'customer') {
        const user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: {
            penalty_points: true,
            is_suspended: true,
            suspended_at: true,
            suspended_until: true,
          },
        });

        const stats = await PenaltyService.getPenaltyStats(userId, null);
        penaltyInfo = { ...user, stats };
      } else if (userType === 'service_provider') {
        const provider = await prisma.serviceProviderDetails.findUnique({
          where: { provider_id: userId },
          select: {
            penalty_points: true,
            is_suspended: true,
            suspended_at: true,
            suspended_until: true,
          },
        });

        const stats = await PenaltyService.getPenaltyStats(null, userId);
        penaltyInfo = { ...provider, stats };
      }

      res.status(200).json({
        success: true,
        data: penaltyInfo,
      });
    } catch (error) {
      console.error('Error fetching penalty info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch penalty information',
        error: error.message,
      });
    }
  }

  /**
   * Get penalty history for current user/provider
   */
  static async getMyViolations(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType;
      const { status, limit = 50, offset = 0 } = req.query;

      const history = await PenaltyService.getPenaltyHistory({
        userId: userType === 'customer' ? userId : null,
        providerId: userType === 'service_provider' ? userId : null,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching violation history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch violation history',
        error: error.message,
      });
    }
  }

  /**
   * Appeal a violation
   */
  static async appealViolation(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType;
      const { violationId } = req.params;
      const { appealReason } = req.body;

      if (!appealReason || appealReason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Appeal reason must be at least 10 characters long',
        });
      }

      const result = await PenaltyService.appealViolation(
        parseInt(violationId),
        appealReason,
        userType === 'customer' ? userId : null,
        userType === 'service_provider' ? userId : null
      );

      res.status(200).json({
        success: true,
        message: 'Appeal submitted successfully. An admin will review it shortly.',
        data: result,
      });
    } catch (error) {
      console.error('Error submitting appeal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to submit appeal',
      });
    }
  }

  /**
   * Get all violation types
   */
  static async getViolationTypes(req, res) {
    try {
      const { category } = req.query;

      const where = { is_active: true };
      if (category) where.violation_category = category;

      const violationTypes = await prisma.violationType.findMany({
        where,
        orderBy: { penalty_points: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: violationTypes,
      });
    } catch (error) {
      console.error('Error fetching violation types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch violation types',
        error: error.message,
      });
    }
  }

  /**
   * Get reward statistics for current user/provider
   */
  static async getMyRewardStats(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType;

      const rewardStats = await PenaltyService.getRewardStats(
        userType === 'customer' ? userId : null,
        userType === 'service_provider' ? userId : null
      );

      res.status(200).json({
        success: true,
        data: rewardStats,
      });
    } catch (error) {
      console.error('Error fetching reward stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reward statistics',
        error: error.message,
      });
    }
  }

  /**
   * Get penalty adjustments (restorations/bonuses) for current user/provider
   */
  static async getMyAdjustments(req, res) {
    try {
      const userId = req.userId;
      const userType = req.userType;
      const { type, limit = 50, offset = 0 } = req.query;

      // Build where clause
      const where = {};
      
      if (userType === 'customer') {
        where.user_id = userId;
      } else if (userType === 'service_provider') {
        where.provider_id = userId;
      }

      // Filter by adjustment type if specified
      if (type) {
        where.adjustment_type = type;
      } else {
        // By default, only show positive adjustments (restore, bonus, reset)
        where.adjustment_type = {
          in: ['restore', 'bonus', 'reset']
        };
      }

      const adjustments = await prisma.penaltyAdjustment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          adjustment_id: true,
          adjustment_type: true,
          points_adjusted: true,
          previous_points: true,
          new_points: true,
          reason: true,
          created_at: true,
          adjusted_by_admin_id: true,
          related_violation_id: true,
        },
      });

      // Get total count
      const total = await prisma.penaltyAdjustment.count({ where });

      res.status(200).json({
        success: true,
        data: {
          adjustments,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + adjustments.length < total,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching penalty adjustments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch penalty adjustments',
        error: error.message,
      });
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Admin: Record a manual violation
   */
  static async adminRecordViolation(req, res) {
    try {
      const { admin_id } = req.admin;
      const {
        userId,
        providerId,
        violationCode,
        appointmentId,
        reportId,
        ratingId,
        violationDetails,
        evidenceUrls,
      } = req.body;

      if (!userId && !providerId) {
        return res.status(400).json({
          success: false,
          message: 'Either userId or providerId must be provided',
        });
      }

      if (!violationCode) {
        return res.status(400).json({
          success: false,
          message: 'Violation code is required',
        });
      }

      const violation = await PenaltyService.recordViolation({
        userId,
        providerId,
        violationCode,
        appointmentId,
        reportId,
        ratingId,
        violationDetails,
        evidenceUrls,
        detectedBy: 'admin',
        detectedByAdminId: admin_id,
      });

      res.status(201).json({
        success: true,
        message: 'Violation recorded successfully',
        data: violation,
      });
    } catch (error) {
      console.error('Error recording violation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to record violation',
      });
    }
  }

  /**
   * Admin: Get all violations with filters
   */
  static async adminGetViolations(req, res) {
    try {
      const { userId, providerId, status, limit = 100, offset = 0 } = req.query;

      const history = await PenaltyService.getPenaltyHistory({
        userId: userId ? parseInt(userId) : undefined,
        providerId: providerId ? parseInt(providerId) : undefined,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching violations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch violations',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Get pending appeals
   */
  static async adminGetPendingAppeals(req, res) {
    try {
      const pendingAppeals = await prisma.penaltyViolation.findMany({
        where: {
          appeal_status: 'pending',
        },
        include: {
          violation_type: true,
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          provider: {
            select: {
              provider_id: true,
              provider_first_name: true,
              provider_last_name: true,
              provider_email: true,
            },
          },
        },
        orderBy: { created_at: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: pendingAppeals,
      });
    } catch (error) {
      console.error('Error fetching pending appeals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending appeals',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Review an appeal
   */
  static async adminReviewAppeal(req, res) {
    try {
      const { admin_id } = req.admin;
      const { violationId } = req.params;
      const { approved, reviewNotes } = req.body;

      if (typeof approved !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Approved status (true/false) is required',
        });
      }

      if (!reviewNotes || reviewNotes.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Review notes must be at least 10 characters long',
        });
      }

      const result = await PenaltyService.reviewAppeal(
        parseInt(violationId),
        approved,
        admin_id,
        reviewNotes
      );

      res.status(200).json({
        success: true,
        message: `Appeal ${approved ? 'approved' : 'rejected'} successfully`,
        data: result,
      });
    } catch (error) {
      console.error('Error reviewing appeal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to review appeal',
      });
    }
  }

  /**
   * Admin: Manually adjust penalty points
   */
  static async adminAdjustPoints(req, res) {
    try {
      const { admin_id } = req.admin;
      const { userId, providerId, points, adjustmentType, reason } = req.body;

      if (!userId && !providerId) {
        return res.status(400).json({
          success: false,
          message: 'Either userId or providerId must be provided',
        });
      }

      if (!points || points <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Points must be a positive number',
        });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Reason must be at least 10 characters long',
        });
      }

      let result;
      if (adjustmentType === 'add' || adjustmentType === 'restore') {
        result = await PenaltyService.restorePoints({
          userId,
          providerId,
          points,
          reason,
          adminId: admin_id,
        });
      } else {
        // Deduct points
        result = await PenaltyService.deductPoints({
          userId,
          providerId,
          points,
        });

        // Log the manual adjustment
        await prisma.penaltyAdjustment.create({
          data: {
            user_id: userId,
            provider_id: providerId,
            adjustment_type: 'penalty',
            points_adjusted: -points,
            previous_points: result.previousPoints,
            new_points: result.newPoints,
            reason,
            adjusted_by_admin_id: admin_id,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Points adjusted successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error adjusting points:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to adjust points',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Get penalty statistics for a user or provider
   */
  static async adminGetPenaltyStats(req, res) {
    try {
      const { userId, providerId } = req.query;

      if (!userId && !providerId) {
        return res.status(400).json({
          success: false,
          message: 'Either userId or providerId must be provided',
        });
      }

      const stats = await PenaltyService.getPenaltyStats(
        userId ? parseInt(userId) : null,
        providerId ? parseInt(providerId) : null
      );

      // Get adjustment history
      const adjustments = await prisma.penaltyAdjustment.findMany({
        where: {
          ...(userId && { user_id: parseInt(userId) }),
          ...(providerId && { provider_id: parseInt(providerId) }),
        },
        orderBy: { created_at: 'desc' },
        take: 20,
      });

      res.status(200).json({
        success: true,
        data: {
          stats,
          recentAdjustments: adjustments,
        },
      });
    } catch (error) {
      console.error('Error fetching penalty stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch penalty statistics',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Initialize/Update violation types
   */
  static async adminInitializeViolationTypes(req, res) {
    try {
      await PenaltyService.initializeViolationTypes();

      res.status(200).json({
        success: true,
        message: 'Violation types initialized successfully',
      });
    } catch (error) {
      console.error('Error initializing violation types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize violation types',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Get dashboard statistics
   */
  static async adminGetDashboardStats(req, res) {
    try {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total violations
      const totalViolations = await prisma.penaltyViolation.count();
      const weeklyViolations = await prisma.penaltyViolation.count({
        where: { created_at: { gte: lastWeek } },
      });

      // Suspended accounts
      const suspendedUsers = await prisma.user.count({
        where: { is_suspended: true },
      });
      const suspendedProviders = await prisma.serviceProviderDetails.count({
        where: { is_suspended: true },
      });

      // Restricted accounts (below 60 points)
      const restrictedUsers = await prisma.user.count({
        where: { penalty_points: { lt: 60 }, is_suspended: false },
      });
      const restrictedProviders = await prisma.serviceProviderDetails.count({
        where: { penalty_points: { lt: 60 }, is_suspended: false },
      });

      // Pending appeals
      const pendingAppeals = await prisma.penaltyViolation.count({
        where: { appeal_status: 'pending' },
      });

      // Most common violations
      const commonViolations = await prisma.penaltyViolation.groupBy({
        by: ['violation_type_id'],
        _count: true,
        orderBy: {
          _count: {
            violation_type_id: 'desc',
          },
        },
        take: 5,
      });

      // Get violation type details
      const violationTypeIds = commonViolations.map((v) => v.violation_type_id);
      const violationTypes = await prisma.violationType.findMany({
        where: { violation_type_id: { in: violationTypeIds } },
      });

      const commonViolationsWithDetails = commonViolations.map((v) => {
        const type = violationTypes.find((t) => t.violation_type_id === v.violation_type_id);
        return {
          ...v,
          violation_type: type,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          totalViolations,
          weeklyViolations,
          suspendedUsers,
          suspendedProviders,
          restrictedUsers,
          restrictedProviders,
          pendingAppeals,
          commonViolations: commonViolationsWithDetails,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Manually suspend or lift suspension
   */
  static async adminManageSuspension(req, res) {
    try {
      const { admin_id } = req.admin;
      const { userId, providerId, action, reason, suspensionDays } = req.body;

      if (!userId && !providerId) {
        return res.status(400).json({
          success: false,
          message: 'Either userId or providerId must be provided',
        });
      }

      if (!['suspend', 'lift'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action must be either "suspend" or "lift"',
        });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Reason must be at least 10 characters long',
        });
      }

      let result;
      
      if (action === 'suspend') {
        const suspendedUntil = suspensionDays 
          ? new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000)
          : null;

        if (userId) {
          result = await prisma.user.update({
            where: { user_id: userId },
            data: {
              is_suspended: true,
              suspended_at: new Date(),
              suspended_until: suspendedUntil,
            },
          });
        } else {
          result = await prisma.serviceProviderDetails.update({
            where: { provider_id: providerId },
            data: {
              is_suspended: true,
              suspended_at: new Date(),
              suspended_until: suspendedUntil,
            },
          });
        }

        // Log the suspension
        await prisma.penaltyAdjustment.create({
          data: {
            user_id: userId,
            provider_id: providerId,
            adjustment_type: 'suspension',
            points_adjusted: 0,
            previous_points: result.penalty_points,
            new_points: result.penalty_points,
            reason,
            adjusted_by_admin_id: admin_id,
          },
        });

        res.status(200).json({
          success: true,
          message: `Account suspended successfully${suspensionDays ? ` for ${suspensionDays} days` : ''}`,
          data: result,
        });
      } else {
        // Lift suspension
        if (userId) {
          result = await prisma.user.update({
            where: { user_id: userId },
            data: {
              is_suspended: false,
              suspended_at: null,
              suspended_until: null,
            },
          });
        } else {
          result = await prisma.serviceProviderDetails.update({
            where: { provider_id: providerId },
            data: {
              is_suspended: false,
              suspended_at: null,
              suspended_until: null,
            },
          });
        }

        // Log the lift
        await prisma.penaltyAdjustment.create({
          data: {
            user_id: userId,
            provider_id: providerId,
            adjustment_type: 'lift_suspension',
            points_adjusted: 0,
            previous_points: result.penalty_points,
            new_points: result.penalty_points,
            reason,
            adjusted_by_admin_id: admin_id,
          },
        });

        res.status(200).json({
          success: true,
          message: 'Suspension lifted successfully',
          data: result,
        });
      }
    } catch (error) {
      console.error('Error managing suspension:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to manage suspension',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Reset penalty points to default (rehabilitation)
   */
  static async adminResetPoints(req, res) {
    try {
      const { admin_id } = req.admin;
      const { userId, providerId, reason, resetValue = 100 } = req.body;

      if (!userId && !providerId) {
        return res.status(400).json({
          success: false,
          message: 'Either userId or providerId must be provided',
        });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Reason must be at least 10 characters long',
        });
      }

      if (resetValue < 0 || resetValue > 100) {
        return res.status(400).json({
          success: false,
          message: 'Reset value must be between 0 and 100',
        });
      }

      let result;
      let previousPoints;

      if (userId) {
        const user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { penalty_points: true },
        });
        previousPoints = user.penalty_points;

        result = await prisma.user.update({
          where: { user_id: userId },
          data: {
            penalty_points: resetValue,
            is_suspended: false,
            suspended_at: null,
            suspended_until: null,
          },
        });
      } else {
        const provider = await prisma.serviceProviderDetails.findUnique({
          where: { provider_id: providerId },
          select: { penalty_points: true },
        });
        previousPoints = provider.penalty_points;

        result = await prisma.serviceProviderDetails.update({
          where: { provider_id: providerId },
          data: {
            penalty_points: resetValue,
            is_suspended: false,
            suspended_at: null,
            suspended_until: null,
          },
        });
      }

      // Log the reset
      await prisma.penaltyAdjustment.create({
        data: {
          user_id: userId,
          provider_id: providerId,
          adjustment_type: 'reset',
          points_adjusted: resetValue - previousPoints,
          previous_points: previousPoints,
          new_points: resetValue,
          reason,
          adjusted_by_admin_id: admin_id,
        },
      });

      res.status(200).json({
        success: true,
        message: `Points reset to ${resetValue} successfully`,
        data: {
          previousPoints,
          newPoints: resetValue,
          suspensionLifted: true,
        },
      });
    } catch (error) {
      console.error('Error resetting points:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset points',
        error: error.message,
      });
    }
  }

  /**
   * Admin: View all penalty adjustment logs
   */
  static async adminGetAdjustmentLogs(req, res) {
    try {
      const { userId, providerId, adjustmentType, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (userId) where.user_id = parseInt(userId);
      if (providerId) where.provider_id = parseInt(providerId);
      if (adjustmentType) where.adjustment_type = adjustmentType;

      const logs = await prisma.penaltyAdjustment.findMany({
        where,
        include: {
          adjusted_by_admin: {
            select: {
              admin_id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          provider: {
            select: {
              provider_id: true,
              provider_first_name: true,
              provider_last_name: true,
              provider_email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      const total = await prisma.penaltyAdjustment.count({ where });

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: total > parseInt(offset) + parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching adjustment logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch adjustment logs',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Get restricted accounts (below 60 points)
   */
  static async adminGetRestrictedAccounts(req, res) {
    try {
      const { type = 'both', limit = 50, offset = 0 } = req.query;

      const data = {};

      if (type === 'user' || type === 'both') {
        data.restrictedUsers = await prisma.user.findMany({
          where: {
            penalty_points: { lt: 60 },
            is_suspended: false,
          },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            penalty_points: true,
            suspended_at: true,
            suspended_until: true,
          },
          orderBy: { penalty_points: 'asc' },
          take: type === 'both' ? parseInt(limit) / 2 : parseInt(limit),
          skip: parseInt(offset),
        });
      }

      if (type === 'provider' || type === 'both') {
        data.restrictedProviders = await prisma.serviceProviderDetails.findMany({
          where: {
            penalty_points: { lt: 60 },
            is_suspended: false,
          },
          select: {
            provider_id: true,
            provider_first_name: true,
            provider_last_name: true,
            provider_email: true,
            penalty_points: true,
            suspended_at: true,
            suspended_until: true,
          },
          orderBy: { penalty_points: 'asc' },
          take: type === 'both' ? parseInt(limit) / 2 : parseInt(limit),
          skip: parseInt(offset),
        });
      }

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Error fetching restricted accounts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch restricted accounts',
        error: error.message,
      });
    }
  }

  /**
   * Admin: Manually trigger 3-month penalty reset (for testing)
   */
  static async adminManualPenaltyReset(req, res) {
    try {
      await manualPenaltyReset();
      
      res.status(200).json({
        success: true,
        message: 'Penalty reset triggered successfully. All accounts reset to 100 points.',
      });
    } catch (error) {
      console.error('Error triggering manual penalty reset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger penalty reset',
        error: error.message,
      });
    }
  }
}

export default PenaltyController;
