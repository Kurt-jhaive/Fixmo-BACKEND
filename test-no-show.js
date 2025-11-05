import prisma from './src/prismaclient.js';

/**
 * Test No-Show Appointment Setup
 * Creates test appointments in different states to test no-show reporting
 */

async function setupNoShowTests() {
  console.log('\n=== Setting Up No-Show Test Appointments ===\n');

  try {
    // Get a test customer
    console.log('Step 1: Finding test customer...');
    const customer = await prisma.user.findFirst({
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        email: true
      }
    });
    
    if (!customer) {
      console.log('❌ No customers found. Please create a customer account first.');
      return;
    }
    
    console.log(`✓ Found customer: ${customer.first_name} ${customer.last_name} (ID: ${customer.user_id})`);

    // Get a test provider
    console.log('\nStep 2: Finding test provider...');
    const provider = await prisma.serviceProviderDetails.findFirst({
      where: {
        provider_isActivated: true,
        provider_isVerified: true
      },
      select: {
        provider_id: true,
        provider_first_name: true,
        provider_last_name: true,
        provider_email: true
      }
    });
    
    if (!provider) {
      console.log('❌ No active providers found. Please create and activate a provider first.');
      return;
    }
    
    console.log(`✓ Found provider: ${provider.provider_first_name} ${provider.provider_last_name} (ID: ${provider.provider_id})`);

    // Get a service listing from the provider
    console.log('\nStep 3: Finding provider service...');
    const service = await prisma.serviceListing.findFirst({
      where: {
        provider_id: provider.provider_id
      },
      select: {
        service_id: true,
        service_title: true
      }
    });
    
    if (!service) {
      console.log('❌ No services found for this provider. Please create a service listing first.');
      return;
    }
    
    console.log(`✓ Found service: ${service.service_title} (ID: ${service.service_id})`);

    // Get an availability slot
    console.log('\nStep 4: Finding provider availability...');
    const availability = await prisma.availability.findFirst({
      where: {
        provider_id: provider.provider_id,
        availability_isActive: true
      },
      select: {
        availability_id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true
      }
    });
    
    if (!availability) {
      console.log('❌ No availability slots found. Please set provider availability first.');
      return;
    }
    
    console.log(`✓ Found availability: ${availability.dayOfWeek} ${availability.startTime}-${availability.endTime}`);

    // Create test appointments
    console.log('\n=== Creating Test Appointments ===\n');

    // Test Case 1: Provider can report (On the Way, 60 mins ago)
    console.log('Test Case 1: Creating "On the Way" appointment (60 mins ago)...');
    const now = new Date();
    const sixtyMinsAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const appointment1 = await prisma.appointment.create({
      data: {
        customer_id: customer.user_id,
        provider_id: provider.provider_id,
        service_id: service.service_id,
        availability_id: availability.availability_id,
        appointment_status: 'On the Way',
        scheduled_date: sixtyMinsAgo,
        repairDescription: 'Test appointment - Provider can report no-show (60 mins elapsed)'
      }
    });
    
    console.log(`✓ Created appointment ID: ${appointment1.appointment_id}`);
    console.log(`  - Status: ${appointment1.appointment_status}`);
    console.log(`  - Scheduled: ${appointment1.scheduled_date.toISOString()}`);
    console.log(`  - Time elapsed: 60 minutes ✓ (Can report)`);
    console.log(`  - Provider can report: YES (grace period met)`);

    // Test Case 2: Provider cannot report yet (On the Way, 30 mins ago)
    console.log('\nTest Case 2: Creating "On the Way" appointment (30 mins ago)...');
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    const appointment2 = await prisma.appointment.create({
      data: {
        customer_id: customer.user_id,
        provider_id: provider.provider_id,
        service_id: service.service_id,
        availability_id: availability.availability_id,
        appointment_status: 'On the Way',
        scheduled_date: thirtyMinsAgo,
        repairDescription: 'Test appointment - Provider cannot report yet (30 mins elapsed)'
      }
    });
    
    console.log(`✓ Created appointment ID: ${appointment2.appointment_id}`);
    console.log(`  - Status: ${appointment2.appointment_status}`);
    console.log(`  - Scheduled: ${appointment2.scheduled_date.toISOString()}`);
    console.log(`  - Time elapsed: 30 minutes ✗ (Grace period: 45 mins)`);
    console.log(`  - Provider can report: NO (need to wait 15 more minutes)`);

    // Test Case 3: Customer can report (Scheduled, time passed)
    console.log('\nTest Case 3: Creating "scheduled" appointment (past end time)...');
    // Create a scheduled date in the past
    const pastDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    const appointment3 = await prisma.appointment.create({
      data: {
        customer_id: customer.user_id,
        provider_id: provider.provider_id,
        service_id: service.service_id,
        availability_id: availability.availability_id,
        appointment_status: 'scheduled',
        scheduled_date: pastDate,
        repairDescription: 'Test appointment - Customer can report no-show (time passed)'
      }
    });
    
    console.log(`✓ Created appointment ID: ${appointment3.appointment_id}`);
    console.log(`  - Status: ${appointment3.appointment_status}`);
    console.log(`  - Scheduled: ${appointment3.scheduled_date.toISOString()}`);
    console.log(`  - Slot end time: ${availability.endTime}`);
    console.log(`  - Current time is past appointment: YES ✓`);
    console.log(`  - Customer can report: YES (provider didn't show)`);

    // Test Case 4: Customer cannot report yet (Scheduled, time not passed)
    console.log('\nTest Case 4: Creating "scheduled" appointment (future time)...');
    const futureDate = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
    
    const appointment4 = await prisma.appointment.create({
      data: {
        customer_id: customer.user_id,
        provider_id: provider.provider_id,
        service_id: service.service_id,
        availability_id: availability.availability_id,
        appointment_status: 'scheduled',
        scheduled_date: futureDate,
        repairDescription: 'Test appointment - Customer cannot report yet (future time)'
      }
    });
    
    console.log(`✓ Created appointment ID: ${appointment4.appointment_id}`);
    console.log(`  - Status: ${appointment4.appointment_status}`);
    console.log(`  - Scheduled: ${appointment4.scheduled_date.toISOString()}`);
    console.log(`  - Slot end time: ${availability.endTime}`);
    console.log(`  - Current time is past appointment: NO ✗`);
    console.log(`  - Customer can report: NO (must wait until appointment time)`);

    // Summary
    console.log('\n=== Test Summary ===\n');
    console.log('📝 Created 4 test appointments for no-show testing:\n');
    
    console.log('Provider Testing:');
    console.log(`  ✅ Appointment ${appointment1.appointment_id} - CAN report (60 mins elapsed)`);
    console.log(`     POST /api/serviceProvider/appointments/${appointment1.appointment_id}/report-no-show`);
    console.log(`  ❌ Appointment ${appointment2.appointment_id} - CANNOT report (30 mins, need 45)`);
    console.log(`     POST /api/serviceProvider/appointments/${appointment2.appointment_id}/report-no-show`);
    
    console.log('\nCustomer Testing:');
    console.log(`  ✅ Appointment ${appointment3.appointment_id} - CAN report (time passed)`);
    console.log(`     POST /auth/appointments/${appointment3.appointment_id}/report-no-show`);
    console.log(`  ❌ Appointment ${appointment4.appointment_id} - CANNOT report (future time)`);
    console.log(`     POST /auth/appointments/${appointment4.appointment_id}/report-no-show`);

    console.log('\n=== Testing Instructions ===\n');
    console.log('Provider App Test (Success Case):');
    console.log(`1. Login as provider: ${provider.provider_email}`);
    console.log(`2. Navigate to appointment ${appointment1.appointment_id}`);
    console.log(`3. Click "Report No-Show" button`);
    console.log(`4. Upload photo evidence`);
    console.log(`5. Enter description: "Customer not present at location"`);
    console.log(`6. Submit - Should succeed (60 mins elapsed > 45 mins grace)`);
    console.log(`7. Verify customer penalty points decreased by 10`);

    console.log('\nProvider App Test (Failure Case):');
    console.log(`1. Try to report appointment ${appointment2.appointment_id}`);
    console.log(`2. Should fail with "Grace period not met" error`);
    console.log(`3. Error should show: "Need to wait 15 more minutes"`);

    console.log('\nCustomer App Test (Success Case):');
    console.log(`1. Login as customer: ${customer.email}`);
    console.log(`2. Navigate to appointment ${appointment3.appointment_id}`);
    console.log(`3. Click "Report No-Show" button`);
    console.log(`4. Upload photo evidence`);
    console.log(`5. Enter description: "Provider never arrived for scheduled appointment"`);
    console.log(`6. Submit - Should succeed (appointment time passed)`);
    console.log(`7. Verify provider penalty points decreased by 15`);

    console.log('\nCustomer App Test (Failure Case):');
    console.log(`1. Try to report appointment ${appointment4.appointment_id}`);
    console.log(`2. Should fail with "Appointment time not passed" error`);
    console.log(`3. Error should show appointment end time and current time`);

    console.log('\n=== API Endpoints ===\n');
    console.log('Provider Report No-Show:');
    console.log('  POST /api/serviceProvider/appointments/:appointmentId/report-no-show');
    console.log('  Headers: Authorization: Bearer <provider_token>');
    console.log('  Body (multipart/form-data):');
    console.log('    - evidence_photo: <image_file>');
    console.log('    - description: <string>');

    console.log('\nCustomer Report No-Show:');
    console.log('  POST /auth/appointments/:appointmentId/report-no-show');
    console.log('  Headers: Authorization: Bearer <customer_token>');
    console.log('  Body (multipart/form-data):');
    console.log('    - evidence_photo: <image_file>');
    console.log('    - description: <string>');

    console.log('\n=== Verification Queries ===\n');
    console.log('Check customer penalty points:');
    console.log(`  SELECT penalty_points FROM "User" WHERE user_id = ${customer.user_id};`);
    
    console.log('\nCheck provider penalty points:');
    console.log(`  SELECT penalty_points FROM "ServiceProviderDetails" WHERE provider_id = ${provider.provider_id};`);
    
    console.log('\nCheck violation records:');
    console.log(`  SELECT * FROM "PenaltyViolation" WHERE user_id = ${customer.user_id} OR provider_id = ${provider.provider_id} ORDER BY created_at DESC;`);

    console.log('\n✅ Test setup complete! Ready for testing in mobile app.\n');

  } catch (error) {
    console.error('❌ Error setting up no-show tests:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupNoShowTests()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
