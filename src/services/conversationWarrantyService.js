import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate warranty expiry date for an appointment
 * @param {Date} baseDate - The base date (completion_date or booking_date)
 * @param {number} warrantyDays - Number of warranty days
 * @returns {Date} - The warranty expiry date
 */
export const calculateWarrantyExpiry = (baseDate, warrantyDays) => {
    if (!warrantyDays || warrantyDays <= 0) {
        return null;
    }
    
    const expiryDate = new Date(baseDate);
    expiryDate.setDate(expiryDate.getDate() + warrantyDays);
    return expiryDate;
};

/**
 * Find or create a conversation for a customer-provider pair
 * @param {number} customerId - Customer ID
 * @param {number} providerId - Provider ID
 * @param {Date} warrantyExpires - Initial warranty expiry date
 * @returns {Object} - The conversation object
 */
export const findOrCreateConversation = async (customerId, providerId, warrantyExpires = null) => {
    try {
        // First, try to find an existing conversation (including closed ones)
        let conversation = await prisma.conversation.findFirst({
            where: {
                customer_id: customerId,
                provider_id: providerId
            }
        });

        if (conversation) {
            // If conversation exists but is closed, reactivate it
            if (conversation.status !== 'active') {
                conversation = await prisma.conversation.update({
                    where: { conversation_id: conversation.conversation_id },
                    data: {
                        status: 'active',
                        warranty_expires: warrantyExpires,
                        updated_at: new Date()
                    }
                });
                console.log(`🔄 Reactivated conversation ${conversation.conversation_id}`);
            } else {
                // Update warranty expiry if provided and later than current
                if (warrantyExpires && 
                    (!conversation.warranty_expires || warrantyExpires > conversation.warranty_expires)) {
                    conversation = await prisma.conversation.update({
                        where: { conversation_id: conversation.conversation_id },
                        data: {
                            warranty_expires: warrantyExpires,
                            updated_at: new Date()
                        }
                    });
                }
            }
            return conversation;
        }

        // If no conversation exists, create a new one
        conversation = await prisma.conversation.create({
            data: {
                customer_id: customerId,
                provider_id: providerId,
                warranty_expires: warrantyExpires,
                status: 'active'
            }
        });

        return conversation;
    } catch (error) {
        console.error('Error finding or creating conversation:', error);
        throw error;
    }
};

/**
 * Extend conversation warranty if the new expiry date is later
 * @param {number} conversationId - Conversation ID
 * @param {Date} newWarrantyExpiry - New warranty expiry date
 * @returns {Object} - Updated conversation object
 */
export const extendConversationWarranty = async (conversationId, newWarrantyExpiry) => {
    try {
        if (!newWarrantyExpiry) {
            return null;
        }

        const conversation = await prisma.conversation.findUnique({
            where: { conversation_id: conversationId }
        });

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        // Only update if the new expiry is later than the current one
        const shouldUpdate = !conversation.warranty_expires || 
                           newWarrantyExpiry > conversation.warranty_expires;

        if (shouldUpdate) {
            const updatedConversation = await prisma.conversation.update({
                where: { conversation_id: conversationId },
                data: { 
                    warranty_expires: newWarrantyExpiry,
                    updated_at: new Date()
                }
            });

            console.log(`🔄 Extended conversation ${conversationId} warranty to ${newWarrantyExpiry.toISOString()}`);
            return updatedConversation;
        }

        return conversation;
    } catch (error) {
        console.error('Error extending conversation warranty:', error);
        throw error;
    }
};

/**
 * Handle appointment warranty logic for conversations
 * @param {Object} appointment - Appointment object
 * @param {string} eventType - 'booked', 'completed', 'finished'
 * @returns {Object} - Updated or created conversation
 */
