import prisma from '../prismaclient.js';

/**
 * PENALTY POINT THRESHOLDS
 * 100-81: Good Standing - No restrictions
 * 80-71:  Warning Level - Notification sent, marked "At Risk"
 * 70-61:  Limited Privileges - Users: 2 appointments max, Providers: 3 slots/day
 * 60-51:  Strict Restrictions - Users: 1 appointment max, Providers: 2 slots/day
 * ≤50:    Deactivated - Must contact admin for reactivation
 */

/**
 * Check Suspension Middleware
 * Prevents suspended users/providers from performing critical actions
 */

export const checkSuspensionStatus = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check user suspension
    if (req.user.user_id) {
      const user = await prisma.user.findUnique({
        where: { user_id: req.user.user_id },
        select: {
          is_suspended: true,
          penalty_points: true,
          suspended_at: true,
        },
      });

      // Auto-deactivate if points ≤ 50
      if (user.penalty_points <= 50 || user.is_suspended) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated due to low penalty points. Please contact admin for review and reactivation.',
          data: {
            penalty_points: user.penalty_points,
            suspended_at: user.suspended_at,
            contact_support: true,
            deactivation_reason: user.penalty_points <= 50 ? 'Points dropped to 50 or below' : 'Account suspended',
          },
        });
      }

      // Set warning levels based on points
      if (user.penalty_points >= 71 && user.penalty_points <= 80) {
        req.penaltyWarning = {
          level: 'warning',
          tier: 'at_risk',
          message: `Warning: You have ${user.penalty_points} points. Maintain good behavior to avoid restrictions.`,
          penalty_points: user.penalty_points,
          restrictions: 'None yet, but account marked as "At Risk"',
        };
      } else if (user.penalty_points >= 61 && user.penalty_points <= 70) {
        req.penaltyWarning = {
          level: 'limited',
          tier: 'limited_privileges',
          message: `Limited Access: You can only book up to 2 appointments at a time. Current points: ${user.penalty_points}`,
          penalty_points: user.penalty_points,
          restrictions: 'Maximum 2 active appointments',
          max_appointments: 2,
        };
      } else if (user.penalty_points >= 51 && user.penalty_points <= 60) {
        req.penaltyWarning = {
          level: 'strict',
          tier: 'strict_restrictions',
          message: `Strict Restrictions: You can only book 1 appointment at a time. Current points: ${user.penalty_points}`,
          penalty_points: user.penalty_points,
          restrictions: 'Maximum 1 active appointment',
          max_appointments: 1,
        };
      }
    }

    // Check provider suspension
    if (req.user.provider_id) {
      const provider = await prisma.serviceProviderDetails.findUnique({
        where: { provider_id: req.user.provider_id },
        select: {
          is_suspended: true,
          penalty_points: true,
          suspended_at: true,
        },
      });

      // Auto-deactivate if points ≤ 50
      if (provider.penalty_points <= 50 || provider.is_suspended) {
        return res.status(403).json({
          success: false,
          message: 'Your provider account has been deactivated due to low penalty points. Please contact admin for review and reactivation.',
          data: {
            penalty_points: provider.penalty_points,
            suspended_at: provider.suspended_at,
            contact_support: true,
            deactivation_reason: provider.penalty_points <= 50 ? 'Points dropped to 50 or below' : 'Account suspended',
          },
        });
      }

      // Set warning levels based on points
      if (provider.penalty_points >= 71 && provider.penalty_points <= 80) {
        req.penaltyWarning = {
          level: 'warning',
          tier: 'at_risk',
          message: `Warning: You have ${provider.penalty_points} points. Maintain good service to avoid restrictions.`,
          penalty_points: provider.penalty_points,
          restrictions: 'None yet, but account marked as "At Risk"',
        };
      } else if (provider.penalty_points >= 61 && provider.penalty_points <= 70) {
        req.penaltyWarning = {
          level: 'limited',
          tier: 'limited_privileges',
          message: `Limited Access: You can only have 3 service slots per day. Current points: ${provider.penalty_points}`,
          penalty_points: provider.penalty_points,
          restrictions: 'Maximum 3 service slots per day',
          max_slots_per_day: 3,
        };
      } else if (provider.penalty_points >= 51 && provider.penalty_points <= 60) {
        req.penaltyWarning = {
          level: 'strict',
          tier: 'strict_restrictions',
          message: `Strict Restrictions: You can only offer 2 service slots per day. Current points: ${provider.penalty_points}`,
          penalty_points: provider.penalty_points,
          restrictions: 'Maximum 2 service slots per day',
          max_slots_per_day: 2,
        };
      }
    }

    // Continue to next middleware/controller
    next();
  } catch (error) {
    console.error('Error checking suspension status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify account status',
      error: error.message,
    });
  }
};

/**
 * Optional: Attach penalty warning to response
 * Use this after checkSuspensionStatus to include warning in response
 */
export const attachPenaltyWarning = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = function (data) {
    // If there's a penalty warning, attach it to response
    if (req.penaltyWarning) {
      data.penalty_warning = req.penaltyWarning;
    }
    return originalJson(data);
  };

  next();
};

/**
 * Check if user has minimum points for action
 * Use for actions that require a certain penalty threshold
 */
