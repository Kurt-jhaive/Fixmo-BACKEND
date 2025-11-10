import PenaltyService from '../services/penaltyService.js';
import prisma from '../prismaclient.js';
import { manualPenaltyReset } from '../services/penaltyResetJob.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

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
      const providerId = req.providerId;
      const userType = req.userType; // 'customer' or 'service_provider'

      console.log('🔍 getMyPenaltyInfo - Request details:', {
        userId,
        providerId,
        userType
      });

      let penaltyInfo;
      if (userType === 'customer') {
        const user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: {
            user_id: true,
            penalty_points: true,
            is_suspended: true,
            suspended_at: true,
            suspended_until: true,
          },
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const stats = await PenaltyService.getPenaltyStats(userId, null);
        penaltyInfo = { ...user, stats };
        
        console.log('✅ Customer penalty info retrieved:', {
          userId: user.user_id,
          penalty_points: user.penalty_points
        });
      } else if (userType === 'service_provider' || userType === 'provider') {
        // Use providerId if available, otherwise fall back to userId
        const actualProviderId = providerId || userId;
        
        const provider = await prisma.serviceProviderDetails.findUnique({
          where: { provider_id: actualProviderId },
          select: {
            provider_id: true,
            penalty_points: true,
            is_suspended: true,
            suspended_at: true,
            suspended_until: true,
          },
        });

        if (!provider) {
          return res.status(404).json({
            success: false,
            message: 'Provider not found'
          });
        }

        const stats = await PenaltyService.getPenaltyStats(null, actualProviderId);
        penaltyInfo = { ...provider, stats };
        
        console.log('✅ Provider penalty info retrieved:', {
          providerId: provider.provider_id,
          penalty_points: provider.penalty_points
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid user type'
        });
      }

      res.status(200).json({
        success: true,
        data: penaltyInfo,
      });
    } catch (error) {
      console.error('❌ Error fetching penalty info:', error);
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
      const providerId = req.providerId;
      const userType = req.userType;
      const { status, limit = 50, offset = 0 } = req.query;

      console.log('🔍 getMyViolations - Request details:', {
        userId,
        providerId,
        userType,
        status
      });

      // Use providerId if available for providers, otherwise userId
      const actualUserId = userType === 'customer' ? userId : null;
      const actualProviderId = (userType === 'service_provider' || userType === 'provider') 
        ? (providerId || userId) 
        : null;

      console.log('🔍 Fetching violations for:', {
        actualUserId,
        actualProviderId,
        userType
      });

      const history = await PenaltyService.getPenaltyHistory({
        userId: actualUserId,
        providerId: actualProviderId,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      console.log('✅ Violations retrieved:', {
        count: history.violations?.length || 0,
        total: history.total || 0
      });

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('❌ Error fetching violation history:', error);
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
      const providerId = req.providerId;
      const userType = req.userType;
      const { violationId } = req.params;
      const { appealReason } = req.body;

      if (!appealReason || appealReason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Appeal reason must be at least 10 characters long',
        });
      }

      // Upload evidence files to Cloudinary if provided
      let evidenceUrls = [];
      if (req.files && req.files.length > 0) {
        console.log(`📤 Uploading ${req.files.length} evidence files to Cloudinary...`);
        
        for (const file of req.files) {
          try {
            const folderName = userType === 'customer' 
              ? `penalty-evidence/users/${userId}`
              : `penalty-evidence/providers/${providerId || userId}`;
            
            const cloudinaryUrl = await uploadToCloudinary(file.buffer, folderName);
            evidenceUrls.push(cloudinaryUrl);
            console.log('✅ Evidence uploaded:', cloudinaryUrl);
          } catch (uploadError) {
            console.error('❌ Error uploading evidence file:', uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      // Use correct ID based on user type
      const actualUserId = userType === 'customer' ? userId : null;
      const actualProviderId = (userType === 'service_provider' || userType === 'provider') 
        ? (providerId || userId) 
        : null;

      const result = await PenaltyService.appealViolation(
        parseInt(violationId),
        appealReason,
        actualUserId,
        actualProviderId,
        evidenceUrls.length > 0 ? evidenceUrls : null
      );

      res.status(200).json({
        success: true,
        message: 'Appeal submitted successfully. An admin will review it shortly.',
        data: {
          ...result,
          evidenceCount: evidenceUrls.length,
          evidenceUrls: evidenceUrls
        },
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
      const providerId = req.providerId;
      const userType = req.userType;
      const { type, limit = 50, offset = 0 } = req.query;

      console.log('🔍 getMyAdjustments - Request details:', {
        userId,
        providerId,
        userType,
        type
      });

      // Build where clause
      const where = {};
      
      if (userType === 'customer') {
        where.user_id = userId;
        where.provider_id = null; // Ensure it's a customer adjustment
        console.log('📋 Filtering adjustments for customer:', userId);
      } else if (userType === 'service_provider' || userType === 'provider') {
        // Use providerId if available, otherwise fall back to userId
        const actualProviderId = providerId || userId;
        where.provider_id = actualProviderId;
        where.user_id = null; // Ensure it's a provider adjustment
        console.log('📋 Filtering adjustments for provider:', actualProviderId);
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

      console.log('🔍 Query where clause:', where);

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
          user_id: true,
          provider_id: true,
        },
      });

      // Get total count
      const total = await prisma.penaltyAdjustment.count({ where });

      console.log('✅ Adjustments retrieved:', {
        count: adjustments.length,
        total
      });

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

      // Upload evidence files to Cloudinary if provided
      let uploadedEvidenceUrls = [];
      if (req.files && req.files.length > 0) {
        console.log(`📤 Admin uploading ${req.files.length} evidence files to Cloudinary...`);
        
        for (const file of req.files) {
          try {
            const folderName = userId 
              ? `penalty-evidence/admin/users/${userId}`
              : `penalty-evidence/admin/providers/${providerId}`;
            
            const cloudinaryUrl = await uploadToCloudinary(file.buffer, folderName);
            uploadedEvidenceUrls.push(cloudinaryUrl);
            console.log('✅ Admin evidence uploaded:', cloudinaryUrl);
          } catch (uploadError) {
            console.error('❌ Error uploading admin evidence file:', uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      // Merge uploaded URLs with any provided URLs
      const allEvidenceUrls = [
        ...(evidenceUrls || []),
        ...uploadedEvidenceUrls
      ];

      const violation = await PenaltyService.recordViolation({
        userId,
        providerId,
        violationCode,
        appointmentId,
        reportId,
        ratingId,
        violationDetails,
        evidenceUrls: allEvidenceUrls.length > 0 ? allEvidenceUrls : null,
        detectedBy: 'admin',
        detectedByAdminId: admin_id,
      });

      res.status(201).json({
        success: true,
        message: 'Violation recorded successfully',
        data: {
          ...violation,
          evidenceCount: allEvidenceUrls.length,
          uploadedFiles: uploadedEvidenceUrls.length
        },
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
   * Admin: Dismiss/Reverse a violation
   */
  static async adminReverseViolation(req, res) {
    try {
      const { admin_id } = req.admin;
      const { violationId } = req.params;
      const { reason } = req.body;

      // Validate reason
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Reason must be at least 10 characters long',
        });
      }

      // Get violation with related data
      const violation = await prisma.penaltyViolation.findUnique({
        where: { violation_id: parseInt(violationId) },
        include: {
          violation_type: true,
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              penalty_points: true,
            },
          },
          provider: {
            select: {
              provider_id: true,
              provider_first_name: true,
              provider_last_name: true,
              penalty_points: true,
            },
          },
        },
      });

      if (!violation) {
        return res.status(404).json({
          success: false,
          message: 'Violation not found',
        });
      }

      if (violation.status === 'reversed') {
        return res.status(400).json({
          success: false,
          message: 'Violation has already been dismissed',
        });
      }

      // Update violation status to reversed
      await prisma.penaltyViolation.update({
        where: { violation_id: parseInt(violationId) },
        data: {
          status: 'reversed',
          reversed_at: new Date(),
          reversed_by_admin_id: admin_id,
          reversal_reason: reason,
        },
      });

      const pointsToRestore = violation.points_deducted;

      // Restore points to user or provider
      if (violation.user_id && violation.user) {
        const currentPoints = violation.user.penalty_points;
        const newPoints = Math.min(100, currentPoints + pointsToRestore);

        await prisma.user.update({
          where: { user_id: violation.user_id },
          data: {
            penalty_points: newPoints,
            // Remove suspension if points go above 50
            is_suspended: newPoints <= 50,
            suspended_at: newPoints > 50 ? null : violation.user.suspended_at,
          },
        });

        // Create adjustment log
        await prisma.penaltyAdjustment.create({
          data: {
            user_id: violation.user_id,
            adjustment_type: 'restore',
            points_adjusted: pointsToRestore,
            previous_points: currentPoints,
            new_points: newPoints,
            reason: `Violation dismissed by admin: ${reason}`,
            adjusted_by_admin_id: admin_id,
            related_violation_id: violation.violation_id,
          },
        });

        console.log(`✅ Restored ${pointsToRestore} points to user ${violation.user_id} (${currentPoints} → ${newPoints})`);
      } else if (violation.provider_id && violation.provider) {
        const currentPoints = violation.provider.penalty_points;
        const newPoints = Math.min(100, currentPoints + pointsToRestore);

        await prisma.serviceProviderDetails.update({
          where: { provider_id: violation.provider_id },
          data: {
            penalty_points: newPoints,
            // Remove suspension if points go above 50
            is_suspended: newPoints <= 50,
            suspended_at: newPoints > 50 ? null : violation.provider.suspended_at,
          },
        });

        // Create adjustment log
        await prisma.penaltyAdjustment.create({
          data: {
            provider_id: violation.provider_id,
            adjustment_type: 'restore',
            points_adjusted: pointsToRestore,
            previous_points: currentPoints,
            new_points: newPoints,
            reason: `Violation dismissed by admin: ${reason}`,
            adjusted_by_admin_id: admin_id,
            related_violation_id: violation.violation_id,
          },
        });

        console.log(`✅ Restored ${pointsToRestore} points to provider ${violation.provider_id} (${currentPoints} → ${newPoints})`);
      }

      res.status(200).json({
        success: true,
        message: `Violation dismissed and ${pointsToRestore} points restored successfully`,
        data: {
          violation_id: violation.violation_id,
          points_restored: pointsToRestore,
          status: 'reversed',
        },
      });
    } catch (error) {
      console.error('Error dismissing violation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to dismiss violation',
        error: error.message,
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
        select: {
          violation_type_id: true,
          violation_code: true,
          violation_name: true,
          penalty_points: true,
        },
      });

      const commonViolationsWithDetails = commonViolations.map((v) => {
        const type = violationTypes.find((t) => t.violation_type_id === v.violation_type_id);
        return {
          violation_code: type?.violation_code || 'UNKNOWN',
          violation_name: type?.violation_name || 'Unknown Violation',
          penalty_points: type?.penalty_points || 0,
          count: v._count,
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
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      // Manually fetch related data for each log
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const enrichedLog = { ...log };

          // Fetch user data if user_id exists
          if (log.user_id) {
            const user = await prisma.user.findUnique({
              where: { user_id: log.user_id },
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            });
            enrichedLog.user = user;
          }

          // Fetch provider data if provider_id exists
          if (log.provider_id) {
            const provider = await prisma.serviceProviderDetails.findUnique({
              where: { provider_id: log.provider_id },
              select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_email: true,
              },
            });
            enrichedLog.provider = provider;
          }

          // Fetch admin data if adjusted_by_admin_id exists
          if (log.adjusted_by_admin_id) {
            const admin = await prisma.admin.findUnique({
              where: { admin_id: log.adjusted_by_admin_id },
              select: {
                admin_id: true,
                admin_name: true,
                admin_email: true,
                admin_username: true,
              },
            });
            enrichedLog.adjusted_by_admin = admin;
          }

          return enrichedLog;
        })
      );

      const total = await prisma.penaltyAdjustment.count({ where });

      res.status(200).json({
        success: true,
        data: {
          logs: enrichedLogs,
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
