import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMiddleware from '../middleware/authMiddleware.js';
import { requireCustomerSession } from '../middleware/sessionAuth.js';
import {
  login,
  requestOTP,
  verifyOTPOnly,
  verifyOTPAndRegister,
  requestForgotPasswordOTP,
  verifyForgotPasswordOTPAndReset,
  resetPassword,
  addAppointment,
  getServiceListings,
  getServiceListingDetails,
  getCustomerAppointments,
  cancelAppointment,
  addRatetoProvider,
  resetPasswordOnly,
  getUserProfile,
  updateVerificationDocuments,
  getServiceListingsForCustomer,
  getServiceCategories,
  getCustomerStats,
  getProviderBookingAvailability,
  getWeeklyAvailabilityDebug,
  getProviderWeeklyDays,
  createAppointment,
  updateAppointmentStatus,
  getAppointmentDetails,
  getCustomerBookingsDetailed,
  cancelAppointmentEnhanced,
  getCustomerProfile,
  requestCustomerProfileUpdateOTP,
  verifyOTPAndUpdateCustomerProfile,
} from '../controller/authCustomerController.js';

const router = express.Router();

// Optional authentication middleware - doesn't fail if no token provided
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    // No token provided, continue without authentication
    return next();
  }

  // Token provided, try to verify it
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    req.userType = decoded.userType;
  } catch (err) {
    // Invalid token, but don't fail - just continue without auth
    console.log('Optional auth: Invalid token, continuing without authentication');
  }
  
  next();
};

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create necessary directories (for backward compatibility)
ensureDirectoryExists('uploads/customer-profiles');
ensureDirectoryExists('uploads/customer-ids');

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log('Customer file filter check:', {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    originalname: file.originalname
  });

  // Only accept image files for customer uploads
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`${file.fieldname} must be an image file (JPG, PNG, GIF, etc.)`), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 2 // Maximum 2 files (1 profile + 1 ID)
  }
});

router.post('/login', login);
router.post('/request-otp', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), requestOTP);               // Step 1: Send OTP with file upload
router.post('/verify-otp', verifyOTPOnly);  // Step 1.5: Verify OTP only (for registration flow)
router.post('/verify-register', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), verifyOTPAndRegister); // Step 2: Validate OTP + register with file upload

// Forgot password: request OTP
router.post('/forgot-password-request-otp', requestForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/forgot-password-verify-otp', verifyForgotPasswordOTPAndReset);
// Simple password reset (OTP already verified)
router.post('/reset-password', resetPassword);
// Simple password reset (OTP already verified)
router.post('/reset-password-only', resetPasswordOnly);

// Get user profile and verification status
router.get('/user-profile/:userId', getUserProfile);
// Get authenticated customer profile (new endpoint)
router.get('/customer-profile', authMiddleware, getCustomerProfile);
// Edit customer profile - Step 1: Request OTP
router.post('/customer-profile/request-otp', authMiddleware, requestCustomerProfileUpdateOTP);
// Edit customer profile - Step 2: Verify OTP and Update
router.put('/customer-profile', authMiddleware, verifyOTPAndUpdateCustomerProfile);
// Update verification documents
router.post('/update-verification-documents', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'validId', maxCount: 1 }
]), updateVerificationDocuments);

// Get service listings for customer dashboard
router.get('/service-listings', optionalAuth, getServiceListingsForCustomer);
// Get service categories
router.get('/service-categories', getServiceCategories);
// Get customer statistics
router.get('/customer-stats/:userId', getCustomerStats);

// Customer appointment routes
// Get provider availability for booking
router.get('/provider/:providerId/booking-availability', getProviderBookingAvailability);
// Debug endpoint for weekly recurring availability
router.get('/provider/:providerId/weekly-debug', getWeeklyAvailabilityDebug);
// Get provider's weekly available days
router.get('/provider/:providerId/weekly-days', getProviderWeeklyDays);
// Create a new appointment (requires authentication)
router.post('/appointments', authMiddleware, createAppointment);
// Book a new appointment (legacy)
router.post('/book-appointment', addAppointment);
// Get specific service listing details
router.get('/service-listing/:service_id', getServiceListingDetails);
// Get customer's appointments
router.get('/customer/:customer_id/appointments', getCustomerAppointments);
// Cancel appointment
router.put('/cancel-appointment/:appointment_id', cancelAppointment);
// Submit rating for service provider
router.post('/rate-provider', addRatetoProvider);
// Update appointment status (for providers)
router.put('/appointment/:appointmentId/status', updateAppointmentStatus);
// Get appointment details
router.get('/appointment/:appointmentId', getAppointmentDetails);

// Enhanced customer booking routes (requires authentication)
router.get('/bookings', authMiddleware, getCustomerBookingsDetailed);
router.put('/bookings/:appointment_id/cancel', authMiddleware, cancelAppointmentEnhanced);
router.post('/bookings/:appointment_id/rate', requireCustomerSession, addRatetoProvider);

export default router;

