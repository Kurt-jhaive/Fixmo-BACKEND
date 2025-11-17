import express from 'express';
import AvailabilityController from '../controller/availabilityController.js';
import { requireAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// Public routes - No authentication required for customers to check availability
// GET /api/availability/check/:providerId - Check if time range is available
router.get('/check/:providerId', AvailabilityController.checkTimeRangeAvailability);

// GET /api/availability/provider/:providerId/booked-slots - Get booked slots for provider (public for customers)
router.get('/provider/:providerId/booked-slots', AvailabilityController.getProviderBookedSlots);

// GET /api/availability/provider/:providerId/weekly-schedule - Get provider's weekly schedule (for rebooking)
router.get('/provider/:providerId/weekly-schedule', AvailabilityController.getProviderWeeklySchedule);

// GET /api/availability/provider/:providerId/day/:dayOfWeek - Get available time slots for specific day (for rebooking)
router.get('/provider/:providerId/day/:dayOfWeek', AvailabilityController.getAvailableTimeSlotsForDay);

// Apply authentication middleware to all routes below
router.use(requireAuth('provider'));

// GET /api/availability/summary - Get availability summary (must be before /:availabilityId)
router.get('/summary', AvailabilityController.getAvailabilitySummary);

// GET /api/availability/day-status - Get day availability status
router.get('/day-status', AvailabilityController.getDayAvailabilityStatus);

// GET /api/availability/booked-slots - Get booked slots for specific day
router.get('/booked-slots', AvailabilityController.getBookedSlotsForDay);

// GET /api/availability - Get provider's availability
router.get('/', AvailabilityController.getProviderAvailability);

// POST /api/availability - Set/Update provider's availability
router.post('/', AvailabilityController.setProviderAvailability);

// POST /api/availability/time-range - Add time-range based availability
router.post('/time-range', AvailabilityController.addTimeRangeAvailability);

// POST /api/availability/toggle-day - Toggle availability for entire day
router.post('/toggle-day', AvailabilityController.toggleDayAvailability);

// PUT /api/availability/toggle-slot/:availabilityId - Toggle individual time slot
router.put('/toggle-slot/:availabilityId', AvailabilityController.toggleTimeSlot);

// DELETE /api/availability/:availabilityId - Delete specific availability
router.delete('/:availabilityId', AvailabilityController.deleteAvailability);

export default router;
