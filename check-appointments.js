const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAppointments() {
    try {
        const appointments = await prisma.appointment.findMany({ 
            take: 10,
            include: { 
                customer: { select: { user_id: true, first_name: true, last_name: true } },
                serviceProvider: { select: { provider_id: true, provider_first_name: true } }
            } 
        });
        
        console.log('Available appointments:');
        appointments.forEach(app => {
            console.log(`ID: ${app.appointment_id}, Customer: ${app.customer.first_name} ${app.customer.last_name}, Provider: ${app.serviceProvider.provider_first_name}, Status: ${app.appointment_status}`);
        });
        
        if (appointments.length === 0) {
            console.log('No appointments found. Creating a test appointment...');
            
            // Get first customer and provider
            const customer = await prisma.user.findFirst();
            const provider = await prisma.serviceProvider.findFirst();
            const availability = await prisma.availability.findFirst();
            const service = await prisma.service.findFirst();
            
            if (customer && provider && availability && service) {
                const testAppointment = await prisma.appointment.create({
                    data: {
                        customer_id: customer.user_id,
                        provider_id: provider.provider_id,
                        availability_id: availability.availability_id,
                        service_id: service.service_id,
                        scheduled_date: new Date(),
                        appointment_status: 'confirmed'
                    }
                });
                console.log(`✅ Created test appointment with ID: ${testAppointment.appointment_id}`);
            } else {
                console.log('❌ Cannot create test appointment: missing customer, provider, availability, or service');
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAppointments();
