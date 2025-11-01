import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserStatus() {
  try {
    const userId = 1;

    console.log('🔍 Checking User Status...\n');

    // Get user data
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

    console.log('📊 User Account Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   User: ${user.first_name} ${user.last_name} (ID: ${user.user_id})`);
    console.log(`   Penalty Points: ${user.penalty_points}`);
    console.log(`   Tier: ${getTierName(user.penalty_points)}`);
    console.log(`   Is Suspended: ${user.is_suspended}`);
    console.log(`   Is Activated: ${user.is_activated}`);
    console.log(`   Suspended At: ${user.suspended_at || 'N/A'}`);
    console.log(`   Restrictions: ${getRestrictions(user.penalty_points)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get recent violations
    const violations = await prisma.penaltyViolation.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        violation_type: true,
      },
    });

    if (violations.length > 0) {
      console.log('📋 Recent Violations (Last 5):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      violations.forEach((v, index) => {
        console.log(`   ${index + 1}. ${v.violation_type.violation_name}`);
        console.log(`      Points Deducted: -${v.points_deducted}`);
        console.log(`      Status: ${v.status}`);
        console.log(`      Date: ${v.created_at.toLocaleString()}`);
        console.log('');
      });
    }

    // Get recent adjustments
    const adjustments = await prisma.penaltyAdjustment.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    if (adjustments.length > 0) {
      console.log('📝 Recent Adjustments (Last 5):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      adjustments.forEach((a, index) => {
        console.log(`   ${index + 1}. ${a.adjustment_type.toUpperCase()}`);
        console.log(`      Points Adjusted: ${a.points_adjusted > 0 ? '+' : ''}${a.points_adjusted}`);
        console.log(`      ${a.previous_points} → ${a.new_points}`);
        console.log(`      Reason: ${a.reason}`);
        console.log(`      Date: ${a.created_at.toLocaleString()}`);
        console.log('');
      });
    }

    // Check if deactivation is needed but not applied
    if (user.penalty_points <= 50 && user.is_activated === true) {
      console.log('⚠️  WARNING: Account should be deactivated but is_activated = true!');
      console.log('   This indicates the deactivation logic was not applied properly.\n');
    }

    if (user.penalty_points <= 50 && !user.is_suspended) {
      console.log('⚠️  WARNING: Account should be suspended but is_suspended = false!');
      console.log('   This indicates the suspension logic was not applied properly.\n');
    }

  } catch (error) {
    console.error('❌ Error checking user status:', error);
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
  if (points <= 50) return 'Cannot book appointments - Account deactivated';
  if (points <= 60) return 'Maximum 1 appointment at a time';
  if (points <= 70) return 'Maximum 2 appointments at a time';
  if (points <= 80) return 'Warning only';
  return 'No restrictions';
}

checkUserStatus();
