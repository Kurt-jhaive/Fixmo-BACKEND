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
        // First, try to find an existing active conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                customer_id: customerId,
                provider_id: providerId,
                status: 'active'
            }
        });

        if (conversation) {
            return conversation;
        }

        // If no active conversation exists, create a new one
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

        return conversation?.warranty_expires || null;
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
        // Find the most recent appointment between customer and provider
        const appointment = await prisma.appointment.findFirst({
            where: {
                customer_id: customerId,
                provider_id: providerId,
                appointment_status: { in: ['in-warranty', 'completed', 'finished'] }
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

        if (!appointment) {
            return { hasAppointment: false, isCompleted: true, isExpired: true };
        }

        const now = new Date();
        let isExpired = false;
        let needsUpdate = false;

        // Check if warranty has expired for in-warranty appointments
        if (appointment.appointment_status === 'in-warranty') {
            if (appointment.warranty_expires_at) {
                isExpired = now > new Date(appointment.warranty_expires_at);
                
                // Auto-update expired in-warranty appointments to completed
                if (isExpired) {
                    needsUpdate = true;
                }
            } else if (appointment.warranty_days && appointment.finished_at) {
                // Calculate expiry if not set but we have the data
                const finishedDate = new Date(appointment.finished_at);
                const calculatedExpiry = new Date(finishedDate);
                calculatedExpiry.setDate(calculatedExpiry.getDate() + appointment.warranty_days);
                
                isExpired = now > calculatedExpiry;
                
                // Update the appointment with calculated expiry and status if expired
                if (isExpired) {
                    needsUpdate = true;
                } else {
                    // Set the calculated expiry even if not expired yet
                    await prisma.appointment.update({
                        where: { appointment_id: appointment.appointment_id },
                        data: { warranty_expires_at: calculatedExpiry }
                    });
                    appointment.warranty_expires_at = calculatedExpiry;
                }
            }
        }

        // Update appointment status if needed
        if (needsUpdate) {
            await prisma.appointment.update({
                where: { appointment_id: appointment.appointment_id },
                data: { 
                    appointment_status: 'completed',
                    completed_at: now
                }
            });
            
            console.log(`🔄 Auto-updated appointment ${appointment.appointment_id} from in-warranty to completed (warranty expired)`);
            appointment.appointment_status = 'completed';
        }

        return {
            hasAppointment: true,
            appointmentStatus: appointment.appointment_status,
            isCompleted: appointment.appointment_status === 'completed',
            isInWarranty: appointment.appointment_status === 'in-warranty' && !isExpired,
            isExpired: isExpired || appointment.appointment_status === 'completed',
            warrantyExpiresAt: appointment.warranty_expires_at
        };
    } catch (error) {
        console.error('Error checking appointment status:', error);
        return { hasAppointment: false, isCompleted: true, isExpired: true };
    }
};

/**
 * Check if messaging is allowed based on warranty status
 * @param {number} customerId - Customer ID
 * @param {number} providerId - Provider ID
 * @returns {boolean} - True if messaging is allowed
 */
export const isMessagingAllowed = async (customerId, providerId) => {
    try {
        // First check appointment status
        const appointmentStatus = await checkAppointmentStatus(customerId, providerId);
        
        if (!appointmentStatus.hasAppointment) {
            return false;
        }

        // Only allow messaging if appointment is in-warranty (not expired/completed)
        return appointmentStatus.isInWarranty;
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