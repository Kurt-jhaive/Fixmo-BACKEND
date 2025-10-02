import express from 'express';
import {
    getPendingVerifications,
    approveCustomerVerification,
    approveProviderVerification,
    rejectCustomerVerification,
    rejectProviderVerification,
    getCustomerVerificationStatus,
    getProviderVerificationStatus,
    resubmitCustomerVerification,
    resubmitProviderVerification
} from '../controller/verificationController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// ADMIN ROUTES - Require admin authentication
// ============================================

/**
 * @route   GET /api/verification/admin/pending
 * @desc    Get all pending verification requests
 * @access  Admin
 * @query   type - 'customer', 'provider', or 'all' (default: 'all')
 */
router.get('/admin/pending', adminAuthMiddleware, getPendingVerifications);

/**
 * @route   POST /api/verification/admin/customer/:user_id/approve
 * @desc    Approve customer verification
 * @access  Admin
 */
router.post('/admin/customer/:user_id/approve', adminAuthMiddleware, approveCustomerVerification);

/**
 * @route   POST /api/verification/admin/provider/:provider_id/approve
 * @desc    Approve provider verification
 * @access  Admin
 */
router.post('/admin/provider/:provider_id/approve', adminAuthMiddleware, approveProviderVerification);

/**
 * @route   POST /api/verification/admin/customer/:user_id/reject
 * @desc    Reject customer verification with reason
 * @access  Admin
 * @body    { rejection_reason: string }
 */
router.post('/admin/customer/:user_id/reject', adminAuthMiddleware, rejectCustomerVerification);

/**
 * @route   POST /api/verification/admin/provider/:provider_id/reject
 * @desc    Reject provider verification with reason
 * @access  Admin
 * @body    { rejection_reason: string }
 */
router.post('/admin/provider/:provider_id/reject', adminAuthMiddleware, rejectProviderVerification);

// ============================================
// CUSTOMER ROUTES - Require customer authentication
// ============================================

/**
 * @route   GET /api/verification/customer/status
 * @desc    Get customer's verification status
 * @access  Authenticated Customer
 */
router.get('/customer/status', authMiddleware, getCustomerVerificationStatus);

/**
 * @route   POST /api/verification/customer/resubmit
 * @desc    Re-submit customer verification after rejection
 * @access  Authenticated Customer
 * @body    { valid_id_url: string }
 */
router.post('/customer/resubmit', authMiddleware, resubmitCustomerVerification);

// ============================================
// PROVIDER ROUTES - Require provider authentication
// ============================================

/**
 * @route   GET /api/verification/provider/status
 * @desc    Get provider's verification status
 * @access  Authenticated Provider
 */
router.get('/provider/status', authMiddleware, getProviderVerificationStatus);

/**
 * @route   POST /api/verification/provider/resubmit
 * @desc    Re-submit provider verification after rejection
 * @access  Authenticated Provider
 * @body    { valid_id_url: string, certificate_urls: string[] }
 */
router.post('/provider/resubmit', authMiddleware, resubmitProviderVerification);

export default router;
