import prisma from '../prismaclient.js';

/**
 * Penalty Service
 * Handles all penalty point management for users and providers
 */

class PenaltyService {
  /**
   * Initialize violation types in database (run once or via seeder)
   */
  static async initializeViolationTypes() {
    const violationTypes = [
      // USER VIOLATIONS
      {
        violation_code: 'USER_LATE_CANCEL',
        violation_name: 'Late Cancellation',
        violation_category: 'user',
        penalty_points: 10,
        description: 'Cancelling an appointment less than 24 hours before the schedule',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'USER_NO_SHOW',
        violation_name: 'No-Show',
        violation_category: 'user',
        penalty_points: 15,
        description: 'Failing to attend a booked service without cancellation',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'USER_REPEATED_NO_SHOW',
        violation_name: 'Repeated No-Shows',
        violation_category: 'user',
        penalty_points: 25,
        description: 'Three or more no-shows within seven days',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'USER_FAKE_COMPLAINT',
        violation_name: 'Fake Complaint',
        violation_category: 'user',
        penalty_points: 20,
        description: 'Submitting a fake complaint or false report against a provider',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'USER_RUDE_BEHAVIOR',
        violation_name: 'Rude or Disrespectful Behavior',
        violation_category: 'user',
        penalty_points: 20,
        description: 'Being rude or disrespectful toward a provider',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'USER_CHAT_SPAM',
        violation_name: 'Chat Spam/Abuse',
        violation_category: 'user',
        penalty_points: 30,
        description: 'Spamming or abusing the in-app chat system',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'USER_HARASSMENT',
        violation_name: 'Harassment',
        violation_category: 'user',
        penalty_points: 50,
        description: 'Harassing or threatening a service provider',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'USER_INAPPROPRIATE_CONTENT',
        violation_name: 'Inappropriate Content',
        violation_category: 'user',
        penalty_points: 25,
        description: 'Sending inappropriate or offensive content to providers',
        requires_evidence: true,
        auto_detect: false,
      },

      // PROVIDER VIOLATIONS
      {
        violation_code: 'PROVIDER_CANCEL_BOOKING',
        violation_name: 'Booking Cancellation',
        violation_category: 'provider',
        penalty_points: 15,
        description: 'Cancelling a confirmed booking',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'PROVIDER_NO_SHOW',
        violation_name: 'No-Show',
        violation_category: 'provider',
        penalty_points: 20,
        description: 'Failing to show up for a confirmed appointment',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'PROVIDER_REPEATED_NO_SHOW',
        violation_name: 'Repeated No-Shows',
        violation_category: 'provider',
        penalty_points: 30,
        description: 'Two or more no-shows within seven days',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'PROVIDER_LATE_RESPONSE',
        violation_name: 'Late Response to Booking',
        violation_category: 'provider',
        penalty_points: 5,
        description: 'Responding to a booking request later than 24 hours',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'PROVIDER_POOR_COMMUNICATION',
        violation_name: 'Poor Communication',
        violation_category: 'provider',
        penalty_points: 10,
        description: 'Three or more user complaints about poor communication within a week',
        requires_evidence: true,
        auto_detect: true,
      },
      {
        violation_code: 'PROVIDER_RUDE_BEHAVIOR',
        violation_name: 'Unprofessional Behavior',
        violation_category: 'provider',
        penalty_points: 20,
        description: 'Displaying rude or unprofessional behavior toward users',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'PROVIDER_SPAM',
        violation_name: 'Spam/Promotional Content',
        violation_category: 'provider',
        penalty_points: 15,
        description: 'Sending spam or unrelated promotional content in chats',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'PROVIDER_POOR_RATINGS',
        violation_name: 'Consecutive Poor Ratings',
        violation_category: 'provider',
        penalty_points: 5,
        description: 'Receiving three consecutive one-star ratings',
        requires_evidence: false,
        auto_detect: true,
      },
      {
        violation_code: 'PROVIDER_LATE_ARRIVAL',
        violation_name: 'Late Arrival',
        violation_category: 'provider',
        penalty_points: 5,
        description: 'Arriving more than 30 minutes late to a scheduled service',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'PROVIDER_HARASSMENT',
        violation_name: 'Harassment',
        violation_category: 'provider',
        penalty_points: 50,
        description: 'Harassing or threatening a customer',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'PROVIDER_INAPPROPRIATE_CONTENT',
        violation_name: 'Inappropriate Content',
        violation_category: 'provider',
        penalty_points: 25,
        description: 'Sending inappropriate or offensive content to customers',
        requires_evidence: true,
        auto_detect: false,
      },
      {
        violation_code: 'PROVIDER_FRAUD',
        violation_name: 'Fraudulent Activity',
        violation_category: 'provider',
        penalty_points: 100,
        description: 'Engaging in fraudulent or deceptive practices',
        requires_evidence: true,
        auto_detect: false,
      },
    ];

    for (const violationType of violationTypes) {
      await prisma.violationType.upsert({
        where: { violation_code: violationType.violation_code },
        update: violationType,
        create: violationType,
      });
    }

    console.log('Violation types initialized successfully');
  }

