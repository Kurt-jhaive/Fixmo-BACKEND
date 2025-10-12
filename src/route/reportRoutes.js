import express from 'express';
import {
    submitReport,
    getAllReports,
    getReportById,
    updateReportStatus,
    deleteReport,
    getReportStatistics
} from '../controller/reportController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/reports
 * @desc    Submit a new report (public - no auth required)
 * @access  Public
 */
router.post('/', submitReport);

/**
 * @route   GET /api/reports/statistics
 * @desc    Get report statistics (admin only)
 * @access  Admin
 */
router.get('/statistics', adminAuthMiddleware, getReportStatistics);

/**
 * @route   GET /api/reports
 * @desc    Get all reports with filters (admin only)
 * @access  Admin
 */
router.get('/', adminAuthMiddleware, getAllReports);

/**
 * @route   GET /api/reports/:reportId
 * @desc    Get single report by ID (admin only)
 * @access  Admin
 */
router.get('/:reportId', adminAuthMiddleware, getReportById);

/**
 * @route   PATCH /api/reports/:reportId
 * @desc    Update report status (admin only)
 * @access  Admin
 */
router.patch('/:reportId', adminAuthMiddleware, updateReportStatus);

/**
 * @route   DELETE /api/reports/:reportId
 * @desc    Delete report (admin only)
 * @access  Admin
 */
router.delete('/:reportId', adminAuthMiddleware, deleteReport);

export default router;
