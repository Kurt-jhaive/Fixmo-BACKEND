import { PrismaClient } from '@prisma/client';
import { handleAppointmentWarranty } from '../services/conversationWarrantyService.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import notificationService from '../services/notificationService.js';
import PenaltyService from '../services/penaltyService.js';

const prisma = new PrismaClient();

// Get all appointments (with filtering and pagination)
export const getAllAppointments = async (req, res) => {
    try {
        // NOTE: Auto-complete logic moved to hourly cron job for better performance
        // Running this on every request was causing Railway backend issues
        
        const { 
            page = 1, 
            limit = 10, 
            status, 
            provider_id, 
            customer_id,
            from_date,
            to_date,
            sort_by = 'scheduled_date',
            sort_order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Build where clause
        let whereClause = {};

        if (status) {
            whereClause.appointment_status = status;
        }

        if (provider_id) {
            whereClause.provider_id = parseInt(provider_id);
        }

        if (customer_id) {
            whereClause.customer_id = parseInt(customer_id);
        }

        if (from_date || to_date) {
            whereClause.scheduled_date = {};
            if (from_date) {
                whereClause.scheduled_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.scheduled_date.lte = new Date(to_date);
            }
        }

        // Get appointments with pagination
        const [appointmentsRaw, totalCount] = await Promise.all([
            prisma.appointment.findMany({
                where: whereClause,
                include: {
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true,
                            user_location: true
                        }
                    },
                    serviceProvider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true,
                            provider_location: true,
                            provider_rating: true
                        }
                    },
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true,
                            rated_by: true,
                            user: {
                                select: {
                                    first_name: true,
                                    last_name: true
                                }
                            }
                        }
                    },
                    service: {
                        select: {
                            service_title: true,
                            service_startingprice: true
                        }
                    },
                    availability: {
                        select: {
                            availability_id: true,
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true,
                            availability_isActive: true
                        }
                    }
                },
                orderBy: {
                    [sort_by]: sort_order
                },
                skip,
                take
            }),
            prisma.appointment.count({ where: whereClause })
        ]);

        const now = new Date();
        const appointments = appointmentsRaw.map(a => {
            let days_left = null;
            if (a.warranty_expires_at) {
                const diffMs = a.warranty_expires_at.getTime() - now.getTime();
                days_left = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            }
            
            // Enhanced rating detection
            const customer_rating = a.appointment_rating?.find(r => r.rated_by === 'customer');
            const provider_rating = a.appointment_rating?.find(r => r.rated_by === 'provider');
            
            const is_rated_by_customer = !!customer_rating;
            const is_rated_by_provider = !!provider_rating;
            const is_rated = is_rated_by_customer; // Main flag for customer rating (required)
            const needs_rating = a.appointment_status === 'completed' && !is_rated_by_customer;
            
            // Rating status object for detailed frontend control
            const rating_status = {
                is_rated,
                is_rated_by_customer,
                is_rated_by_provider,
                needs_rating,
                customer_rating_value: customer_rating?.rating_value || null,
                provider_rating_value: provider_rating?.rating_value || null
            };
            
            // Add slot times at root level for easier access
            return { 
                ...a, 
                days_left, 
                needs_rating, 
                is_rated, 
                rating_status,
                slot_start_time: a.availability?.startTime || null,
                slot_end_time: a.availability?.endTime || null,
                slot_day_of_week: a.availability?.dayOfWeek || null
            };
        });

        const totalPages = Math.ceil(totalCount / take);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: take,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointments',
            error: error.message
        });
    }
};

// Get appointment by ID
export const getAppointmentById = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        // Validate appointmentId parameter
        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                message: 'Appointment ID is required'
            });
        }

        const parsedAppointmentId = parseInt(appointmentId);
        if (isNaN(parsedAppointmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid appointment ID format'
            });
        }

        const appointment = await prisma.appointment.findUnique({
            where: {
                appointment_id: parsedAppointmentId
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true,
                        user_location: true,
                        profile_photo: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true,
                        provider_profile_photo: true,
                        provider_rating: true
                    }
                },
                appointment_rating: {
                    include: {
                        user: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                },
                service: {
                    select: {
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        const now2 = new Date();
        let days_left = null;
        if (appointment.warranty_expires_at) {
            const diffMs = appointment.warranty_expires_at.getTime() - now2.getTime();
            days_left = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
        
        // Enhanced rating detection for single appointment
        const customer_rating = appointment.appointment_rating?.find(r => r.rated_by === 'customer');
        const provider_rating = appointment.appointment_rating?.find(r => r.rated_by === 'provider');
        
        const is_rated_by_customer = !!customer_rating;
        const is_rated_by_provider = !!provider_rating;
        const is_rated = is_rated_by_customer; // Main flag for customer rating (required)
        const needs_rating = appointment.appointment_status === 'completed' && !is_rated_by_customer;
        
        // Rating status object for detailed frontend control
        const rating_status = {
            is_rated,
            is_rated_by_customer,
            is_rated_by_provider,
            needs_rating,
            customer_rating_value: customer_rating?.rating_value || null,
            provider_rating_value: provider_rating?.rating_value || null
        };

        res.status(200).json({
            success: true,
            data: { ...appointment, days_left, needs_rating, is_rated, rating_status }
        });

    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointment',
            error: error.message
        });
    }
};

// Create new appointment
export const createAppointment = async (req, res) => {
    try {
        const {
            customer_id,
            provider_id,
            scheduled_date,
            appointment_status = 'scheduled',
            final_price,
            repairDescription,
            availability_id,
            service_id
        } = req.body;

        // Validate required fields
        if (!customer_id || !provider_id || !scheduled_date || !availability_id || !service_id) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID, Provider ID, scheduled date, availability ID, and service ID are required'
            });
        }

        // Validate customer exists
        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(customer_id) }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Service provider not found'
            });
        }

        // ✅ PREVENT SELF-BOOKING: Check if customer is trying to book with themselves
        const customerFullName = `${customer.first_name} ${customer.last_name}`.toLowerCase().trim();
        const providerFullName = `${provider.provider_first_name} ${provider.provider_last_name}`.toLowerCase().trim();
        const namesMatch = customerFullName === providerFullName;
        const emailMatches = customer.email.toLowerCase().trim() === provider.provider_email.toLowerCase().trim();
        const phoneMatches = customer.phone_number.trim() === provider.provider_phone_number.trim();

        if (namesMatch && (emailMatches || phoneMatches)) {
            console.log('🚫 SELF-BOOKING PREVENTED:', {
                customer: customerFullName,
                provider: providerFullName,
                email_match: emailMatches,
                phone_match: phoneMatches
            });
            return res.status(400).json({
                success: false,
                message: 'You cannot book an appointment with yourself. Please select a different service provider.',
                reason: 'self_booking_not_allowed'
            });
        }

        // ✅ NEW: Prevent multiple bookings on the same date - customer can only book once per day
        const requestedDate = new Date(scheduled_date);
        const startOfDay = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate());
        const endOfDay = new Date(requestedDate.getFullYear(), requestedDate.getMonth(), requestedDate.getDate() + 1);

        const existingBookingOnDate = await prisma.appointment.findFirst({
            where: {
                customer_id: parseInt(customer_id),
                scheduled_date: {
                    gte: startOfDay,
                    lt: endOfDay
                },
                appointment_status: {
                    notIn: ['Cancelled', 'cancelled'] // Don't count cancelled appointments
                }
            }
        });

        if (existingBookingOnDate) {
            console.log('🚫 DAILY BOOKING LIMIT EXCEEDED:', {
                customer_id,
                requested_date: scheduled_date,
                existing_appointment_id: existingBookingOnDate.appointment_id,
                existing_appointment_time: existingBookingOnDate.scheduled_date
            });
            return res.status(400).json({
                success: false,
                message: 'You already have an appointment scheduled on this date. You can only book one appointment per day.',
                reason: 'daily_booking_limit_exceeded',
                existing_appointment: {
                    appointment_id: existingBookingOnDate.appointment_id,
                    scheduled_date: existingBookingOnDate.scheduled_date,
                    status: existingBookingOnDate.appointment_status
                }
            });
        }

        // Validate scheduled date
        const scheduledDateTime = new Date(scheduled_date);
        if (isNaN(scheduledDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheduled date format'
            });
        }

        // Check for conflicts
        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                scheduled_date: scheduledDateTime,
                appointment_status: {
                    in: ['scheduled', 'on-the-way', 'in-progress']
                }
            }
        });

        if (conflictingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'Provider already has an appointment at this time'
            });
        }

        // Load service to capture warranty_days
        const service = await prisma.serviceListing.findUnique({
            where: { service_id: parseInt(service_id) },
            select: { service_id: true, service_title: true, service_startingprice: true, warranty: true }
        });

        if (!service) {
            return res.status(404).json({ success: false, message: 'Service listing not found' });
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                customer_id: parseInt(customer_id),
                provider_id: parseInt(provider_id),
                scheduled_date: scheduledDateTime,
                appointment_status,
                final_price: final_price ? parseFloat(final_price) : null,
                repairDescription: repairDescription || null,
                availability_id: parseInt(availability_id),
                service_id: parseInt(service_id),
                warranty_days: service.warranty ?? null
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true,
                        warranty: true
                    }
                }
            }
        });

        // Handle warranty-based conversation creation/extension
        try {
            await handleAppointmentWarranty(appointment, 'booked');
            console.log('✅ Conversation warranty handling completed for booking');
        } catch (warrantyError) {
            console.error('❌ Error handling appointment warranty:', warrantyError);
            // Don't fail the appointment creation if warranty handling fails
        }

        // Send email notification for scheduled appointment
        try {
            const { sendBookingConfirmationToCustomer, sendBookingConfirmationToProvider } = await import('../services/mailer.js');
            
            // Format booking details for email
            const bookingDetails = {
                customerName: `${appointment.customer.first_name} ${appointment.customer.last_name}`,
                customerPhone: appointment.customer.phone_number,
                customerEmail: appointment.customer.email,
                serviceTitle: appointment.service?.service_title || 'Service',
                providerName: `${appointment.serviceProvider.provider_first_name} ${appointment.serviceProvider.provider_last_name}`,
                providerPhone: appointment.serviceProvider.provider_phone_number,
                providerEmail: appointment.serviceProvider.provider_email,
                scheduledDate: appointment.scheduled_date,
                appointmentId: appointment.appointment_id,
                startingPrice: appointment.service?.service_startingprice || 0,
                repairDescription: appointment.repairDescription
            };
            console.log('📧 BookingDetails (createAppointment):', bookingDetails);
            
            await sendBookingConfirmationToCustomer(appointment.customer.email, bookingDetails);
            await sendBookingConfirmationToProvider(appointment.serviceProvider.provider_email, bookingDetails);
            console.log('✅ Booking confirmation emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending booking confirmation emails:', emailError);
            // Don't fail the appointment creation if email fails
        }

        // Send push notifications to both customer and provider
        try {
            // Notify customer about new booking
            notificationService.sendBookingUpdateNotification(
                appointment.appointment_id,
                'confirmed',
                'customer'
            ).catch(err => console.error('Failed to send customer notification:', err));

            // Notify provider about new booking
            notificationService.sendBookingUpdateNotification(
                appointment.appointment_id,
                'confirmed',
                'provider'
            ).catch(err => console.error('Failed to send provider notification:', err));
            
            console.log('✅ Push notifications sent to customer and provider');
        } catch (notifError) {
            console.error('❌ Error sending push notifications:', notifError);
            // Don't fail the appointment creation if notification fails
        }

        res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating appointment',
            error: error.message
        });
    }
};

