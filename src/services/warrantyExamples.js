/**
 * Fixmo Warranty Conversation System - Example Queries and Test Scripts
 * 
 * This file demonstrates how to use the new warranty-based conversation system
 * with sample Prisma queries and usage examples.
 */

import { PrismaClient } from '@prisma/client';
import {
    calculateWarrantyExpiry,
    findOrCreateConversation,
    extendConversationWarranty,
    handleAppointmentWarranty,
    closeExpiredConversations,
    isMessagingAllowed
} from '../services/conversationWarrantyService.js';

const prisma = new PrismaClient();

// ========================================
// Example 1: Creating a Warranty Conversation
// ========================================

export const exampleCreateWarrantyConversation = async () => {
    console.log('\n🔧 Example 1: Creating a Warranty Conversation');
    
    try {
        // Simulate appointment completion
        const appointment = {
            appointment_id: 1,
            customer_id: 1,
            provider_id: 1,
            service_id: 1,
            warranty_days: 30,
            finished_at: new Date(),
            completed_at: new Date()
        };

        // Handle warranty conversation creation/extension
        const conversation = await handleAppointmentWarranty(appointment, 'completed');
        
        console.log('✅ Warranty conversation created/updated:');
        console.log(`   - Conversation ID: ${conversation?.conversation_id}`);
        console.log(`   - Customer ID: ${appointment.customer_id}`);
        console.log(`   - Provider ID: ${appointment.provider_id}`);
        console.log(`   - Warranty expires: ${conversation?.warranty_expires}`);
        
        return conversation;
    } catch (error) {
        console.error('❌ Error in example 1:', error);
    }
};

// ========================================
// Example 2: Extending Warranty Period
// ========================================

export const exampleExtendWarranty = async () => {
    console.log('\n🔧 Example 2: Extending Warranty Period');
    
    try {
        // Simulate a second appointment with longer warranty
        const newAppointment = {
            appointment_id: 2,
            customer_id: 1,  // Same customer
            provider_id: 1,  // Same provider
            service_id: 2,
            warranty_days: 60, // Longer warranty
            finished_at: new Date(),
            completed_at: new Date()
        };

        const conversation = await handleAppointmentWarranty(newAppointment, 'completed');
        
        console.log('✅ Warranty extended:');
        console.log(`   - Conversation ID: ${conversation?.conversation_id}`);
        console.log(`   - New warranty expires: ${conversation?.warranty_expires}`);
        
        return conversation;
    } catch (error) {
        console.error('❌ Error in example 2:', error);
    }
};

// ========================================
// Example 3: Sample Prisma Queries
// ========================================

export const examplePrismaQueries = async () => {
    console.log('\n🔧 Example 3: Sample Prisma Queries');
    
    try {
        // Query 1: Get all active conversations with warranty info
        console.log('\n📊 Query 1: Active conversations with warranty');
        const activeConversations = await prisma.conversation.findMany({
            where: { status: 'active' },
            include: {
                customer: {
                    select: { first_name: true, last_name: true, email: true }
                },
                provider: {
                    select: { 
                        provider_first_name: true, 
                        provider_last_name: true, 
                        provider_email: true 
                    }
                },
                _count: { select: { messages: true } }
            }
        });
        
        console.log(`   Found ${activeConversations.length} active conversations`);
        activeConversations.forEach(conv => {
            const isExpired = conv.warranty_expires && new Date() > conv.warranty_expires;
            console.log(`   - ID: ${conv.conversation_id}, Warranty: ${conv.warranty_expires?.toISOString()}, Expired: ${isExpired}`);
        });

        // Query 2: Find conversations expiring in next 7 days
        console.log('\n📊 Query 2: Conversations expiring soon');
        const soon = new Date();
        soon.setDate(soon.getDate() + 7);
        
        const expiringSoon = await prisma.conversation.findMany({
            where: {
                status: 'active',
                warranty_expires: {
                    gte: new Date(),
                    lte: soon
                }
            },
            orderBy: { warranty_expires: 'asc' }
        });
        
        console.log(`   Found ${expiringSoon.length} conversations expiring in next 7 days`);

        // Query 3: Get conversation statistics by status
        console.log('\n📊 Query 3: Conversation statistics');
        const stats = await prisma.conversation.groupBy({
            by: ['status'],
            _count: { conversation_id: true }
        });
        
        stats.forEach(stat => {
            console.log(`   - ${stat.status}: ${stat._count.conversation_id} conversations`);
        });

        return { activeConversations, expiringSoon, stats };
    } catch (error) {
        console.error('❌ Error in example 3:', error);
    }
};

// ========================================
// Example 4: Testing Messaging Permissions
// ========================================