export const handleAppointmentWarranty = async (appointment, eventType) => {
    try {
        // Get warranty days from the service
        const service = await prisma.serviceListing.findUnique({
            where: { service_id: appointment.service_id },
            select: { warranty: true }
        });

        const warrantyDays = appointment.warranty_days || service?.warranty || 0;
        
        if (warrantyDays <= 0) {
            console.log(`📝 No warranty for appointment ${appointment.appointment_id}`);
            return null;
        }

        // Calculate base date for warranty
        let baseDate;
        switch (eventType) {
            case 'booked':
                baseDate = appointment.scheduled_date || appointment.created_at || new Date();
                break;
            case 'completed':
                baseDate = appointment.completed_at || appointment.finished_at || new Date();
                break;
            case 'finished':
                baseDate = appointment.finished_at || new Date();
                break;
            default:
                baseDate = new Date();
        }

        const warrantyExpiry = calculateWarrantyExpiry(baseDate, warrantyDays);
        
        if (!warrantyExpiry) {
            return null;
        }

        // Find or create conversation
        const conversation = await findOrCreateConversation(
            appointment.customer_id, 
            appointment.provider_id, 
            warrantyExpiry
        );

        // Extend warranty if this appointment has a later expiry
        const updatedConversation = await extendConversationWarranty(
            conversation.conversation_id, 
            warrantyExpiry
        );

        console.log(`✅ ${eventType.toUpperCase()} - Appointment ${appointment.appointment_id} warranty handled`);
        console.log(`📅 Warranty expires: ${warrantyExpiry.toISOString()}`);

        return updatedConversation || conversation;
    } catch (error) {
        console.error('Error handling appointment warranty:', error);
        throw error;
    }
};

/**
 * Close conversations with expired warranties
 * @returns {Array} - Array of closed conversation IDs
 */
export const closeExpiredConversations = async () => {
    try {
        const now = new Date();
        
        // Find conversations with expired warranties
        const expiredConversations = await prisma.conversation.findMany({
            where: {
                status: 'active',
                warranty_expires: {
                    lt: now
                }
            },
            select: {
                conversation_id: true,
                customer_id: true,
                provider_id: true,
                warranty_expires: true
            }
        });

        if (expiredConversations.length === 0) {
            console.log('🔍 No expired conversations found');
            return [];
        }

        // Update expired conversations to closed status
        const conversationIds = expiredConversations.map(c => c.conversation_id);
        
        await prisma.conversation.updateMany({
            where: {
                conversation_id: { in: conversationIds }
            },
            data: {
                status: 'closed',
                updated_at: now
            }
        });

        console.log(`🔒 Closed ${expiredConversations.length} expired conversations`);
        console.log(`📋 Closed conversation IDs: ${conversationIds.join(', ')}`);

        return expiredConversations;
    } catch (error) {
        console.error('Error closing expired conversations:', error);
        throw error;
    }
};

/**
 * Get active warranty expiry date for a customer-provider conversation
 * @param {number} customerId - Customer ID
 * @param {number} providerId - Provider ID
 * @returns {Date|null} - Latest warranty expiry date or null
 */
