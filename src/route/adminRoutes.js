import express from 'express';
import adminController from '../controller/adminControllerNew.js';
import { 
    adminAuthMiddleware, 
    superAdminMiddleware, 
    checkPasswordChangeRequired 
} from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

// Public Admin Authentication Routes (no middleware)
router.post('/login', adminController.adminLogin);

// Protected Admin Routes (require authentication)
router.use(adminAuthMiddleware); // Apply to all routes below

// Admin Password Management
router.put('/change-password', adminController.changePassword);

// Apply password change check to all routes below (except change-password)
router.use(checkPasswordChangeRequired);

// Admin logout and basic routes
router.post('/logout', adminController.adminLogout);

// Dashboard Routes
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/recent-activity', adminController.getRecentActivity);

// User Management Routes
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId/verify', adminController.verifyUser);
router.put('/users/:userId/reject', adminController.rejectUser);
router.put('/users/:userId/activate', adminController.activateUser);
router.put('/users/:userId/deactivate', adminController.deactivateUser);

// Provider Management Routes
router.get('/providers', adminController.getProviders);
router.get('/providers/:providerId', adminController.getProviderById);
router.put('/providers/:providerId/verify', adminController.verifyProvider);
router.put('/providers/:providerId/reject', adminController.rejectProvider);
router.put('/providers/:providerId/activate', adminController.activateProvider);
router.put('/providers/:providerId/deactivate', adminController.deactivateProvider);

// Certificate Management Routes
router.get('/certificates', adminController.getCertificates);
router.get('/certificates/:certificateId', adminController.getCertificateById);
router.put('/certificates/:certificateId/approve', adminController.approveCertificate);
router.put('/certificates/:certificateId/reject', adminController.rejectCertificate);

// Booking Management Routes
router.get('/bookings', adminController.getBookings);

// Legacy Routes - for backward compatibility
router.post('/verify-service-provider', adminController.verifyServiceProvider);
router.post('/verify-customer', adminController.verifyCustomer);
router.get('/unverified-service-providers', adminController.getUnverifiedServiceProviders);
router.get('/unverified-customers', adminController.getUnverifiedCustomers);

// Super Admin Only Routes
router.use(superAdminMiddleware); // Apply to all routes below

// Admin Management Routes (Super Admin Only)
router.post('/', adminController.inviteAdmin); // POST /admins
router.get('/', adminController.getAllAdmins); // GET /admins
router.put('/:admin_id/toggle-status', adminController.toggleAdminStatus); // PUT /admins/:admin_id/toggle-status

export default router;