  /**
   * Record a violation for a user or provider
   * @param {Object} data - Violation data
   * @returns {Object} Created violation record
   */
  static async recordViolation(data) {
    const {
      userId,
      providerId,
      violationCode,
      appointmentId,
      reportId,
      ratingId,
      violationDetails,
      evidenceUrls,
      detectedBy = 'system',
      detectedByAdminId,
    } = data;

    // Validate that either userId or providerId is provided
    if (!userId && !providerId) {
      throw new Error('Either userId or providerId must be provided');
    }

    // Get violation type
    const violationType = await prisma.violationType.findUnique({
      where: { violation_code: violationCode, is_active: true },
    });

    if (!violationType) {
      throw new Error(`Violation type ${violationCode} not found or inactive`);
    }

    // Verify category matches
    if (userId && violationType.violation_category !== 'user') {
      throw new Error('Violation type category mismatch: expected user violation');
    }
    if (providerId && violationType.violation_category !== 'provider') {
      throw new Error('Violation type category mismatch: expected provider violation');
    }

    // Create violation record
    const violation = await prisma.penaltyViolation.create({
      data: {
        user_id: userId,
        provider_id: providerId,
        violation_type_id: violationType.violation_type_id,
        appointment_id: appointmentId,
        report_id: reportId,
        rating_id: ratingId,
        points_deducted: violationType.penalty_points,
        violation_details: violationDetails,
        evidence_urls: evidenceUrls,
        detected_by: detectedBy,
        detected_by_admin_id: detectedByAdminId,
      },
    });

    // Deduct penalty points
    await this.deductPoints({
      userId,
      providerId,
      points: violationType.penalty_points,
      violationId: violation.violation_id,
    });

    return violation;
  }