// Update appointment
export const updateAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const {
            scheduled_date,
            appointment_status,
            final_price,
            repairDescription
        } = req.body;

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Build update data
        const updateData = {};

        if (scheduled_date) {
            const scheduledDateTime = new Date(scheduled_date);
            if (isNaN(scheduledDateTime.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid scheduled date format'
                });
            }

            // Check for conflicts if changing date
            if (scheduledDateTime.getTime() !== existingAppointment.scheduled_date.getTime()) {
                const conflictingAppointment = await prisma.appointment.findFirst({
                    where: {
                        provider_id: existingAppointment.provider_id,
                        scheduled_date: scheduledDateTime,
                        appointment_status: {
                            in: ['scheduled', 'on-the-way', 'in-progress']
                        },
                        appointment_id: {
                            not: parseInt(appointmentId)
                        }
                    }
                });

                if (conflictingAppointment) {
                    return res.status(409).json({
                        success: false,
                        message: 'Provider already has an appointment at this new time'
                    });
                }
            }

            updateData.scheduled_date = scheduledDateTime;
        }

        if (appointment_status !== undefined) {
            updateData.appointment_status = appointment_status;
        }

        if (final_price !== undefined) {
            updateData.final_price = final_price ? parseFloat(final_price) : null;
        }

        if (repairDescription !== undefined) {
            updateData.repairDescription = repairDescription;
        }

        // Update appointment
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: updateData,
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Appointment updated successfully',
            data: updatedAppointment
        });

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating appointment',
            error: error.message
        });
    }
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                appointment_rating: true
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Delete related ratings first
        if (existingAppointment.appointment_rating.length > 0) {
            await prisma.rating.deleteMany({
                where: { appointment_id: parseInt(appointmentId) }
            });
        }

        // Delete appointment
        await prisma.appointment.delete({
            where: { appointment_id: parseInt(appointmentId) }
        });

        res.status(200).json({
            success: true,
            message: 'Appointment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting appointment',
            error: error.message
        });
    }
};

// Update appointment status
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Validate status values
    const validStatuses = ['scheduled', 'On the Way', 'in-progress', 'in-warranty', 'finished', 'completed', 'cancelled'];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Compute additional fields for certain transitions
        const dataUpdate = { appointment_status: status };

        if (status === 'finished') {
            dataUpdate.finished_at = new Date();
            // When work is finished, start the warranty window (enters in-warranty)
            dataUpdate.appointment_status = 'in-warranty';
            
            // Handle warranty resumption from paused state (backjob scenario)
            if (existingAppointment.warranty_paused_at && existingAppointment.warranty_remaining_days !== null) {
                // Resume warranty from paused state - use remaining days from when it was paused
                const expires = new Date();
                expires.setDate(expires.getDate() + existingAppointment.warranty_remaining_days);
                dataUpdate.warranty_expires_at = expires;
                // Clear pause fields
                dataUpdate.warranty_paused_at = null;
                dataUpdate.warranty_remaining_days = null;
                
                // Mark the backjob as completed since the rescheduled work is now finished
                console.log(`🔧 Backjob resolved - marking as completed for appointment ${appointmentId}`);
            } else {
                // Normal warranty calculation for first-time completion
                const warrantyDays = existingAppointment.warranty_days;
                if (warrantyDays && Number.isInteger(warrantyDays)) {
                    const expires = new Date();
                    expires.setDate(expires.getDate() + warrantyDays);
                    dataUpdate.warranty_expires_at = expires;
                }
            }
        }

        if (status === 'completed') {
            dataUpdate.completed_at = new Date();
            // Expire warranty immediately when appointment is marked completed
            dataUpdate.warranty_expires_at = new Date();
        }

        if (status === 'in-warranty') {
            if (!existingAppointment.finished_at) {
                dataUpdate.finished_at = new Date();
            }
            
            // Handle warranty resumption from paused state (backjob scenario)
            if (existingAppointment.warranty_paused_at && existingAppointment.warranty_remaining_days !== null) {
                // Resume warranty from paused state - use remaining days from when it was paused
                const base = dataUpdate.finished_at ? new Date(dataUpdate.finished_at) : new Date();
                const expires = new Date(base);
                expires.setDate(expires.getDate() + existingAppointment.warranty_remaining_days);
                dataUpdate.warranty_expires_at = expires;
                // Clear pause fields
                dataUpdate.warranty_paused_at = null;
                dataUpdate.warranty_remaining_days = null;
            } else {
                // Normal warranty calculation for first-time completion
                const warrantyDays = existingAppointment.warranty_days;
                if (warrantyDays && Number.isInteger(warrantyDays)) {
                    const base = dataUpdate.finished_at ? new Date(dataUpdate.finished_at) : (existingAppointment.finished_at ? new Date(existingAppointment.finished_at) : new Date());
                    const expires = new Date(base);
                    expires.setDate(expires.getDate() + warrantyDays);
                    dataUpdate.warranty_expires_at = expires;
                }
            }
        }

        // Update appointment status and timing fields
        const updatedAppointment = await prisma.$transaction(async (tx) => {
            const updated = await tx.appointment.update({
                where: { appointment_id: parseInt(appointmentId) },
                data: dataUpdate,
                include: {
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true
                        }
                    },
                    serviceProvider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true
                        }
                    },
                    service: {
                        select: {
                            service_id: true,
                            service_title: true,
                            service_startingprice: true
                        }
                    }
                }
            });

            // If appointment is now in-warranty or completed, mark any active backjobs as completed
            if (status === 'finished' || status === 'in-warranty') {
                const activeBackjobs = await tx.backjobApplication.findMany({
                    where: {
                        appointment_id: parseInt(appointmentId),
                        status: 'approved'
                    }
                });

                if (activeBackjobs.length > 0) {
                    await tx.backjobApplication.updateMany({
                        where: {
                            appointment_id: parseInt(appointmentId),
                            status: 'approved'
                        },
                        data: {
                            status: 'completed',
                            resolved_at: new Date()
                        }
                    });
                    console.log(`✅ Marked ${activeBackjobs.length} backjob(s) as completed for appointment ${appointmentId}`);
                }
            }

            return updated;
        });

        // Handle warranty-based conversation updates for finished/completed status
        try {
            if (status === 'finished' || status === 'completed' || status === 'in-warranty') {
                const eventType = status === 'completed' ? 'completed' : 'finished';
                await handleAppointmentWarranty(updatedAppointment, eventType);
                console.log(`✅ Conversation warranty handling completed for ${status}`);
            }
        } catch (warrantyError) {
            console.error('❌ Error handling appointment warranty:', warrantyError);
            // Don't fail the status update if warranty handling fails
        }

        // Send completion email notifications when status is set to completed
        if (status === 'completed') {
            try {
                const { sendBookingCompletionToCustomer, sendBookingCompletionToProvider } = await import('../services/mailer.js');
                
                // Format completion details for email
                const completionDetails = {
                    customerName: `${updatedAppointment.customer.first_name} ${updatedAppointment.customer.last_name}`,
                    customerPhone: updatedAppointment.customer.phone_number,
                    customerEmail: updatedAppointment.customer.email,
                    serviceTitle: updatedAppointment.service?.service_title || 'Service',
                    providerName: `${updatedAppointment.serviceProvider.provider_first_name} ${updatedAppointment.serviceProvider.provider_last_name}`,
                    providerPhone: updatedAppointment.serviceProvider.provider_phone_number,
                    providerEmail: updatedAppointment.serviceProvider.provider_email,
                    scheduledDate: updatedAppointment.scheduled_date,
                    completedDate: updatedAppointment.completed_at || new Date(),
                    appointmentId: updatedAppointment.appointment_id,
                    startingPrice: updatedAppointment.service?.service_startingprice || 0,
                    repairDescription: updatedAppointment.repairDescription
                };

                console.log('📧 Sending completion emails for appointment:', updatedAppointment.appointment_id);
                
                // Send email to customer
                await sendBookingCompletionToCustomer(updatedAppointment.customer.email, completionDetails);
                console.log('✅ Completion email sent to customer:', updatedAppointment.customer.email);
                
                // Send email to provider
                await sendBookingCompletionToProvider(updatedAppointment.serviceProvider.provider_email, completionDetails);
                console.log('✅ Completion email sent to provider:', updatedAppointment.serviceProvider.provider_email);
                
            } catch (emailError) {
                console.error('❌ Error sending completion emails:', emailError);
                // Don't fail the status update if email fails
            }

            // Send push notifications for completion
            try {
                // Notify customer about completion
                notificationService.sendBookingUpdateNotification(
                    updatedAppointment.appointment_id,
                    'completed',
                    'customer'
                ).catch(err => console.error('Failed to send customer notification:', err));

                // Notify provider about completion with special message
                notificationService.sendServiceCompletedNotification(
                    updatedAppointment.provider_id,
                    updatedAppointment.appointment_id
                ).catch(err => console.error('Failed to send provider completion notification:', err));

                // Send rating reminder to customer after 5 seconds
                setTimeout(() => {
                    notificationService.sendRatingReminderNotification(
                        updatedAppointment.appointment_id
                    ).catch(err => console.error('Failed to send rating reminder:', err));
                }, 5000);

                console.log('✅ Push notifications sent for completion');
            } catch (notifError) {
                console.error('❌ Error sending push notifications:', notifError);
            }

            // ✨ Reward penalty points for successful completion
            try {
                console.log('🎁 Rewarding penalty points for completed appointment:', updatedAppointment.appointment_id);
                
                const reward = await PenaltyService.rewardSuccessfulBooking(updatedAppointment.appointment_id);
                
                if (reward.success) {
                    console.log('✅ Penalty rewards granted:');
                    console.log(`   Customer: ${reward.customerReward?.points_added || 0} points (now ${reward.customerReward?.new_points || 'N/A'})`);
                    console.log(`   Provider: ${reward.providerReward?.points_added || 0} points (now ${reward.providerReward?.new_points || 'N/A'})`);
                } else {
                    console.log('⚠️ No penalty rewards granted:', reward.message);
                }
            } catch (rewardError) {
                console.error('❌ Error rewarding penalty points:', rewardError);
                // Don't fail the status update if reward fails
            }
        }

        // Send push notifications for other status changes
        if (status !== 'completed') {
            try {
                const statusMap = {
                    'scheduled': 'confirmed',
                    'On the Way': 'confirmed',
                    'in-progress': 'confirmed',
                    'in-warranty': 'completed',
                    'finished': 'completed'
                };
                
                const notificationStatus = statusMap[status] || 'confirmed';

                // Notify both customer and provider
                notificationService.sendBookingUpdateNotification(
                    updatedAppointment.appointment_id,
                    notificationStatus,
                    'customer'
                ).catch(err => console.error('Failed to send customer notification:', err));

                notificationService.sendBookingUpdateNotification(
                    updatedAppointment.appointment_id,
                    notificationStatus,
                    'provider'
                ).catch(err => console.error('Failed to send provider notification:', err));

                console.log('✅ Push notifications sent for status update');
            } catch (notifError) {
                console.error('❌ Error sending push notifications:', notifError);
            }
        }

        res.status(200).json({
            success: true,
            message: `Appointment status updated to ${status}`,
            data: updatedAppointment
        });

    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating appointment status',
            error: error.message
        });
    }
};

