import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNullAvailability() {
    try {
        console.log('🔍 Finding appointments with NULL availability_id...\n');
        
        const appointmentsWithNullAvailability = await prisma.appointment.findMany({
            where: {
                availability_id: null
            },
            select: {
                appointment_id: true,
                provider_id: true,
                scheduled_date: true,
                appointment_status: true
            }
        });

        console.log(`Found ${appointmentsWithNullAvailability.length} appointments with NULL availability_id\n`);

        if (appointmentsWithNullAvailability.length === 0) {
            console.log('✅ No NULL availability_id values found. Safe to migrate!');
            return;
        }

        console.log('📋 Appointments with NULL availability_id:');
        appointmentsWithNullAvailability.forEach(apt => {
            console.log(`  - Appointment ${apt.appointment_id}: Provider ${apt.provider_id}, Date: ${apt.scheduled_date}, Status: ${apt.appointment_status}`);
        });

        console.log('\n🔧 For each appointment, we need to find a matching availability slot...\n');

        let fixed = 0;
        let cantFix = [];

        for (const apt of appointmentsWithNullAvailability) {
            // Get the day of week from scheduled_date
            const scheduledDate = new Date(apt.scheduled_date);
            const dayOfWeek = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' });

            // Find an availability slot for this provider on this day
            const availabilitySlot = await prisma.availability.findFirst({
                where: {
                    provider_id: apt.provider_id,
                    dayOfWeek: dayOfWeek,
                    availability_isActive: true
                },
                orderBy: {
                    availability_id: 'asc' // Get the first available slot
                }
            });

            if (availabilitySlot) {
                // Update the appointment with this availability_id
                await prisma.appointment.update({
                    where: { appointment_id: apt.appointment_id },
                    data: { availability_id: availabilitySlot.availability_id }
                });
                
                console.log(`✅ Fixed appointment ${apt.appointment_id}: assigned availability_id ${availabilitySlot.availability_id} (${dayOfWeek})`);
                fixed++;
            } else {
                console.log(`⚠️  Cannot fix appointment ${apt.appointment_id}: No availability slot found for provider ${apt.provider_id} on ${dayOfWeek}`);
                cantFix.push(apt);
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Fixed: ${fixed}`);
        console.log(`   Cannot fix: ${cantFix.length}`);

        if (cantFix.length > 0) {
            console.log('\n⚠️  The following appointments need manual attention:');
            cantFix.forEach(apt => {
                const dayOfWeek = new Date(apt.scheduled_date).toLocaleDateString('en-US', { weekday: 'long' });
                console.log(`   - Appointment ${apt.appointment_id}: Provider ${apt.provider_id} needs availability slot for ${dayOfWeek}`);
            });
        } else {
            console.log('\n✅ All appointments fixed! You can now run: npx prisma migrate dev');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixNullAvailability();