  /**
   * Deduct penalty points from user or provider
   * Auto-deactivates account if points drop to 50 or below
   * @param {Object} data - Points deduction data
   */
  static async deductPoints(data) {
    const { userId, providerId, points, violationId } = data;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { user_id: userId } });
      const previousPoints = user.penalty_points;
      const newPoints = Math.max(0, previousPoints - points);

      // Auto-deactivate if points drop to 50 or below
      const shouldDeactivate = newPoints <= 50;

      // Update user points
      await prisma.user.update({
        where: { user_id: userId },
        data: {
          penalty_points: newPoints,
          is_suspended: shouldDeactivate,
          suspended_at: shouldDeactivate ? new Date() : user.suspended_at,
        },
      });

      // Log adjustment
      await prisma.penaltyAdjustment.create({
        data: {
          user_id: userId,
          adjustment_type: 'penalty',
          points_adjusted: -points,
          previous_points: previousPoints,
          new_points: newPoints,
          reason: shouldDeactivate 
            ? `Penalty for violation - Account auto-deactivated (points ≤ 50)` 
            : `Penalty for violation`,
          related_violation_id: violationId,
        },
      });

      if (shouldDeactivate && previousPoints > 50) {
        console.log(`⚠️  User ${userId} auto-deactivated - penalty points dropped to ${newPoints} (≤ 50)`);
      }

      return { previousPoints, newPoints, suspended: shouldDeactivate, deactivated: shouldDeactivate };
    }

    if (providerId) {
      const provider = await prisma.serviceProviderDetails.findUnique({
        where: { provider_id: providerId },
      });
      const previousPoints = provider.penalty_points;
      const newPoints = Math.max(0, previousPoints - points);

      // Auto-deactivate if points drop to 50 or below
      const shouldDeactivate = newPoints <= 50;

      // Update provider points
      await prisma.serviceProviderDetails.update({
        where: { provider_id: providerId },
        data: {
          penalty_points: newPoints,
          is_suspended: shouldDeactivate,
          suspended_at: shouldDeactivate ? new Date() : provider.suspended_at,
        },
      });

      // Log adjustment
      await prisma.penaltyAdjustment.create({
        data: {
          provider_id: providerId,
          adjustment_type: 'penalty',
          points_adjusted: -points,
          previous_points: previousPoints,
          new_points: newPoints,
          reason: shouldDeactivate 
            ? `Penalty for violation - Account auto-deactivated (points ≤ 50)` 
            : `Penalty for violation`,
          related_violation_id: violationId,
        },
      });

      if (shouldDeactivate && previousPoints > 50) {
        console.log(`⚠️  Provider ${providerId} auto-deactivated - penalty points dropped to ${newPoints} (≤ 50)`);
      }

      return { previousPoints, newPoints, suspended: shouldDeactivate, deactivated: shouldDeactivate };
    }
  }

  /**
   * Restore penalty points (for appeals or admin corrections)
   * @param {Object} data - Points restoration data
   */
  static async restorePoints(data) {
    const { userId, providerId, points, reason, adminId, violationId } = data;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { user_id: userId } });
      const previousPoints = user.penalty_points;
      const newPoints = Math.min(100, previousPoints + points);

      await prisma.user.update({
        where: { user_id: userId },
        data: {
          penalty_points: newPoints,
          is_suspended: false,
          suspended_at: null,
        },
      });

      await prisma.penaltyAdjustment.create({
        data: {
          user_id: userId,
          adjustment_type: 'restore',
          points_adjusted: points,
          previous_points: previousPoints,
          new_points: newPoints,
          reason,
          adjusted_by_admin_id: adminId,
          related_violation_id: violationId,
        },
      });

      return { previousPoints, newPoints };
    }

    if (providerId) {
      const provider = await prisma.serviceProviderDetails.findUnique({
        where: { provider_id: providerId },
      });
      const previousPoints = provider.penalty_points;
      const newPoints = Math.min(100, previousPoints + points);

      await prisma.serviceProviderDetails.update({
        where: { provider_id: providerId },
        data: {
          penalty_points: newPoints,
          is_suspended: false,
          suspended_at: null,
        },
      });

      await prisma.penaltyAdjustment.create({
        data: {
          provider_id: providerId,
          adjustment_type: 'restore',
          points_adjusted: points,
          previous_points: previousPoints,
          new_points: newPoints,
          reason,
          adjusted_by_admin_id: adminId,
          related_violation_id: violationId,
        },
      });

      return { previousPoints, newPoints };
    }
  }

  /**
   * Get penalty history for user or provider
   * @param {Object} params - Query parameters
   */
  static async getPenaltyHistory(params) {
    const { userId, providerId, status, limit = 50, offset = 0 } = params;

    const where = {};
    if (userId) where.user_id = userId;
    if (providerId) where.provider_id = providerId;
    if (status) where.status = status;

    const violations = await prisma.penaltyViolation.findMany({
      where,
      include: {
        violation_type: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.penaltyViolation.count({ where });

    return { violations, total };
  }

  /**
   * Check for repeated violations and apply additional penalties
   * @param {Object} params - Check parameters
   */
  static async checkRepeatedViolations(params) {
    const { userId, providerId, violationCode, days = 7 } = params;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const where = {
      created_at: { gte: dateThreshold },
      status: 'active',
    };

    if (userId) where.user_id = userId;
    if (providerId) where.provider_id = providerId;

    // Get violation type
    const violationType = await prisma.violationType.findUnique({
      where: { violation_code: violationCode },
    });

    if (violationType) {
      where.violation_type_id = violationType.violation_type_id;
    }

    const recentViolations = await prisma.penaltyViolation.count({ where });

    return {
      count: recentViolations,
      shouldApplyAdditionalPenalty: recentViolations >= 3,
    };
  }

  /**
   * Auto-detect late cancellation
   */
  static async detectLateCancellation(appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
    });

    if (!appointment) return null;

    // Check if cancelled within 24 hours of scheduled time
    const hoursDifference =
      (new Date(appointment.scheduled_date) - new Date()) / (1000 * 60 * 60);

    if (hoursDifference < 24 && appointment.appointment_status === 'cancelled') {
      // Record violation
      await this.recordViolation({
        userId: appointment.customer_id,
        violationCode: 'USER_LATE_CANCEL',
        appointmentId: appointment.appointment_id,
        violationDetails: `Appointment cancelled ${hoursDifference.toFixed(1)} hours before scheduled time`,
        detectedBy: 'system',
      });

      return true;
    }

    return false;
  }

  /**
   * Auto-detect provider no-show
   */
  static async detectProviderNoShow(appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
    });

    if (!appointment) return null;

    // Check if appointment is marked as provider no-show
    if (appointment.appointment_status === 'provider_no_show') {
      // Check for repeated no-shows
      const repeated = await this.checkRepeatedViolations({
        providerId: appointment.provider_id,
        violationCode: 'PROVIDER_NO_SHOW',
        days: 7,
      });

      if (repeated.count >= 2) {
        // Apply repeated no-show penalty
        await this.recordViolation({
          providerId: appointment.provider_id,
          violationCode: 'PROVIDER_REPEATED_NO_SHOW',
          appointmentId: appointment.appointment_id,
          violationDetails: `Provider has ${repeated.count} no-shows in the past 7 days`,
          detectedBy: 'system',
        });
      } else {
        // Regular no-show penalty
        await this.recordViolation({
          providerId: appointment.provider_id,
          violationCode: 'PROVIDER_NO_SHOW',
          appointmentId: appointment.appointment_id,
          detectedBy: 'system',
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Auto-detect user no-show
   */
  static async detectUserNoShow(appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
    });

    if (!appointment) return null;

    // Check if appointment is marked as user no-show
    if (appointment.appointment_status === 'user_no_show') {
      // Check for repeated no-shows
      const repeated = await this.checkRepeatedViolations({
        userId: appointment.customer_id,
        violationCode: 'USER_NO_SHOW',
        days: 7,
      });

      if (repeated.count >= 3) {
        // Apply repeated no-show penalty
        await this.recordViolation({
          userId: appointment.customer_id,
          violationCode: 'USER_REPEATED_NO_SHOW',
          appointmentId: appointment.appointment_id,
          violationDetails: `User has ${repeated.count} no-shows in the past 7 days`,
          detectedBy: 'system',
        });
      } else {
        // Regular no-show penalty
        await this.recordViolation({
          userId: appointment.customer_id,
          violationCode: 'USER_NO_SHOW',
          appointmentId: appointment.appointment_id,
          detectedBy: 'system',
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Auto-detect consecutive poor ratings for provider
   */
  static async detectConsecutivePoorRatings(providerId) {
    // Get last 3 ratings for provider
    const recentRatings = await prisma.rating.findMany({
      where: {
        provider_id: providerId,
        rated_by: 'customer',
      },
      orderBy: { created_at: 'desc' },
      take: 3,
    });

    // Check if all 3 are 1-star
    if (recentRatings.length === 3) {
      const allOneStars = recentRatings.every((r) => r.rating_value === 1);

      if (allOneStars) {
        await this.recordViolation({
          providerId,
          violationCode: 'PROVIDER_POOR_RATINGS',
          violationDetails: 'Three consecutive one-star ratings received',
          detectedBy: 'system',
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Appeal a violation
   */
  static async appealViolation(violationId, appealReason, userId, providerId) {
    const violation = await prisma.penaltyViolation.findUnique({
      where: { violation_id: violationId },
    });

    if (!violation) {
      throw new Error('Violation not found');
    }

    // Verify ownership
    if (userId && violation.user_id !== userId) {
      throw new Error('Unauthorized to appeal this violation');
    }
    if (providerId && violation.provider_id !== providerId) {
      throw new Error('Unauthorized to appeal this violation');
    }

    // Update violation with appeal
    await prisma.penaltyViolation.update({
      where: { violation_id: violationId },
      data: {
        status: 'appealed',
        appeal_reason: appealReason,
        appeal_status: 'pending',
      },
    });

    return { success: true, message: 'Appeal submitted successfully' };
  }

  /**
   * Admin reviews an appeal
   */
  static async reviewAppeal(violationId, approved, adminId, reviewNotes) {
    const violation = await prisma.penaltyViolation.findUnique({
      where: { violation_id: violationId },
      include: { violation_type: true },
    });

    if (!violation) {
      throw new Error('Violation not found');
    }

    if (approved) {
      // Restore points
      await this.restorePoints({
        userId: violation.user_id,
        providerId: violation.provider_id,
        points: violation.points_deducted,
        reason: `Appeal approved: ${reviewNotes}`,
        adminId,
        violationId,
      });

      // Update violation status
      await prisma.penaltyViolation.update({
        where: { violation_id: violationId },
        data: {
          status: 'reversed',
          appeal_status: 'approved',
          appeal_reviewed_by: adminId,
          appeal_reviewed_at: new Date(),
          reversed_at: new Date(),
          reversed_by_admin_id: adminId,
          reversal_reason: reviewNotes,
        },
      });
    } else {
      // Reject appeal
      await prisma.penaltyViolation.update({
        where: { violation_id: violationId },
        data: {
          status: 'active',
          appeal_status: 'rejected',
          appeal_reviewed_by: adminId,
          appeal_reviewed_at: new Date(),
        },
      });
    }

    return { success: true, approved };
  }

  /**
   * Get penalty statistics
   */
  static async getPenaltyStats(userId, providerId) {
    const where = {};
    if (userId) where.user_id = userId;
    if (providerId) where.provider_id = providerId;

    const totalViolations = await prisma.penaltyViolation.count({ where });
    const activeViolations = await prisma.penaltyViolation.count({
      where: { ...where, status: 'active' },
    });

    const recentViolations = await prisma.penaltyViolation.count({
      where: {
        ...where,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    let currentPoints = 100;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { penalty_points: true, is_suspended: true },
      });
      currentPoints = user.penalty_points;
    } else if (providerId) {
      const provider = await prisma.serviceProviderDetails.findUnique({
        where: { provider_id: providerId },
        select: { penalty_points: true, is_suspended: true },
      });
      currentPoints = provider.penalty_points;
    }

    return {
      currentPoints,
      totalViolations,
      activeViolations,
      recentViolations,
      status: currentPoints > 50 ? 'good' : currentPoints > 20 ? 'warning' : 'critical',
    };
  }

  /**
   * Auto-restore points for successful booking completion
   * Called when appointment status changes to 'completed'
   * @param {number} appointmentId - The completed appointment ID
   */
  static async rewardSuccessfulBooking(appointmentId) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { appointment_id: appointmentId },
        include: {
          customer: {
            select: { user_id: true, penalty_points: true, is_suspended: true }
          },
          serviceProvider: {
            select: { provider_id: true, penalty_points: true, is_suspended: true }
          }
        }
      });

      if (!appointment) {
        console.error(`Appointment ${appointmentId} not found`);
        return null;
      }

      // Only reward if appointment is completed
      if (appointment.appointment_status !== 'completed') {
        return null;
      }

      const rewards = {
        customer: null,
        provider: null
      };

      // Reward customer (5 points per successful booking)
      if (appointment.customer && appointment.customer.penalty_points < 100) {
        const customerPointsToAdd = 5;
        const customerNewPoints = Math.min(100, appointment.customer.penalty_points + customerPointsToAdd);
        
        await prisma.user.update({
          where: { user_id: appointment.customer_id },
          data: {
            penalty_points: customerNewPoints,
            is_suspended: false,
            suspended_at: null
          }
        });

        // Log the reward
        await prisma.penaltyAdjustment.create({
          data: {
            user_id: appointment.customer_id,
            adjustment_type: 'bonus',
            points_adjusted: customerPointsToAdd,
            previous_points: appointment.customer.penalty_points,
            new_points: customerNewPoints,
            reason: `Reward for successful booking completion - Appointment #${appointmentId}`
          }
        });

        rewards.customer = {
          points_added: customerPointsToAdd,
          previous_points: appointment.customer.penalty_points,
          new_points: customerNewPoints
        };

        console.log(`✓ Rewarded customer ${appointment.customer_id} with ${customerPointsToAdd} points for completing appointment ${appointmentId}`);
      }

      // Reward provider (10 points per successful booking)
      if (appointment.serviceProvider && appointment.serviceProvider.penalty_points < 100) {
        const providerPointsToAdd = 10;
        const providerNewPoints = Math.min(100, appointment.serviceProvider.penalty_points + providerPointsToAdd);
        
        await prisma.serviceProviderDetails.update({
          where: { provider_id: appointment.provider_id },
          data: {
            penalty_points: providerNewPoints,
            is_suspended: false,
            suspended_at: null
          }
        });

        // Log the reward
        await prisma.penaltyAdjustment.create({
          data: {
            provider_id: appointment.provider_id,
            adjustment_type: 'bonus',
            points_adjusted: providerPointsToAdd,
            previous_points: appointment.serviceProvider.penalty_points,
            new_points: providerNewPoints,
            reason: `Reward for successful booking completion - Appointment #${appointmentId}`
          }
        });

        rewards.provider = {
          points_added: providerPointsToAdd,
          previous_points: appointment.serviceProvider.penalty_points,
          new_points: providerNewPoints
        };

        console.log(`✓ Rewarded provider ${appointment.provider_id} with ${providerPointsToAdd} points for completing appointment ${appointmentId}`);
      }

      return rewards;
    } catch (error) {
      console.error('Error rewarding successful booking:', error);
      return null;
    }
  }

  /**
   * Auto-restore points based on rating received
   * Called when a rating is submitted
   * @param {number} ratingId - The rating ID
   */
  static async rewardGoodRating(ratingId) {
    try {
      const rating = await prisma.rating.findUnique({
        where: { id: ratingId },
        include: {
          serviceProvider: {
            select: { provider_id: true, penalty_points: true, is_suspended: true }
          }
        }
      });

      if (!rating) {
        console.error(`Rating ${ratingId} not found`);
        return null;
      }

      // Only reward providers for customer ratings (not vice versa)
      if (rating.rated_by !== 'customer') {
        return null;
      }

      // Determine points based on rating value
      let pointsToAdd = 0;
      if (rating.rating_value === 5) {
        pointsToAdd = 5;
      } else if (rating.rating_value === 4) {
        pointsToAdd = 3;
      } else if (rating.rating_value === 3) {
        pointsToAdd = 2;
      }
      // No points for ratings below 3

      if (pointsToAdd === 0 || rating.serviceProvider.penalty_points >= 100) {
        return null; // No reward needed
      }

      const newPoints = Math.min(100, rating.serviceProvider.penalty_points + pointsToAdd);

      await prisma.serviceProviderDetails.update({
        where: { provider_id: rating.provider_id },
        data: {
          penalty_points: newPoints,
          is_suspended: false,
          suspended_at: null
        }
      });

      // Log the reward
      await prisma.penaltyAdjustment.create({
        data: {
          provider_id: rating.provider_id,
          adjustment_type: 'bonus',
          points_adjusted: pointsToAdd,
          previous_points: rating.serviceProvider.penalty_points,
          new_points: newPoints,
          reason: `Reward for receiving ${rating.rating_value}-star rating - Rating #${ratingId}`
        }
      });

      console.log(`✓ Rewarded provider ${rating.provider_id} with ${pointsToAdd} points for ${rating.rating_value}-star rating`);

      return {
        points_added: pointsToAdd,
        previous_points: rating.serviceProvider.penalty_points,
        new_points: newPoints,
        rating_value: rating.rating_value
      };
    } catch (error) {
      console.error('Error rewarding good rating:', error);
      return null;
    }
  }

  /**
   * Get point restoration statistics
   * Shows how many points a user/provider has earned through good behavior
   */
  static async getRewardStats(userId, providerId) {
    try {
      const where = {
        adjustment_type: 'bonus'
      };

      if (userId) where.user_id = userId;
      if (providerId) where.provider_id = providerId;

      const rewards = await prisma.penaltyAdjustment.findMany({
        where,
        orderBy: { created_at: 'desc' }
      });

      const totalPointsEarned = rewards.reduce((sum, r) => sum + r.points_adjusted, 0);
      const rewardsThisMonth = rewards.filter(r => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(r.created_at) >= monthAgo;
      });

      return {
        total_rewards: rewards.length,
        total_points_earned: totalPointsEarned,
        rewards_this_month: rewardsThisMonth.length,
        points_earned_this_month: rewardsThisMonth.reduce((sum, r) => sum + r.points_adjusted, 0),
        recent_rewards: rewards.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting reward stats:', error);
      return null;
    }
  }
}

export default PenaltyService;