export const requireMinimumPoints = (minimumPoints = 20) => {
  return async (req, res, next) => {
    try {
      let currentPoints = 100;

      if (req.user.user_id) {
        const user = await prisma.user.findUnique({
          where: { user_id: req.user.user_id },
          select: { penalty_points: true, is_suspended: true },
        });

        if (user.is_suspended) {
          return res.status(403).json({
            success: false,
            message: 'Account suspended',
          });
        }

        currentPoints = user.penalty_points;
      } else if (req.user.provider_id) {
        const provider = await prisma.serviceProviderDetails.findUnique({
          where: { provider_id: req.user.provider_id },
          select: { penalty_points: true, is_suspended: true },
        });

        if (provider.is_suspended) {
          return res.status(403).json({
            success: false,
            message: 'Account suspended',
          });
        }

        currentPoints = provider.penalty_points;
      }

      if (currentPoints < minimumPoints) {
        return res.status(403).json({
          success: false,
          message: `This action requires at least ${minimumPoints} penalty points. You currently have ${currentPoints} points.`,
          data: {
            required_points: minimumPoints,
            current_points: currentPoints,
          },
        });
      }

      next();
    } catch (error) {
      console.error('Error checking minimum points:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify penalty points',
      });
    }
  };
};

/**
 * Check booking eligibility with appointment limits
 * Enforces progressive restrictions based on penalty points
 * 
 * Users:
 * - 70-61 points: Max 2 active appointments
 * - 60-51 points: Max 1 active appointment
 * - ≤50 points: Account deactivated
 * 
 * Providers:
 * - 70-61 points: Max 3 slots per day
 * - 60-51 points: Max 2 slots per day
 * - ≤50 points: Account deactivated
 */
export const checkBookingEligibility = async (req, res, next) => {
  try {
    if (req.user.user_id) {
      const user = await prisma.user.findUnique({
        where: { user_id: req.user.user_id },
        select: { penalty_points: true, is_suspended: true },
      });

      // Deactivated accounts (≤50 points or suspended)
      if (user.penalty_points <= 50 || user.is_suspended) {
        return res.status(403).json({
          success: false,
          message: 'Your account is deactivated. Please contact admin for reactivation.',
          reason: 'account_deactivated',
          data: {
            current_points: user.penalty_points,
            contact_admin: true,
          },
        });
      }

      // Check appointment limits based on point ranges
      if (user.penalty_points >= 51 && user.penalty_points <= 70) {
        const maxAppointments = user.penalty_points >= 61 ? 2 : 1;
        
        // Count active appointments (scheduled or in-progress)
        const activeAppointments = await prisma.appointment.count({
          where: {
            user_id: req.user.user_id,
            appointment_status: {
              in: ['scheduled', 'in-progress'],
            },
          },
        });

        if (activeAppointments >= maxAppointments) {
          return res.status(403).json({
            success: false,
            message: `You have reached your appointment limit. You can only have ${maxAppointments} active appointment${maxAppointments > 1 ? 's' : ''} at a time with ${user.penalty_points} points.`,
            reason: 'appointment_limit_reached',
            data: {
              current_points: user.penalty_points,
              max_appointments: maxAppointments,
              active_appointments: activeAppointments,
              tip: 'Complete or cancel existing appointments to book new ones, or improve your penalty score.',
            },
          });
        }

        // Attach limit info to request for controller use
        req.appointmentLimit = maxAppointments;
      }
    } else if (req.user.provider_id) {
      const provider = await prisma.serviceProviderDetails.findUnique({
        where: { provider_id: req.user.provider_id },
        select: { penalty_points: true, is_suspended: true },
      });

      // Deactivated accounts (≤50 points or suspended)
      if (provider.penalty_points <= 50 || provider.is_suspended) {
        return res.status(403).json({
          success: false,
          message: 'Your provider account is deactivated. Please contact admin for reactivation.',
          reason: 'account_deactivated',
          data: {
            current_points: provider.penalty_points,
            contact_admin: true,
          },
        });
      }

      // Check slot limits based on point ranges
      if (provider.penalty_points >= 51 && provider.penalty_points <= 70) {
        const maxSlotsPerDay = provider.penalty_points >= 61 ? 3 : 2;

        // Get the date being checked (from request body or query)
        const targetDate = req.body.date || req.query.date || new Date().toISOString().split('T')[0];
        
        // Count existing slots for this day
        const existingSlots = await prisma.availability.count({
          where: {
            provider_id: req.user.provider_id,
            day_of_week: new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' }),
            slot_isActive: true,
          },
        });

        if (existingSlots >= maxSlotsPerDay) {
          return res.status(403).json({
            success: false,
            message: `You have reached your daily slot limit. You can only have ${maxSlotsPerDay} service slot${maxSlotsPerDay > 1 ? 's' : ''} per day with ${provider.penalty_points} points.`,
            reason: 'slot_limit_reached',
            data: {
              current_points: provider.penalty_points,
              max_slots_per_day: maxSlotsPerDay,
              existing_slots: existingSlots,
              tip: 'Improve your penalty score to unlock more slots.',
            },
          });
        }

        // Attach limit info to request for controller use
        req.slotLimit = maxSlotsPerDay;
      }
    }

    next();
  } catch (error) {
    console.error('Error checking booking eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify booking eligibility',
    });
  }
};

export default {
  checkSuspensionStatus,
  attachPenaltyWarning,
  requireMinimumPoints,
  checkBookingEligibility,
};
