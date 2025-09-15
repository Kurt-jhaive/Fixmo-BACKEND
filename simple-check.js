const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();
    
    try {
        // Check appointments
        const appointments = await prisma.appointment.findMany({ take: 5 });
        console.log('Found appointments:', appointments.length);
        
        if (appointments.length > 0) {
            appointments.forEach(app => {
                console.log(`Appointment ID: ${app.appointment_id}, Status: ${app.appointment_status}`);
            });
        } else {
            console.log('No appointments found');
        }
        
        // Check conversations
        const conversations = await prisma.conversation.findMany({ take: 5 });
        console.log('Found conversations:', conversations.length);
        
        if (conversations.length > 0) {
            conversations.forEach(conv => {
                console.log(`Conversation ID: ${conv.conversation_id}, Appointment: ${conv.appointment_id}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
