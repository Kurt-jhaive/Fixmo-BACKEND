import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import {
  requestProviderOTP,
  verifyProviderOTPOnly,
  verifyProviderOTPAndRegister,
  providerLogin,
  requestProviderForgotPasswordOTP,
  verifyProviderForgotPasswordOTPAndReset,
  providerResetPassword,
  uploadCertificate,
  addServiceListing,
  addAvailability,
  getProviderAvailability,
  updateAvailability,
  deleteAvailability,
  getProviderDayAvailability,
  getProviderProfile,
  getProviderServices,
  requestProviderProfileUpdateOTP,
  updateProviderProfileWithOTP,
  verifyOriginalEmailAndRequestNewEmailOTP,
  verifyNewEmailAndUpdateProfile,
  getProviderAppointments,
  acceptAppointmentBooking,
  updateAppointmentStatusProvider,
  cancelProviderAppointment,
  rateCustomerAppointment,
  getProviderAvailabilityWithBookings,
  finishAppointment,
  getAllServiceListings,
  getServiceListingsByTitle,
  getProviderProfessions,
  getProviderDetails,
  updateProviderDetails
} from '../controller/authserviceProviderController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { uploadServiceImage } from '../middleware/multer.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create necessary directories (for backward compatibility)
ensureDirectoryExists('uploads/profiles');
ensureDirectoryExists('uploads/ids');
ensureDirectoryExists('uploads/certificates');
ensureDirectoryExists('uploads/service-images');

// Configure multer memory storage for Cloudinary uploads
const registrationStorage = multer.memoryStorage();

// File filter to accept only images for profile photos and IDs, and documents for certificates
const fileFilter = (req, file, cb) => {
  console.log('File filter check:', {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    originalname: file.originalname
  });

  if (file.fieldname === 'provider_profile_photo' || file.fieldname === 'provider_valid_id') {
    // Only accept image files for profile photos and IDs
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`${file.fieldname} must be an image file (JPG, PNG, GIF, etc.)`), false);
    }
  } else if (file.fieldname === 'certificateFile') {
    // Accept images and documents for certificates
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Certificate files must be images (JPG, PNG, GIF) or documents (PDF, DOC, DOCX)'), false);
    }
  } else {
    cb(new Error('Unknown file field'), false);
  }
};

// Create a specialized upload middleware for registration with multiple files
const registrationUpload = multer({ 
  storage: registrationStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 12 // Maximum 12 files total (1 profile + 1 ID + 10 certificates)
  }
}).fields([
  { name: 'provider_profile_photo', maxCount: 1 },
  { name: 'provider_valid_id', maxCount: 1 },
  { name: 'certificateFile', maxCount: 10 } // Allow up to 10 certificates
]);

// Configure multer for single certificate uploads
// Using memory storage for Vercel compatibility (serverless environment)
// Files will be uploaded to Cloudinary from memory buffer
const certificateStorage = multer.memoryStorage(); // Changed from diskStorage to memoryStorage

const certificateFilter = (req, file, cb) => {
  console.log('Certificate file filter check:', {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    originalname: file.originalname
  });

  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Certificate files must be images (JPG, PNG, GIF) or documents (PDF, DOC, DOCX)'), false);
  }
};

const certificateUpload = multer({ 
  storage: certificateStorage,
  fileFilter: certificateFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure multer for profile updates
const profileUpdateUpload = multer({ 
  storage: registrationStorage, // Reuse the same storage configuration
  fileFilter: (req, file, cb) => {
    // Accept both profile photo and valid ID for updates
    if (file.fieldname === 'provider_profile_photo' || file.fieldname === 'provider_valid_id') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Files must be image files (JPG, PNG, GIF, etc.)'), false);
      }
    } else {
      cb(new Error('Only profile photo and valid ID uploads are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 2 // Only profile photo and valid ID
  }
}).fields([
  { name: 'provider_profile_photo', maxCount: 1 },
  { name: 'provider_valid_id', maxCount: 1 }
]);

const prisma = new PrismaClient();

// Step 1: Service provider requests OTP
router.post('/provider-request-otp', requestProviderOTP);
// Step 1.5: Service provider verifies OTP only (for registration flow)
router.post('/provider-verify-otp', verifyProviderOTPOnly);
// Step 2: Service provider verifies OTP and registers with error handling
router.post('/provider-verify-register', (req, res, next) => {
  registrationUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB per file.'
        });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 12 files total.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      }
    } else if (err) {
      console.error('File validation error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // If no error, proceed to the controller
    next();
  });
}, verifyProviderOTPAndRegister);
// Service provider login
router.post('/provider-login', providerLogin);
router.post('/loginProvider', providerLogin);
// Forgot password: request OTP
router.post('/provider-forgot-password-request-otp', requestProviderForgotPasswordOTP);
// Forgot password: verify OTP and reset password
router.post('/provider-forgot-password-verify-otp', verifyProviderForgotPasswordOTPAndReset);
// Simple provider password reset (OTP already verified)
router.post('/provider-reset-password', providerResetPassword);