// Cancel appointment with reason (User cancellation with email notifications)
export const cancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { cancellation_reason } = req.body;

        if (!cancellation_reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Update appointment status to cancelled with reason
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { 
                appointment_status: 'cancelled',
                cancellation_reason: cancellation_reason
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        // Send cancellation email notifications
        try {
            const { sendBookingCancellationToCustomer, sendBookingCancellationEmail } = await import('../services/mailer.js');
            
            // Format cancellation details for email
            const cancellationDetails = {
                customerName: `${updatedAppointment.customer.first_name} ${updatedAppointment.customer.last_name}`,
                customerPhone: updatedAppointment.customer.phone_number,
                customerEmail: updatedAppointment.customer.email,
                serviceTitle: updatedAppointment.service?.service_title || 'Service',
                providerName: `${updatedAppointment.serviceProvider.provider_first_name} ${updatedAppointment.serviceProvider.provider_last_name}`,
                providerPhone: updatedAppointment.serviceProvider.provider_phone_number,
                providerEmail: updatedAppointment.serviceProvider.provider_email,
                scheduledDate: updatedAppointment.scheduled_date,
                appointmentId: updatedAppointment.appointment_id,
                startingPrice: updatedAppointment.service?.service_startingprice || 0,
                repairDescription: updatedAppointment.repairDescription,
                cancellationReason: cancellation_reason,
                cancelledBy: 'customer' // or determine based on user type
            };

            console.log('📧 Sending cancellation emails for appointment:', updatedAppointment.appointment_id);
            
            // Send email to customer
            await sendBookingCancellationToCustomer(updatedAppointment.customer.email, cancellationDetails);
            console.log('✅ Cancellation email sent to customer:', updatedAppointment.customer.email);
            
            // Send email to provider
            await sendBookingCancellationEmail(updatedAppointment.serviceProvider.provider_email, cancellationDetails);
            console.log('✅ Cancellation email sent to provider:', updatedAppointment.serviceProvider.provider_email);
            
        } catch (emailError) {
            console.error('❌ Error sending cancellation emails:', emailError);
            // Don't fail the cancellation if email fails
        }

        // Send push notifications for cancellation
        try {
            // Notify customer about cancellation
            notificationService.sendBookingUpdateNotification(
                updatedAppointment.appointment_id,
                'cancelled',
                'customer'
            ).catch(err => console.error('Failed to send customer notification:', err));

            // Notify provider about cancellation
            notificationService.sendBookingUpdateNotification(
                updatedAppointment.appointment_id,
                'cancelled',
                'provider'
            ).catch(err => console.error('Failed to send provider notification:', err));

            console.log('✅ Push notifications sent for cancellation');
        } catch (notifError) {
            console.error('❌ Error sending push notifications:', notifError);
            // Don't fail the cancellation if email fails
        }

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully and notifications sent',
            data: updatedAppointment
        });

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling appointment',
            error: error.message
        });
    }
};

// Admin cancel appointment with enhanced email notifications
export const adminCancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { cancellation_reason, admin_notes } = req.body;
        const adminId = req.userId; // Get admin ID from auth middleware

        if (!cancellation_reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Prevent cancelling already cancelled appointments
        if (existingAppointment.appointment_status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Appointment is already cancelled'
            });
        }

        // Update appointment status to cancelled with admin details
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { 
                appointment_status: 'cancelled',
                cancellation_reason: cancellation_reason,
                cancelled_by_admin_id: adminId
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        // Send enhanced cancellation email notifications for admin cancellations
        try {
            const { sendBookingCancellationToCustomer, sendBookingCancellationEmail } = await import('../services/mailer.js');
            
            // Format cancellation details for email with admin context
            const cancellationDetails = {
                customerName: `${updatedAppointment.customer.first_name} ${updatedAppointment.customer.last_name}`,
                customerPhone: updatedAppointment.customer.phone_number,
                customerEmail: updatedAppointment.customer.email,
                serviceTitle: updatedAppointment.service?.service_title || 'Service',
                providerName: `${updatedAppointment.serviceProvider.provider_first_name} ${updatedAppointment.serviceProvider.provider_last_name}`,
                providerPhone: updatedAppointment.serviceProvider.provider_phone_number,
                providerEmail: updatedAppointment.serviceProvider.provider_email,
                scheduledDate: updatedAppointment.scheduled_date,
                appointmentId: updatedAppointment.appointment_id,
                startingPrice: updatedAppointment.service?.service_startingprice || 0,
                repairDescription: updatedAppointment.repairDescription,
                cancellationReason: `${cancellation_reason}${admin_notes ? ` | Admin Notes: ${admin_notes}` : ''}`,
                cancelledBy: 'admin'
            };

            console.log('📧 Sending admin cancellation emails for appointment:', updatedAppointment.appointment_id);
            
            // Send email to customer with admin cancellation context
            await sendBookingCancellationToCustomer(updatedAppointment.customer.email, cancellationDetails);
            console.log('✅ Admin cancellation email sent to customer:', updatedAppointment.customer.email);
            
            // Send email to provider with admin cancellation context
            await sendBookingCancellationEmail(updatedAppointment.serviceProvider.provider_email, cancellationDetails);
            console.log('✅ Admin cancellation email sent to provider:', updatedAppointment.serviceProvider.provider_email);
            
        } catch (emailError) {
            console.error('❌ Error sending admin cancellation emails:', emailError);
            // Don't fail the cancellation if email fails
        }

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled by admin successfully and notifications sent',
            data: {
                ...updatedAppointment,
                cancellation_type: 'admin',
                admin_notes: admin_notes
            }
        });

    } catch (error) {
        console.error('Error in admin appointment cancellation:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling appointment by admin',
            error: error.message
        });
    }
};

// Provider cancel appointment (Service Provider cancellation)
export const providerCancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { cancellation_reason } = req.body;
        const providerId = req.userId; // Provider ID from requireAuth('provider') middleware

        if (!providerId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Provider ID not found'
            });
        }

        if (!cancellation_reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        // Check if appointment exists and belongs to this provider
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Verify appointment belongs to this provider
        if (existingAppointment.provider_id !== providerId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You can only cancel your own appointments'
            });
        }

        // Check if appointment is in a cancellable status
        if (existingAppointment.appointment_status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Appointment is already cancelled'
            });
        }

        if (existingAppointment.appointment_status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a completed appointment'
            });
        }

        // Update appointment status to cancelled with provider's reason
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { 
                appointment_status: 'cancelled',
                cancellation_reason: cancellation_reason // Provider's cancellation reason
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        // Send cancellation email notifications
        try {
            const { sendBookingCancellationToCustomer, sendBookingCancellationEmail } = await import('../services/mailer.js');
            
            // Format cancellation details for email
            const cancellationDetails = {
                customerName: `${updatedAppointment.customer.first_name} ${updatedAppointment.customer.last_name}`,
                customerPhone: updatedAppointment.customer.phone_number,
                customerEmail: updatedAppointment.customer.email,
                serviceTitle: updatedAppointment.service?.service_title || 'Service',
                providerName: `${updatedAppointment.serviceProvider.provider_first_name} ${updatedAppointment.serviceProvider.provider_last_name}`,
                providerPhone: updatedAppointment.serviceProvider.provider_phone_number,
                providerEmail: updatedAppointment.serviceProvider.provider_email,
                scheduledDate: updatedAppointment.scheduled_date,
                appointmentId: updatedAppointment.appointment_id,
                startingPrice: updatedAppointment.service?.service_startingprice || 0,
                repairDescription: updatedAppointment.repairDescription,
                cancellationReason: cancellation_reason,
                cancelledBy: 'provider' // Indicate that provider cancelled
            };

            console.log('📧 Sending provider cancellation emails for appointment:', updatedAppointment.appointment_id);
            
            // Send email to customer (notify them about provider cancellation)
            await sendBookingCancellationToCustomer(updatedAppointment.customer.email, cancellationDetails);
            console.log('✅ Provider cancellation email sent to customer:', updatedAppointment.customer.email);
            
            // Send confirmation email to provider
            await sendBookingCancellationEmail(updatedAppointment.serviceProvider.provider_email, cancellationDetails);
            console.log('✅ Provider cancellation confirmation sent to provider:', updatedAppointment.serviceProvider.provider_email);
            
        } catch (emailError) {
            console.error('❌ Error sending provider cancellation emails:', emailError);
            // Don't fail the cancellation if email fails
        }

        // Send push notifications for cancellation
        try {
            // Notify customer about provider cancellation
            notificationService.sendBookingUpdateNotification(
                updatedAppointment.appointment_id,
                'cancelled',
                'customer'
            ).catch(err => console.error('Failed to send customer notification:', err));

            // Notify provider (confirmation)
            notificationService.sendBookingUpdateNotification(
                updatedAppointment.appointment_id,
                'cancelled',
                'provider'
            ).catch(err => console.error('Failed to send provider notification:', err));

            console.log('✅ Push notifications sent for provider cancellation');
        } catch (notifError) {
            console.error('❌ Error sending push notifications:', notifError);
            // Don't fail the cancellation if notifications fail
        }

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully by provider and notifications sent',
            data: updatedAppointment
        });

    } catch (error) {
        console.error('Error in provider appointment cancellation:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling appointment by provider',
            error: error.message
        });
    }
};

