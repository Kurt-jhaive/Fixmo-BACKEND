const { PrismaClient } = require('@prisma/client');

async function fixConversations() {
    const prisma = new PrismaClient();
    
    try {
        // Check existing conversations and their appointment data
        const conversations = await prisma.conversation.findMany({
            include: {
                appointment: {
                    select: {
                        appointment_id: true,
                        appointment_status: true,
                        scheduled_date: true
                    }
                }
            }
        });
        
        console.log('📋 Current conversations:');
        conversations.forEach(conv => {
            console.log(`Conversation ${conv.conversation_id}:`);
            console.log(`  - Appointment ID: ${conv.appointment_id}`);
            console.log(`  - Appointment Data:`, conv.appointment ? `ID ${conv.appointment.appointment_id}, Status: ${conv.appointment.appointment_status}` : 'NULL');
            console.log('');
        });
        
        // Check if we have any appointments
        const appointments = await prisma.appointment.findMany({
            take: 5,
            select: {
                appointment_id: true,
                appointment_status: true,
                customer_id: true,
                provider_id: true
            }
        });
        
        console.log('📅 Available appointments:');
        appointments.forEach(app => {
            console.log(`  - ID: ${app.appointment_id}, Status: ${app.appointment_status}, Customer: ${app.customer_id}, Provider: ${app.provider_id}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixConversations();
