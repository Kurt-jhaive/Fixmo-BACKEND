import { PrismaClient } from '@prisma/client';
import PenaltyService from './src/services/penaltyService.js';

const prisma = new PrismaClient();

async function restorePoints() {
  try {
    const userId = 1;
    const pointsToRestore = 20; // Restore 20 points

    console.log('🎁 Restoring penalty points to user...');

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        penalty_points: true,
        is_suspended: true,
        is_activated: true,
        suspended_at: true,
      },
    });

    if (!user) {
      console.error('❌ User not found with ID:', userId);
      return;
    }

    console.log('\n📊 Current User Status:');
    console.log(`   User: ${user.first_name} ${user.last_name} (ID: ${user.user_id})`);
    console.log(`   Current Penalty Points: ${user.penalty_points}`);
    console.log(`   Current Tier: ${getTierName(user.penalty_points)}`);
    console.log(`   Suspended: ${user.is_suspended}`);
    console.log(`   Activated: ${user.is_activated}`);
    console.log(`   Suspended At: ${user.suspended_at?.toLocaleString() || 'N/A'}`);

    const estimatedNewPoints = Math.min(100, user.penalty_points + pointsToRestore);

    console.log(`\n⚙️ Restoring ${pointsToRestore} points using PenaltyService...`);
    console.log(`   ${user.penalty_points} → ${estimatedNewPoints}`);

    // Use PenaltyService to restore points (this handles reactivation automatically)
    const result = await PenaltyService.restorePoints({
      userId: userId,
      points: pointsToRestore,
      reason: 'Manual point restoration - Testing penalty system',
      adminId: 1, // Admin ID (optional)
    });

    console.log(`   ✓ Points restored via PenaltyService`);
    console.log(`   ✓ Previous: ${result.previousPoints}, New: ${result.newPoints}`);

    // Get updated user data
    const updatedUser = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        penalty_points: true,
        is_suspended: true,
        is_activated: true,
        suspended_at: true,
      },
    });

    console.log('\n✅ Points Restored Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   User: ${updatedUser.first_name} ${updatedUser.last_name}`);
    console.log(`   Previous Points: ${user.penalty_points}`);
    console.log(`   New Penalty Points: ${updatedUser.penalty_points}`);
    console.log(`   Suspended: ${updatedUser.is_suspended}`);
    console.log(`   Activated: ${updatedUser.is_activated}`);
    console.log(`   Suspended At: ${updatedUser.suspended_at?.toLocaleString() || 'N/A'}`);
    console.log(`   New Tier: ${getTierName(updatedUser.penalty_points)}`);
    console.log(`   Restrictions: ${getRestrictions(updatedUser.penalty_points)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show tier change if applicable
    const oldTier = getTierNumber(user.penalty_points);
    const newTier = getTierNumber(updatedUser.penalty_points);
    
    if (oldTier !== newTier) {
      console.log('⚠️  TIER CHANGE DETECTED!');
      console.log(`   Moved from ${getTierName(user.penalty_points)} to ${getTierName(updatedUser.penalty_points)}`);
      
      // Show reactivation notice
      if (updatedUser.penalty_points > 50 && user.penalty_points <= 50) {
        console.log('   ✅ ACCOUNT REACTIVATED!');
        console.log(`   → is_activated changed from false to true`);
        console.log(`   → is_suspended changed from true to false`);
        console.log(`   → suspended_at cleared`);
        console.log(`   → User can now log in and use the platform`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

  } catch (error) {
    console.error('❌ Error restoring points:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getTierName(points) {
  if (points <= 50) return '🔴 Tier 5: Deactivated';
  if (points <= 60) return '🟠 Tier 4: Restricted';
  if (points <= 70) return '🟡 Tier 3: Limited';
  if (points <= 80) return '⚠️ Tier 2: At Risk';
  return '✅ Tier 1: Good Standing';
}

function getTierNumber(points) {
  if (points <= 50) return 5;
  if (points <= 60) return 4;
  if (points <= 70) return 3;
  if (points <= 80) return 2;
  return 1;
}

function getRestrictions(points) {
  if (points <= 50) return 'Cannot book appointments - Account deactivated';
  if (points <= 60) return 'Maximum 1 appointment at a time';
  if (points <= 70) return 'Maximum 2 appointments at a time';
  if (points <= 80) return 'Warning only - Monitor behavior';
  return 'No restrictions';
}

restorePoints();