// Rate customer/appointment
export const rateAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Check if appointment exists and is completed
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (existingAppointment.appointment_status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only rate completed appointments'
            });
        }

        // Create or update rating
        const ratingData = await prisma.rating.upsert({
            where: {
                appointment_id: parseInt(appointmentId)
            },
            update: {
                rating_value: parseInt(rating),
                rating_comment: comment || null
            },
            create: {
                appointment_id: parseInt(appointmentId),
                rating_value: parseInt(rating),
                rating_comment: comment || null,
                user_id: existingAppointment.customer_id,
                provider_id: existingAppointment.provider_id
            }
        });

        res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            data: ratingData
        });

    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting rating',
            error: error.message
        });
    }
};

// Reschedule appointment
export const rescheduleAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { new_scheduled_date } = req.body;

        if (!new_scheduled_date) {
            return res.status(400).json({
                success: false,
                message: 'New scheduled date is required'
            });
        }

        // Check if appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Validate new date
        const newScheduledDateTime = new Date(new_scheduled_date);
        if (isNaN(newScheduledDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        // Check if new date is in the future
        if (newScheduledDateTime < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'New scheduled date must be in the future'
            });
        }

        // Check for conflicts
        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                provider_id: existingAppointment.provider_id,
                scheduled_date: newScheduledDateTime,
                appointment_status: {
                    in: ['scheduled', 'on-the-way', 'in-progress']
                },
                appointment_id: {
                    not: parseInt(appointmentId)
                }
            }
        });

        if (conflictingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'Provider already has an appointment at the new time'
            });
        }

        // Update appointment
        const rescheduledAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: {
                scheduled_date: newScheduledDateTime,
                appointment_status: 'scheduled' // Reset to scheduled when rescheduled
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: rescheduledAppointment
        });

    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error rescheduling appointment',
            error: error.message
        });
    }
};

// Get provider appointments
export const getProviderAppointments = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { 
            status, 
            from_date, 
            to_date, 
            page = 1, 
            limit = 10,
            sort_order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = {
            provider_id: parseInt(providerId)
        };

        if (status) {
            whereClause.appointment_status = status;
        }

        if (from_date || to_date) {
            whereClause.scheduled_date = {};
            if (from_date) {
                whereClause.scheduled_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.scheduled_date.lte = new Date(to_date);
            }
        }

        const [appointmentsRaw, totalCount] = await Promise.all([
            prisma.appointment.findMany({
                where: whereClause,
                include: {
                    customer: {
                        select: {
                            user_id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone_number: true,
                            user_location: true,
                            exact_location: true,
                            profile_photo: true
                        }
                    },
                    service: {
                        select: {
                            service_id: true,
                            service_title: true,
                            service_startingprice: true
                        }
                    },
                    availability: {
                        select: {
                            availability_id: true,
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true,
                            availability_isActive: true
                        }
                    },
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true,
                            rated_by: true
                        }
                    },
                    backjob_applications: {
                        where: {
                            status: {
                                notIn: ['cancelled-by-admin', 'cancelled-by-user', 'cancelled-by-customer']
                            }
                        },
                        select: {
                            backjob_id: true,
                            reason: true,
                            status: true,
                            created_at: true,
                            customer_cancellation_reason: true
                        },
                        orderBy: {
                            created_at: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: {
                    scheduled_date: sort_order
                },
                skip,
                take
            }),
            prisma.appointment.count({ where: whereClause })
        ]);

        const now3 = new Date();
        const appointments = appointmentsRaw.map(a => {
            let days_left = null;
            if (a.warranty_expires_at) {
                const diffMs = a.warranty_expires_at.getTime() - now3.getTime();
                days_left = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            }
            
            // Enhanced rating detection for provider appointments
            const customer_rating = a.appointment_rating?.find(r => r.rated_by === 'customer');
            const provider_rating = a.appointment_rating?.find(r => r.rated_by === 'provider');
            
            const is_rated_by_customer = !!customer_rating;
            const is_rated_by_provider = !!provider_rating;
            const is_rated = is_rated_by_customer; // Main flag for customer rating (required)
            const needs_rating = a.appointment_status === 'completed' && !is_rated_by_customer;
            
            // Provider-specific: whether they can rate the customer
            const provider_can_rate_customer = a.appointment_status === 'completed' && !is_rated_by_provider;
            
            // Rating status object
            const rating_status = {
                is_rated,
                is_rated_by_customer,
                is_rated_by_provider,
                needs_rating,
                provider_can_rate_customer,
                customer_rating_value: customer_rating?.rating_value || null,
                provider_rating_value: provider_rating?.rating_value || null
            };
            
            // Include current backjob if exists
            const current_backjob = a.backjob_applications && a.backjob_applications.length > 0 
                ? a.backjob_applications[0] 
                : null;
            
            // Add slot times at root level for easier frontend access
            return { 
                ...a, 
                days_left, 
                needs_rating,
                is_rated,
                rating_status,
                current_backjob,
                backjob_applications: undefined, // Remove the array to avoid duplication
                slot_start_time: a.availability?.startTime || null,
                slot_end_time: a.availability?.endTime || null,
                slot_day_of_week: a.availability?.dayOfWeek || null
            };
        });

        const totalPages = Math.ceil(totalCount / take);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: take,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching provider appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching provider appointments',
            error: error.message
        });
    }
};

// Get customer appointments
export const getCustomerAppointments = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { 
            status, 
            from_date, 
            to_date, 
            page = 1, 
            limit = 10,
            sort_order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = {
            customer_id: parseInt(customerId)
        };

        if (status) {
            whereClause.appointment_status = status;
        }

        if (from_date || to_date) {
            whereClause.scheduled_date = {};
            if (from_date) {
                whereClause.scheduled_date.gte = new Date(from_date);
            }
            if (to_date) {
                whereClause.scheduled_date.lte = new Date(to_date);
            }
        }

        const [appointmentsRaw2, totalCount] = await Promise.all([
            prisma.appointment.findMany({
                where: whereClause,
                include: {
                    serviceProvider: {
                        select: {
                            provider_id: true,
                            provider_first_name: true,
                            provider_last_name: true,
                            provider_email: true,
                            provider_phone_number: true,
                            provider_location: true,
                            provider_exact_location: true,
                            provider_profile_photo: true,
                            provider_rating: true
                        }
                    },
                    service: {
                        select: {
                            service_id: true,
                            service_title: true,
                            service_startingprice: true
                        }
                    },
                    availability: {
                        select: {
                            availability_id: true,
                            dayOfWeek: true,
                            startTime: true,
                            endTime: true,
                            availability_isActive: true
                        }
                    },
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true,
                            rated_by: true
                        }
                    },
                    backjob_applications: {
                        where: {
                            status: {
                                notIn: ['cancelled-by-admin', 'cancelled-by-user', 'cancelled-by-customer']
                            }
                        },
                        select: {
                            backjob_id: true,
                            reason: true,
                            status: true,
                            created_at: true,
                            customer_cancellation_reason: true
                        },
                        orderBy: {
                            created_at: 'desc'
                        },
                        take: 1
                    }
                },
                orderBy: {
                    scheduled_date: sort_order
                },
                skip,
                take
            }),
            prisma.appointment.count({ where: whereClause })
        ]);

        const now4 = new Date();
        const appointments = appointmentsRaw2.map(a => {
            let days_left = null;
            if (a.warranty_expires_at) {
                const diffMs = a.warranty_expires_at.getTime() - now4.getTime();
                days_left = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            }
            
            // Enhanced rating detection for customer appointments
            const customer_rating = a.appointment_rating?.find(r => r.rated_by === 'customer');
            const provider_rating = a.appointment_rating?.find(r => r.rated_by === 'provider');
            
            const is_rated_by_customer = !!customer_rating;
            const is_rated_by_provider = !!provider_rating;
            const is_rated = is_rated_by_customer; // Main flag for customer rating (required)
            const needs_rating = a.appointment_status === 'completed' && !is_rated_by_customer;
            
            // Rating status object
            const rating_status = {
                is_rated,
                is_rated_by_customer,
                is_rated_by_provider,
                needs_rating,
                customer_rating_value: customer_rating?.rating_value || null,
                provider_rating_value: provider_rating?.rating_value || null,
                // Additional info for customer view
                provider_rated_me: is_rated_by_provider
            };
            
            // Include current backjob if exists
            const current_backjob = a.backjob_applications && a.backjob_applications.length > 0 
                ? a.backjob_applications[0] 
                : null;
            
            // Add slot times at root level for easier frontend access
            return { 
                ...a, 
                days_left, 
                needs_rating,
                is_rated,
                rating_status,
                current_backjob,
                backjob_applications: undefined, // Remove the array to avoid duplication
                slot_start_time: a.availability?.startTime || null,
                slot_end_time: a.availability?.endTime || null,
                slot_day_of_week: a.availability?.dayOfWeek || null
            };
        });

        const totalPages = Math.ceil(totalCount / take);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: take,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching customer appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer appointments',
            error: error.message
        });
    }
};

// Get appointment statistics
export const getAppointmentStats = async (req, res) => {
    try {
        const { provider_id } = req.query;

        let whereClause = {};
        if (provider_id) {
            whereClause.provider_id = parseInt(provider_id);
        }

        // Get current date ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Get overall statistics
        const [
            totalAppointments,
            pendingAppointments,
            confirmedAppointments,
            completedAppointments,
            cancelledAppointments,
            monthlyAppointments,
            yearlyAppointments,
            averageRating
        ] = await Promise.all([
            prisma.appointment.count({ where: whereClause }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'pending' } 
            }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'confirmed' } 
            }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'completed' } 
            }),
            prisma.appointment.count({ 
                where: { ...whereClause, appointment_status: 'cancelled' } 
            }),
            prisma.appointment.count({
                where: {
                    ...whereClause,
                    scheduled_date: {
                        gte: startOfMonth
                    }
                }
            }),
            prisma.appointment.count({
                where: {
                    ...whereClause,
                    scheduled_date: {
                        gte: startOfYear
                    }
                }
            }),
            prisma.rating.aggregate({
                where: {
                    ...(provider_id && { provider_id: parseInt(provider_id) })
                },
                _avg: {
                    rating_value: true
                }
            })
        ]);

        // Calculate total revenue
        const revenueData = await prisma.appointment.aggregate({
            where: {
                ...whereClause,
                appointment_status: 'completed',
                final_price: {
                    not: null
                }
            },
            _sum: {
                final_price: true
            }
        });

        const totalRevenue = revenueData._sum.final_price || 0;

        // Calculate completion rate
        const completionRate = totalAppointments > 0 
            ? Math.round((completedAppointments / totalAppointments) * 100)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                total_appointments: totalAppointments,
                pending_appointments: pendingAppointments,
                confirmed_appointments: confirmedAppointments,
                completed_appointments: completedAppointments,
                cancelled_appointments: cancelledAppointments,
                monthly_appointments: monthlyAppointments,
                yearly_appointments: yearlyAppointments,
                total_revenue: totalRevenue,
                average_rating: averageRating._avg.rating_value || 0,
                completion_rate: completionRate
            }
        });

    } catch (error) {
        console.error('Error fetching appointment statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointment statistics',
            error: error.message
        });
    }
};

