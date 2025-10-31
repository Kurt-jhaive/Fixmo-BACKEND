import cron from 'node-cron';
import prisma from '../prismaclient.js';

/**
 * Penalty Points Reset Job
 * Automatically resets penalty points to 100 every 3 months
 * Runs on the 1st day of every 3rd month at midnight (Jan 1, Apr 1, Jul 1, Oct 1)
 */

/**
 * Run the penalty points reset job
 */
const runPenaltyReset = async () => {
  try {
    console.log('🔄 Running 3-month penalty points reset job...');
    
    const now = new Date();
    
    // Reset all users to 100 points
    const updatedUsers = await prisma.user.updateMany({
      where: {
        penalty_points: { lt: 100 }, // Only reset if not already at 100
      },
      data: {
        penalty_points: 100,
        is_suspended: false,
        suspended_at: null,
        suspended_until: null,
      },
    });

    // Reset all providers to 100 points
    const updatedProviders = await prisma.serviceProviderDetails.updateMany({
      where: {
        penalty_points: { lt: 100 }, // Only reset if not already at 100
      },
      data: {
        penalty_points: 100,
        is_suspended: false,
        suspended_at: null,
        suspended_until: null,
      },
    });

    // Log the reset in penalty adjustments table
    const usersToLog = await prisma.user.findMany({
      where: {
        penalty_points: 100,
      },
      select: {
        user_id: true,
      },
    });

    const providersToLog = await prisma.serviceProviderDetails.findMany({
      where: {
        penalty_points: 100,
      },
      select: {
        provider_id: true,
      },
    });

    // Create adjustment logs for users
    if (usersToLog.length > 0) {
      await prisma.penaltyAdjustment.createMany({
        data: usersToLog.map((user) => ({
          user_id: user.user_id,
          adjustment_type: 'reset',
          points_adjusted: 100, // Simplified logging
          previous_points: 0, // We don't track previous in bulk reset
          new_points: 100,
          reason: 'Automatic 3-month penalty reset - Fresh start',
          adjusted_by_admin_id: null, // System-automated
        })),
        skipDuplicates: true,
      });
    }

    // Create adjustment logs for providers
    if (providersToLog.length > 0) {
      await prisma.penaltyAdjustment.createMany({
        data: providersToLog.map((provider) => ({
          provider_id: provider.provider_id,
          adjustment_type: 'reset',
          points_adjusted: 100, // Simplified logging
          previous_points: 0, // We don't track previous in bulk reset
          new_points: 100,
          reason: 'Automatic 3-month penalty reset - Fresh start',
          adjusted_by_admin_id: null, // System-automated
        })),
        skipDuplicates: true,
      });
    }

    // Log results
    if (updatedUsers.count > 0 || updatedProviders.count > 0) {
      console.log(`✅ 3-month penalty reset completed successfully!`);
      console.log(`📊 Reset Summary:`);
      console.log(`   - Users reset: ${updatedUsers.count}`);
      console.log(`   - Providers reset: ${updatedProviders.count}`);
      console.log(`   - Total accounts reset: ${updatedUsers.count + updatedProviders.count}`);
      console.log(`   - Reset date: ${now.toISOString()}`);
      console.log(`   - Next reset: ${getNextResetDate().toISOString()}`);
    } else {
      console.log('ℹ️  No accounts needed penalty reset (all already at 100 points).');
    }

  } catch (error) {
    console.error('❌ Error during 3-month penalty reset:', error);
    console.error('Stack trace:', error.stack);
  }
};

/**
 * Get the next scheduled reset date (next quarter start)
 */
const getNextResetDate = () => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  
  // Determine next quarter: Jan (0), Apr (3), Jul (6), Oct (9)
  const quarterMonths = [0, 3, 6, 9];
  let nextQuarterMonth = quarterMonths.find(m => m > currentMonth);
  
  if (!nextQuarterMonth) {
    // If no quarter left this year, go to Jan next year
    nextQuarterMonth = 0;
    return new Date(now.getFullYear() + 1, nextQuarterMonth, 1, 0, 0, 0, 0);
  }
  
  return new Date(now.getFullYear(), nextQuarterMonth, 1, 0, 0, 0, 0);
};

/**
 * Initialize the penalty reset job
 * Runs at midnight (00:00) on the 1st day of every 3rd month
//  * Schedule: 0 0 1 (minute hour day-of-month month day-of-week)*/
//  * This means: January 1, April 1, July 1, October 1 at 00:00
//  */
export const initializePenaltyResetJob = () => {
  // Prevent duplicate initialization
  if (global.__penaltyResetJobInitialized) {
    console.log('ℹ️  Penalty reset job already initialized (skipping duplicate)');
    return;
  }

  console.log('🔄 Initializing 3-month penalty reset job...');
  
  // Run at midnight on the 1st of every 3rd month (Jan, Apr, Jul, Oct)
  // Cron pattern: '0 0 1 */3 *'
  // For testing: '*/5 * * * *' runs every 5 minutes
  cron.schedule('0 0 1 */3 *', runPenaltyReset, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('✅ Penalty reset job scheduled (runs quarterly: Jan 1, Apr 1, Jul 1, Oct 1)');
  console.log(`📅 Next reset: ${getNextResetDate().toISOString()}`);

  // Mark as initialized
  global.__penaltyResetJobInitialized = true;
  
  console.log('⏰ Penalty reset job initialized');
};

/**
 * Manual trigger for testing (can be called from admin endpoint)
 */
export const manualPenaltyReset = async () => {
  console.log('🔧 Manual penalty reset triggered by admin...');
  await runPenaltyReset();
};

export default {
  initializePenaltyResetJob,
  manualPenaltyReset,
};
