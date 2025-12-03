import express from 'express';
import {
    createSignupVerificationSession,
    getSignupVerificationStatus,
    createCustomerVerificationSession,
    getCustomerVerificationStatus,
    getVerificationSessionStatus,
    handleDiditWebhook,
    getDiditAnalytics,
    checkDiditConfig
} from '../controller/diditController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

// ============================================
// SIGNUP ROUTES (NO AUTH REQUIRED)
// Used during signup flow before user has a token
// ============================================

/**
 * @swagger
 * /api/didit/signup/session:
 *   post:
 *     summary: Create verification session for signup
 *     description: Creates a Didit verification session during signup (no auth required)
 *     tags: [Didit Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               callback_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                     verification_url:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Email is required
 *       500:
 *         description: Server error
 */
router.post('/signup/session', createSignupVerificationSession);

/**
 * @swagger
 * /api/didit/signup/status/{session_id}:
 *   get:
 *     summary: Check verification status for signup
 *     description: Poll this endpoint to check verification status during signup (no auth required)
 *     tags: [Didit Verification]
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Didit session ID
 *     responses:
 *       200:
 *         description: Session status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     is_approved:
 *                       type: boolean
 *                     is_declined:
 *                       type: boolean
 *                     is_pending:
 *                       type: boolean
 *       400:
 *         description: Session ID required
 *       500:
 *         description: Server error
 */
router.get('/signup/status/:session_id', getSignupVerificationStatus);

// ============================================
// WEBHOOK ROUTE - Must be before JSON parsing
// Note: Raw body parsing is handled in server.js
// ============================================

/**
 * @swagger
 * /api/didit/webhook:
 *   post:
 *     summary: Didit webhook endpoint
 *     description: Receives verification status updates from Didit
 *     tags: [Didit Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid signature
 */
router.post('/webhook', handleDiditWebhook);

// ============================================
// CUSTOMER ROUTES
// ============================================

/**
 * @swagger
 * /api/didit/customer/session:
 *   post:
 *     summary: Create verification session for customer
 *     description: Creates a new Didit verification session for the authenticated customer
 *     tags: [Didit Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callback_url:
 *                 type: string
 *                 description: URL to redirect after verification (optional)
 *     responses:
 *       200:
 *         description: Verification session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                     verification_url:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Already verified
 *       500:
 *         description: Server error
 */
router.post('/customer/session', authMiddleware, createCustomerVerificationSession);

/**
 * @swagger
 * /api/didit/customer/status:
 *   get:
 *     summary: Get customer's verification status
 *     description: Get the current verification status of the authenticated customer from database
 *     tags: [Didit Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     is_verified:
 *                       type: boolean
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected, expired]
 *                     rejection_reason:
 *                       type: string
 *       404:
 *         description: Customer not found
 */
router.get('/customer/status', authMiddleware, getCustomerVerificationStatus);

// ============================================
// SESSION STATUS ROUTE
// ============================================

/**
 * @swagger
 * /api/didit/session/{session_id}:
 *   get:
 *     summary: Get verification session status
 *     description: Retrieve the current status of a verification session
 *     tags: [Didit Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Didit session ID
 *     responses:
 *       200:
 *         description: Session details retrieved
 *       400:
 *         description: Session ID required
 *       500:
 *         description: Server error
 */
router.get('/session/:session_id', authMiddleware, getVerificationSessionStatus);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @swagger
 * /api/didit/admin/analytics:
 *   get:
 *     summary: Get Didit verification analytics
 *     description: Get verification statistics and analytics (Admin only)
 *     tags: [Didit Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/admin/analytics', adminAuthMiddleware, getDiditAnalytics);

/**
 * @swagger
 * /api/didit/admin/config:
 *   get:
 *     summary: Check Didit configuration status
 *     description: Check if Didit is properly configured (Admin only)
 *     tags: [Didit Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration status returned
 *       500:
 *         description: Server error
 */
router.get('/admin/config', adminAuthMiddleware, checkDiditConfig);

/**
 * @swagger
 * /api/didit/config:
 *   get:
 *     summary: Check Didit configuration (public)
 *     description: Check if Didit verification is available
 *     tags: [Didit Verification]
 *     responses:
 *       200:
 *         description: Configuration status returned
 */
router.get('/config', checkDiditConfig);

export default router;