// Rating functions for completed appointments
export const submitRating = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { rating_value, rating_comment, rater_type } = req.body;

        // Validate input
        if (!rating_value || rating_value < 1 || rating_value > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating value must be between 1 and 5'
            });
        }

        // Get appointment details
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                customer: true,
                serviceProvider: true
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check if appointment is completed
        if (appointment.appointment_status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only rate completed appointments'
            });
        }

        // Determine who is rating whom
        let user_id, provider_id;
        if (rater_type === 'customer') {
            user_id = appointment.customer_id;
            provider_id = appointment.provider_id;
        } else if (rater_type === 'provider') {
            user_id = appointment.customer_id;
            provider_id = appointment.provider_id;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid rater type'
            });
        }

        // Check if rating already exists
        const existingRating = await prisma.rating.findFirst({
            where: {
                appointment_id: parseInt(appointmentId),
                rated_by: rater_type // Use 'rated_by' instead of 'rater_type'
            }
        });

        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'Rating already submitted for this appointment'
            });
        }

        // Create rating
        const rating = await prisma.rating.create({
            data: {
                rating_value: parseInt(rating_value),
                rating_comment: rating_comment || '',
                appointment_id: parseInt(appointmentId),
                user_id: user_id,
                provider_id: provider_id,
                rated_by: rater_type // Use 'rated_by' instead of 'rater_type'
            }
        });

        // Update provider's average rating if customer rated provider
        if (rater_type === 'customer') {
            const avgRating = await prisma.rating.aggregate({
                where: {
                    provider_id: provider_id,
                    rated_by: 'customer' // Use 'rated_by' instead of 'rater_type'
                },
                _avg: {
                    rating_value: true
                }
            });

            await prisma.serviceProviderDetails.update({
                where: { provider_id: provider_id },
                data: { provider_rating: avgRating._avg.rating_value || 0 }
            });
        }

        res.json({
            success: true,
            message: 'Rating submitted successfully',
            rating: rating
        });

    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting rating',
            error: error.message
        });
    }
};

// BACKJOB WORKFLOW
// Upload evidence files for backjob applications
export const uploadBackjobEvidence = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No evidence files provided'
            });
        }

        // Verify appointment exists and user has access
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Only the customer or provider can upload evidence
        if (req.userType === 'customer' && appointment.customer_id !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the appointment customer can upload evidence'
            });
        }

        if (req.userType === 'provider' && appointment.provider_id !== req.userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the appointment provider can upload evidence'
            });
        }

        const uploadedFiles = [];
        
        // Upload each file to Cloudinary
        for (const file of req.files) {
            try {
                const fileUrl = await uploadToCloudinary(
                    file.buffer,
                    'fixmo/backjob-evidence',
                    `evidence_${appointmentId}_${req.userId}_${Date.now()}`
                );
                
                uploadedFiles.push({
                    url: fileUrl,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size
                });
            } catch (uploadError) {
                console.error('Error uploading evidence file to Cloudinary:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading evidence files'
                });
            }
        }

        res.json({
            success: true,
            message: 'Evidence files uploaded successfully',
            data: {
                files: uploadedFiles,
                total_files: uploadedFiles.length
            }
        });

    } catch (error) {
        console.error('Error uploading backjob evidence:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading evidence',
            error: error.message
        });
    }
};

// Apply for backjob (customer) when appointment is in-warranty
export const applyBackjob = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { reason, evidence } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason is required' });
        }

        if (!evidence || (!evidence.files && !evidence.description)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Evidence is required. Please upload photos/videos or provide detailed description.' 
            });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
        });

        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        // Only the owning customer can apply
        if (req.userType !== 'customer' || (req.userId && req.userId !== appointment.customer_id)) {
            return res.status(403).json({ success: false, message: 'Only the appointment customer can apply for a backjob' });
        }

        if (appointment.appointment_status !== 'in-warranty') {
            return res.status(400).json({ success: false, message: 'Backjob can only be applied during warranty' });
        }

        // Prevent duplicate active backjob applications for the same appointment
        // Allow new application if existing one was completed, disputed, cancelled, or rejected
        const existingActive = await prisma.backjobApplication.findFirst({
            where: {
                appointment_id: appointment.appointment_id,
                status: { in: ['approved'] } // Only block if there's an active approved backjob that hasn't been resolved
            }
        });
        if (existingActive) {
            return res.status(409).json({ 
                success: false, 
                message: 'An active approved backjob already exists for this appointment. The provider must reschedule or resolve it first before you can apply for another backjob.' 
            });
        }

        // Get appointment details with customer, provider, and service info for emails
        const appointmentWithDetails = await prisma.appointment.findUnique({
            where: { appointment_id: appointment.appointment_id },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        // Create backjob application with auto-approval
        const backjob = await prisma.backjobApplication.create({
            data: {
                appointment_id: appointment.appointment_id,
                customer_id: appointment.customer_id,
                provider_id: appointment.provider_id,
                reason,
                evidence: evidence || null,
                status: 'approved' // Auto-approve the backjob application
            },
        });

        // WARRANTY PAUSE LOGIC: When a backjob is applied, pause the warranty countdown
        // Calculate remaining warranty days before pausing
        let warrantyRemainingDays = null;
        if (appointment.warranty_expires_at) {
            const now = new Date();
            const remainingMs = appointment.warranty_expires_at.getTime() - now.getTime();
            warrantyRemainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
        }

        // Update appointment status to backjob and pause warranty
        // The warranty will resume from this point when the backjob is resolved
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: appointment.appointment_id },
            data: { 
                appointment_status: 'backjob',
                warranty_paused_at: new Date(), // Mark when warranty was paused
                warranty_remaining_days: warrantyRemainingDays // Store remaining days to resume later
            },
        });

        // Send email notifications for backjob application
        try {
            const { sendBackjobApplicationToCustomer, sendBackjobApplicationToProvider } = await import('../services/backjob-mailer.js');
            
            // Prepare email details
            const emailDetails = {
                customerName: `${appointmentWithDetails.customer.first_name} ${appointmentWithDetails.customer.last_name}`,
                customerPhone: appointmentWithDetails.customer.phone_number,
                serviceTitle: appointmentWithDetails.service?.service_title || 'Service',
                providerName: `${appointmentWithDetails.serviceProvider.provider_first_name} ${appointmentWithDetails.serviceProvider.provider_last_name}`,
                providerPhone: appointmentWithDetails.serviceProvider.provider_phone_number,
                appointmentId: appointment.appointment_id,
                backjobId: backjob.backjob_id,
                reason: reason,
                scheduledDate: appointment.scheduled_date
            };

            console.log('📧 Sending backjob application emails...');
            await sendBackjobApplicationToCustomer(appointmentWithDetails.customer.email, emailDetails);
            await sendBackjobApplicationToProvider(appointmentWithDetails.serviceProvider.provider_email, emailDetails);
            console.log('✅ Backjob application emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending backjob application emails:', emailError);
            // Don't fail the backjob creation if email fails
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Backjob application automatically approved - provider can now reschedule or dispute', 
            data: { backjob, appointment: updatedAppointment } 
        });
    } catch (error) {
        console.error('Error applying backjob:', error);
        return res.status(500).json({ success: false, message: 'Error applying backjob', error: error.message });
    }
};

