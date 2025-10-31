import { PrismaClient } from '@prisma/client';

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

    const newPoints = user.penalty_points - pointsToDeduct;

    console.log(`\n⚙️ Deducting ${pointsToDeduct} points...`);
    console.log(`   ${user.penalty_points} → ${newPoints}`);

    // Get a violation type to use
    const violationType = await prisma.violationType.findFirst({
      where: {
        violation_category: 'user',
        is_active: true,
        violation_code: 'USER_LATE_CANCEL',
      },
    });

    if (!violationType) {
      console.error('❌ No violation types found');
      return;
    }

    // Create a violation record
    const violation = await prisma.penaltyViolation.create({
      data: {
        user_id: userId,
        violation_type_id: violationType.violation_type_id,
        points_deducted: pointsToDeduct,
        violation_details: `Late cancellation - Testing tier system (${user.penalty_points} → ${newPoints} points)`,
        status: 'confirmed',
        detected_by: 'system',
      },
    });

    console.log(`   ✓ Violation record created (ID: ${violation.violation_id})`);

    // Update user penalty points
    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: {
        penalty_points: newPoints,
        is_suspended: newPoints <= 50,
      },
    });

    console.log('\n✅ Penalty Added Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   User: ${updatedUser.first_name} ${updatedUser.last_name}`);
    console.log(`   Previous Points: ${user.penalty_points}`);
    console.log(`   New Penalty Points: ${updatedUser.penalty_points}`);
    console.log(`   Suspended: ${updatedUser.is_suspended}`);
    console.log(`   New Tier: ${getTierName(updatedUser.penalty_points)}`);
    console.log(`   Restrictions: ${getRestrictions(updatedUser.penalty_points)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show tier change if applicable
    const oldTier = getTierNumber(user.penalty_points);
    const newTier = getTierNumber(updatedUser.penalty_points);
    
    if (oldTier !== newTier) {
      console.log('⚠️  TIER CHANGE DETECTED!');
      console.log(`   Moved from ${getTierName(user.penalty_points)} to ${getTierName(updatedUser.penalty_points)}`);
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
