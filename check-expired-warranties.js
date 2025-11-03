import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExpiredWarranties() {
    try {
        const now = new Date();
        console.log('🔍 Checking for expired warranties...');
        console.log('Current time:', now.toISOString());
        console.log('');

        // Find all in-warranty appointments
        const inWarrantyAppointments = await prisma.appointment.findMany({
            where: {
                appointment_status: { in: ['in-warranty', 'backjob'] }
            },
            select: {
                appointment_id: true,
                appointment_status: true,
                warranty_expires_at: true,
                warranty_paused_at: true,
                finished_at: true,
                warranty_days: true,
                customer_id: true,
                provider_id: true
            },
            orderBy: {
                warranty_expires_at: 'asc'
            }
        });

        console.log(`📋 Total in-warranty/backjob appointments: ${inWarrantyAppointments.length}`);
        console.log('');

        if (inWarrantyAppointments.length === 0) {
            console.log('✅ No in-warranty or backjob appointments found');
            return;
        }

        // Separate expired and active
        const expired = [];
        const active = [];

        for (const apt of inWarrantyAppointments) {
            const isExpired = apt.warranty_expires_at && apt.warranty_expires_at <= now;
            const isPaused = apt.warranty_paused_at !== null;
            
            if (isExpired && !isPaused) {
                expired.push(apt);
            } else {
                active.push(apt);
            }
        }

        console.log(`❌ Expired (should be completed): ${expired.length}`);
        console.log(`✅ Still active: ${active.length}`);
        console.log('');

        if (expired.length > 0) {
            console.log('🚨 EXPIRED APPOINTMENTS THAT NEED AUTO-COMPLETION:');
            expired.forEach(apt => {
                const expiryDate = new Date(apt.warranty_expires_at);
                const diffMs = now - expiryDate;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);
                
                console.log(`  - ID: ${apt.appointment_id}`);
                console.log(`    Status: ${apt.appointment_status}`);
                console.log(`    Expired: ${expiryDate.toISOString()}`);
                console.log(`    Overdue by: ${diffDays} days, ${diffHours % 24} hours`);
                console.log(`    Customer ID: ${apt.customer_id}, Provider ID: ${apt.provider_id}`);
                console.log('');
            });
        }

        if (active.length > 0) {
            console.log('✅ ACTIVE WARRANTY APPOINTMENTS:');
            active.forEach(apt => {
                if (apt.warranty_expires_at) {
                    const expiryDate = new Date(apt.warranty_expires_at);
                    const diffMs = expiryDate - now;
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffHours / 24);
                    
                    console.log(`  - ID: ${apt.appointment_id}`);
                    console.log(`    Status: ${apt.appointment_status}`);
                    console.log(`    Expires: ${expiryDate.toISOString()}`);
                    console.log(`    Time remaining: ${diffDays} days, ${diffHours % 24} hours`);
                    if (apt.warranty_paused_at) {
                        console.log(`    ⏸️  Paused at: ${apt.warranty_paused_at.toISOString()}`);
                    }
                    console.log('');
                } else {
                    console.log(`  - ID: ${apt.appointment_id}`);
                    console.log(`    Status: ${apt.appointment_status}`);
                    console.log(`    ⚠️  No warranty_expires_at set`);
                    console.log(`    warranty_days: ${apt.warranty_days}`);
                    console.log(`    finished_at: ${apt.finished_at ? apt.finished_at.toISOString() : 'null'}`);
                    console.log(`    ⚠️  PROBLEM: Cannot calculate expiry without warranty_expires_at!`);
                    console.log('');
                }
            });
            
            // Suggest fix
            const missingExpiry = active.filter(apt => !apt.warranty_expires_at && apt.warranty_days && apt.finished_at);
            if (missingExpiry.length > 0) {
                console.log('💡 SUGGESTED FIX:');
                console.log('The following appointments have warranty_days and finished_at but missing warranty_expires_at.');
                console.log('Running the auto-completion job will calculate and set these values.');
                console.log('');
                missingExpiry.forEach(apt => {
                    const finishedDate = new Date(apt.finished_at);
                    const calculatedExpiry = new Date(finishedDate);
                    calculatedExpiry.setDate(calculatedExpiry.getDate() + apt.warranty_days);
                    console.log(`  - Appointment ${apt.appointment_id}: Should expire on ${calculatedExpiry.toISOString()}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkExpiredWarranties();
