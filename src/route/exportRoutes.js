import express from 'express';
import {
    exportUsers,
    exportProviders,
    exportCertificates,
    exportAppointments
} from '../controller/exportController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/admin/export/users
 * @desc    Export users to CSV or PDF with filters
 * @access  Admin
 * @query   format (csv|pdf), verification_status, is_activated, is_verified, search, start_date, end_date
 */
router.get('/users', adminAuthMiddleware, exportUsers);

/**
 * @route   GET /api/admin/export/providers
 * @desc    Export service providers to CSV or PDF with filters
 * @access  Admin
 * @query   format (csv|pdf), verification_status, provider_isActivated, provider_isVerified, search, start_date, end_date
 */
router.get('/providers', adminAuthMiddleware, exportProviders);

/**
 * @route   GET /api/admin/export/certificates
 * @desc    Export certificates to CSV or PDF with filters
 * @access  Admin
 * @query   format (csv|pdf), certificate_status, provider_id, search, start_date, end_date
 */
router.get('/certificates', adminAuthMiddleware, exportCertificates);

/**
 * @route   GET /api/admin/export/appointments
 * @desc    Export appointments to CSV or PDF with filters
 * @access  Admin
 * @query   format (csv|pdf), appointment_status, customer_id, provider_id, service_id, start_date, end_date
 */
router.get('/appointments', adminAuthMiddleware, exportAppointments);

export default router;
