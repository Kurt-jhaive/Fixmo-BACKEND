import prisma from '../prismaclient.js';

/**
 * Seed Penalty Violation Types
 * Run this to initialize the violation types in the database
 */

async function seedViolationTypes() {
  console.log('Starting violation types seeding...');

  const violationTypes = [
    // USER VIOLATIONS
    {
      violation_code: 'USER_LATE_CANCEL',
      violation_name: 'Late Cancellation',
      violation_category: 'user',
      penalty_points: 10,
      description: 'Cancelling an appointment less than 24 hours before the schedule',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'USER_NO_SHOW',
      violation_name: 'No-Show',
      violation_category: 'user',
      penalty_points: 15,
      description: 'Failing to attend a booked service without cancellation',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'USER_REPEATED_NO_SHOW',
      violation_name: 'Repeated No-Shows',
      violation_category: 'user',
      penalty_points: 25,
      description: 'Three or more no-shows within seven days',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'USER_FAKE_COMPLAINT',
      violation_name: 'Fake Complaint',
      violation_category: 'user',
      penalty_points: 20,
      description: 'Submitting a fake complaint or false report against a provider',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'USER_RUDE_BEHAVIOR',
      violation_name: 'Rude or Disrespectful Behavior',
      violation_category: 'user',
      penalty_points: 20,
      description: 'Being rude or disrespectful toward a provider',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'USER_CHAT_SPAM',
      violation_name: 'Chat Spam/Abuse',
      violation_category: 'user',
      penalty_points: 30,
      description: 'Spamming or abusing the in-app chat system',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'USER_HARASSMENT',
      violation_name: 'Harassment',
      violation_category: 'user',
      penalty_points: 50,
      description: 'Harassing or threatening a service provider',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'USER_INAPPROPRIATE_CONTENT',
      violation_name: 'Inappropriate Content',
      violation_category: 'user',
      penalty_points: 25,
      description: 'Sending inappropriate or offensive content to providers',
      requires_evidence: true,
      auto_detect: false,
    },

    // PROVIDER VIOLATIONS
    {
      violation_code: 'PROVIDER_CANCEL_BOOKING',
      violation_name: 'Booking Cancellation',
      violation_category: 'provider',
      penalty_points: 15,
      description: 'Cancelling a confirmed booking',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'PROVIDER_NO_SHOW',
      violation_name: 'No-Show',
      violation_category: 'provider',
      penalty_points: 20,
      description: 'Failing to show up for a confirmed appointment',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'PROVIDER_REPEATED_NO_SHOW',
      violation_name: 'Repeated No-Shows',
      violation_category: 'provider',
      penalty_points: 30,
      description: 'Two or more no-shows within seven days',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'PROVIDER_LATE_RESPONSE',
      violation_name: 'Late Response to Booking',
      violation_category: 'provider',
      penalty_points: 5,
      description: 'Responding to a booking request later than 24 hours',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'PROVIDER_POOR_COMMUNICATION',
      violation_name: 'Poor Communication',
      violation_category: 'provider',
      penalty_points: 10,
      description: 'Three or more user complaints about poor communication within a week',
      requires_evidence: true,
      auto_detect: true,
    },
    {
      violation_code: 'PROVIDER_RUDE_BEHAVIOR',
      violation_name: 'Unprofessional Behavior',
      violation_category: 'provider',
      penalty_points: 20,
      description: 'Displaying rude or unprofessional behavior toward users',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'PROVIDER_SPAM',
      violation_name: 'Spam/Promotional Content',
      violation_category: 'provider',
      penalty_points: 15,
      description: 'Sending spam or unrelated promotional content in chats',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'PROVIDER_POOR_RATINGS',
      violation_name: 'Consecutive Poor Ratings',
      violation_category: 'provider',
      penalty_points: 5,
      description: 'Receiving three consecutive one-star ratings',
      requires_evidence: false,
      auto_detect: true,
    },
    {
      violation_code: 'PROVIDER_LATE_ARRIVAL',
      violation_name: 'Late Arrival',
      violation_category: 'provider',
      penalty_points: 5,
      description: 'Arriving more than 30 minutes late to a scheduled service',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'PROVIDER_HARASSMENT',
      violation_name: 'Harassment',
      violation_category: 'provider',
      penalty_points: 50,
      description: 'Harassing or threatening a customer',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'PROVIDER_INAPPROPRIATE_CONTENT',
      violation_name: 'Inappropriate Content',
      violation_category: 'provider',
      penalty_points: 25,
      description: 'Sending inappropriate or offensive content to customers',
      requires_evidence: true,
      auto_detect: false,
    },
    {
      violation_code: 'PROVIDER_FRAUD',
      violation_name: 'Fraudulent Activity',
      violation_category: 'provider',
      penalty_points: 100,
      description: 'Engaging in fraudulent or deceptive practices',
      requires_evidence: true,
      auto_detect: false,
    },
  ];

  let createdCount = 0;
  let updatedCount = 0;

  for (const violationType of violationTypes) {
    const existing = await prisma.violationType.findUnique({
      where: { violation_code: violationType.violation_code },
    });

    if (existing) {
      await prisma.violationType.update({
        where: { violation_code: violationType.violation_code },
        data: violationType,
      });
      updatedCount++;
      console.log(`✓ Updated: ${violationType.violation_code}`);
    } else {
      await prisma.violationType.create({
        data: violationType,
      });
      createdCount++;
      console.log(`✓ Created: ${violationType.violation_code}`);
    }
  }

  console.log('\n=== Seeding Complete ===');
  console.log(`Created: ${createdCount} violation types`);
  console.log(`Updated: ${updatedCount} violation types`);
  console.log(`Total: ${createdCount + updatedCount} violation types`);
}

// Run the seeder
seedViolationTypes()
  .then(() => {
    console.log('\n✓ Violation types seeded successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error seeding violation types:', error);
    process.exit(1);
  });
