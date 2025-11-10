import express from 'express';
import { 
    getProviderCertificates, 
    uploadCertificate, 
    deleteCertificate, 
    updateCertificateStatus, 
    getCertificateById,
    upload 
} from '../controller/certificateController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { manualCheckExpiredCertificates, manualCheckExpiringCertificates } from '../services/certificateExpiryJob.js';

const router = express.Router();

// Admin-only manual certificate expiry check routes (for testing)
// These routes must come BEFORE the authMiddleware is applied
router.post('/admin/check-expired', adminAuthMiddleware, async (req, res) => {
    try {
        const result = await manualCheckExpiredCertificates();
        res.json({
            success: true,
            message: 'Manual certificate expiry check completed',
            data: result
        });
    } catch (error) {
        console.error('Manual check expired certificates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check expired certificates',
            error: error.message
        });
    }
});

router.post('/admin/check-expiring-soon', adminAuthMiddleware, async (req, res) => {
    try {
        const result = await manualCheckExpiringCertificates();
        res.json({
            success: true,
            message: 'Manual certificate expiry reminder check completed',
            data: result
        });
    } catch (error) {
        console.error('Manual check expiring certificates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check expiring certificates',
            error: error.message
        });
    }
});

// Apply authentication middleware to provider routes
router.use(authMiddleware);

// Provider Routes
router.get('/', getProviderCertificates);
router.get('/valid-types', (req, res) => {
    // Return predefined certificate types
    const certificateTypes = [
        'Electrical Technician Certificate',
        'Plumbing License',
        'HVAC Certification',
        'Carpentry Certificate',
        'Appliance Repair Certification',
        'Safety Training Certificate',
        'Trade School Diploma',
        'Professional License',
        'Welding Certification',
        'Electronics Repair Certification'
    ];
    res.json(certificateTypes);
});
router.get('/:certificateId', getCertificateById);
router.post('/upload', upload.single('certificateFile'), uploadCertificate);
router.delete('/:certificateId', deleteCertificate);
router.patch('/:certificateId/status', updateCertificateStatus); // Admin only

export default router;
