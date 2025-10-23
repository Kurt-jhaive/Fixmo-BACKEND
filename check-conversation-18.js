import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConversation18() {
    try {
        console.log('🔍 Checking Conversation #18 and all related appointments...\n');
        
        const conv = await prisma.conversation.findUnique({
            where: { conversation_id: 18 },
            include: {
                customer: {
                    select: { user_id: true, first_name: true, last_name: true }
                },
                provider: {
                    select: { provider_id: true, provider_first_name: true, provider_last_name: true }
                }
            }
        });

        if (!conv) {
            console.log('❌ Conversation #18 not found');
            return;
        }

        console.log('💬 Conversation Details:');
        console.log(`   ID: ${conv.conversation_id}`);
        console.log(`   Status: ${conv.status}`);
        console.log(`   Customer: ${conv.customer.first_name} ${conv.customer.last_name} (ID: ${conv.customer_id})`);
        console.log(`   Provider: ${conv.provider.provider_first_name} ${conv.provider.provider_last_name} (ID: ${conv.provider_id})`);
        console.log(`   Warranty Expires: ${conv.warranty_expires ? conv.warranty_expires.toISOString() : 'null'}`);
        console.log('');

        // Find ALL appointments for this customer-provider pair
        const appointments = await prisma.appointment.findMany({
            where: {
                customer_id: conv.customer_id,
                provider_id: conv.provider_id
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        console.log(`📋 Found ${appointments.length} appointment(s) for this customer-provider pair:\n`);

        const now = new Date();
        let latestWarrantyExpiry = null;
        let hasActiveWarranty = false;

        appointments.forEach((apt, index) => {
            console.log(`${index + 1}. Appointment #${apt.appointment_id}`);
            console.log(`   Status: ${apt.appointment_status}`);
            console.log(`   Created: ${apt.created_at.toISOString()}`);
            console.log(`   Warranty Days: ${apt.warranty_days}`);
            console.log(`   Finished At: ${apt.finished_at ? apt.finished_at.toISOString() : 'null'}`);
            console.log(`   Warranty Expires At: ${apt.warranty_expires_at ? apt.warranty_expires_at.toISOString() : 'null'}`);
            
            if (apt.warranty_expires_at) {
                const expiryDate = new Date(apt.warranty_expires_at);
                const isExpired = now > expiryDate;
                const diffMs = Math.abs(now - expiryDate);
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                console.log(`   Warranty: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'} (${isExpired ? 'expired' : 'expires'} ${diffDays} days ago/from now)`);
                
                // Track the latest warranty expiry
                if (!latestWarrantyExpiry || expiryDate > latestWarrantyExpiry) {
                    latestWarrantyExpiry = expiryDate;
                }
                
                // Check if this appointment has active warranty
                if (!isExpired && apt.appointment_status === 'in-warranty') {
                    hasActiveWarranty = true;
                }
            }
            console.log('');
        });

        console.log('🔍 Analysis:');
        console.log(`   Latest warranty expiry among all appointments: ${latestWarrantyExpiry ? latestWarrantyExpiry.toISOString() : 'none'}`);
        console.log(`   Conversation warranty_expires: ${conv.warranty_expires ? conv.warranty_expires.toISOString() : 'none'}`);
        console.log(`   Has active warranty: ${hasActiveWarranty ? '✅ YES' : '❌ NO'}`);
        console.log('');

        if (latestWarrantyExpiry && conv.warranty_expires) {
            const convDate = new Date(conv.warranty_expires);
            if (latestWarrantyExpiry > convDate) {
                console.log('   ⚠️  PROBLEM: Latest appointment warranty is NEWER than conversation warranty!');
                console.log(`   💡 FIX: Update conversation.warranty_expires to ${latestWarrantyExpiry.toISOString()}`);
            } else if (latestWarrantyExpiry < convDate) {
                console.log('   ⚠️  PROBLEM: Conversation warranty is NEWER than latest appointment!');
                console.log('   💡 This might be from a deleted appointment or data inconsistency');
            } else {
                console.log('   ✅ Conversation warranty matches latest appointment');
            }
        }

        if (hasActiveWarranty && conv.status === 'closed') {
            console.log('   ⚠️  CRITICAL: Active warranty exists but conversation is closed!');
            console.log('   💡 FIX: Reopen the conversation');
        }

        // Check if conversation warranty has expired but appointments are still active
        if (conv.warranty_expires && now > new Date(conv.warranty_expires) && hasActiveWarranty) {
            console.log('   ⚠️  CRITICAL: Conversation warranty expired but active appointment warranties exist!');
            console.log('   💡 FIX: Update conversation.warranty_expires to latest appointment expiry');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkConversation18();
