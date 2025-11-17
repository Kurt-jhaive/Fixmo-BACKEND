import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class AvailabilityController {
    // Get provider's availability
    static async getProviderAvailability(req, res) {
        try {
            console.log('Getting provider availability for provider:', req.userId);
            
            const providerId = req.userId;
            const { includeInactive } = req.query; // Optional query param to include inactive slots
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Build where clause based on includeInactive flag
            const whereClause = {
                provider_id: providerId
            };

            // By default, only show slots where both day AND slot are active
            // Unless includeInactive=true is specified
            if (includeInactive !== 'true') {
                whereClause.AND = [
                    { availability_isActive: true },
                    { slot_isActive: true }
                ];
            }

            const availability = await prisma.availability.findMany({
                where: whereClause,
                orderBy: [
                    {
                        dayOfWeek: 'asc'
                    },
                    {
                        startTime: 'asc'
                    }
                ]
            });

            console.log(`Found ${availability.length} availability records for provider ${providerId}`);

            // Add status indicator for each slot
            const enrichedAvailability = availability.map(slot => ({
                ...slot,
                isBookable: slot.availability_isActive && slot.slot_isActive,
                statusReason: !slot.availability_isActive 
                    ? 'Day is deactivated' 
                    : !slot.slot_isActive 
                        ? 'Time slot is deactivated' 
                        : 'Available for booking'
            }));

            res.json({
                success: true,
                data: enrichedAvailability,
                meta: {
                    total: enrichedAvailability.length,
                    bookableSlots: enrichedAvailability.filter(s => s.isBookable).length,
                    showingInactive: includeInactive === 'true'
                }
            });

        } catch (error) {
            console.error('Error fetching availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching availability'
            });
        }
    }

    // Set or update provider's availability
    static async setProviderAvailability(req, res) {
        try {
            console.log('Setting provider availability for provider:', req.userId);
            console.log('Availability data:', req.body);
            
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const { availabilityData } = req.body;

            if (!Array.isArray(availabilityData)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid availability data format'
                });
            }

            // Instead of deleting all, we need to handle availability slots more carefully
            // to avoid foreign key constraint violations
            
            // First, get existing availability slots that have appointments
            const slotsWithAppointments = await prisma.availability.findMany({
                where: {
                    provider_id: providerId,
                    appointments: {
                        some: {} // Has at least one appointment
                    }
                },
                select: {
                    availability_id: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true
                }
            });

            console.log(`Found ${slotsWithAppointments.length} slots with appointments`);

            // Delete only availability slots that don't have appointments
            await prisma.availability.deleteMany({
                where: {
                    provider_id: providerId,
                    appointments: {
                        none: {} // Has no appointments
                    }
                }
            });

            console.log('Deleted availability records without appointments');            // Process new availability records
            const availabilityRecords = [];
            const updatePromises = [];
            
            for (const dayData of availabilityData) {
                const { dayOfWeek, isAvailable, startTime, endTime } = dayData;
                
                // Save time slots if they exist, regardless of isAvailable status
                if (startTime && endTime) {
                    // Validate time format
                    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid time format for ${dayOfWeek}`
                        });
                    }

                    // Check if end time is after start time
                    if (startTime >= endTime) {
                        return res.status(400).json({
                            success: false,
                            message: `End time must be after start time for ${dayOfWeek}`
                        });
                    }

                    // Check if this slot already exists (especially those with appointments)
                    const existingSlot = slotsWithAppointments.find(slot => 
                        slot.dayOfWeek === dayOfWeek && 
                        slot.startTime === startTime && 
                        slot.endTime === endTime
                    );

                    if (existingSlot) {
                        // Update existing slot that has appointments
                        updatePromises.push(
                            prisma.availability.update({
                                where: { availability_id: existingSlot.availability_id },
                                data: { availability_isActive: isAvailable }
                            })
                        );
                    } else {
                        // Create new slot
                        availabilityRecords.push({
                            provider_id: providerId,
                            dayOfWeek: dayOfWeek,
                            startTime: startTime,
                            endTime: endTime,
                            availability_isActive: isAvailable // Store the checkbox state
                        });
                    }
                }
            }

            // Execute updates for existing slots with appointments
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                console.log(`Updated ${updatePromises.length} existing slots with appointments`);
            }

            // Create new slots
            if (availabilityRecords.length > 0) {
                await prisma.availability.createMany({
                    data: availabilityRecords
                });
                console.log(`Created ${availabilityRecords.length} new availability records`);
            }

            res.json({
                success: true,
                message: 'Availability updated successfully',
                data: availabilityRecords
            });

        } catch (error) {
            console.error('Error setting availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating availability'
            });
        }
    }

    // Delete specific availability record
    static async deleteAvailability(req, res) {
        try {
            const { availabilityId } = req.params;
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Check if the availability belongs to the provider and get all appointments
            const availability = await prisma.availability.findFirst({
                where: {
                    availability_id: parseInt(availabilityId),
                    provider_id: providerId
                },
                include: {
                    appointments: true // Get all appointments
                }
            });

            if (!availability) {
                return res.status(404).json({
                    success: false,
                    message: 'Availability record not found'
                });
            }

            // Check if there are ANY appointments linked to this slot
            if (availability.appointments.length > 0) {
                const activeAppointments = availability.appointments.filter(appt => 
                    ['scheduled', 'confirmed', 'in-progress'].includes(appt.appointment_status)
                );

                const inactiveAppointments = availability.appointments.filter(appt => 
                    !['scheduled', 'confirmed', 'in-progress'].includes(appt.appointment_status)
                );

                return res.status(409).json({
                    success: false,
                    message: `Cannot delete availability slot with ${availability.appointments.length} appointment(s). This slot has ${activeAppointments.length} active and ${inactiveAppointments.length} completed/cancelled appointments.`,
                    reason: 'Appointments are permanently linked to availability slots for record-keeping',
                    suggestion: 'Instead of deleting, you can deactivate this slot by toggling it off',
                    appointments: {
                        total: availability.appointments.length,
                        active: activeAppointments.map(appt => ({
                            appointment_id: appt.appointment_id,
                            scheduled_date: appt.scheduled_date,
                            status: appt.appointment_status
                        })),
                        inactive: inactiveAppointments.map(appt => ({
                            appointment_id: appt.appointment_id,
                            scheduled_date: appt.scheduled_date,
                            status: appt.appointment_status
                        }))
                    }
                });
            }

            // No appointments - safe to delete the availability slot
            await prisma.availability.delete({
                where: {
                    availability_id: parseInt(availabilityId)
                }
            });

            console.log(`Deleted availability record ${availabilityId} for provider ${providerId}`);

            res.json({
                success: true,
                message: 'Availability deleted successfully',
                action: 'deleted'
            });

        } catch (error) {
            console.error('Error deleting availability:', error);
            
            // Handle foreign key constraint error
            if (error.code === 'P2003') {
                return res.status(409).json({
                    success: false,
                    message: 'Cannot delete availability slot with existing appointments. The slot has been deactivated instead.',
                    error: 'foreign_key_constraint'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error deleting availability',
                error: error.message
            });
        }
    }

    // Toggle availability for an entire day
    static async toggleDayAvailability(req, res) {
        try {
            console.log('Toggling day availability for provider:', req.userId);
            console.log('Request body:', req.body);
            
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const { dayOfWeek, isActive } = req.body;

            // Validation
            if (!dayOfWeek) {
                return res.status(400).json({
                    success: false,
                    message: 'dayOfWeek is required'
                });
            }

            if (typeof isActive !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'isActive must be a boolean value (true or false)'
                });
            }

            // Validate day of week
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayOfWeek)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid dayOfWeek. Must be one of: ${validDays.join(', ')}`
                });
            }

            // Get all availability slots for this day
            const availabilitySlots = await prisma.availability.findMany({
                where: {
                    provider_id: providerId,
                    dayOfWeek: dayOfWeek
                },
                include: {
                    appointments: {
                        where: {
                            appointment_status: {
                                in: ['scheduled', 'confirmed', 'in-progress']
                            }
                        }
                    }
                }
            });

            if (availabilitySlots.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No availability slots found for ${dayOfWeek}. Please add availability first.`
                });
            }

            // Check if trying to deactivate a day with active appointments
            if (!isActive) {
                const slotsWithAppointments = availabilitySlots.filter(slot => 
                    slot.appointments && slot.appointments.length > 0
                );

                if (slotsWithAppointments.length > 0) {
                    const totalAppointments = slotsWithAppointments.reduce(
                        (sum, slot) => sum + slot.appointments.length, 
                        0
                    );

                    return res.status(409).json({
                        success: false,
                        message: `Cannot deactivate ${dayOfWeek}. There are ${totalAppointments} active appointment(s) scheduled for this day.`,
                        conflictingAppointments: slotsWithAppointments.map(slot => ({
                            availability_id: slot.availability_id,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            appointments: slot.appointments.map(appt => ({
                                appointment_id: appt.appointment_id,
                                scheduled_date: appt.scheduled_date,
                                status: appt.appointment_status
                            }))
                        }))
                    });
                }
            }

            // Update all slots for this day
            const updateResult = await prisma.availability.updateMany({
                where: {
                    provider_id: providerId,
                    dayOfWeek: dayOfWeek
                },
                data: {
                    availability_isActive: isActive
                }
            });

            console.log(`${isActive ? 'Activated' : 'Deactivated'} ${updateResult.count} availability slot(s) for ${dayOfWeek}`);

            res.json({
                success: true,
                message: `${dayOfWeek} availability ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    dayOfWeek,
                    isActive,
                    updatedSlots: updateResult.count,
                    status: isActive ? 'Bookable' : 'Not bookable'
                }
            });

        } catch (error) {
            console.error('Error toggling day availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error toggling day availability',
                error: error.message
            });
        }
    }

    // Get day availability status
    static async getDayAvailabilityStatus(req, res) {
        try {
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get availability grouped by day
            const allSlots = await prisma.availability.findMany({
                where: {
                    provider_id: providerId
                },
                orderBy: [
                    { dayOfWeek: 'asc' },
                    { startTime: 'asc' }
                ]
            });

            // Group by day and calculate status
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            const dayStatus = daysOfWeek.map(day => {
                const daySlots = allSlots.filter(slot => slot.dayOfWeek === day);
                
                if (daySlots.length === 0) {
                    return {
                        dayOfWeek: day,
                        hasSlots: false,
                        totalSlots: 0,
                        activeSlots: 0,
                        inactiveSlots: 0,
                        bookableSlots: 0,
                        isFullyActive: false,
                        isFullyInactive: false,
                        status: 'No availability set'
                    };
                }

                // Count slots by different criteria
                const dayActiveSlots = daySlots.filter(slot => slot.availability_isActive).length;
                const slotActiveSlots = daySlots.filter(slot => slot.slot_isActive).length;
                const bookableSlots = daySlots.filter(slot => slot.availability_isActive && slot.slot_isActive).length;

                return {
                    dayOfWeek: day,
                    hasSlots: true,
                    totalSlots: daySlots.length,
                    dayActiveSlots, // Day-level toggle count
                    slotActiveSlots, // Slot-level toggle count
                    bookableSlots, // Both day AND slot active
                    inactiveSlots: daySlots.length - bookableSlots,
                    isFullyActive: bookableSlots === daySlots.length,
                    isFullyInactive: bookableSlots === 0,
                    status: bookableSlots === daySlots.length 
                        ? 'Fully available' 
                        : bookableSlots === 0 
                            ? 'Not available' 
                            : 'Partially available',
                    slots: daySlots.map(slot => ({
                        availability_id: slot.availability_id,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        dayIsActive: slot.availability_isActive, // Day-level toggle
                        slotIsActive: slot.slot_isActive, // Slot-level toggle
                        isBookable: slot.availability_isActive && slot.slot_isActive, // Combined status
                        statusReason: !slot.availability_isActive 
                            ? 'Day deactivated' 
                            : !slot.slot_isActive 
                                ? 'Slot deactivated' 
                                : 'Available'
                    }))
                };
            });

            res.json({
                success: true,
                data: dayStatus
            });

        } catch (error) {
            console.error('Error getting day availability status:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting day availability status',
                error: error.message
            });
        }
    }

    // Toggle individual time slot (new feature for granular control)
    static async toggleTimeSlot(req, res) {
        try {
            console.log('Toggling individual time slot for provider:', req.userId);
            console.log('Request params:', req.params);
            console.log('Request body:', req.body);
            
            const providerId = req.userId;
            const { availabilityId } = req.params;
            const { slot_isActive } = req.body;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Validation
            if (!availabilityId) {
                return res.status(400).json({
                    success: false,
                    message: 'availabilityId is required'
                });
            }

            if (typeof slot_isActive !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'slot_isActive must be a boolean value (true or false)'
                });
            }

            // Find the slot and verify it belongs to the provider
            const slot = await prisma.availability.findFirst({
                where: {
                    availability_id: parseInt(availabilityId),
                    provider_id: providerId
                },
                include: {
                    appointments: {
                        where: {
                            appointment_status: {
                                in: ['scheduled', 'confirmed', 'in-progress']
                            }
                        }
                    }
                }
            });

            if (!slot) {
                return res.status(404).json({
                    success: false,
                    message: 'Time slot not found or does not belong to you'
                });
            }

            // Check if trying to deactivate a slot with active appointments
            if (!slot_isActive && slot.appointments && slot.appointments.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: `Cannot deactivate time slot. There are ${slot.appointments.length} active appointment(s) scheduled for this slot.`,
                    conflictingAppointments: slot.appointments.map(appt => ({
                        appointment_id: appt.appointment_id,
                        scheduled_date: appt.scheduled_date,
                        status: appt.appointment_status,
                        customer_name: appt.customer_name
                    })),
                    suggestion: 'Please cancel or complete these appointments before deactivating the slot'
                });
            }

            // Update the individual slot
            const updatedSlot = await prisma.availability.update({
                where: {
                    availability_id: parseInt(availabilityId)
                },
                data: {
                    slot_isActive: slot_isActive
                }
            });

            console.log(`${slot_isActive ? 'Activated' : 'Deactivated'} time slot ${availabilityId} (${slot.dayOfWeek} ${slot.startTime}-${slot.endTime})`);

            res.json({
                success: true,
                message: `Time slot ${slot_isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    availability_id: updatedSlot.availability_id,
                    dayOfWeek: updatedSlot.dayOfWeek,
                    startTime: updatedSlot.startTime,
                    endTime: updatedSlot.endTime,
                    slot_isActive: updatedSlot.slot_isActive,
                    availability_isActive: updatedSlot.availability_isActive,
                    status: updatedSlot.slot_isActive && updatedSlot.availability_isActive 
                        ? 'Bookable' 
                        : 'Not bookable',
                    note: updatedSlot.slot_isActive && !updatedSlot.availability_isActive 
                        ? 'Slot is active but day is deactivated. Customers cannot book until day is activated.' 
                        : null
                }
            });

        } catch (error) {
            console.error('Error toggling time slot:', error);
            res.status(500).json({
                success: false,
                message: 'Error toggling time slot',
                error: error.message
            });
        }
    }

    // Add time-range based availability for a specific day
    static async addTimeRangeAvailability(req, res) {
        try {
            console.log('Adding time-range availability for provider:', req.userId);
            console.log('Request body:', req.body);
            
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const { dayOfWeek, startTime, endTime } = req.body;

            // Validation
            if (!dayOfWeek || !startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'dayOfWeek, startTime, and endTime are required'
                });
            }

            // Validate day of week
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayOfWeek)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid dayOfWeek. Must be one of: ${validDays.join(', ')}`
                });
            }

            // Validate time format (HH:MM)
            const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid time format. Use HH:MM format (e.g., 09:00, 14:30)'
                });
            }

            // Check if end time is after start time
            if (startTime >= endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }

            // Check for overlapping availability slots
            const existingSlots = await prisma.availability.findMany({
                where: {
                    provider_id: providerId,
                    dayOfWeek: dayOfWeek,
                    availability_isActive: true
                },
                include: {
                    appointments: {
                        where: {
                            appointment_status: {
                                in: ['scheduled', 'confirmed', 'in-progress']
                            }
                        }
                    }
                },
                orderBy: {
                    startTime: 'asc'
                }
            });

            // Helper function to check if time ranges overlap
            const timeRangesOverlap = (start1, end1, start2, end2) => {
                return start1 < end2 && start2 < end1;
            };

            // Check for conflicts with existing slots
            for (const slot of existingSlots) {
                if (timeRangesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
                    // If there are active appointments in this overlapping slot
                    if (slot.appointments.length > 0) {
                        return res.status(409).json({
                            success: false,
                            message: `Time conflict: You have existing bookings between ${slot.startTime} - ${slot.endTime} on ${dayOfWeek}`,
                            conflictingSlot: {
                                availability_id: slot.availability_id,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                                bookingCount: slot.appointments.length
                            }
                        });
                    }
                }
            }

            // Create the new availability slot
            const newAvailability = await prisma.availability.create({
                data: {
                    provider_id: providerId,
                    dayOfWeek: dayOfWeek,
                    startTime: startTime,
                    endTime: endTime,
                    availability_isActive: true
                }
            });

            console.log(`Created new availability slot ${newAvailability.availability_id} for provider ${providerId}`);

            res.status(201).json({
                success: true,
                message: 'Time-range availability added successfully',
                data: newAvailability
            });

        } catch (error) {
            console.error('Error adding time-range availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding availability',
                error: error.message
            });
        }
    }

    // Check if a specific time range is available for booking
    static async checkTimeRangeAvailability(req, res) {
        try {
            const { providerId } = req.params;
            const { dayOfWeek, startTime, endTime, date } = req.query;

            // Validation
            if (!dayOfWeek || !startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'dayOfWeek, startTime, and endTime are required'
                });
            }

            // Get all availability slots for the provider on that day
            const availabilitySlots = await prisma.availability.findMany({
                where: {
                    provider_id: parseInt(providerId),
                    dayOfWeek: dayOfWeek,
                    availability_isActive: true
                },
                include: {
                    appointments: {
                        where: date ? {
                            scheduled_date: new Date(date),
                            appointment_status: {
                                in: ['scheduled', 'confirmed', 'in-progress']
                            }
                        } : {
                            appointment_status: {
                                in: ['scheduled', 'confirmed', 'in-progress']
                            }
                        }
                    }
                },
                orderBy: {
                    startTime: 'asc'
                }
            });

            // Helper function to check if requested time is within availability slot
            const isWithinSlot = (reqStart, reqEnd, slotStart, slotEnd) => {
                return reqStart >= slotStart && reqEnd <= slotEnd;
            };

            // Helper function to check if time ranges overlap
            const timeRangesOverlap = (start1, end1, start2, end2) => {
                return start1 < end2 && start2 < end1;
            };

            let isAvailable = false;
            let matchingSlot = null;
            let conflictingAppointments = [];

            // Check if the requested time range fits within any availability slot
            for (const slot of availabilitySlots) {
                if (isWithinSlot(startTime, endTime, slot.startTime, slot.endTime)) {
                    matchingSlot = slot;
                    
                    // Check if there are any conflicting appointments
                    const conflicts = slot.appointments.filter(appt => {
                        // Get appointment time from scheduled_date
                        const apptDate = new Date(appt.scheduled_date);
                        const apptStartTime = `${String(apptDate.getHours()).padStart(2, '0')}:${String(apptDate.getMinutes()).padStart(2, '0')}`;
                        
                        // Assuming appointments last 1 hour (you can adjust this)
                        const apptEndHour = apptDate.getHours() + 1;
                        const apptEndTime = `${String(apptEndHour).padStart(2, '0')}:${String(apptDate.getMinutes()).padStart(2, '0')}`;
                        
                        return timeRangesOverlap(startTime, endTime, apptStartTime, apptEndTime);
                    });

                    if (conflicts.length === 0) {
                        isAvailable = true;
                        break;
                    } else {
                        conflictingAppointments = conflicts;
                    }
                }
            }

            res.json({
                success: true,
                data: {
                    isAvailable,
                    requestedTimeRange: {
                        dayOfWeek,
                        startTime,
                        endTime,
                        date
                    },
                    matchingSlot: matchingSlot ? {
                        availability_id: matchingSlot.availability_id,
                        startTime: matchingSlot.startTime,
                        endTime: matchingSlot.endTime
                    } : null,
                    conflictingAppointments: conflictingAppointments.map(appt => ({
                        appointment_id: appt.appointment_id,
                        scheduled_date: appt.scheduled_date,
                        status: appt.appointment_status
                    })),
                    message: isAvailable 
                        ? 'Time range is available for booking' 
                        : matchingSlot 
                            ? `Time range conflicts with ${conflictingAppointments.length} existing appointment(s)`
                            : 'No availability slot found for the requested time range'
                }
            });

        } catch (error) {
            console.error('Error checking time-range availability:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking availability',
                error: error.message
            });
        }
    }

    // Get availability summary
    static async getAvailabilitySummary(req, res) {
        try {
            const providerId = req.userId;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const totalSlots = await prisma.availability.count({
                where: {
                    provider_id: providerId
                }
            });

            const activeSlots = await prisma.availability.count({
                where: {
                    provider_id: providerId,
                    availability_isActive: true
                }
            });

            // Count booked slots by counting availabilities that have appointments
            const bookedSlots = await prisma.availability.count({
                where: {
                    provider_id: providerId,
                    availability_isActive: true,
                    appointments: {
                        some: {} // Has at least one appointment
                    }
                }
            });

            const availableSlots = activeSlots - bookedSlots;
            const configuredSlots = totalSlots - activeSlots;

            // Get availability by day
            const availabilityByDay = await prisma.availability.groupBy({
                by: ['dayOfWeek'],
                where: {
                    provider_id: providerId
                },
                _count: {
                    availability_id: true
                }
            });

            // Get active days count
            const activeDays = await prisma.availability.groupBy({
                by: ['dayOfWeek'],
                where: {
                    provider_id: providerId,
                    availability_isActive: true
                },
                _count: {
                    availability_id: true
                }
            });

            res.json({
                success: true,
                data: {
                    totalSlots,
                    activeSlots,
                    bookedSlots,
                    availableSlots,
                    configuredSlots,
                    activeDays: activeDays.length,
                    availabilityByDay
                }
            });

        } catch (error) {
            console.error('Error getting availability summary:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting availability summary'
            });
        }
    }

    // Get booked slots for a specific provider (public endpoint for customers)
    static async getProviderBookedSlots(req, res) {
        try {
            const { providerId } = req.params;
            const { dayOfWeek, date } = req.query;
            
            if (!providerId || isNaN(parseInt(providerId))) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid provider ID is required'
                });
            }

            // Validation
            if (!dayOfWeek) {
                return res.status(400).json({
                    success: false,
                    message: 'dayOfWeek query parameter is required (e.g., ?dayOfWeek=Monday)'
                });
            }

            // Validate day of week
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayOfWeek)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid dayOfWeek. Must be one of: ${validDays.join(', ')}`
                });
            }

            // Build query filter for appointments
            let appointmentFilter = {
                appointment_status: {
                    in: ['scheduled', 'confirmed', 'in-progress']
                }
            };

            // If specific date provided, filter appointments by that date
            if (date) {
                const targetDate = new Date(date);
                if (isNaN(targetDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid date format. Use YYYY-MM-DD'
                    });
                }
                const startOfDay = new Date(targetDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(targetDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                appointmentFilter.scheduled_date = {
                    gte: startOfDay,
                    lt: endOfDay
                };
            }

            // Get all availability slots for the day with their appointments
            const availabilitySlots = await prisma.availability.findMany({
                where: {
                    provider_id: parseInt(providerId),
                    dayOfWeek: dayOfWeek
                },
                include: {
                    appointments: {
                        where: appointmentFilter,
                        select: {
                            appointment_id: true,
                            scheduled_date: true,
                            appointment_status: true
                        },
                        orderBy: {
                            scheduled_date: 'asc'
                        }
                    }
                },
                orderBy: {
                    startTime: 'asc'
                }
            });

            // Calculate statistics
            const totalSlots = availabilitySlots.length;
            const activeSlots = availabilitySlots.filter(slot => slot.availability_isActive).length;
            const bookedSlots = availabilitySlots.filter(slot => slot.appointments.length > 0).length;
            const availableSlots = availabilitySlots.filter(
                slot => slot.availability_isActive && slot.appointments.length === 0
            ).length;

            // Format response with booking details
            // IMPORTANT: Each availability_id is a SINGLE slot (1:1 mapping)
            // If an availability has ANY appointment, it's booked
            const slotsData = availabilitySlots.map(slot => {
                const hasBooking = slot.appointments.length > 0;
                const totalBookings = slot.appointments.length;

                return {
                    availability_id: slot.availability_id,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: slot.availability_isActive,
                    isBooked: hasBooking,
                    totalBookings: totalBookings,
                    appointments: slot.appointments.map(appt => ({
                        appointment_id: appt.appointment_id,
                        scheduled_date: appt.scheduled_date,
                        status: appt.appointment_status
                    })),
                    status: !slot.availability_isActive 
                        ? 'Inactive' 
                        : hasBooking 
                            ? 'Booked' 
                            : 'Available'
                };
            });

            res.json({
                success: true,
                data: {
                    providerId: parseInt(providerId),
                    dayOfWeek,
                    date: date || 'All dates',
                    summary: {
                        totalSlots,
                        activeSlots,
                        bookedSlots,
                        availableSlots
                    },
                    slots: slotsData
                }
            });

        } catch (error) {
            console.error('Error getting provider booked slots:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting booked slots',
                error: error.message
            });
        }
    }

    // Track which specific slots are booked on a given day (for authenticated providers)
    static async getBookedSlotsForDay(req, res) {
        try {
            const providerId = req.userId;
            const { dayOfWeek, date } = req.query;
            
            if (!providerId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Validation
            if (!dayOfWeek) {
                return res.status(400).json({
                    success: false,
                    message: 'dayOfWeek query parameter is required (e.g., ?dayOfWeek=Monday)'
                });
            }

            // Validate day of week
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayOfWeek)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid dayOfWeek. Must be one of: ${validDays.join(', ')}`
                });
            }

            // Build query filter for appointments
            let appointmentFilter = {
                appointment_status: {
                    in: ['scheduled', 'confirmed', 'in-progress']
                }
            };

            // If specific date provided, filter appointments by that date
            if (date) {
                const targetDate = new Date(date);
                if (isNaN(targetDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid date format. Use YYYY-MM-DD'
                    });
                }
                appointmentFilter.scheduled_date = {
                    gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                    lt: new Date(targetDate.setHours(23, 59, 59, 999))
                };
            }

            // Get all availability slots for the day with their appointments
            const availabilitySlots = await prisma.availability.findMany({
                where: {
                    provider_id: providerId,
                    dayOfWeek: dayOfWeek
                },
                include: {
                    appointments: {
                        where: appointmentFilter,
                        include: {
                            customer: {
                                select: {
                                    user_id: true,
                                    first_name: true,
                                    last_name: true
                                }
                            }
                        },
                        orderBy: {
                            scheduled_date: 'asc'
                        }
                    }
                },
                orderBy: {
                    startTime: 'asc'
                }
            });

            // Calculate statistics
            const totalSlots = availabilitySlots.length;
            const activeSlots = availabilitySlots.filter(slot => slot.availability_isActive).length;
            const bookedSlots = availabilitySlots.filter(slot => slot.appointments.length > 0).length;
            const availableSlots = availabilitySlots.filter(
                slot => slot.availability_isActive && slot.appointments.length === 0
            ).length;

            // Format response
            const slotsData = availabilitySlots.map(slot => ({
                availability_id: slot.availability_id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isActive: slot.availability_isActive,
                isBooked: slot.appointments.length > 0,
                bookingCount: slot.appointments.length,
                appointments: slot.appointments.map(appt => ({
                    appointment_id: appt.appointment_id,
                    scheduled_date: appt.scheduled_date,
                    status: appt.appointment_status,
                    customer: {
                        id: appt.customer.user_id,
                        name: `${appt.customer.first_name} ${appt.customer.last_name}`
                    }
                })),
                status: !slot.availability_isActive 
                    ? 'Inactive' 
                    : slot.appointments.length > 0 
                        ? 'Booked' 
                        : 'Available'
            }));

            res.json({
                success: true,
                data: {
                    dayOfWeek,
                    date: date || 'All dates',
                    summary: {
                        totalSlots,
                        activeSlots,
                        bookedSlots,
                        availableSlots
                    },
                    slots: slotsData
                }
            });

        } catch (error) {
            console.error('Error getting booked slots for day:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting booked slots',
                error: error.message
            });
        }
    }

    // Get provider's weekly schedule with availability status
    // Perfect for rebooking - shows all time slots for the week with booking status
    static async getProviderWeeklySchedule(req, res) {
        try {
            const { providerId } = req.params;
            const { startDate } = req.query; // Optional: specific week start date (YYYY-MM-DD)

            console.log(`Getting weekly schedule for provider ${providerId}`);

            // Validate provider exists
            const provider = await prisma.serviceProviderDetails.findUnique({
                where: { provider_id: parseInt(providerId) },
                select: { 
                    provider_id: true,
                    provider_first_name: true,
                    provider_last_name: true
                }
            });

            if (!provider) {
                return res.status(404).json({
                    success: false,
                    message: 'Provider not found'
                });
            }

            // Calculate week range
            const weekStart = startDate ? new Date(startDate) : new Date();
            weekStart.setHours(0, 0, 0, 0);
            
            // If no startDate provided, start from today
            // If startDate provided, use that as week start
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            // Get all availability slots for the provider
            const availabilitySlots = await prisma.availability.findMany({
                where: {
                    provider_id: parseInt(providerId),
                    availability_isActive: true, // Only show active day slots
                    slot_isActive: true // Only show active time slots
                },
                include: {
                    appointments: {
                        where: {
                            scheduled_date: {
                                gte: weekStart,
                                lt: weekEnd
                            },
                            appointment_status: {
                                in: ['Pending', 'Confirmed', 'In Progress'] // Exclude cancelled/completed
                            }
                        },
                        select: {
                            appointment_id: true,
                            scheduled_date: true,
                            appointment_status: true,
                            customer_id: true
                        }
                    }
                },
                orderBy: [
                    { dayOfWeek: 'asc' },
                    { startTime: 'asc' }
                ]
            });

            // Define day order for sorting
            const dayOrder = {
                'Monday': 1,
                'Tuesday': 2,
                'Wednesday': 3,
                'Thursday': 4,
                'Friday': 5,
                'Saturday': 6,
                'Sunday': 7
            };

            // Group slots by day of week
            const weeklySchedule = {};
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            // Initialize all days
            days.forEach(day => {
                weeklySchedule[day] = {
                    dayOfWeek: day,
                    isAvailable: false,
                    timeSlots: [],
                    totalSlots: 0,
                    availableSlots: 0,
                    bookedSlots: 0
                };
            });

            // Populate with actual availability data
            availabilitySlots.forEach(slot => {
                const day = slot.dayOfWeek;
                const hasBooking = slot.appointments.length > 0;

                const timeSlotData = {
                    availability_id: slot.availability_id,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isBooked: hasBooking,
                    isAvailable: !hasBooking,
                    bookingInfo: hasBooking ? {
                        appointment_id: slot.appointments[0].appointment_id,
                        scheduled_date: slot.appointments[0].scheduled_date,
                        status: slot.appointments[0].appointment_status
                    } : null
                };

                if (weeklySchedule[day]) {
                    weeklySchedule[day].isAvailable = true;
                    weeklySchedule[day].timeSlots.push(timeSlotData);
                    weeklySchedule[day].totalSlots++;
                    
                    if (hasBooking) {
                        weeklySchedule[day].bookedSlots++;
                    } else {
                        weeklySchedule[day].availableSlots++;
                    }
                }
            });

            // Convert to array and sort by day order
            const scheduleArray = Object.values(weeklySchedule).sort((a, b) => {
                return dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
            });

            // Calculate overall statistics
            const totalSlots = availabilitySlots.length;
            const bookedSlots = availabilitySlots.filter(slot => slot.appointments.length > 0).length;
            const availableSlots = totalSlots - bookedSlots;
            const activeDays = scheduleArray.filter(day => day.isAvailable).length;

            res.json({
                success: true,
                data: {
                    provider: {
                        provider_id: provider.provider_id,
                        name: `${provider.provider_first_name} ${provider.provider_last_name}`
                    },
                    weekRange: {
                        startDate: weekStart.toISOString().split('T')[0],
                        endDate: weekEnd.toISOString().split('T')[0]
                    },
                    summary: {
                        totalSlots,
                        availableSlots,
                        bookedSlots,
                        activeDays,
                        availabilityRate: totalSlots > 0 ? ((availableSlots / totalSlots) * 100).toFixed(1) : 0
                    },
                    schedule: scheduleArray
                }
            });

        } catch (error) {
            console.error('Error getting provider weekly schedule:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting provider weekly schedule',
                error: error.message
            });
        }
    }

    // Get available time slots for a specific day (for rebooking)
    static async getAvailableTimeSlotsForDay(req, res) {
        try {
            const { providerId, dayOfWeek } = req.params;
            const { date } = req.query; // Optional: specific date (YYYY-MM-DD)

            console.log(`Getting available slots for provider ${providerId} on ${dayOfWeek}`);

            // Validate day of week
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayOfWeek)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid day of week. Must be one of: ' + validDays.join(', ')
                });
            }

            // Build date range for checking bookings
            let dateStart, dateEnd;
            if (date) {
                dateStart = new Date(date);
                dateStart.setHours(0, 0, 0, 0);
                dateEnd = new Date(date);
                dateEnd.setHours(23, 59, 59, 999);
            } else {
                // If no date specified, check next 4 weeks
                dateStart = new Date();
                dateStart.setHours(0, 0, 0, 0);
                dateEnd = new Date(dateStart);
                dateEnd.setDate(dateEnd.getDate() + 28);
            }

            // Get all time slots for this day
            const timeSlots = await prisma.availability.findMany({
                where: {
                    provider_id: parseInt(providerId),
                    dayOfWeek: dayOfWeek,
                    availability_isActive: true,
                    slot_isActive: true
                },
                include: {
                    appointments: date ? {
                        where: {
                            scheduled_date: {
                                gte: dateStart,
                                lte: dateEnd
                            },
                            appointment_status: {
                                in: ['Pending', 'Confirmed', 'In Progress']
                            }
                        }
                    } : {
                        where: {
                            appointment_status: {
                                in: ['Pending', 'Confirmed', 'In Progress']
                            }
                        }
                    }
                },
                orderBy: {
                    startTime: 'asc'
                }
            });

            if (timeSlots.length === 0) {
                return res.json({
                    success: true,
                    message: `Provider has no available time slots on ${dayOfWeek}`,
                    data: {
                        dayOfWeek,
                        date: date || 'Not specified',
                        timeSlots: [],
                        summary: {
                            total: 0,
                            available: 0,
                            booked: 0
                        }
                    }
                });
            }

            // Format time slots with availability status
            const formattedSlots = timeSlots.map(slot => {
                const isBooked = slot.appointments.length > 0;
                
                return {
                    availability_id: slot.availability_id,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    timeRange: `${slot.startTime} - ${slot.endTime}`,
                    isAvailable: !isBooked,
                    isBooked: isBooked,
                    status: isBooked ? 'Booked' : 'Available',
                    bookingInfo: isBooked ? {
                        appointment_id: slot.appointments[0].appointment_id,
                        scheduled_date: slot.appointments[0].scheduled_date,
                        status: slot.appointments[0].appointment_status
                    } : null
                };
            });

            const availableSlots = formattedSlots.filter(s => s.isAvailable);
            const bookedSlots = formattedSlots.filter(s => s.isBooked);

            res.json({
                success: true,
                data: {
                    dayOfWeek,
                    date: date || 'Any date within next 4 weeks',
                    timeSlots: formattedSlots,
                    availableTimeSlots: availableSlots, // Filtered list for convenience
                    summary: {
                        total: formattedSlots.length,
                        available: availableSlots.length,
                        booked: bookedSlots.length,
                        availabilityRate: ((availableSlots.length / formattedSlots.length) * 100).toFixed(1)
                    }
                }
            });

        } catch (error) {
            console.error('Error getting available time slots:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting available time slots',
                error: error.message
            });
        }
    }
}

export default AvailabilityController;
