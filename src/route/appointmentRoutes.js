import express from 'express';
import {
    getAllAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    adminCancelAppointment,
    providerCancelAppointment,
    rateAppointment,
    rescheduleAppointment,
    getProviderAppointments,
    getCustomerAppointments,
    getAppointmentStats,
    submitRating,
    getAppointmentRatings,
    canRateAppointment,
    completeAppointmentByCustomer,
    getAppointmentsNeedingRatings,
    checkAppointmentRatingStatus
} from '../controller/appointmentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { requireAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// Backjob routes (MUST be before /:appointmentId routes to avoid conflict)
import { applyBackjob, disputeBackjob, cancelBackjobByCustomer, listBackjobs, updateBackjobStatus, approveBackjobDispute, rejectBackjobDispute, rescheduleFromBackjob, uploadBackjobEvidence } from '../controller/appointmentController.js';
import { uploadBackjobEvidence as uploadBackjobEvidenceMiddleware } from '../middleware/multer.js';

// Admin lists backjobs (NO authMiddleware here, adminAuthMiddleware handles it)
router.get('/backjobs', adminAuthMiddleware, listBackjobs);

// Admin updates backjob status (approve/cancel)
router.patch('/backjobs/:backjobId', adminAuthMiddleware, updateBackjobStatus);

// Admin approves provider's dispute (cancels customer's backjob)
router.post('/backjobs/:backjobId/approve-dispute', adminAuthMiddleware, approveBackjobDispute);

// Admin rejects provider's dispute (keeps backjob active)
router.post('/backjobs/:backjobId/reject-dispute', adminAuthMiddleware, rejectBackjobDispute);

// Provider disputes a backjob
router.post('/backjobs/:backjobId/dispute', authMiddleware, disputeBackjob);

// Customer cancels their own backjob
router.post('/backjobs/:backjobId/cancel', authMiddleware, cancelBackjobByCustomer);

// Apply authentication middleware to remaining routes
router.use(authMiddleware);

// General appointment routes
router.get('/', getAllAppointments);                           // GET /api/appointments - Get all appointments with filtering
router.get('/stats', getAppointmentStats);                     // GET /api/appointments/stats - Get appointment statistics

// Rating-specific routes (must be before /:appointmentId routes)
router.get('/can-rate', authMiddleware, getAppointmentsNeedingRatings); // GET /api/appointments/can-rate - Get appointments that can be rated

router.get('/:appointmentId', getAppointmentById);             // GET /api/appointments/:id - Get appointment by ID
router.post('/', createAppointment);                           // POST /api/appointments - Create new appointment
router.put('/:appointmentId', updateAppointment);              // PUT /api/appointments/:id - Update appointment
router.delete('/:appointmentId', deleteAppointment);           // DELETE /api/appointments/:id - Delete appointment

// Status and scheduling management
router.patch('/:appointmentId/status', updateAppointmentStatus); // PATCH /api/appointments/:id/status - Update appointment status
router.put('/:appointmentId/cancel', cancelAppointment);         // PUT /api/appointments/:id/cancel - Cancel appointment with reason (Customer)
router.post('/:appointmentId/provider-cancel', requireAuth('provider'), providerCancelAppointment); // POST /api/appointments/:id/provider-cancel - Provider cancel appointment
router.post('/:appointmentId/admin-cancel', adminAuthMiddleware, adminCancelAppointment); // POST /api/appointments/:id/admin-cancel - Admin cancel appointment with enhanced tracking
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

// Backjob routes for appointments
// Upload evidence files for backjob (customer or provider)
router.post('/:appointmentId/backjob-evidence', authMiddleware, uploadBackjobEvidenceMiddleware.array('evidence_files', 5), uploadBackjobEvidence);

// Customer applies for backjob (must be in-warranty)
router.post('/:appointmentId/apply-backjob', authMiddleware, applyBackjob);

// Provider reschedules an approved backjob
router.patch('/:appointmentId/reschedule-backjob', authMiddleware, rescheduleFromBackjob);

// Check specific appointment rating status
router.get('/:appointmentId/rating-status', authMiddleware, checkAppointmentRatingStatus);

export default router;
