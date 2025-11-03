import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDeactivation() {
  try {
    console.log('🔧 Fixing deactivation status for accounts with ≤50 points...\n');

    // Fix users with ≤50 points
    const usersToFix = await prisma.user.findMany({
      where: {
        penalty_points: { lte: 50 },
        is_activated: true, // Should be false
      },
    });

    console.log(`Found ${usersToFix.length} users needing deactivation fix`);

    for (const user of usersToFix) {
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: {
          is_activated: false,
          is_suspended: true,
          suspended_at: user.suspended_at || new Date(),
        },
      });

      console.log(`   ✓ Fixed User ${user.user_id}: ${user.first_name} ${user.last_name} (${user.penalty_points} points)`);
    }

    // Fix providers with ≤50 points
    const providersToFix = await prisma.serviceProviderDetails.findMany({
      where: {
        penalty_points: { lte: 50 },
        provider_isActivated: true, // Should be false
      },
    });

    console.log(`\nFound ${providersToFix.length} providers needing deactivation fix`);

    for (const provider of providersToFix) {
      await prisma.serviceProviderDetails.update({
        where: { provider_id: provider.provider_id },
        data: {
          provider_isActivated: false,
          is_suspended: true,
          suspended_at: provider.suspended_at || new Date(),
        },
      });

      console.log(`   ✓ Fixed Provider ${provider.provider_id}: ${provider.provider_first_name} ${provider.provider_last_name} (${provider.penalty_points} points)`);
    }

    console.log('\n✅ Deactivation fix completed!');

    // Show updated status for user ID 1
    const user = await prisma.user.findUnique({
      where: { user_id: 1 },
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

    if (user) {
      console.log('\n📊 Updated Status for User ID 1:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   User: ${user.first_name} ${user.last_name}`);
      console.log(`   Penalty Points: ${user.penalty_points}`);
      console.log(`   Is Suspended: ${user.is_suspended}`);
      console.log(`   Is Activated: ${user.is_activated}`);
      console.log(`   Suspended At: ${user.suspended_at?.toLocaleString() || 'N/A'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

  } catch (error) {
    console.error('❌ Error fixing deactivation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeactivation();