// Provider disputes backjob (cannot cancel)
export const disputeBackjob = async (req, res) => {
    try {
        const { backjobId } = req.params;
        const { dispute_reason, dispute_evidence } = req.body;

        const backjob = await prisma.backjobApplication.findUnique({ where: { backjob_id: parseInt(backjobId) } });
        if (!backjob) {
            return res.status(404).json({ success: false, message: 'Backjob application not found' });
        }

        // Only the assigned provider can dispute
        if (req.userType !== 'provider' || (req.userId && req.userId !== backjob.provider_id)) {
            return res.status(403).json({ success: false, message: 'Only the appointment provider can dispute a backjob' });
        }

        // Check if backjob is in a disputable state (approved or pending)
        if (!['approved', 'pending'].includes(backjob.status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot dispute a backjob with status: ${backjob.status}` 
            });
        }

        // Get backjob details with appointment, customer, provider, and service info
        const backjobWithDetails = await prisma.backjobApplication.findUnique({
            where: { backjob_id: backjob.backjob_id },
            include: {
                appointment: {
                    include: {
                        customer: {
                            select: {
                                user_id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true
                            }
                        },
                        serviceProvider: {
                            select: {
                                provider_id: true,
                                provider_first_name: true,
                                provider_last_name: true,
                                provider_email: true,
                                provider_phone_number: true
                            }
                        },
                        service: {
                            select: {
                                service_id: true,
                                service_title: true,
                                service_startingprice: true
                            }
                        }
                    }
                }
            }
        });

        const updated = await prisma.backjobApplication.update({
            where: { backjob_id: backjob.backjob_id },
            data: {
                status: 'disputed',
                provider_dispute_reason: dispute_reason || null,
                provider_dispute_evidence: dispute_evidence || null,
            },
        });

        // Resume warranty from paused state when backjob is disputed
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: backjob.appointment_id }
        });

        if (appointment && appointment.warranty_paused_at && appointment.warranty_remaining_days !== null) {
            // Resume warranty from where it was paused
            const now = new Date();
            const newExpiryDate = new Date(now);
            newExpiryDate.setDate(newExpiryDate.getDate() + appointment.warranty_remaining_days);

            await prisma.appointment.update({
                where: { appointment_id: backjob.appointment_id },
                data: {
                    appointment_status: 'in-warranty', // Resume warranty period
                    warranty_expires_at: newExpiryDate,
                    warranty_paused_at: null, // Clear pause
                    warranty_remaining_days: null
                }
            });
        }

        // Send email notification to customer about dispute
        try {
            const { sendBackjobDisputeToCustomer } = await import('../services/backjob-mailer.js');
            
            // Prepare email details
            const emailDetails = {
                customerName: `${backjobWithDetails.appointment.customer.first_name} ${backjobWithDetails.appointment.customer.last_name}`,
                serviceTitle: backjobWithDetails.appointment.service?.service_title || 'Service',
                providerName: `${backjobWithDetails.appointment.serviceProvider.provider_first_name} ${backjobWithDetails.appointment.serviceProvider.provider_last_name}`,
                appointmentId: backjobWithDetails.appointment_id,
                backjobId: backjob.backjob_id,
                disputeReason: dispute_reason || 'No reason provided',
                originalReason: backjobWithDetails.reason
            };

            console.log('📧 Sending backjob dispute email to customer...');
            await sendBackjobDisputeToCustomer(backjobWithDetails.appointment.customer.email, emailDetails);
            console.log('✅ Backjob dispute email sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending backjob dispute email:', emailError);
            // Don't fail the dispute if email fails
        }

        return res.status(200).json({ success: true, message: 'Backjob disputed', data: updated });
    } catch (error) {
        console.error('Error disputing backjob:', error);
        return res.status(500).json({ success: false, message: 'Error disputing backjob', error: error.message });
    }
};

// Customer cancels their own backjob application with reason
export const cancelBackjobByCustomer = async (req, res) => {
    try {
        const { backjobId } = req.params;
        const { cancellation_reason } = req.body;

        if (!cancellation_reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        const backjob = await prisma.backjobApplication.findUnique({
            where: { backjob_id: parseInt(backjobId) }
        });

        if (!backjob) {
            return res.status(404).json({
                success: false,
                message: 'Backjob application not found'
            });
        }

        // Only the customer who created the backjob can cancel it
        if (req.userType !== 'customer' || (req.userId && req.userId !== backjob.customer_id)) {
            return res.status(403).json({
                success: false,
                message: 'Only the customer who created the backjob can cancel it'
            });
        }

        // Check if backjob is in a cancellable state (approved, pending, or disputed)
        if (!['approved', 'pending', 'disputed'].includes(backjob.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a backjob with status: ${backjob.status}`
            });
        }

        // Get backjob details with appointment, customer, provider, and service info for emails
        const backjobWithDetails = await prisma.backjobApplication.findUnique({
            where: { backjob_id: backjob.backjob_id },
            include: {
                appointment: {
                    include: {
                        customer: {
                            select: {
                                user_id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true
                            }
                        },
                        serviceProvider: {
                            select: {
                                provider_id: true,
                                provider_first_name: true,
                                provider_last_name: true,
                                provider_email: true,
                                provider_phone_number: true
                            }
                        },
                        service: {
                            select: {
                                service_id: true,
                                service_title: true,
                                service_startingprice: true
                            }
                        }
                    }
                }
            }
        });

        // Update backjob status to cancelled-by-customer
        const updated = await prisma.backjobApplication.update({
            where: { backjob_id: backjob.backjob_id },
            data: {
                status: 'cancelled-by-customer',
                customer_cancellation_reason: cancellation_reason,
            },
        });

        // Resume warranty from paused state when customer cancels backjob
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: backjob.appointment_id }
        });

        if (appointment) {
            // Prepare appointment update data
            const appointmentUpdateData = {
                appointment_status: 'in-warranty' // Always return to in-warranty when backjob is cancelled
            };

            // If warranty was paused, resume it from where it was paused
            if (appointment.warranty_paused_at && appointment.warranty_remaining_days !== null) {
                // Resume warranty from where it was paused
                const now = new Date();
                const newExpiryDate = new Date(now);
                newExpiryDate.setDate(newExpiryDate.getDate() + appointment.warranty_remaining_days);

                appointmentUpdateData.warranty_expires_at = newExpiryDate;
                appointmentUpdateData.warranty_paused_at = null; // Clear pause
                appointmentUpdateData.warranty_remaining_days = null;
            }
            // If no warranty pause data, just ensure the status is updated
            // (this handles cases where warranty pause logic might have failed)

            await prisma.appointment.update({
                where: { appointment_id: backjob.appointment_id },
                data: appointmentUpdateData
            });
        }

        // Send email notifications for backjob cancellation
        try {
            const { sendBackjobCancellationToCustomer, sendBackjobCancellationToProvider } = await import('../services/backjob-mailer.js');
            
            // Prepare email details
            const emailDetails = {
                customerName: `${backjobWithDetails.appointment.customer.first_name} ${backjobWithDetails.appointment.customer.last_name}`,
                customerPhone: backjobWithDetails.appointment.customer.phone_number,
                serviceTitle: backjobWithDetails.appointment.service?.service_title || 'Service',
                providerName: `${backjobWithDetails.appointment.serviceProvider.provider_first_name} ${backjobWithDetails.appointment.serviceProvider.provider_last_name}`,
                providerPhone: backjobWithDetails.appointment.serviceProvider.provider_phone_number,
                appointmentId: backjobWithDetails.appointment_id,
                backjobId: backjob.backjob_id,
                cancellationReason: cancellation_reason,
                originalReason: backjobWithDetails.reason,
                cancelledBy: 'customer'
            };

            console.log('📧 Sending backjob cancellation emails...');
            await sendBackjobCancellationToCustomer(backjobWithDetails.appointment.customer.email, emailDetails);
            await sendBackjobCancellationToProvider(backjobWithDetails.appointment.serviceProvider.provider_email, emailDetails);
            console.log('✅ Backjob cancellation emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending backjob cancellation emails:', emailError);
            // Don't fail the cancellation if email fails
        }

        res.status(200).json({
            success: true,
            message: 'Backjob cancelled successfully by customer and warranty resumed',
            data: updated
        });

    } catch (error) {
        console.error('Error cancelling backjob by customer:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling backjob',
            error: error.message
        });
    }
};

// Admin: list backjob applications with filters
export const listBackjobs = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = status ? { status } : {};
        const [items, total] = await Promise.all([
            prisma.backjobApplication.findMany({
                where,
                include: {
                    appointment: {
                        select: {
                            appointment_id: true,
                            appointment_status: true,
                            scheduled_date: true,
                            final_price: true,
                            repairDescription: true,
                            warranty_days: true,
                            warranty_expires_at: true,
                            warranty_paused_at: true,
                            warranty_remaining_days: true,
                            service: {
                                select: {
                                    service_id: true,
                                    service_title: true,
                                    service_startingprice: true
                                }
                            }
                        }
                    },
                    customer: { 
                        select: { 
                            user_id: true, 
                            first_name: true, 
                            last_name: true, 
                            email: true,
                            phone_number: true,
                            user_location: true
                        } 
                    },
                    provider: { 
                        select: { 
                            provider_id: true, 
                            provider_first_name: true, 
                            provider_last_name: true, 
                            provider_email: true,
                            provider_phone_number: true,
                            provider_location: true
                        } 
                    },
                },
                orderBy: { created_at: 'desc' },
                skip, 
                take,
            }),
            prisma.backjobApplication.count({ where }),
        ]);

        return res.status(200).json({ 
            success: true, 
            data: items, 
            pagination: { 
                current_page: parseInt(page), 
                total_pages: Math.ceil(total / take), 
                total_count: total, 
                limit: take,
                has_next: parseInt(page) < Math.ceil(total / take),
                has_prev: parseInt(page) > 1
            } 
        });
    } catch (error) {
        console.error('Error listing backjobs:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error listing backjobs', 
            error: error.message 
        });
    }
};

// Admin: update backjob status (approve -> provider reschedules; cancel-by-admin -> appointment completed)
export const updateBackjobStatus = async (req, res) => {
    try {
        const { backjobId } = req.params;
        const { action, admin_notes } = req.body; // action: approve | cancel-by-admin | cancel-by-user

        const backjob = await prisma.backjobApplication.findUnique({ where: { backjob_id: parseInt(backjobId) } });
        if (!backjob) {
            return res.status(404).json({ success: false, message: 'Backjob application not found' });
        }

    let newStatus = backjob.status;
    let appointmentUpdate = null;

        // Get appointment for warranty handling
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: backjob.appointment_id }
        });

        if (action === 'approve') {
            newStatus = 'approved';
            // Appointment remains in 'backjob' until provider reschedules
        } else if (action === 'cancel-by-admin') {
            newStatus = 'cancelled-by-admin';
            appointmentUpdate = { appointment_status: 'completed' };
            // Clear warranty pause when admin cancels (ends warranty)
            if (appointment && appointment.warranty_paused_at) {
                appointmentUpdate.warranty_paused_at = null;
                appointmentUpdate.warranty_remaining_days = null;
                appointmentUpdate.warranty_expires_at = new Date(); // Expire immediately
            }
        } else if (action === 'cancel-by-user') {
            newStatus = 'cancelled-by-user';
            // Resume warranty from paused state when cancelled by user
            if (appointment && appointment.warranty_paused_at && appointment.warranty_remaining_days !== null) {
                const now = new Date();
                const resumeExpiryDate = new Date(now);
                resumeExpiryDate.setDate(resumeExpiryDate.getDate() + appointment.warranty_remaining_days);
                
                appointmentUpdate = { 
                    appointment_status: 'in-warranty',
                    warranty_expires_at: resumeExpiryDate,
                    warranty_paused_at: null,
                    warranty_remaining_days: null
                };
            } else {
                appointmentUpdate = { appointment_status: 'in-warranty' };
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const updatedBackjob = await prisma.backjobApplication.update({
            where: { backjob_id: backjob.backjob_id },
            data: { status: newStatus, admin_notes: admin_notes || null },
            include: {
                appointment: {
                    select: {
                        appointment_id: true,
                        customer_id: true,
                        provider_id: true,
                        service_id: true,
                        appointment_status: true,
                        scheduled_date: true,
                        final_price: true,
                        customer: {
                            select: {
                                user_id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true
                            }
                        },
                        serviceProvider: {
                            select: {
                                provider_id: true,
                                provider_first_name: true,
                                provider_last_name: true,
                                provider_email: true,
                                provider_phone_number: true
                            }
                        },
                        service: {
                            select: {
                                service_id: true,
                                service_title: true,
                                service_startingprice: true
                            }
                        }
                    }
                }
            }
        });

        if (appointmentUpdate) {
            await prisma.appointment.update({ where: { appointment_id: backjob.appointment_id }, data: appointmentUpdate });
        }

        // Send push notifications
        try {
            if (newStatus === 'approved') {
                // Notify provider about backjob assignment
                await notificationService.sendBackjobAssignmentNotification(
                    updatedBackjob.appointment.provider_id,
                    updatedBackjob.appointment_id,
                    'warranty repair'
                );
                
                // Notify customer that backjob was approved
                await notificationService.sendBackjobStatusNotification(
                    updatedBackjob.backjob_id,
                    'approved'
                );
                
                console.log('✅ Backjob approval notifications sent');
            } else if (newStatus === 'cancelled-by-admin' || newStatus === 'cancelled-by-user') {
                // Notify customer about cancellation
                await notificationService.sendBackjobStatusNotification(
                    updatedBackjob.backjob_id,
                    newStatus
                );
                
                console.log('✅ Backjob cancellation notification sent');
            }
        } catch (notifError) {
            console.error('❌ Error sending backjob notifications:', notifError);
        }

        return res.status(200).json({ success: true, message: 'Backjob updated', data: updatedBackjob });
    } catch (error) {
        console.error('Error updating backjob:', error);
        return res.status(500).json({ success: false, message: 'Error updating backjob', error: error.message });
    }
};

