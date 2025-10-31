import express from 'express';
import PenaltyController from '../controller/penaltyController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

/**
 * Penalty Routes
 * Endpoints for penalty management system
 */

// ==================== USER/PROVIDER ENDPOINTS ====================

/**
 * @swagger
 * /api/penalty/my-info:
 *   get:
 *     summary: Get current user/provider penalty information
 *     tags: [Penalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Penalty information retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-info', authMiddleware, PenaltyController.getMyPenaltyInfo);

/**
 * @swagger
 * /api/penalty/my-violations:
 *   get:
 *     summary: Get violation history for current user/provider
 *     tags: [Penalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, appealed, reversed, expired]
 *         description: Filter by violation status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Violation history retrieved successfully
 */
router.get('/my-violations', authMiddleware, PenaltyController.getMyViolations);

/**
 * @swagger
 * /api/penalty/appeal/{violationId}:
 *   post:
 *     summary: Appeal a violation
 *     tags: [Penalty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: violationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Violation ID to appeal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appealReason
 *             properties:
 *               appealReason:
 *                 type: string
 *                 minLength: 10
 *                 description: Reason for appealing the violation
 *     responses:
 *       200:
 *         description: Appeal submitted successfully
 *       400:
 *         description: Invalid request
 */
router.post('/appeal/:violationId', authMiddleware, PenaltyController.appealViolation);

/**
 * @swagger
 * /api/penalty/my-rewards:
 *   get:
 *     summary: Get reward statistics for current user/provider
 *     tags: [Penalty]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reward statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-rewards', authMiddleware, PenaltyController.getMyRewardStats);

/**
 * @swagger
 * /api/penalty/violation-types:
 *   get:
 *     summary: Get all violation types
 *     tags: [Penalty]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [user, provider]
 *         description: Filter by violation category
 *     responses:
 *       200:
 *         description: Violation types retrieved successfully
 */
router.get('/violation-types', PenaltyController.getViolationTypes);

// ==================== ADMIN ENDPOINTS ====================

/**
 * @swagger
 * /api/penalty/admin/record-violation:
 *   post:
 *     summary: Admin - Record a manual violation
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - violationCode
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID (required if not providerId)
 *               providerId:
 *                 type: integer
 *                 description: Provider ID (required if not userId)
 *               violationCode:
 *                 type: string
 *                 description: Violation type code
 *               appointmentId:
 *                 type: integer
 *                 description: Related appointment ID
 *               reportId:
 *                 type: integer
 *                 description: Related report ID
 *               ratingId:
 *                 type: integer
 *                 description: Related rating ID
 *               violationDetails:
 *                 type: string
 *                 description: Additional details about the violation
 *               evidenceUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs of evidence/screenshots
 *     responses:
 *       201:
 *         description: Violation recorded successfully
 *       400:
 *         description: Invalid request
 */
router.post('/admin/record-violation', adminAuthMiddleware, PenaltyController.adminRecordViolation);

/**
 * @swagger
 * /api/penalty/admin/violations:
 *   get:
 *     summary: Admin - Get all violations with filters
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: integer
 *         description: Filter by provider ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by violation status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Violations retrieved successfully
 */
router.get('/admin/violations', adminAuthMiddleware, PenaltyController.adminGetViolations);

/**
 * @swagger
 * /api/penalty/admin/pending-appeals:
 *   get:
 *     summary: Admin - Get all pending appeals
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Pending appeals retrieved successfully
 */
router.get('/admin/pending-appeals', adminAuthMiddleware, PenaltyController.adminGetPendingAppeals);

/**
 * @swagger
 * /api/penalty/admin/review-appeal/{violationId}:
 *   post:
 *     summary: Admin - Review an appeal
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: path
 *         name: violationId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *               - reviewNotes
 *             properties:
 *               approved:
 *                 type: boolean
 *                 description: Whether to approve or reject the appeal
 *               reviewNotes:
 *                 type: string
 *                 minLength: 10
 *                 description: Admin's review notes
 *     responses:
 *       200:
 *         description: Appeal reviewed successfully
 */
router.post('/admin/review-appeal/:violationId', adminAuthMiddleware, PenaltyController.adminReviewAppeal);

