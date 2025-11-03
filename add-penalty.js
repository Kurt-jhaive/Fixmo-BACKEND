import { PrismaClient } from '@prisma/client';
import PenaltyService from './src/services/penaltyService.js';

const prisma = new PrismaClient();

async function addPenalty() {
  try {
    const userId = 1;
    const pointsToDeduct = 10; // Deduct 10 more points (will go from 70 to 60)

    console.log('🎯 Adding penalty to user...');

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

    const estimatedNewPoints = Math.max(0, user.penalty_points - pointsToDeduct);

    console.log(`\n⚙️ Deducting ${pointsToDeduct} points using PenaltyService...`);
    console.log(`   ${user.penalty_points} → ${estimatedNewPoints}`);

    // Use PenaltyService to record violation (this handles deactivation automatically)
    const violation = await PenaltyService.recordViolation({
      userId: userId,
      violationCode: 'USER_LATE_CANCEL',
      violationDetails: `Late cancellation - Testing tier system`,
      detectedBy: 'system',
    });

    console.log(`   ✓ Violation recorded via PenaltyService (ID: ${violation.violation_id})`);

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

    console.log('\n✅ Penalty Added Successfully!');
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
      
      // Show deactivation warning
      if (updatedUser.penalty_points <= 50 && user.penalty_points > 50) {
        console.log('   🔒 ACCOUNT AUTO-DEACTIVATED!');
        console.log(`   → is_activated changed from true to false`);
        console.log(`   → User cannot log in or book appointments`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

  } catch (error) {
    console.error('❌ Error adding penalty:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getTierNumber(points) {
  if (points <= 50) return 5;
  if (points <= 60) return 4;
  if (points <= 70) return 3;
  if (points <= 80) return 2;
  return 1;
}

function getTierName(points) {
  if (points <= 50) return '🔴 Tier 5: Deactivated';
  if (points <= 60) return '🟠 Tier 4: Restricted';
  if (points <= 70) return '🟡 Tier 3: Limited';
  if (points <= 80) return '⚠️ Tier 2: At Risk';
  return '✅ Tier 1: Good Standing';
}

function getRestrictions(points) {
  if (points <= 50) return 'Cannot book appointments';
  if (points <= 60) return 'Maximum 1 appointment at a time';
  if (points <= 70) return 'Maximum 2 appointments at a time';
  if (points <= 80) return 'Warning only';
  return 'No restrictions';
}

addPenalty();