// Provider reschedules an approved backjob: choose available date; appointment becomes scheduled (same ID)
export const rescheduleFromBackjob = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { new_scheduled_date, availability_id } = req.body;

        if (!new_scheduled_date || !availability_id) {
            return res.status(400).json({ success: false, message: 'New scheduled date and availability_id are required' });
        }

        const appointment = await prisma.appointment.findUnique({ where: { appointment_id: parseInt(appointmentId) } });
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.appointment_status !== 'backjob') {
            return res.status(400).json({ success: false, message: 'Appointment is not in backjob status' });
        }

        // Only the assigned provider can reschedule
        if (req.userType !== 'provider' || (req.userId && req.userId !== appointment.provider_id)) {
            return res.status(403).json({ success: false, message: 'Only the appointment provider can reschedule a backjob' });
        }

        // Ensure there is an approved backjob for this appointment
        const approvedBackjob = await prisma.backjobApplication.findFirst({
            where: { appointment_id: appointment.appointment_id, status: 'approved' }
        });
        if (!approvedBackjob) {
            return res.status(400).json({ success: false, message: 'No approved backjob found for this appointment' });
        }

        const newDate = new Date(new_scheduled_date);
        if (isNaN(newDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date format' });
        }

        // Conflict check
        const conflict = await prisma.appointment.findFirst({
            where: {
                provider_id: appointment.provider_id,
                scheduled_date: newDate,
                appointment_status: { in: ['scheduled', 'on-the-way', 'in-progress'] },
                appointment_id: { not: appointment.appointment_id },
            },
        });
        if (conflict) {
            return res.status(409).json({ success: false, message: 'Provider already has an appointment at this time' });
        }

        // Clear warranty pause when rescheduling - warranty will resume from paused state after completion
        const updated = await prisma.appointment.update({
            where: { appointment_id: appointment.appointment_id },
            data: { 
                scheduled_date: newDate, 
                availability_id: parseInt(availability_id), 
                appointment_status: 'scheduled',
                // Keep warranty_paused_at and warranty_remaining_days until work is completed again
            },
            include: {
                customer: { select: { user_id: true, first_name: true, last_name: true, email: true, phone_number: true } },
                serviceProvider: { select: { provider_id: true, provider_first_name: true, provider_last_name: true, provider_email: true, provider_phone_number: true } },
                service: { select: { service_id: true, service_title: true, service_startingprice: true } }
            }
        });

        // Send email notifications for backjob reschedule
        try {
            const { sendBackjobRescheduleToCustomer, sendBackjobRescheduleToProvider } = await import('../services/backjob-mailer.js');
            
            // Prepare email details
            const emailDetails = {
                customerName: `${updated.customer.first_name} ${updated.customer.last_name}`,
                customerPhone: updated.customer.phone_number,
                serviceTitle: updated.service?.service_title || 'Service',
                providerName: `${updated.serviceProvider.provider_first_name} ${updated.serviceProvider.provider_last_name}`,
                providerPhone: updated.serviceProvider.provider_phone_number,
                appointmentId: updated.appointment_id,
                backjobId: approvedBackjob.backjob_id,
                newScheduledDate: newDate,
                originalReason: approvedBackjob.reason
            };

            console.log('📧 Sending backjob reschedule emails...');
            await sendBackjobRescheduleToCustomer(updated.customer.email, emailDetails);
            await sendBackjobRescheduleToProvider(updated.serviceProvider.provider_email, emailDetails);
            console.log('✅ Backjob reschedule emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending backjob reschedule emails:', emailError);
            // Don't fail the reschedule if email fails
        }

        return res.status(200).json({ success: true, message: 'Backjob appointment rescheduled', data: updated });
    } catch (error) {
        console.error('Error rescheduling backjob appointment:', error);
        return res.status(500).json({ success: false, message: 'Error rescheduling backjob appointment', error: error.message });
    }
};

// Get ratings for an appointment
export const getAppointmentRatings = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const ratings = await prisma.rating.findMany({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        profile_photo: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_profile_photo: true
                    }
                }
            }
        });

        res.json({
            success: true,
            ratings: ratings
        });

    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ratings',
            error: error.message
        });
    }
};

// Check if user can rate an appointment
export const canRateAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { rater_type } = req.query;

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check if appointment is completed
        if (appointment.appointment_status !== 'completed') {
            return res.json({
                success: true,
                can_rate: false,
                reason: 'Appointment not completed'
            });
        }

        // Check if rating already exists
        const existingRating = await prisma.rating.findFirst({
            where: {
                appointment_id: parseInt(appointmentId),
                rated_by: rater_type // Use 'rated_by' instead of 'rater_type'
            }
        });

        res.json({
            success: true,
            can_rate: !existingRating,
            reason: existingRating ? 'Rating already submitted' : null
        });

    } catch (error) {
        console.error('Error checking rating eligibility:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking rating eligibility',
            error: error.message
        });
    }
};

// Customer marks appointment completed (manual completion inside warranty window)
export const completeAppointmentByCustomer = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await prisma.appointment.findUnique({ where: { appointment_id: parseInt(appointmentId) } });
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        // Only owning customer can complete
        if (req.userType !== 'customer' || (req.userId && req.userId !== appointment.customer_id)) {
            return res.status(403).json({ success: false, message: 'Only the appointment customer can mark as completed' });
        }

        // Only allow if finished (in-warranty) or in-warranty
        if (!['in-warranty', 'finished', 'completed'].includes(appointment.appointment_status)) {
            return res.status(400).json({ success: false, message: 'Appointment is not eligible for completion' });
        }

        if (appointment.appointment_status === 'completed') {
            return res.status(200).json({ success: true, message: 'Already completed', data: appointment });
        }

        const dataUpdate = { appointment_status: 'completed', completed_at: new Date() };

        // Expire warranty immediately when customer completes the appointment
        dataUpdate.warranty_expires_at = new Date();

        const updated = await prisma.appointment.update({
            where: { appointment_id: appointment.appointment_id },
            data: dataUpdate,
            include: {
                customer: { 
                    select: { 
                        user_id: true, 
                        first_name: true, 
                        last_name: true,
                        email: true,
                        phone_number: true
                    } 
                },
                serviceProvider: { 
                    select: { 
                        provider_id: true, 
                        provider_first_name: true, 
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    } 
                },
                service: { 
                    select: { 
                        service_id: true, 
                        service_title: true, 
                        service_startingprice: true 
                    } 
                }
            }
        });

        // Handle warranty-based conversation updates
        try {
            await handleAppointmentWarranty(updated, 'completed');
            console.log('✅ Conversation warranty handling completed for customer completion');
        } catch (warrantyError) {
            console.error('❌ Error handling appointment warranty:', warrantyError);
            // Don't fail the completion if warranty handling fails
        }

        // Send completion email notifications when customer manually completes appointment
        try {
            const { sendBookingCompletionToCustomer, sendBookingCompletionToProvider } = await import('../services/mailer.js');
            
            // Format completion details for email
            const completionDetails = {
                customerName: `${updated.customer.first_name} ${updated.customer.last_name}`,
                customerPhone: updated.customer.phone_number,
                customerEmail: updated.customer.email,
                serviceTitle: updated.service?.service_title || 'Service',
                providerName: `${updated.serviceProvider.provider_first_name} ${updated.serviceProvider.provider_last_name}`,
                providerPhone: updated.serviceProvider.provider_phone_number,
                providerEmail: updated.serviceProvider.provider_email,
                scheduledDate: updated.scheduled_date,
                completedDate: updated.completed_at || new Date(),
                appointmentId: updated.appointment_id,
                startingPrice: updated.service?.service_startingprice || 0,
                repairDescription: updated.repairDescription
            };

            console.log('📧 Sending customer completion emails for appointment:', updated.appointment_id);
            
            // Send email to customer
            await sendBookingCompletionToCustomer(updated.customer.email, completionDetails);
            console.log('✅ Customer completion email sent to customer:', updated.customer.email);
            
            // Send email to provider
            await sendBookingCompletionToProvider(updated.serviceProvider.provider_email, completionDetails);
            console.log('✅ Customer completion email sent to provider:', updated.serviceProvider.provider_email);
            
        } catch (emailError) {
            console.error('❌ Error sending customer completion emails:', emailError);
            // Don't fail the completion if email fails
        }

        return res.status(200).json({ success: true, message: 'Appointment marked as completed', data: updated });
    } catch (error) {
        console.error('Error completing appointment:', error);
        return res.status(500).json({ success: false, message: 'Error completing appointment', error: error.message });
    }
};

// Get appointments that need ratings (for frontend rating prompts)
export const getAppointmentsNeedingRatings = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const userId = req.userId;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = {};

        // Automatically filter based on authenticated user's type
        if (req.userType === 'customer') {
            // Customers can rate completed appointments
            whereClause.customer_id = userId;
            whereClause.appointment_status = 'completed';
        } else if (req.userType === 'provider') {
            // Providers can rate customers on completed appointments
            whereClause.provider_id = userId;
            whereClause.appointment_status = 'completed';
        }

        // Get all relevant appointments for the user to filter unrated ones
        const appointmentsRaw = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        profile_photo: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_profile_photo: true,
                        provider_rating: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                },
                appointment_rating: {
                    select: {
                        id: true,
                        rating_value: true,
                        rating_comment: true,
                        rated_by: true,
                        created_at: true
                    }
                }
            },
            orderBy: {
                completed_at: 'desc'
            }
        });

        // Filter appointments that haven't been rated by the current user
        const unratedAppointments = appointmentsRaw.filter(a => {
            const customer_rating = a.appointment_rating?.find(r => r.rated_by === 'customer');
            const provider_rating = a.appointment_rating?.find(r => r.rated_by === 'provider');

            if (req.userType === 'customer') {
                return !customer_rating; // Show only if customer hasn't rated
            } else if (req.userType === 'provider') {
                return !provider_rating; // Show only if provider hasn't rated
            }
            return false;
        });

        // Apply pagination to filtered results
        const totalCount = unratedAppointments.length;
        const paginatedAppointments = unratedAppointments.slice(skip, skip + take);

        // Map to clean response format (no extra rating status since these are all unrated)
        const responseAppointments = paginatedAppointments.map(a => ({
            appointment_id: a.appointment_id,
            appointment_status: a.appointment_status,
            scheduled_date: a.scheduled_date,
            completed_at: a.completed_at,
            customer: a.customer,
            serviceProvider: a.serviceProvider,
            service: a.service,
            needs_rating: true // All these appointments need rating
        }));

        const totalPages = Math.ceil(totalCount / take);

        res.status(200).json({
            success: true,
            message: 'Unrated appointments retrieved successfully',
            data: responseAppointments,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_count: totalCount,
                limit: take,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching appointments that can be rated:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointments that can be rated',
            error: error.message
        });
    }
};

