import express from 'express';
import {
    getAllAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    rateAppointment,
    rescheduleAppointment,
    getProviderAppointments,
    getCustomerAppointments,
    getAppointmentStats,
    submitRating,
    getAppointmentRatings,
    canRateAppointment,
    completeAppointmentByCustomer
} from '../controller/appointmentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// General appointment routes
router.get('/', getAllAppointments);                           // GET /api/appointments - Get all appointments with filtering
router.get('/stats', getAppointmentStats);                     // GET /api/appointments/stats - Get appointment statistics
router.get('/:appointmentId', getAppointmentById);             // GET /api/appointments/:id - Get appointment by ID
router.post('/', createAppointment);                           // POST /api/appointments - Create new appointment
router.put('/:appointmentId', updateAppointment);              // PUT /api/appointments/:id - Update appointment
router.delete('/:appointmentId', deleteAppointment);           // DELETE /api/appointments/:id - Delete appointment

// Status and scheduling management
router.patch('/:appointmentId/status', updateAppointmentStatus); // PATCH /api/appointments/:id/status - Update appointment status
router.put('/:appointmentId/cancel', cancelAppointment);         // PUT /api/appointments/:id/cancel - Cancel appointment with reason
router.post('/:appointmentId/rate', rateAppointment);            // POST /api/appointments/:id/rate - Rate appointment/customer
router.patch('/:appointmentId/reschedule', rescheduleAppointment); // PATCH /api/appointments/:id/reschedule - Reschedule appointment
router.post('/:appointmentId/complete', completeAppointmentByCustomer); // POST /api/appointments/:id/complete - Customer completes appointment

// Provider-specific routes
router.get('/provider/:providerId', getProviderAppointments);   // GET /api/appointments/provider/:providerId - Get provider's appointments

// Customer-specific routes
router.get('/customer/:customerId', getCustomerAppointments);   // GET /api/appointments/customer/:customerId - Get customer's appointments

// Rating routes
router.post('/:appointmentId/ratings', authMiddleware, submitRating);          // POST /api/appointments/:id/ratings - Submit rating for appointment
router.get('/:appointmentId/ratings', authMiddleware, getAppointmentRatings);  // GET /api/appointments/:id/ratings - Get ratings for appointment  
router.get('/:appointmentId/can-rate', authMiddleware, canRateAppointment);    // GET /api/appointments/:id/can-rate - Check if user can rate appointment

// Backjob routes
import { applyBackjob, disputeBackjob, listBackjobs, updateBackjobStatus, rescheduleFromBackjob } from '../controller/appointmentController.js';

// Customer applies for backjob (must be in-warranty)
router.post('/:appointmentId/backjob/apply', authMiddleware, applyBackjob);

// Provider disputes a backjob
router.post('/backjob/:backjobId/dispute', authMiddleware, disputeBackjob);

// Admin lists backjobs
router.get('/backjobs', adminAuthMiddleware, listBackjobs);

// Admin updates backjob status (approve/cancel)
router.patch('/backjobs/:backjobId', adminAuthMiddleware, updateBackjobStatus);

// Provider reschedules an approved backjob
router.patch('/:appointmentId/backjob/reschedule', authMiddleware, rescheduleFromBackjob);

export default router;
