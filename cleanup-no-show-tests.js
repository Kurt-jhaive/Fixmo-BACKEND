import prisma from './src/prismaclient.js';

/**
 * Cleanup No-Show Test Appointments
 * Deletes the test appointments created by test-no-show.js
 */

async function cleanupNoShowTests() {
  console.log('\n=== Cleaning Up No-Show Test Appointments ===\n');

  try {
    // Delete the test appointments (IDs 70-73 from the last run)
    console.log('Deleting test appointments...');
    
    const deletedAppointments = await prisma.appointment.deleteMany({
      where: {
        appointment_id: {
          in: [70, 71, 72, 73]
        }
      }
    });

    console.log(`✓ Deleted ${deletedAppointments.count} test appointments`);
    console.log('\n✅ Cleanup complete!\n');

  } catch (error) {
    console.error('❌ Error cleaning up test appointments:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupNoShowTests()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
