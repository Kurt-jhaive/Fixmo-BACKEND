import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middleware/authMiddleware.js';
import { requireCustomerSession } from '../middleware/sessionAuth.js';
import {
  login,
  sendOTP,
  verifyOTPForRegistration,
  registerCustomer,
  checkPhoneUnique,
  checkUsernameUnique,
  requestOTP,
  verifyOTPOnly,
  verifyOTPAndRegister,
  requestForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetPasswordCustomer,
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
  getCustomerBookingAvailability,
  requestCustomerProfileUpdateOTP,
  verifyOTPAndUpdateCustomerProfile,
  reportProviderNoShow,
  finishAppointmentCustomer,
} from '../controller/authCustomerController.js';

const router = express.Router();

// Optional authentication middleware - doesn't fail if no token provided
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  console.log('\n🔐 ========== OPTIONAL AUTH MIDDLEWARE ==========');
  console.log('Authorization header:', authHeader ? 'Present ✓' : 'Missing ✗');
  
  if (!authHeader) {
    // No token provided, continue without authentication
    console.log('⚠️ No Authorization header - continuing as unauthenticated request\n');
    return next();
  }

  // Token provided, try to verify it
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  console.log('Token format:', authHeader.startsWith('Bearer ') ? 'Bearer token ✓' : 'Raw token');
  console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    req.userType = decoded.userType;
    console.log('✅ Token verified successfully!');
    console.log('   User ID:', req.userId);
    console.log('   User Type:', req.userType);
    console.log('   Token issued at:', decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'unknown');
    console.log('   Token expires at:', decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'no expiry');
    console.log('================================================\n');
  } catch (err) {
    // Invalid token, but don't fail - just continue without auth
    console.log('❌ Token verification FAILED!');
    console.log('   Error:', err.message);
    if (err.name === 'TokenExpiredError') {
      console.log('   Reason: TOKEN EXPIRED');
      console.log('   Expired at:', err.expiredAt);
      console.log('   ⚠️ USER NEEDS TO LOGOUT AND LOGIN AGAIN');
    } else if (err.name === 'JsonWebTokenError') {
      console.log('   Reason: INVALID TOKEN (wrong secret or malformed)');
      console.log('   ⚠️ JWT_SECRET might have changed, or token is corrupted');
      console.log('   ⚠️ USER NEEDS TO LOGOUT AND LOGIN AGAIN');
    } else {
      console.log('   Reason:', err.name);
    }
    console.log('   Continuing as unauthenticated request');
    console.log('================================================\n');
  }
  
  next();
};

// Use memory storage for Cloudinary uploads (serverless-compatible)
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

// New 3-step OTP flow for customer registration
router.post('/send-otp', sendOTP);                        // Step 1: Send OTP to email
router.post('/verify-otp', verifyOTPForRegistration);     // Step 2: Verify OTP
router.post('/register', upload.fields([                  // Step 3: Register user
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), registerCustomer);

// Uniqueness check endpoints
router.post('/check-phone', checkPhoneUnique);            // Check if phone number is unique
router.post('/check-username', checkUsernameUnique);      // Check if username is unique

// Legacy endpoints for backward compatibility
router.post('/request-otp', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), requestOTP);               // Step 1: Send OTP with file upload
router.post('/verify-otp-only', verifyOTPOnly);  // Step 1.5: Verify OTP only (for registration flow)
router.post('/verify-register', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
]), verifyOTPAndRegister); // Step 2: Validate OTP + register with file upload

// NEW: 3-Step Forgot Password Flow (with rate limiting)
router.post('/forgot-password', requestForgotPasswordOTP);          // Step 1: Request OTP (3 attempts/30min)
router.post('/verify-forgot-password', verifyForgotPasswordOTP);    // Step 2: Verify OTP
router.post('/reset-password', resetPasswordCustomer);              // Step 3: Reset password

// LEGACY: Forgot password routes (for backward compatibility)
router.post('/forgot-password-request-otp', requestForgotPasswordOTP);
router.post('/forgot-password-verify-otp', verifyForgotPasswordOTPAndReset);
router.post('/reset-password-only', resetPasswordOnly);

// Get user profile and verification status
router.get('/user-profile/:userId', getUserProfile);
// Get authenticated customer profile (new endpoint)
router.get('/customer-profile', authMiddleware, getCustomerProfile);
// Get customer's booking availability status (how many slots left)
router.get('/customer-booking-availability', authMiddleware, getCustomerBookingAvailability);
// Edit customer profile - Step 1: Request OTP
router.post('/customer-profile/request-otp', authMiddleware, requestCustomerProfileUpdateOTP);
// Edit customer profile - Step 2: Verify OTP and Update
router.put('/customer-profile', authMiddleware, verifyOTPAndUpdateCustomerProfile);
// Update verification documents
router.post('/update-verification-documents', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'valid_id', maxCount: 1 }
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

// Customer finish appointment route
router.put('/appointments/:appointmentId/finish', authMiddleware, finishAppointmentCustomer);

// Report provider no-show (requires authentication and photo upload)
const noShowUpload = multer({ storage: multer.memoryStorage() });
router.post('/appointments/:appointmentId/report-no-show', authMiddleware, noShowUpload.single('evidence_photo'), reportProviderNoShow);

export default router;

