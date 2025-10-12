import express from 'express';
import multer from 'multer';
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

// Configure multer for file uploads (max 5 images)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * @route   POST /api/reports
 * @desc    Submit a new report with optional image attachments (public - no auth required)
 * @access  Public
 */
router.post('/', upload.array('images', 5), submitReport);

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
