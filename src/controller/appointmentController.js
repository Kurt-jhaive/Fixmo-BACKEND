import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all appointments (with filtering and pagination)
export const getAllAppointments = async (req, res) => {
    try {
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
            const needs_rating = a.appointment_status === 'completed' && !a.appointment_rating?.some(r => r.rated_by === 'customer');
            return { ...a, days_left, needs_rating };
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

        const appointment = await prisma.appointment.findUnique({
            where: {
                appointment_id: parseInt(appointmentId)
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
        const needs_rating = appointment.appointment_status === 'completed' && !appointment.appointment_rating?.some(r => r.rated_by === 'customer');

        res.status(200).json({
            success: true,
            data: { ...appointment, days_left, needs_rating }
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
    const validStatuses = ['scheduled', 'on-the-way', 'in-progress', 'in-warranty', 'finished', 'completed', 'cancelled'];
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
            // warranty_expires_at will be set upon completion trigger or here based on finished_at
            // Set now if warranty_days exists
            const warrantyDays = existingAppointment.warranty_days;
            if (warrantyDays && Number.isInteger(warrantyDays)) {
                const expires = new Date();
                expires.setDate(expires.getDate() + warrantyDays);
                dataUpdate.warranty_expires_at = expires;
            }
        }

        if (status === 'completed') {
            dataUpdate.completed_at = new Date();
            // Keep warranty_expires_at as previously set (from finished), do not change status further
        }

        if (status === 'in-warranty') {
            if (!existingAppointment.finished_at) {
                dataUpdate.finished_at = new Date();
            }
            const warrantyDays = existingAppointment.warranty_days;
            if (warrantyDays && Number.isInteger(warrantyDays)) {
                const base = dataUpdate.finished_at ? new Date(dataUpdate.finished_at) : (existingAppointment.finished_at ? new Date(existingAppointment.finished_at) : new Date());
                const expires = new Date(base);
                expires.setDate(expires.getDate() + warrantyDays);
                dataUpdate.warranty_expires_at = expires;
            }
        }

        // Update appointment status and timing fields
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: dataUpdate,
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true
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

// Cancel appointment with reason
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
            where: { appointment_id: parseInt(appointmentId) }
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
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true
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
            message: 'Appointment cancelled successfully',
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
                    appointment_rating: {
                        select: {
                            rating_value: true,
                            rating_comment: true,
                            rated_by: true
                        }
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
            const needs_rating = a.appointment_status === 'completed' && !a.appointment_rating?.some(r => r.rated_by === 'customer');
            return { ...a, days_left, needs_rating };
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
                            rating_value: true,
                            rating_comment: true,
                            rated_by: true
                        }
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
            const needs_rating = a.appointment_status === 'completed' && !a.appointment_rating?.some(r => r.rated_by === 'customer');
            return { ...a, days_left, needs_rating };
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
// Apply for backjob (customer) when appointment is in-warranty
export const applyBackjob = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { reason, evidence } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason is required' });
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
        const existingActive = await prisma.backjobApplication.findFirst({
            where: {
                appointment_id: appointment.appointment_id,
                status: { in: ['pending', 'approved', 'disputed'] }
            }
        });
        if (existingActive) {
            return res.status(409).json({ success: false, message: 'An active backjob request already exists for this appointment' });
        }

        // Create backjob application
        const backjob = await prisma.backjobApplication.create({
            data: {
                appointment_id: appointment.appointment_id,
                customer_id: appointment.customer_id,
                provider_id: appointment.provider_id,
                reason,
                evidence: evidence || null,
            },
        });

        // Update appointment status to backjob
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: appointment.appointment_id },
            data: { appointment_status: 'backjob' },
        });

        return res.status(201).json({ success: true, message: 'Backjob application submitted', data: { backjob, appointment: updatedAppointment } });
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

        const updated = await prisma.backjobApplication.update({
            where: { backjob_id: backjob.backjob_id },
            data: {
                status: 'disputed',
                provider_dispute_reason: dispute_reason || null,
                provider_dispute_evidence: dispute_evidence || null,
            },
        });

        return res.status(200).json({ success: true, message: 'Backjob disputed', data: updated });
    } catch (error) {
        console.error('Error disputing backjob:', error);
        return res.status(500).json({ success: false, message: 'Error disputing backjob', error: error.message });
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
                    appointment: true,
                    customer: { select: { user_id: true, first_name: true, last_name: true, email: true } },
                    provider: { select: { provider_id: true, provider_first_name: true, provider_last_name: true, provider_email: true } },
                },
                orderBy: { created_at: 'desc' },
                skip, take,
            }),
            prisma.backjobApplication.count({ where }),
        ]);

        return res.status(200).json({ success: true, data: items, pagination: { current_page: parseInt(page), total_pages: Math.ceil(total / take), total_count: total, limit: take } });
    } catch (error) {
        console.error('Error listing backjobs:', error);
        return res.status(500).json({ success: false, message: 'Error listing backjobs', error: error.message });
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

        if (action === 'approve') {
            newStatus = 'approved';
            // Appointment remains in 'backjob' until provider reschedules
        } else if (action === 'cancel-by-admin') {
            newStatus = 'cancelled-by-admin';
            appointmentUpdate = { appointment_status: 'completed' };
        } else if (action === 'cancel-by-user') {
            newStatus = 'cancelled-by-user';
            // Appointment returns to warranty state
            appointmentUpdate = { appointment_status: 'in-warranty' };
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const updatedBackjob = await prisma.backjobApplication.update({
            where: { backjob_id: backjob.backjob_id },
            data: { status: newStatus, admin_notes: admin_notes || null },
        });

        if (appointmentUpdate) {
            await prisma.appointment.update({ where: { appointment_id: backjob.appointment_id }, data: appointmentUpdate });
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

        const updated = await prisma.appointment.update({
            where: { appointment_id: appointment.appointment_id },
            data: { scheduled_date: newDate, availability_id: parseInt(availability_id), appointment_status: 'scheduled' },
            include: {
                customer: { select: { user_id: true, first_name: true, last_name: true, email: true, phone_number: true } },
                serviceProvider: { select: { provider_id: true, provider_first_name: true, provider_last_name: true, provider_email: true, provider_phone_number: true } },
                service: { select: { service_id: true, service_title: true, service_startingprice: true } }
            }
        });

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

        // Ensure warranty_expires_at is set based on finished_at + warranty_days if not already
        if (!appointment.warranty_expires_at) {
            const base = appointment.finished_at ? new Date(appointment.finished_at) : new Date();
            if (appointment.warranty_days && Number.isInteger(appointment.warranty_days)) {
                const expires = new Date(base);
                expires.setDate(expires.getDate() + appointment.warranty_days);
                dataUpdate.warranty_expires_at = expires;
            }
        }

        const updated = await prisma.appointment.update({
            where: { appointment_id: appointment.appointment_id },
            data: dataUpdate,
            include: {
                customer: { select: { user_id: true, first_name: true, last_name: true } },
                serviceProvider: { select: { provider_id: true, provider_first_name: true, provider_last_name: true } },
                service: { select: { service_id: true, service_title: true, service_startingprice: true } }
            }
        });

        return res.status(200).json({ success: true, message: 'Appointment marked as completed', data: updated });
    } catch (error) {
        console.error('Error completing appointment:', error);
        return res.status(500).json({ success: false, message: 'Error completing appointment', error: error.message });
    }
};
