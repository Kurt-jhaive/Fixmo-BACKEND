// Enhanced test to check appointment warranty system
import { PrismaClient } from '@prisma/client';
import { checkAppointmentStatus, isMessagingAllowed } from './src/services/conversationWarrantyService.js';

const prisma = new PrismaClient();

async function testWarrantySystem() {
    console.log('🧪 Enhanced Warranty System Test...\n');

    try {
        // Test with specific appointments that have warranty data
        console.log('1. Looking for appointments with warranty data...');
        
        const appointmentsWithWarranty = await prisma.appointment.findMany({
            where: {
                OR: [
                    { warranty_expires_at: { not: null } },
                    { warranty_days: { not: null } },
                    { appointment_status: { in: ['in-warranty', 'finished'] } }
                ]
            },
            take: 5,
            select: {
                appointment_id: true,
                customer_id: true,
                provider_id: true,
                appointment_status: true,
                warranty_expires_at: true,
                warranty_days: true,
                finished_at: true,
                completed_at: true,
                created_at: true,
                service: {
                    select: {
                        warranty: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        console.log(`Found ${appointmentsWithWarranty.length} appointments with warranty info`);

        for (const appt of appointmentsWithWarranty) {
            console.log(`\n=== Appointment ${appt.appointment_id} ===`);
            console.log(`Status: ${appt.appointment_status}`);
            console.log(`Warranty Days: ${appt.warranty_days}`);
            console.log(`Service Warranty: ${appt.service?.warranty}`);
            console.log(`Warranty Expires At: ${appt.warranty_expires_at}`);
            console.log(`Finished At: ${appt.finished_at}`);
            console.log(`Completed At: ${appt.completed_at}`);

            // Check appointment status
            const statusResult = await checkAppointmentStatus(appt.customer_id, appt.provider_id);
            console.log('Status Check:', statusResult);

            // Check messaging allowance
            const messagingAllowed = await isMessagingAllowed(appt.customer_id, appt.provider_id);
            console.log(`Messaging Allowed: ${messagingAllowed}`);

            // Check if there's a conversation
            const conversation = await prisma.conversation.findFirst({
                where: {
                    customer_id: appt.customer_id,
                    provider_id: appt.provider_id
                }
            });
            
            if (conversation) {
                console.log(`Conversation: ID ${conversation.conversation_id}, Status: ${conversation.status}`);
            } else {
                console.log('No conversation found');
            }
        }

        // Test creating a mock expired warranty scenario
        console.log('\n2. Testing expired warranty scenario...');
        
        // Find an in-warranty appointment and simulate expiry
        const inWarrantyAppt = await prisma.appointment.findFirst({
            where: { appointment_status: 'in-warranty' }
        });

        if (inWarrantyAppt) {
            console.log(`\nSimulating expiry for appointment ${inWarrantyAppt.appointment_id}...`);
            
            // Temporarily set warranty to expire in the past
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            
            await prisma.appointment.update({
                where: { appointment_id: inWarrantyAppt.appointment_id },
                data: { warranty_expires_at: pastDate }
            });

            const expiredStatus = await checkAppointmentStatus(inWarrantyAppt.customer_id, inWarrantyAppt.provider_id);
            console.log('After setting expiry in past:', expiredStatus);

            // Check if appointment was auto-updated to completed
            const updatedAppt = await prisma.appointment.findUnique({
                where: { appointment_id: inWarrantyAppt.appointment_id },
                select: { appointment_status: true }
            });
            
            console.log(`Appointment status after expiry check: ${updatedAppt.appointment_status}`);
            
            // Reset the appointment for next tests
            await prisma.appointment.update({
                where: { appointment_id: inWarrantyAppt.appointment_id },
                data: { 
                    warranty_expires_at: null,
                    appointment_status: 'in-warranty'
                }
            });
            console.log('Reset appointment for future tests');
        }

        console.log('\n🎉 Enhanced test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testWarrantySystem();