import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAppointment41() {
    try {
        console.log('🔍 Checking Appointment #41...\n');
        
        const apt = await prisma.appointment.findUnique({
            where: { appointment_id: 41 },
            include: {
                customer: {
                    select: { user_id: true, first_name: true, last_name: true }
                },
                serviceProvider: {
                    select: { provider_id: true, provider_first_name: true, provider_last_name: true }
                }
            }
        });

        if (!apt) {
            console.log('❌ Appointment #41 not found');
            return;
        }

        console.log('📋 Appointment Details:');
        console.log(`   ID: ${apt.appointment_id}`);
        console.log(`   Status: ${apt.appointment_status}`);
        console.log(`   Customer: ${apt.customer.first_name} ${apt.customer.last_name} (ID: ${apt.customer.user_id})`);
        console.log(`   Provider: ${apt.serviceProvider.provider_first_name} ${apt.serviceProvider.provider_last_name} (ID: ${apt.serviceProvider.provider_id})`);
        console.log(`   Warranty Days: ${apt.warranty_days}`);
        console.log(`   Finished At: ${apt.finished_at ? apt.finished_at.toISOString() : 'null'}`);
        console.log(`   Warranty Expires At: ${apt.warranty_expires_at ? apt.warranty_expires_at.toISOString() : 'null'}`);
        console.log('');

        // Check warranty status
        const now = new Date();
        if (apt.warranty_expires_at) {
            const expiryDate = new Date(apt.warranty_expires_at);
            const isExpired = now > expiryDate;
            const diffMs = isExpired ? now - expiryDate : expiryDate - now;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            console.log(`⏰ Warranty Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
            console.log(`   ${isExpired ? 'Expired' : 'Expires in'}: ${diffDays} days, ${diffHours} hours`);
        } else {
            console.log('⚠️  No warranty expiration date set');
        }
        console.log('');

        // Find the conversation
        const conv = await prisma.conversation.findFirst({
            where: {
                customer_id: apt.customer_id,
                provider_id: apt.provider_id
            }
        });

        if (!conv) {
            console.log('❌ No conversation found for this customer-provider pair');
            return;
        }

        console.log('💬 Conversation Details:');
        console.log(`   ID: ${conv.conversation_id}`);
        console.log(`   Status: ${conv.status}`);
        console.log(`   Warranty Expires: ${conv.warranty_expires ? conv.warranty_expires.toISOString() : 'null'}`);
        console.log(`   Created: ${conv.created_at.toISOString()}`);
        console.log(`   Updated: ${conv.updated_at.toISOString()}`);
        console.log('');

        // Check conversation warranty status
        if (conv.warranty_expires) {
            const convExpiryDate = new Date(conv.warranty_expires);
            const isConvExpired = now > convExpiryDate;
            const diffMs = isConvExpired ? now - convExpiryDate : convExpiryDate - now;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            console.log(`⏰ Conversation Warranty: ${isConvExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
            console.log(`   ${isConvExpired ? 'Expired' : 'Expires in'}: ${diffDays} days, ${diffHours} hours`);
        }
        console.log('');

        // Analysis
        console.log('🔍 Analysis:');
        if (apt.appointment_status === 'in-warranty' && apt.warranty_expires_at) {
            const aptExpired = now > new Date(apt.warranty_expires_at);
            const convExpired = conv.warranty_expires ? now > new Date(conv.warranty_expires) : true;
            
            if (!aptExpired && conv.status === 'closed') {
                console.log('   ⚠️  PROBLEM: Appointment warranty is active but conversation is closed!');
                console.log('   💡 FIX: Conversation should be reopened or warranty_expires should match appointment');
            } else if (aptExpired && conv.status === 'active') {
                console.log('   ⚠️  PROBLEM: Appointment warranty expired but conversation is still active!');
                console.log('   💡 FIX: Appointment should be auto-completed and conversation closed');
            } else if (!aptExpired && !convExpired && conv.status === 'closed') {
                console.log('   ⚠️  PROBLEM: Both warranties active but conversation is closed!');
                console.log('   💡 FIX: Conversation should be reopened');
            } else {
                console.log('   ✅ Everything looks consistent');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAppointment41();
