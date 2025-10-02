// Test script to verify message controller appointment detection
import { PrismaClient } from '@prisma/client';
import { checkAppointmentStatus } from './src/services/conversationWarrantyService.js';

const prisma = new PrismaClient();

async function testAppointmentDetection() {
    console.log('🧪 Testing Appointment Status Detection...\n');

    try {
        // Test 1: Find a sample customer-provider pair
        console.log('1. Finding sample appointments...');
        const sampleAppointments = await prisma.appointment.findMany({
            where: {
                appointment_status: { in: ['in-warranty', 'completed', 'finished'] }
            },
            take: 3,
            select: {
                appointment_id: true,
                customer_id: true,
                provider_id: true,
                appointment_status: true,
                warranty_expires_at: true,
                finished_at: true,
                completed_at: true,
                warranty_days: true
            }
        });

        if (sampleAppointments.length === 0) {
            console.log('❌ No appointments found with relevant statuses');
            return;
        }

        console.log(`✅ Found ${sampleAppointments.length} appointments to test`);

        // Test 2: Check appointment status for each
        for (const appointment of sampleAppointments) {
            console.log(`\n--- Testing Appointment ${appointment.appointment_id} ---`);
            console.log(`Original Status: ${appointment.appointment_status}`);
            console.log(`Warranty Expires: ${appointment.warranty_expires_at}`);
            console.log(`Finished At: ${appointment.finished_at}`);
            console.log(`Completed At: ${appointment.completed_at}`);

            const status = await checkAppointmentStatus(appointment.customer_id, appointment.provider_id);
            
            console.log('Status Check Result:', {
                hasAppointment: status.hasAppointment,
                appointmentStatus: status.appointmentStatus,
                isCompleted: status.isCompleted,
                isInWarranty: status.isInWarranty,
                isExpired: status.isExpired
            });

            // Test conversation access
            const conversation = await prisma.conversation.findFirst({
                where: {
                    customer_id: appointment.customer_id,
                    provider_id: appointment.provider_id
                },
                select: {
                    conversation_id: true,
                    status: true,
                    warranty_expires: true
                }
            });

            if (conversation) {
                console.log(`Conversation ${conversation.conversation_id}: ${conversation.status}`);
                console.log(`Conversation should be: ${status.isInWarranty ? 'OPEN' : 'CLOSED'}`);
            } else {
                console.log('No conversation found for this appointment pair');
            }
        }

        console.log('\n🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testAppointmentDetection();