// Check if specific appointment needs rating
export const checkAppointmentRatingStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.userId;

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                appointment_rating: {
                    select: {
                        id: true,
                        rating_value: true,
                        rated_by: true,
                        created_at: true
                    }
                }
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check if user has access to this appointment
        if (req.userType === 'customer' && appointment.customer_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (req.userType === 'provider' && appointment.provider_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const customer_rating = appointment.appointment_rating?.find(r => r.rated_by === 'customer');
        const provider_rating = appointment.appointment_rating?.find(r => r.rated_by === 'provider');

        const is_rated_by_customer = !!customer_rating;
        const is_rated_by_provider = !!provider_rating;
        const is_rated = is_rated_by_customer; // Main flag

        let can_rate = false;
        let needs_rating = false;

        if (appointment.appointment_status === 'completed') {
            if (req.userType === 'customer') {
                can_rate = !is_rated_by_customer;
                needs_rating = !is_rated_by_customer;
            } else if (req.userType === 'provider') {
                can_rate = !is_rated_by_provider;
                needs_rating = !is_rated_by_provider;
            }
        }

        res.status(200).json({
            success: true,
            data: {
                appointment_id: appointment.appointment_id,
                appointment_status: appointment.appointment_status,
                is_rated,
                is_rated_by_customer,
                is_rated_by_provider,
                can_rate,
                needs_rating,
                rating_status: {
                    customer_rating: customer_rating ? {
                        rating_id: customer_rating.id,
                        rating_value: customer_rating.rating_value,
                        created_at: customer_rating.created_at
                    } : null,
                    provider_rating: provider_rating ? {
                        rating_id: provider_rating.id,
                        rating_value: provider_rating.rating_value,
                        created_at: provider_rating.created_at
                    } : null
                }
            }
        });

    } catch (error) {
        console.error('Error checking appointment rating status:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking appointment rating status',
            error: error.message
        });
    }
};

// Admin: Approve provider's dispute - cancels customer's backjob request
export const approveBackjobDispute = async (req, res) => {
    try {
        const { backjobId } = req.params;
        const { admin_notes } = req.body;

        // Find the backjob with all details
        const backjob = await prisma.backjobApplication.findUnique({
            where: { backjob_id: parseInt(backjobId) },
            include: {
                appointment: {
                    include: {
                        customer: {
                            select: {
                                user_id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true
                            }
                        },
                        serviceProvider: {
                            select: {
                                provider_id: true,
                                provider_first_name: true,
                                provider_last_name: true,
                                provider_email: true,
                                provider_phone_number: true
                            }
                        },
                        service: {
                            select: {
                                service_id: true,
                                service_title: true
                            }
                        }
                    }
                }
            }
        });

        if (!backjob) {
            return res.status(404).json({ success: false, message: 'Backjob not found' });
        }

        // Check if backjob is disputed
        if (backjob.status !== 'disputed') {
            return res.status(400).json({ 
                success: false, 
                message: 'Only disputed backjobs can have disputes approved. Current status: ' + backjob.status 
            });
        }

        // Get appointment for warranty handling
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: backjob.appointment_id }
        });

        // Use transaction to update both backjob and appointment
        const result = await prisma.$transaction(async (tx) => {
            // Mark backjob as cancelled-by-admin (dispute approved = customer's request denied)
            const updatedBackjob = await tx.backjobApplication.update({
                where: { backjob_id: backjob.backjob_id },
                data: {
                    status: 'cancelled-by-admin',
                    admin_notes: admin_notes || 'Provider dispute approved by admin',
                    resolved_at: new Date()
                }
            });

            // Resume warranty from paused state when dispute is approved (cancels backjob)
            let appointmentUpdate = {};
            if (appointment && appointment.warranty_paused_at && appointment.warranty_remaining_days !== null) {
                const now = new Date();
                const resumeExpiryDate = new Date(now);
                resumeExpiryDate.setDate(resumeExpiryDate.getDate() + appointment.warranty_remaining_days);
                
                appointmentUpdate = {
                    appointment_status: 'in-warranty',
                    warranty_expires_at: resumeExpiryDate,
                    warranty_paused_at: null,
                    warranty_remaining_days: null
                };
            } else {
                appointmentUpdate = { appointment_status: 'in-warranty' };
            }

            await tx.appointment.update({
                where: { appointment_id: backjob.appointment_id },
                data: appointmentUpdate
            });

            return updatedBackjob;
        });

        // Send email notifications
        try {
            const { sendDisputeApprovedToCustomer, sendDisputeApprovedToProvider } = await import('../services/backjob-mailer.js');
            
            const emailDetails = {
                customerName: `${backjob.appointment.customer.first_name} ${backjob.appointment.customer.last_name}`,
                providerName: `${backjob.appointment.serviceProvider.provider_first_name} ${backjob.appointment.serviceProvider.provider_last_name}`,
                serviceTitle: backjob.appointment.service.service_title,
                appointmentId: backjob.appointment_id,
                backjobId: backjob.backjob_id,
                originalReason: backjob.reason,
                providerDisputeReason: backjob.provider_dispute_reason,
                adminNotes: admin_notes || 'Provider dispute approved by admin'
            };

            console.log('📧 Sending dispute approval emails...');
            await sendDisputeApprovedToCustomer(backjob.appointment.customer.email, emailDetails);
            await sendDisputeApprovedToProvider(backjob.appointment.serviceProvider.provider_email, emailDetails);
            console.log('✅ Dispute approval emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending dispute approval emails:', emailError);
            // Don't fail the operation if email fails
        }

        // Send push notifications
        try {
            await notificationService.sendBackjobStatusNotification(
                backjob.backjob_id,
                'dispute-approved'
            );
            console.log('✅ Dispute approval notification sent');
        } catch (notifError) {
            console.error('❌ Error sending dispute approval notification:', notifError);
        }

        return res.status(200).json({
            success: true,
            message: 'Provider dispute approved. Customer backjob request cancelled and warranty resumed.',
            data: result
        });
    } catch (error) {
        console.error('Error approving backjob dispute:', error);
        return res.status(500).json({
            success: false,
            message: 'Error approving backjob dispute',
            error: error.message
        });
    }
};

// Admin: Reject provider's dispute - keeps backjob active for rescheduling
export const rejectBackjobDispute = async (req, res) => {
    try {
        const { backjobId } = req.params;
        const { admin_notes } = req.body;

        // Find the backjob with all details
        const backjob = await prisma.backjobApplication.findUnique({
            where: { backjob_id: parseInt(backjobId) },
            include: {
                appointment: {
                    include: {
                        customer: {
                            select: {
                                user_id: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                phone_number: true
                            }
                        },
                        serviceProvider: {
                            select: {
                                provider_id: true,
                                provider_first_name: true,
                                provider_last_name: true,
                                provider_email: true,
                                provider_phone_number: true
                            }
                        },
                        service: {
                            select: {
                                service_id: true,
                                service_title: true
                            }
                        }
                    }
                }
            }
        });

        if (!backjob) {
            return res.status(404).json({ success: false, message: 'Backjob not found' });
        }

        // Check if backjob is disputed
        if (backjob.status !== 'disputed') {
            return res.status(400).json({
                success: false,
                message: 'Only disputed backjobs can have disputes rejected. Current status: ' + backjob.status
            });
        }

        // Update backjob status back to approved (dispute rejected = customer's request stands)
        const updatedBackjob = await prisma.backjobApplication.update({
            where: { backjob_id: backjob.backjob_id },
            data: {
                status: 'approved',
                admin_notes: admin_notes || 'Provider dispute rejected by admin. Backjob remains active.'
            }
        });

        // Send email notifications
        try {
            const { sendDisputeRejectedToCustomer, sendDisputeRejectedToProvider } = await import('../services/backjob-mailer.js');
            
            const emailDetails = {
                customerName: `${backjob.appointment.customer.first_name} ${backjob.appointment.customer.last_name}`,
                providerName: `${backjob.appointment.serviceProvider.provider_first_name} ${backjob.appointment.serviceProvider.provider_last_name}`,
                providerPhone: backjob.appointment.serviceProvider.provider_phone_number,
                customerPhone: backjob.appointment.customer.phone_number,
                serviceTitle: backjob.appointment.service.service_title,
                appointmentId: backjob.appointment_id,
                backjobId: backjob.backjob_id,
                originalReason: backjob.reason,
                providerDisputeReason: backjob.provider_dispute_reason,
                adminNotes: admin_notes || 'Provider dispute rejected by admin. Backjob remains active.'
            };

            console.log('📧 Sending dispute rejection emails...');
            await sendDisputeRejectedToCustomer(backjob.appointment.customer.email, emailDetails);
            await sendDisputeRejectedToProvider(backjob.appointment.serviceProvider.provider_email, emailDetails);
            console.log('✅ Dispute rejection emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending dispute rejection emails:', emailError);
            // Don't fail the operation if email fails
        }

        // Send push notifications
        try {
            await notificationService.sendBackjobStatusNotification(
                backjob.backjob_id,
                'dispute-rejected'
            );
            console.log('✅ Dispute rejection notification sent');
        } catch (notifError) {
            console.error('❌ Error sending dispute rejection notification:', notifError);
        }

        return res.status(200).json({
            success: true,
            message: 'Provider dispute rejected. Customer backjob request remains active. Provider must reschedule.',
            data: updatedBackjob
        });
    } catch (error) {
        console.error('Error rejecting backjob dispute:', error);
        return res.status(500).json({
            success: false,
            message: 'Error rejecting backjob dispute',
            error: error.message
        });
    }
};