// Provider profile (protected route)
router.get('/profile', authMiddleware, getProviderProfile);
// Get provider profile (protected route)
router.get('/profile', authMiddleware, getProviderProfile);

// Get provider services (protected route)
router.get('/my-services', authMiddleware, getProviderServices);

// Profile update OTP routes
router.post('/profile-update-request-otp', authMiddleware, requestProviderProfileUpdateOTP);

// Two-step email verification for profile updates
router.post('/profile-update-verify-original-email', authMiddleware, (req, res, next) => {
  profileUpdateUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Profile update multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile photo too large. Maximum size is 5MB.'
        });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Only one profile photo is allowed.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      console.error('Profile update upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, verifyOriginalEmailAndRequestNewEmailOTP);

router.post('/profile-update-verify-new-email', authMiddleware, (req, res, next) => {
  profileUpdateUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Profile update multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile photo too large. Maximum size is 5MB.'
        });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Only one profile photo is allowed.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      console.error('Profile update upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, verifyNewEmailAndUpdateProfile);

// Legacy route (still works for non-email changes)
router.post('/profile-update-verify-otp', authMiddleware, (req, res, next) => {
  profileUpdateUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Profile update multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile photo too large. Maximum size is 5MB.'
        });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Only one profile photo is allowed.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      console.error('Profile update upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, updateProviderProfileWithOTP);

// Upload service provider certificate (with multer)
router.post('/upload-certificate', certificateUpload.single('certificate_file'), uploadCertificate);

router.post('/addListing', uploadServiceImage.single('service_picture'),  addServiceListing);

//Add Availability to the provider
router.post('/addAvailability', addAvailability);
// Get availability for a provider
router.get('/provider/:provider_id/availability', getProviderAvailability);
// Get availability for a specific provider and day
router.get('/provider/:provider_id/availability/:dayOfWeek', getProviderDayAvailability);
// Get suggested time slots for a provider and day

// Update specific availability
router.put('/availability/:availability_id', updateAvailability);
// Delete specific availability
router.delete('/availability/:availability_id', deleteAvailability);


// Get all service providers
router.get('/providers', async (req, res) => {
  try {
    const providers = await prisma.serviceProviderDetails.findMany();
    res.json(providers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching providers' });
  }
});

// Get all service listings (public endpoint)
router.get('/service-listings', getAllServiceListings);

// Get service listings by exact title match (public endpoint)
router.get('/services/by-title', getServiceListingsByTitle);

router.get('/certificates', async (req, res) => {
  try {
    const certificates = await prisma.certificate.findMany();
    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching certificates' });
  }
});

// Provider appointment management routes
router.get('/appointments', authMiddleware, getProviderAppointments);
router.put('/appointments/:appointmentId/accept', authMiddleware, acceptAppointmentBooking);
router.put('/appointments/:appointmentId/status', authMiddleware, updateAppointmentStatusProvider);
router.put('/appointments/:appointmentId/finish', authMiddleware, finishAppointment);
router.put('/appointments/:appointmentId/cancel', authMiddleware, cancelProviderAppointment);
router.post('/appointments/:appointmentId/rate', authMiddleware, rateCustomerAppointment);
router.get('/availability-with-bookings', authMiddleware, getProviderAvailabilityWithBookings);

// Provider details management routes
router.get('/professions/:providerId', getProviderProfessions); // Public endpoint to get provider professions
router.get('/details', authMiddleware, getProviderDetails); // Get own provider details (authenticated)
router.put('/details', authMiddleware, profileUpdateUpload, updateProviderDetails); // Update own provider details (authenticated)

export default router;
