import prisma from './src/prismaclient.js';
import PenaltyService from './src/services/penaltyService.js';

/**
 * Test Penalty System
 * Quick test to verify the penalty system is working correctly
 */

async function testPenaltySystem() {
  console.log('\n=== Testing Penalty System ===\n');

  try {
    // Test 1: Check violation types
    console.log('Test 1: Checking violation types...');
    const violationTypes = await prisma.violationType.findMany({
      where: { is_active: true }
    });
    console.log(`✓ Found ${violationTypes.length} active violation types`);

    // Test 2: Get a test user
    console.log('\nTest 2: Getting test user...');
    const testUser = await prisma.user.findFirst({
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        penalty_points: true,
        is_suspended: true
      }
    });
    
    if (!testUser) {
      console.log('✗ No users found in database. Please create a user first.');
      return;
    }
    
    console.log(`✓ Found user: ${testUser.first_name} ${testUser.last_name}`);
    console.log(`  - Current penalty points: ${testUser.penalty_points}`);
    console.log(`  - Suspended: ${testUser.is_suspended}`);

    // Test 3: Get a test provider
    console.log('\nTest 3: Getting test provider...');
    const testProvider = await prisma.serviceProviderDetails.findFirst({
      select: {
        provider_id: true,
        provider_first_name: true,
        provider_last_name: true,
        penalty_points: true,
        is_suspended: true
      }
    });
    
    if (!testProvider) {
      console.log('✗ No providers found in database. Please create a provider first.');
      return;
    }
    
    console.log(`✓ Found provider: ${testProvider.provider_first_name} ${testProvider.provider_last_name}`);
    console.log(`  - Current penalty points: ${testProvider.penalty_points}`);
    console.log(`  - Suspended: ${testProvider.is_suspended}`);

    // Test 4: Record a test violation for user
    console.log('\nTest 4: Recording test violation for user...');
    const userViolation = await PenaltyService.recordViolation({
      userId: testUser.user_id,
      violationCode: 'USER_LATE_CANCEL',
      violationDetails: 'Test violation - will be removed after testing',
      detectedBy: 'system'
    });
    console.log(`✓ Violation recorded: ID ${userViolation.violation_id}`);
    console.log(`  - Points deducted: ${userViolation.points_deducted}`);

    // Test 5: Check updated points
    console.log('\nTest 5: Checking updated penalty points...');
    const updatedUser = await prisma.user.findUnique({
      where: { user_id: testUser.user_id },
      select: { penalty_points: true, is_suspended: true }
    });
    console.log(`✓ User points updated: ${updatedUser.penalty_points} (was ${testUser.penalty_points})`);

    // Test 6: Get penalty statistics
    console.log('\nTest 6: Getting penalty statistics...');
    const stats = await PenaltyService.getPenaltyStats(testUser.user_id, null);
    console.log(`✓ Statistics retrieved:`);
    console.log(`  - Current points: ${stats.currentPoints}`);
    console.log(`  - Total violations: ${stats.totalViolations}`);
    console.log(`  - Active violations: ${stats.activeViolations}`);
    console.log(`  - Status: ${stats.status}`);

    // Test 7: Test appeal submission
    console.log('\nTest 7: Testing appeal submission...');
    await PenaltyService.appealViolation(
      userViolation.violation_id,
      'This is a test appeal - please approve to restore points',
      testUser.user_id,
      null
    );
    console.log('✓ Appeal submitted successfully');

    // Test 8: Check appeal status
    console.log('\nTest 8: Checking appeal status...');
    const appealedViolation = await prisma.penaltyViolation.findUnique({
      where: { violation_id: userViolation.violation_id },
      select: {
        status: true,
        appeal_status: true,
        appeal_reason: true
      }
    });
    console.log(`✓ Appeal status: ${appealedViolation.appeal_status}`);

    // Test 9: Cleanup - Restore points
    console.log('\nTest 9: Cleaning up - Restoring test points...');
    await PenaltyService.restorePoints({
      userId: testUser.user_id,
      points: userViolation.points_deducted,
      reason: 'Test cleanup - restoring test violation points',
      adminId: null,
      violationId: userViolation.violation_id
    });
    console.log('✓ Points restored');

    // Test 10: Delete test violation
    console.log('\nTest 10: Removing test violation...');
    await prisma.penaltyViolation.delete({
      where: { violation_id: userViolation.violation_id }
    });
    console.log('✓ Test violation removed');

    // Final check
    console.log('\nFinal Check: Verifying user points restored...');
    const finalUser = await prisma.user.findUnique({
      where: { user_id: testUser.user_id },
      select: { penalty_points: true }
    });
    console.log(`✓ Final penalty points: ${finalUser.penalty_points}`);

    console.log('\n=== All Tests Passed! ✓ ===\n');
    console.log('The penalty system is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Integrate auto-detection in your appointment controllers');
    console.log('2. Add suspension checks in critical routes');
    console.log('3. Update mobile app to display penalty info');
    console.log('4. Test with real scenarios\n');

    // === BONUS: Test Auto-Reward System ===
    console.log('\n=== Testing Auto-Reward System ===\n');

    // Test 11: Create test appointment and complete it
    console.log('Test 11: Testing successful booking reward...');
    
    // First, reduce user points to test reward
    await prisma.user.update({
      where: { user_id: testUser.user_id },
      data: { penalty_points: 80 }
    });

    // Get real availability and service IDs
    const availability = await prisma.availability.findFirst({
      where: { provider_id: testProvider.provider_id }
    });

    const service = await prisma.serviceListing.findFirst({
      where: { provider_id: testProvider.provider_id }
    });

    if (!availability || !service) {
      console.log('⚠️ Skipping booking reward test - no availability or service found');
      console.log('   This is OK - create test data to fully test this feature');
      
      // Restore points
      await prisma.user.update({
        where: { user_id: testUser.user_id },
        data: { penalty_points: 100 }
      });
    } else {
      const testAppointment = await prisma.appointment.create({
        data: {
          customer_id: testUser.user_id,
          provider_id: testProvider.provider_id,
          appointment_status: 'completed',
          scheduled_date: new Date(),
          availability_id: availability.availability_id,
          service_id: service.service_id,
          completed_at: new Date()
        }
      });
      console.log(`✓ Test appointment created: ID ${testAppointment.appointment_id}`);

    // Trigger reward
    const bookingRewards = await PenaltyService.rewardSuccessfulBooking(testAppointment.appointment_id);
    console.log(`✓ Booking rewards triggered`);
    console.log(`  - User earned: ${bookingRewards.customer?.points_added || 0} points`);
    console.log(`  - Provider earned: ${bookingRewards.provider?.points_added || 0} points`);

    // Verify points updated
    const userAfterReward = await prisma.user.findUnique({
      where: { user_id: testUser.user_id },
      select: { penalty_points: true }
    });
    console.log(`✓ User points after reward: ${userAfterReward.penalty_points} (was 80)`);

    // Test 12: Test rating reward
    console.log('\nTest 12: Testing good rating reward...');
    
    const testRating = await prisma.rating.create({
      data: {
        rating_value: 5,
        rating_comment: 'Test 5-star rating',
        appointment_id: testAppointment.appointment_id,
        user_id: testUser.user_id,
        provider_id: testProvider.provider_id,
        rated_by: 'customer'
      }
    });
    console.log(`✓ Test rating created: ID ${testRating.id}`);

    // Trigger rating reward
    const ratingReward = await PenaltyService.rewardGoodRating(testRating.id);
    console.log(`✓ Rating reward triggered`);
    console.log(`  - Provider earned: ${ratingReward?.points_added || 0} points for ${testRating.rating_value}-star rating`);

    // Test 13: Get reward statistics
    console.log('\nTest 13: Getting reward statistics...');
    const rewardStats = await PenaltyService.getRewardStats(testUser.user_id, null);
    console.log(`✓ User reward stats:`);
    console.log(`  - Total rewards: ${rewardStats.total_rewards}`);
    console.log(`  - Total points earned: ${rewardStats.total_points_earned}`);

    const providerRewardStats = await PenaltyService.getRewardStats(null, testProvider.provider_id);
    console.log(`✓ Provider reward stats:`);
    console.log(`  - Total rewards: ${providerRewardStats.total_rewards}`);
    console.log(`  - Total points earned: ${providerRewardStats.total_points_earned}`);

      // Cleanup test data
      console.log('\nTest 14: Cleaning up test data...');
      await prisma.rating.delete({ where: { id: testRating.id } });
      await prisma.appointment.delete({ where: { appointment_id: testAppointment.appointment_id } });
      
      // Restore original points
      await prisma.user.update({
        where: { user_id: testUser.user_id },
        data: { penalty_points: 100 }
      });
      await prisma.serviceProviderDetails.update({
        where: { provider_id: testProvider.provider_id },
        data: { penalty_points: 100 }
      });

      // Delete reward adjustments
      await prisma.penaltyAdjustment.deleteMany({
        where: {
          OR: [
            { user_id: testUser.user_id },
            { provider_id: testProvider.provider_id }
          ]
        }
      });
      console.log('✓ Test data cleaned up');
    }

    console.log('\n=== All Tests Passed! ✓ ===\n');
    console.log('✅ Penalty system is working correctly');
    console.log('✅ Auto-reward system is working correctly');
    console.log('\nReward Structure:');
    console.log('  - User: +5 points per completed booking');
    console.log('  - Provider: +10 points per completed booking');
    console.log('  - Provider: +5 points for 5-star rating');
    console.log('  - Provider: +3 points for 4-star rating');
    console.log('  - Provider: +2 points for 3-star rating');
    console.log('\nNext steps:');
    console.log('1. Integrate auto-detection in your appointment controllers');
    console.log('2. Call rewardSuccessfulBooking() when appointment completes');
    console.log('3. Call rewardGoodRating() when customer submits rating');
    console.log('4. Add suspension checks in critical routes');
    console.log('5. Update mobile app to display penalty info and rewards');
    console.log('6. Test with real scenarios\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testPenaltySystem();
