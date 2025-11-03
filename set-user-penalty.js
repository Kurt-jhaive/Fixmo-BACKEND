import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setUserPenalty() {
  try {
    const userId = 1;
    const targetPoints = 70;

    console.log('🎯 Setting penalty points for user...');

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
    console.log(`   Suspended: ${user.is_suspended}`);

    const pointsToDeduct = user.penalty_points - targetPoints;

    if (pointsToDeduct <= 0) {
      console.log(`\n✅ User already at or below ${targetPoints} points. No action needed.`);
      return;
    }

    console.log(`\n⚙️ Deducting ${pointsToDeduct} points to reach ${targetPoints}...`);

    // Get a violation type to use
    const violationType = await prisma.violationType.findFirst({
      where: {
        violation_category: 'user',
        is_active: true,
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
        violation_details: `Manual penalty adjustment to test tier system (brought to ${targetPoints} points)`,
        status: 'confirmed',
        detected_by: 'admin',
        detected_by_admin_id: 1, // Admin ID
      },
    });

    console.log(`   ✓ Violation record created (ID: ${violation.violation_id})`);

    // Update user penalty points
    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: {
        penalty_points: targetPoints,
        is_suspended: targetPoints <= 50,
      },
    });

    console.log('\n✅ Penalty Update Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   User: ${updatedUser.first_name} ${updatedUser.last_name}`);
    console.log(`   New Penalty Points: ${updatedUser.penalty_points}`);
    console.log(`   Suspended: ${updatedUser.is_suspended}`);
    console.log(`   Tier: ${getTierName(updatedUser.penalty_points)}`);
    console.log(`   Restrictions: ${getRestrictions(updatedUser.penalty_points)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error setting penalty:', error);
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

function getRestrictions(points) {
  if (points <= 50) return 'Cannot book appointments';
  if (points <= 60) return 'Maximum 1 appointment at a time';
  if (points <= 70) return 'Maximum 2 appointments at a time';
  if (points <= 80) return 'Warning only';
  return 'No restrictions';
}

setUserPenalty();