/**
 * @swagger
 * /api/penalty/admin/adjust-points:
 *   post:
 *     summary: Admin - Manually adjust penalty points
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *               - adjustmentType
 *               - reason
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID (required if not providerId)
 *               providerId:
 *                 type: integer
 *                 description: Provider ID (required if not userId)
 *               points:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of points to add or deduct
 *               adjustmentType:
 *                 type: string
 *                 enum: [add, deduct, restore]
 *                 description: Type of adjustment
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 description: Reason for manual adjustment
 *     responses:
 *       200:
 *         description: Points adjusted successfully
 */
router.post('/admin/adjust-points', adminAuthMiddleware, PenaltyController.adminAdjustPoints);

/**
 * @swagger
 * /api/penalty/admin/stats:
 *   get:
 *     summary: Admin - Get penalty statistics for a user or provider
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/admin/stats', adminAuthMiddleware, PenaltyController.adminGetPenaltyStats);

/**
 * @swagger
 * /api/penalty/admin/initialize-violation-types:
 *   post:
 *     summary: Admin - Initialize or update violation types
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Violation types initialized successfully
 */
router.post('/admin/initialize-violation-types', adminAuthMiddleware, PenaltyController.adminInitializeViolationTypes);

/**
 * @swagger
 * /api/penalty/admin/dashboard:
 *   get:
 *     summary: Admin - Get penalty system dashboard statistics
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/admin/dashboard', adminAuthMiddleware, PenaltyController.adminGetDashboardStats);

/**
 * @swagger
 * /api/penalty/admin/manage-suspension:
 *   post:
 *     summary: Admin - Manually suspend or lift suspension
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - reason
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID (required if not providerId)
 *               providerId:
 *                 type: integer
 *                 description: Provider ID (required if not userId)
 *               action:
 *                 type: string
 *                 enum: [suspend, lift]
 *                 description: Action to perform
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 description: Reason for the action
 *               suspensionDays:
 *                 type: integer
 *                 description: Number of days for suspension (optional, null = indefinite)
 *     responses:
 *       200:
 *         description: Suspension managed successfully
 */
router.post('/admin/manage-suspension', adminAuthMiddleware, PenaltyController.adminManageSuspension);

/**
 * @swagger
 * /api/penalty/admin/reset-points:
 *   post:
 *     summary: Admin - Reset penalty points to default (rehabilitation)
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID (required if not providerId)
 *               providerId:
 *                 type: integer
 *                 description: Provider ID (required if not userId)
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 description: Reason for resetting points
 *               resetValue:
 *                 type: integer
 *                 default: 100
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Points to reset to (default 100)
 *     responses:
 *       200:
 *         description: Points reset successfully
 */
router.post('/admin/reset-points', adminAuthMiddleware, PenaltyController.adminResetPoints);

/**
 * @swagger
 * /api/penalty/admin/adjustment-logs:
 *   get:
 *     summary: Admin - View all penalty adjustment logs
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: integer
 *         description: Filter by provider ID
 *       - in: query
 *         name: adjustmentType
 *         schema:
 *           type: string
 *           enum: [penalty, reward, restore, reset, suspension, lift_suspension]
 *         description: Filter by adjustment type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Adjustment logs retrieved successfully
 */
router.get('/admin/adjustment-logs', adminAuthMiddleware, PenaltyController.adminGetAdjustmentLogs);

/**
 * @swagger
 * /api/penalty/admin/restricted-accounts:
 *   get:
 *     summary: Admin - Get accounts with points below 60 (restricted from booking)
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user, provider, both]
 *           default: both
 *         description: Type of accounts to retrieve
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Restricted accounts retrieved successfully
 */
router.get('/admin/restricted-accounts', adminAuthMiddleware, PenaltyController.adminGetRestrictedAccounts);

/**
 * @swagger
 * /api/penalty/admin/trigger-quarterly-reset:
 *   post:
 *     summary: Admin - Manually trigger 3-month penalty reset (testing only)
 *     tags: [Penalty - Admin]
 *     security:
 *       - adminAuth: []
 *     description: Resets all users and providers to 100 penalty points. Use with caution - this is normally automated quarterly.
 *     responses:
 *       200:
 *         description: Penalty reset triggered successfully
 */
router.post('/admin/trigger-quarterly-reset', adminAuthMiddleware, PenaltyController.adminManualPenaltyReset);

export default router;