export const getActiveWarrantyExpiry = async (customerId, providerId) => {
    try {
        // First check if there's an existing conversation
        const conversation = await prisma.conversation.findFirst({
            where: {
                customer_id: customerId,
                provider_id: providerId,
                status: 'active'
            },
            select: {
                warranty_expires: true
            }
        });

        if (conversation?.warranty_expires) {
            return conversation.warranty_expires;
        }

        // If no conversation or no warranty expiry, check the latest appointment
        const appointment = await prisma.appointment.findFirst({
            where: {
                customer_id: customerId,
                provider_id: providerId,
                appointment_status: { not: 'cancelled' }
            },
            include: {
                service: {
                    select: { warranty: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        if (!appointment) {
            return null;
        }

        // Calculate potential warranty expiry
        const warrantyDays = appointment.warranty_days || appointment.service?.warranty || 0;
        
        if (warrantyDays > 0) {
            // If appointment is finished/completed, use completion date
            if (appointment.finished_at || appointment.completed_at) {
                const baseDate = appointment.finished_at || appointment.completed_at;
                return calculateWarrantyExpiry(baseDate, warrantyDays);
            }
            // For pre-completion appointments, return a future date based on scheduled date
            else {
                const baseDate = appointment.scheduled_date || appointment.created_at;
                return calculateWarrantyExpiry(baseDate, warrantyDays);
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting active warranty expiry:', error);
        return null;
    }
};

/**
 * Check appointment status and update expired warranties
 * @param {number} customerId - Customer ID
 * @param {number} providerId - Provider ID
 * @returns {Object} - Appointment status information
 */
export const checkAppointmentStatus = async (customerId, providerId) => {
    try {
        // Find ALL appointments between customer and provider (not just most recent)
        const appointments = await prisma.appointment.findMany({
            where: {
                customer_id: customerId,
                provider_id: providerId,
                appointment_status: { 
                    not: 'cancelled' // Exclude cancelled appointments
                }
            },
            orderBy: { created_at: 'desc' },
            select: {
                appointment_id: true,
                appointment_status: true,
                warranty_expires_at: true,
                warranty_days: true,
                finished_at: true,
                completed_at: true
            }
        });

        if (!appointments || appointments.length === 0) {
            return { 
                hasAppointment: false, 
                isCompleted: true, 
                isExpired: true,
                canMessage: false,
                appointmentStatus: 'none'
            };
        }

        const now = new Date();
        
        // Check if ANY appointment is active (not completed)
        const activeStatuses = ['scheduled', 'confirmed', 'On the Way', 'in-progress', 'finished', 'in-warranty', 'backjob'];
        const hasActiveAppointment = appointments.some(apt => activeStatuses.includes(apt.appointment_status));
        
        // Check if ANY appointment has active warranty and update expired ones
        let hasActiveWarranty = false;
        for (const apt of appointments) {
            if (apt.appointment_status === 'in-warranty') {
                if (apt.warranty_expires_at) {
                    const isExpired = now > new Date(apt.warranty_expires_at);
                    
                    if (isExpired) {
                        await prisma.appointment.update({
                            where: { appointment_id: apt.appointment_id },
                            data: { 
                                appointment_status: 'completed',
                                completed_at: now
                            }
                        });
                        console.log(`🔄 Auto-updated appointment ${apt.appointment_id} from in-warranty to completed (warranty expired)`);
                    } else {
                        hasActiveWarranty = true;
                    }
                } else if (apt.warranty_days && apt.finished_at) {
                    const finishedDate = new Date(apt.finished_at);
                    const calculatedExpiry = new Date(finishedDate);
                    calculatedExpiry.setDate(calculatedExpiry.getDate() + apt.warranty_days);
                    
                    const isExpired = now > calculatedExpiry;
                    
                    if (isExpired) {
                        await prisma.appointment.update({
                            where: { appointment_id: apt.appointment_id },
                            data: { 
                                appointment_status: 'completed',
                                completed_at: now,
                                warranty_expires_at: calculatedExpiry
                            }
                        });
                        console.log(`🔄 Auto-updated appointment ${apt.appointment_id} from in-warranty to completed (warranty expired)`);
                    } else {
                        await prisma.appointment.update({
                            where: { appointment_id: apt.appointment_id },
                            data: { warranty_expires_at: calculatedExpiry }
                        });
                        hasActiveWarranty = true;
                    }
                }
            }
        }
        
        // Conversation should remain open if there's ANY active appointment or active warranty
        const canMessage = hasActiveAppointment || hasActiveWarranty;
        
        // Get the most recent appointment for display purposes
        const appointment = appointments[0];
        let isExpired = false;

        // Check the most recent appointment's warranty status for display
        if (appointment.appointment_status === 'in-warranty' && appointment.warranty_expires_at) {
            isExpired = now > new Date(appointment.warranty_expires_at);
        }

        return {
            hasAppointment: true,
            appointmentStatus: appointment.appointment_status,
            isCompleted: appointment.appointment_status === 'completed',
            isInWarranty: appointment.appointment_status === 'in-warranty' && !isExpired,
            isExpired: isExpired || appointment.appointment_status === 'completed',
            warrantyExpiresAt: appointment.warranty_expires_at,
            canMessage: canMessage // True if ANY appointment is active or has active warranty
        };
    } catch (error) {
        console.error('Error checking appointment status:', error);
        return { 
            hasAppointment: false, 
            isCompleted: true, 
            isExpired: true, 
            canMessage: false 
        };
    }
};

/**
 * Check if messaging is allowed based on appointment status
 * @param {number} customerId - Customer ID
 * @param {number} providerId - Provider ID
 * @returns {boolean} - True if messaging is allowed
 */
export const isMessagingAllowed = async (customerId, providerId) => {
    try {
        // Check appointment status
        const appointmentStatus = await checkAppointmentStatus(customerId, providerId);
        
        if (!appointmentStatus.hasAppointment) {
            return false;
        }

        // Allow messaging for any appointment that is not cancelled or completed
        // This includes: scheduled, on-the-way, in-progress, in-warranty, finished
        return appointmentStatus.canMessage;
    } catch (error) {
        console.error('Error checking messaging allowance:', error);
        return false;
    }
};

export default {
    calculateWarrantyExpiry,
    findOrCreateConversation,
    extendConversationWarranty,
    handleAppointmentWarranty,
    closeExpiredConversations,
    getActiveWarrantyExpiry,
    checkAppointmentStatus,
    isMessagingAllowed
};