export const exampleMessagingPermissions = async () => {
    console.log('\n🔧 Example 4: Testing Messaging Permissions');
    
    try {
        const customerId = 1;
        const providerId = 1;
        
        // Check if messaging is allowed
        const isAllowed = await isMessagingAllowed(customerId, providerId);
        console.log(`   - Messaging allowed for customer ${customerId} & provider ${providerId}: ${isAllowed}`);
        
        if (isAllowed) {
            // Get warranty expiry info
            const conversation = await prisma.conversation.findFirst({
                where: {
                    customer_id: customerId,
                    provider_id: providerId,
                    status: 'active'
                },
                select: {
                    conversation_id: true,
                    warranty_expires: true,
                    created_at: true
                }
            });
            
            if (conversation) {
                const daysLeft = Math.ceil((new Date(conversation.warranty_expires) - new Date()) / (1000 * 60 * 60 * 24));
                console.log(`   - Warranty expires in ${daysLeft} days`);
                console.log(`   - Conversation created: ${conversation.created_at.toISOString()}`);
            }
        }
        
        return isAllowed;
    } catch (error) {
        console.error('❌ Error in example 4:', error);
    }
};

// ========================================
// Example 5: Manual Warranty Cleanup
// ========================================

export const exampleWarrantyCleanup = async () => {
    console.log('\n🔧 Example 5: Manual Warranty Cleanup');
    
    try {
        // Show expired conversations before cleanup
        const expiredBefore = await prisma.conversation.count({
            where: {
                status: 'active',
                warranty_expires: { lt: new Date() }
            }
        });
        
        console.log(`   - Expired conversations before cleanup: ${expiredBefore}`);
        
        // Run cleanup
        const closedConversations = await closeExpiredConversations();
        
        console.log(`   - Conversations closed: ${closedConversations.length}`);
        closedConversations.forEach(conv => {
            console.log(`     * ID: ${conv.conversation_id}, Expired: ${conv.warranty_expires.toISOString()}`);
        });
        
        return closedConversations;
    } catch (error) {
        console.error('❌ Error in example 5:', error);
    }
};

// ========================================
// Example 6: Appointment Workflow Simulation
// ========================================

export const exampleAppointmentWorkflow = async () => {
    console.log('\n🔧 Example 6: Complete Appointment Workflow');
    
    try {
        // Step 1: Appointment booked
        console.log('   Step 1: Appointment booked');
        const bookedAppointment = {
            appointment_id: 100,
            customer_id: 5,
            provider_id: 3,
            service_id: 1,
            warranty_days: 45,
            scheduled_date: new Date(),
            created_at: new Date()
        };
        
        let conversation = await handleAppointmentWarranty(bookedAppointment, 'booked');
        console.log(`     ✅ Conversation ${conversation?.conversation_id} created for booking`);
        
        // Step 2: Appointment finished
        console.log('   Step 2: Appointment finished');
        const finishedAppointment = {
            ...bookedAppointment,
            finished_at: new Date()
        };
        
        conversation = await handleAppointmentWarranty(finishedAppointment, 'finished');
        console.log(`     ✅ Conversation warranty updated for completion`);
        
        // Step 3: Customer completes appointment
        console.log('   Step 3: Customer marks as completed');
        const completedAppointment = {
            ...finishedAppointment,
            completed_at: new Date()
        };
        
        conversation = await handleAppointmentWarranty(completedAppointment, 'completed');
        console.log(`     ✅ Final conversation warranty set`);
        console.log(`     📅 Warranty expires: ${conversation?.warranty_expires?.toISOString()}`);
        
        return conversation;
    } catch (error) {
        console.error('❌ Error in example 6:', error);
    }
};

// ========================================
// Main Test Runner
// ========================================

export const runAllExamples = async () => {
    console.log('🚀 Running Fixmo Warranty Conversation System Examples\n');
    console.log('=' .repeat(60));
    
    try {
        await exampleCreateWarrantyConversation();
        await exampleExtendWarranty();
        await examplePrismaQueries();
        await exampleMessagingPermissions();
        await exampleWarrantyCleanup();
        await exampleAppointmentWorkflow();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ All examples completed successfully!');
        console.log('\n📚 Additional useful queries:');
        console.log('   - Find duplicate conversations: prisma.conversation.groupBy({ by: ["customer_id", "provider_id"], having: { conversation_id: { _count: { gt: 1 } } } })');
        console.log('   - Get warranty expiry dates: prisma.conversation.findMany({ select: { warranty_expires: true, status: true } })');
        console.log('   - Check message count per conversation: include: { _count: { select: { messages: true } } }');
        
    } catch (error) {
        console.error('❌ Error running examples:', error);
    } finally {
        await prisma.$disconnect();
    }
};

// Export individual examples for targeted testing
export default {
    exampleCreateWarrantyConversation,
    exampleExtendWarranty,
    examplePrismaQueries,
    exampleMessagingPermissions,
    exampleWarrantyCleanup,
    exampleAppointmentWorkflow,
    runAllExamples
};