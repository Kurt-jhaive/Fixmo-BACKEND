// Controller for authentication-related logic
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail, sendBookingCancellationEmail, sendBookingConfirmationToCustomer, sendBookingConfirmationToProvider, sendBookingCancellationToCustomer, sendBookingCompletionToCustomer, sendBookingCompletionToProvider } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword, verifyOTP, cleanupOTP } from '../services/otpUtils.js';
import { checkOTPRateLimit, recordOTPAttempt, checkForgotPasswordRateLimit, recordForgotPasswordAttempt, resetForgotPasswordAttempts } from '../services/rateLimitUtils.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { calculateCustomerProviderDistance } from '../utils/locationUtils.js';
import PenaltyService from '../services/penaltyService.js';

const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   examples:
 *     CustomerLoginRequest:
 *       summary: Customer login request
 *       value:
 *         email: "customer@example.com"
 *         password: "password123"
 *     CustomerLoginResponse:
 *       summary: Successful customer login
 *       value:
 *         message: "Login successful"
 *         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         userId: 123
 *         userName: "johndoe"
 */

/**
 * Customer login controller
 * Authenticates customer credentials and returns JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        const token = jwt.sign({ 
            userId: user.user_id,
            userType: 'customer',
            email: user.email
        }, process.env.JWT_SECRET, { expiresIn: '30d' }); // 30 days for mobile app
        
        res.status(200).json({
            message: 'Login successful',
            token,
            userId: user.user_id,
            userName: user.userName
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Step 1 - Send OTP to email for registration
 *     description: Generates a 6-digit OTP and sends it to the customer's email. OTP expires in 5 minutes.
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
 *                 format: email
 *                 example: "customer@example.com"
 *                 description: Customer's email address
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent to email successfully"
 *       400:
 *         description: Bad request - User already exists or email invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User already exists with this email"
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Too many OTP requests. Please try again later"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error sending OTP"
 */
// Step 1: Send OTP - Generates and sends OTP to email
export const sendOTP = async (req, res) => {
    const { email } = req.body;

    // Validate input
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        // Check rate limiting
        const rateLimitCheck = await checkOTPRateLimit(email);
        if (!rateLimitCheck.allowed) {
            return res.status(429).json({ message: rateLimitCheck.message });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Check if OTP already exists for this email
        const existingOTP = await prisma.oTPVerification.findFirst({ where: { email } });
        
        if (existingOTP) {
            // Update existing OTP record
            await prisma.oTPVerification.updateMany({
                where: { email },
                data: {
                    otp,
                    expires_at: expiresAt,
                    verified: false // Reset verification status
                }
            });
        } else {
            // Create new OTP record
            await prisma.oTPVerification.create({
                data: {
                    email,
                    otp,
                    expires_at: expiresAt,
                    verified: false
                }
            });
        }

        // Record the OTP attempt
        recordOTPAttempt(email);

        // Send OTP email
        await sendOTPEmail(email, otp);
        
        res.status(200).json({
            message: 'OTP sent to email successfully',
        });

    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

/**
 * @swagger
 * /auth/check-phone:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Check if phone number is unique
 *     description: Validates if the phone number is available for registration (not already in use)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *             properties:
 *               phone_number:
 *                 type: string
 *                 example: "+1234567890"
 *                 description: Phone number to check
 *     responses:
 *       200:
 *         description: Phone number is available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Phone number is available"
 *       400:
 *         description: Phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Phone number already exists"
 *       500:
 *         description: Server error
 */
export const checkPhoneUnique = async (req, res) => {
    const { phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ 
            where: { phone_number } 
        });

        if (existingUser) {
            return res.status(400).json({ 
                available: false, 
                message: 'Phone number already exists' 
            });
        }

        res.status(200).json({ 
            available: true, 
            message: 'Phone number is available' 
        });
    } catch (err) {
        console.error('Check phone uniqueness error:', err);
        res.status(500).json({ message: 'Error checking phone number' });
    }
};

/**
 * @swagger
 * /auth/check-username:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Check if username is unique
 *     description: Validates if the username is available for registration (not already in use)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *             properties:
 *               userName:
 *                 type: string
 *                 example: "johndoe123"
 *                 description: Username to check
 *     responses:
 *       200:
 *         description: Username is available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Username is available"
 *       400:
 *         description: Username already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Username already exists"
 *       500:
 *         description: Server error
 */
export const checkUsernameUnique = async (req, res) => {
    const { userName } = req.body;

    if (!userName) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ 
            where: { userName } 
        });

        if (existingUser) {
            return res.status(400).json({ 
                available: false, 
                message: 'Username already exists' 
            });
        }

        res.status(200).json({ 
            available: true, 
            message: 'Username is available' 
        });
    } catch (err) {
        console.error('Check username uniqueness error:', err);
        res.status(500).json({ message: 'Error checking username' });
    }
};

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Step 2 - Verify OTP code
 *     description: Validates the OTP code sent to customer's email and marks it as verified
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "customer@example.com"
 *                 description: Customer's email address
 *               otp:
 *                 type: string
 *                 example: "123456"
 *                 description: 6-digit OTP code received via email
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully. You can now proceed to registration."
 *                 verified:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - Invalid, expired, or missing OTP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   enum:
 *                     - "No OTP found for this email. Please request a new OTP."
 *                     - "OTP has expired. Please request a new OTP."
 *                     - "Invalid OTP. Please try again."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error verifying OTP"
 */
// Step 2: Verify OTP - Validates OTP and marks as verified
export const verifyOTPForRegistration = async (req, res) => {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        // Find OTP record
        const otpRecord = await prisma.oTPVerification.findFirst({ 
            where: { email }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'No OTP found for this email. Please request a new OTP.' });
        }

        // Check if already verified
        if (otpRecord.verified) {
            return res.status(200).json({ message: 'Email already verified. You can proceed to registration.' });
        }

        // Check if OTP is expired
        if (new Date() > otpRecord.expires_at) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
        }

        // Check if OTP matches
        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }

        // Mark OTP as verified
        await prisma.oTPVerification.updateMany({
            where: { email },
            data: { verified: true }
        });

        res.status(200).json({ 
            message: 'Email verified successfully. You can now proceed to registration.',
            verified: true
        });

    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Step 3 - Register customer account
 *     description: Creates a new customer account after email verification. Requires OTP to be verified first.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *               - userName
 *               - phone_number
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *               userName:
 *                 type: string
 *                 example: "johndoe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "customer@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123"
 *               phone_number:
 *                 type: string
 *                 example: "+1234567890"
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               user_location:
 *                 type: string
 *                 example: "New York"
 *               exact_location:
 *                 type: string
 *                 example: "123 Main St, New York, NY 10001"
 *               profile_photo:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo image file (max 5MB)
 *               valid_id:
 *                 type: string
 *                 format: binary
 *                 description: Valid ID image file (max 5MB)
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 userId:
 *                   type: integer
 *                   example: 123
 *                 userName:
 *                   type: string
 *                   example: "johndoe"
 *                 profile_photo:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../profile.jpg"
 *                 valid_id:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../id.jpg"
 *       400:
 *         description: Bad request - Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   enum:
 *                     - "Email not verified. Please verify your email before registering."
 *                     - "Email not found. Please verify your email first."
 *                     - "User already exists"
 *                     - "Phone number is already registered with another account"
 *                     - "All required fields must be provided"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error during registration"
 */
// Step 3: Register - Creates user account after email verification
export const registerCustomer = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      userName,
      email,
      birthday,
      password,
      phone_number,
      user_location,
      exact_location
    } = req.body;
    
    const profilePhotoFile = req.files && req.files['profile_photo'] ? req.files['profile_photo'][0] : null;
    const validIdFile = req.files && req.files['valid_id'] ? req.files['valid_id'][0] : null;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !userName || !phone_number) {
        return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if email is verified
    const otpRecord = await prisma.oTPVerification.findFirst({ 
        where: { email }
    });

    if (!otpRecord) {
        return res.status(400).json({ message: 'Email not found. Please verify your email first.' });
    }

    if (!otpRecord.verified) {
        return res.status(400).json({ message: 'Email not verified. Please verify your email before registering.' });
    }

    // Check if user already exists (prevent duplicate registration)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check for duplicate phone number
    const existingPhoneUser = await prisma.user.findFirst({ 
      where: { phone_number: phone_number } 
    });
    if (existingPhoneUser) {
      return res.status(400).json({ message: 'Phone number is already registered with another account' });
    }

    // Also check if phone number exists in service provider table
    const existingPhoneProvider = await prisma.serviceProviderDetails.findFirst({ 
      where: { provider_phone_number: phone_number } 
    });
    if (existingPhoneProvider) {
      return res.status(400).json({ message: 'Phone number is already registered with a service provider account' });
    }

    // Upload images to Cloudinary
    let profilePhotoUrl = null;
    let validIdUrl = null;

    try {
      if (profilePhotoFile) {
        profilePhotoUrl = await uploadToCloudinary(
          profilePhotoFile.buffer, 
          'fixmo/customer-profiles',
          `customer_profile_${email.replace('@', '_').replace('.', '_')}_${Date.now()}`
        );
      }

      if (validIdFile) {
        validIdUrl = await uploadToCloudinary(
          validIdFile.buffer, 
          'fixmo/customer-ids',
          `customer_id_${email.replace('@', '_').replace('.', '_')}_${Date.now()}`
        );
      }
    } catch (uploadError) {
      console.error('Error uploading images to Cloudinary:', uploadError);
      return res.status(500).json({ message: 'Error uploading images. Please try again.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        first_name,
        last_name,
        userName,
        email,
        birthday: birthday ? new Date(birthday) : null,
        password: hashedPassword,
        phone_number,
        profile_photo: profilePhotoUrl,
        valid_id: validIdUrl,
        user_location: user_location || null,
        exact_location: exact_location || null
      }
    });

    // Send registration success email
    await sendRegistrationSuccessEmail(email, first_name, userName); 

    // Delete the used OTP record
    await prisma.oTPVerification.deleteMany({ where: { email } });

    // Generate JWT token for immediate login after registration
    const token = jwt.sign({ 
      userId: newUser.user_id,
      userType: 'customer',
      email: newUser.email
    }, process.env.JWT_SECRET, { expiresIn: '30d' }); // 30 days for mobile app

    res.status(201).json({
      message: 'User registered successfully',
      token,
      userId: newUser.user_id,
      userName: newUser.userName,
      profile_photo: profilePhotoUrl,
      valid_id: validIdUrl
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Legacy endpoint for backward compatibility - kept for existing integrations
export const requestOTP = sendOTP;

// Legacy endpoint for backward compatibility - kept for existing integrations
export const verifyOTPAndRegister = registerCustomer;

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Step 1 - Request OTP for password reset
 *     description: Sends a 6-digit OTP to customer's email for password reset. Limited to 3 attempts per 30 minutes.
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
 *                 format: email
 *                 example: "customer@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset OTP sent to your email"
 *                 attemptsLeft:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: User not found
 *       429:
 *         description: Too many attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Maximum forgot password attempts (3) reached. Please try again in 25 minutes."
 *       500:
 *         description: Server error
 */
// CUSTOMER: Step 1 - Request OTP for forgot password
export const requestForgotPasswordOTP = async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    
    try {
        // Check rate limiting (3 attempts, 30-minute cooldown)
        const rateLimitCheck = await checkForgotPasswordRateLimit(email);
        if (!rateLimitCheck.allowed) {
            return res.status(429).json({ 
                message: rateLimitCheck.message,
                remainingMinutes: rateLimitCheck.remainingMinutes
            });
        }
        
        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'No account found with this email' });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Store or update OTP
        const existingOTP = await prisma.oTPVerification.findFirst({ where: { email } });
        
        if (existingOTP) {
            await prisma.oTPVerification.updateMany({
                where: { email },
                data: {
                    otp,
                    expires_at: expiresAt,
                    verified: false
                }
            });
        } else {
            await prisma.oTPVerification.create({
                data: {
                    email,
                    otp,
                    expires_at: expiresAt,
                    verified: false
                }
            });
        }
        
        // Send OTP email
        await sendOTPEmail(email, otp, 'password reset');
        
        // Record attempt
        recordForgotPasswordAttempt(email);
        
        res.status(200).json({ 
            message: 'Password reset OTP sent to your email',
            attemptsLeft: rateLimitCheck.attemptsLeft - 1
        });
        
    } catch (err) {
        console.error('Forgot password OTP error:', err);
        res.status(500).json({ message: 'Error processing password reset request' });
    }
};

/**
 * @swagger
 * /auth/verify-forgot-password:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Step 2 - Verify OTP for password reset
 *     description: Verifies the OTP code sent to customer's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "customer@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP verified. You can now reset your password."
 *                 verified:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Server error
 */
// CUSTOMER: Step 2 - Verify OTP (separate step)
export const verifyForgotPasswordOTP = async (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    try {
        // Find OTP record
        const otpRecord = await prisma.oTPVerification.findFirst({ 
            where: { email }
        });
        
        if (!otpRecord) {
            return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        }
        
        // Check if OTP is expired
        if (new Date() > new Date(otpRecord.expires_at)) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }
        
        // Verify OTP
        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }
        
        // Mark as verified
        await prisma.oTPVerification.updateMany({
            where: { email },
            data: { verified: true }
        });
        
        res.status(200).json({ 
            message: 'OTP verified. You can now reset your password.',
            verified: true
        });
        
    } catch (err) {
        console.error('Verify forgot password OTP error:', err);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Customer Authentication
 *     summary: Step 3 - Reset password
 *     description: Resets customer password after OTP verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "customer@example.com"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       400:
 *         description: OTP not verified or user not found
 *       500:
 *         description: Server error
 */
// CUSTOMER: Step 3 - Reset password after OTP verification
export const resetPasswordCustomer = async (req, res) => {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required' });
    }
    
    try {
        // Check if OTP was verified
        const otpRecord = await prisma.oTPVerification.findFirst({ 
            where: { email }
        });
        
        if (!otpRecord || !otpRecord.verified) {
            return res.status(400).json({ message: 'Please verify your OTP first' });
        }
        
        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        
        // Delete OTP record
        await prisma.oTPVerification.deleteMany({ where: { email } });
        
        // Reset rate limiting for this email
        resetForgotPasswordAttempts(email);
        
        res.status(200).json({ message: 'Password reset successfully' });
        
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Error resetting password' });
    }
};

// LEGACY: Combined Step 2 - Verify OTP and reset password (for backward compatibility)
export const verifyForgotPasswordOTPAndReset = async (req, res) => {
    await verifyOTPAndResetPassword({
        email: req.body.email,
        otp: req.body.otp,
        newPassword: req.body.newPassword,
        userType: 'customer',
        updatePassword: async (email, hashedPassword) => await prisma.user.update({ where: { email }, data: { password: hashedPassword } }),
        notFoundMsg: 'User not found'
    }, res);
};

export const addAppointment = async (req, res) => {
    console.log('🔧 BOOKING DEBUG - Request received:', req.body);
    
    const {
        customer_id,
        service_listing_id,
        provider_id,
        scheduled_date,
        scheduled_time,
        service_description,
        final_price,
    } = req.body;

    try {
        console.log('📋 Extracted parameters:', {
            customer_id,
            service_listing_id, 
            provider_id,
            scheduled_date,
            scheduled_time,
            service_description,
            final_price
        });

        // Validate required fields
        if (!customer_id || !provider_id || !scheduled_date || !scheduled_time) {
            return res.status(400).json({ 
                message: 'Missing required fields: customer_id, provider_id, scheduled_date, and scheduled_time are required' 
            });
        }

        // Validate that customer exists
        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(customer_id) }
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Validate that service provider exists
        const serviceProvider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!serviceProvider) {
            return res.status(404).json({ message: 'Service provider not found' });
        }

        // ✅ PREVENT SELF-BOOKING: Check if customer is trying to book with themselves
        const customerFullName = `${customer.first_name} ${customer.last_name}`.toLowerCase().trim();
        const providerFullName = `${serviceProvider.provider_first_name} ${serviceProvider.provider_last_name}`.toLowerCase().trim();
        const namesMatch = customerFullName === providerFullName;
        const emailMatches = customer.email.toLowerCase().trim() === serviceProvider.provider_email.toLowerCase().trim();
        const phoneMatches = customer.phone_number.trim() === serviceProvider.provider_phone_number.trim();

        if (namesMatch && (emailMatches || phoneMatches)) {
            console.log('🚫 SELF-BOOKING PREVENTED:', {
                customer: customerFullName,
                provider: providerFullName,
                email_match: emailMatches,
                phone_match: phoneMatches
            });
            return res.status(400).json({
                message: 'You cannot book an appointment with yourself. Please select a different service provider.',
                reason: 'self_booking_not_allowed'
            });
        }

        // Validate service listing if provided
        let serviceListing = null;
        if (service_listing_id) {
            serviceListing = await prisma.serviceListing.findUnique({
                where: { service_id: parseInt(service_listing_id) },
                include: {
                    serviceProvider: true
                }
            });

            if (!serviceListing) {
                return res.status(404).json({ message: 'Service listing not found' });
            }

            // Ensure the listing belongs to the specified provider
            if (serviceListing.provider_id !== parseInt(provider_id)) {
                return res.status(400).json({ message: 'Service listing does not belong to the specified provider' });
            }
        }

        // Create scheduled datetime
        console.log('🕐 Creating scheduled datetime...');
        console.log('  scheduled_date:', scheduled_date);
        console.log('  scheduled_time:', scheduled_time);
        const scheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}:00`);
        console.log('  scheduledDateTime:', scheduledDateTime);
        console.log('  scheduledDateTime.toString():', scheduledDateTime.toString());
        console.log('  isValid:', !isNaN(scheduledDateTime.getTime()));
        
        if (isNaN(scheduledDateTime.getTime())) {
            console.log('❌ Invalid date/time format:', scheduled_date, scheduled_time);
            return res.status(400).json({ message: 'Invalid scheduled date or time format' });
        }

        // Check if the scheduled date is in the future
        if (scheduledDateTime < new Date()) {
            return res.status(400).json({ message: 'Scheduled date and time must be in the future' });
        }

        // Check provider availability for the exact slot using day-of-week scheduling
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[scheduledDateTime.getDay()];
        
        console.log('🔍 Booking Debug - Looking for exact availability slot:');
        console.log('  Provider ID:', provider_id);
        console.log('  Day of Week:', dayOfWeek);
        console.log('  Scheduled Time:', scheduled_time);
        
        // Find the exact availability slot that matches the requested time
        const exactSlot = await prisma.availability.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek,
                startTime: scheduled_time, // Must match exact start time
                availability_isActive: true // Only active slots can be booked
            },
            include: {
                appointments: {
                    where: {
                        scheduled_date: {
                            gte: new Date(scheduledDateTime.getFullYear(), scheduledDateTime.getMonth(), scheduledDateTime.getDate()),
                            lt: new Date(scheduledDateTime.getFullYear(), scheduledDateTime.getMonth(), scheduledDateTime.getDate() + 1)
                        },
                        appointment_status: {
                            in: ['accepted', 'pending', 'on the way'] // Active appointment statuses
                        }
                    }
                }
            }
        });

        console.log('🎯 Exact slot found:', exactSlot);

        if (!exactSlot) {
            return res.status(400).json({ 
                message: `This time slot is not available. Please select from the provider's available time slots.` 
            });
        }

        // Check if this specific date and time slot is already booked
        if (exactSlot.appointments && exactSlot.appointments.length > 0) {
            return res.status(400).json({ 
                message: 'This time slot is already booked for the selected date' 
            });
        }

        // Create the appointment
        console.log('✅ Creating appointment with data:');
        console.log('  Customer ID:', customer_id);
        console.log('  Provider ID:', provider_id);
        console.log('  Availability ID:', exactSlot.availability_id);
        console.log('  Scheduled Date/Time:', scheduledDateTime);
        console.log('  Final Price:', final_price);
        
        const newAppointment = await prisma.appointment.create({
            data: {
                customer_id: parseInt(customer_id),
                provider_id: parseInt(provider_id),
                service_id: service_listing_id ? parseInt(service_listing_id) : 1, // ✅ ADD: Include service_id
                availability_id: exactSlot.availability_id, // Link to the availability slot
                appointment_status: 'accepted', // Auto-accept since slot is available
                scheduled_date: scheduledDateTime,
                repairDescription: service_description || (serviceListing ? serviceListing.service_description : null)
            },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true,
                        service_startingprice: true
                    }
                },
                availability: {
                    select: {
                        availability_id: true,
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true
                    }
                }
            }
        });

        console.log('✅ Appointment created successfully:', newAppointment.appointment_id);
        console.log('✅ Linked to availability slot:', exactSlot.availability_id);

        // Send confirmation emails to both customer and provider
        try {
            const customerName = `${newAppointment.customer.first_name} ${newAppointment.customer.last_name}`;
            const providerName = `${newAppointment.serviceProvider.provider_first_name} ${newAppointment.serviceProvider.provider_last_name}`;
            
            const bookingDetails = {
                customerName,
                customerPhone: newAppointment.customer.phone_number,
                customerEmail: newAppointment.customer.email,
                serviceTitle: newAppointment.service.service_title,
                providerName,
                providerPhone: newAppointment.serviceProvider.provider_phone_number,
                providerEmail: newAppointment.serviceProvider.provider_email,
                scheduledDate: newAppointment.scheduled_date,
                appointmentId: newAppointment.appointment_id,
                startingPrice: newAppointment.service.service_startingprice,
                repairDescription: newAppointment.repairDescription
            };
            console.log('📧 BookingDetails (auth createAppointment):', bookingDetails);

            // Send confirmation email to customer
            await sendBookingConfirmationToCustomer(newAppointment.customer.email, bookingDetails);
            console.log('✅ Booking confirmation email sent to customer');

            // Send confirmation email to provider
            await sendBookingConfirmationToProvider(newAppointment.serviceProvider.provider_email, bookingDetails);
            console.log('✅ Booking confirmation email sent to provider');

        } catch (emailError) {
            console.error('❌ Failed to send booking confirmation emails:', emailError);
            // Continue with response even if emails fail
        }

        return res.status(201).json({
            message: 'Appointment booked successfully',
            appointment: newAppointment,
            service_listing: serviceListing ? {
                service_id: serviceListing.service_id,
                service_title: serviceListing.service_title,
                service_description: serviceListing.service_description,
                service_price: serviceListing.service_startingprice
            } : null
        });

    } catch (err) {
        console.error('❌ Error creating customer appointment:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        return res.status(500).json({ message: 'Internal server error while creating appointment' });
    }
};

// Get all service listings (for customer browsing)
export const getServiceListings = async (req, res) => {
    try {
        const { provider_id, service_type, location, min_price, max_price, include_availability } = req.query;
        
        let whereClause = {};
        
        if (provider_id) {
            whereClause.provider_id = parseInt(provider_id);
        }
        
        if (min_price || max_price) {
            whereClause.service_startingprice = {};
            if (min_price) whereClause.service_startingprice.gte = parseFloat(min_price);
            if (max_price) whereClause.service_startingprice.lte = parseFloat(max_price);
        }

        const includeProviderData = {
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_email: true,
                provider_phone_number: true,
                provider_location: true,
                provider_rating: true,
                provider_isVerified: true
            }
        };

        // If include_availability is requested, add availability data
        if (include_availability === 'true') {
            includeProviderData.select.provider_availability = {
                where: {
                    availability_isActive: true
                },
                select: {
                    availability_id: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                    availability_isActive: true,
                    _count: {
                        select: {
                            appointments: {
                                where: {
                                    appointment_status: {
                                        in: ['scheduled', 'confirmed', 'in-progress']
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: [
                    { dayOfWeek: 'asc' },
                    { startTime: 'asc' }
                ]
            };
        }

        const serviceListings = await prisma.serviceListing.findMany({
            where: whereClause,
            include: {
                service_photos: {
                    orderBy: {
                        uploadedAt: 'asc'
                    }
                },
                serviceProvider: includeProviderData,
                specific_services: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: {
                service_startingprice: 'asc'
            }
        });

        // Filter by location if specified
        let filteredListings = serviceListings;
        if (location) {
            filteredListings = serviceListings.filter(listing => 
                listing.serviceProvider.provider_location && 
                listing.serviceProvider.provider_location.toLowerCase().includes(location.toLowerCase())
            );
        }

        // Filter by service type if specified
        if (service_type) {
            filteredListings = filteredListings.filter(listing =>
                listing.specific_services.some(service =>
                    service.category.category_name.toLowerCase().includes(service_type.toLowerCase()) ||
                    service.specific_service_title.toLowerCase().includes(service_type.toLowerCase())
                )
            );
        }

        // Process availability if included
        if (include_availability === 'true') {
            filteredListings = filteredListings.map(listing => {
                if (listing.serviceProvider.provider_availability) {
                    const processedAvailability = listing.serviceProvider.provider_availability.map(slot => {
                        const totalBookings = slot._count?.appointments || 0;
                        const startHour = parseInt(slot.startTime.split(':')[0]);
                        const endHour = parseInt(slot.endTime.split(':')[0]);
                        const totalSlots = endHour - startHour;
                        const availableSlots = Math.max(0, totalSlots - totalBookings);
                        
                        return {
                            availability_id: slot.availability_id,
                            dayOfWeek: slot.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            isActive: slot.availability_isActive,
                            totalBookings: totalBookings,
                            estimatedAvailableSlots: availableSlots,
                            isFullyBooked: availableSlots === 0
                        };
                    });

                    return {
                        ...listing,
                        serviceProvider: {
                            ...listing.serviceProvider,
                            available_time_slots: processedAvailability
                        }
                    };
                }
                return listing;
            });
        }

        return res.status(200).json({
            message: 'Service listings retrieved successfully',
            count: filteredListings.length,
            listings: filteredListings
        });

    } catch (err) {
        console.error('Error fetching service listings:', err);
        return res.status(500).json({ message: 'Internal server error while fetching service listings' });
    }
};

// Get specific service listing details
export const getServiceListingDetails = async (req, res) => {
    const { service_id } = req.params;
    const { date } = req.query; // Optional: specific date to check availability

    try {
        if (!service_id) {
            return res.status(400).json({ message: 'Service ID is required' });
        }

        const serviceListing = await prisma.serviceListing.findUnique({
            where: { service_id: parseInt(service_id) },
            include: {
                serviceProvider: {
                    include: {
                        provider_availability: {
                            where: {
                                availability_isActive: true
                            },
                            include: {
                                appointments: date ? {
                                    where: {
                                        scheduled_date: new Date(date),
                                        appointment_status: {
                                            in: ['scheduled', 'confirmed', 'in-progress']
                                        }
                                    }
                                } : {
                                    where: {
                                        appointment_status: {
                                            in: ['scheduled', 'confirmed', 'in-progress']
                                        }
                                    }
                                }
                            },
                            orderBy: [
                                { dayOfWeek: 'asc' },
                                { startTime: 'asc' }
                            ]
                        },
                        provider_ratings: {
                            include: {
                                user: {
                                    select: {
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            },
                            orderBy: {
                                id: 'desc'
                            },
                            take: 5
                        }
                    }
                },
                specific_services: {
                    include: {
                        category: true
                    }
                }
            }
        });

        if (!serviceListing) {
            return res.status(404).json({ message: 'Service listing not found' });
        }

        // Process availability to show available time slots
        const processedAvailability = serviceListing.serviceProvider.provider_availability.map(slot => {
            const totalBookings = slot.appointments?.length || 0;
            
            // Calculate available slots based on time range
            // Assuming 1-hour appointment slots
            const startHour = parseInt(slot.startTime.split(':')[0]);
            const endHour = parseInt(slot.endTime.split(':')[0]);
            const totalSlots = endHour - startHour;
            const availableSlots = Math.max(0, totalSlots - totalBookings);
            
            return {
                availability_id: slot.availability_id,
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isActive: slot.availability_isActive,
                totalBookings: totalBookings,
                estimatedAvailableSlots: availableSlots,
                isFullyBooked: availableSlots === 0,
                bookedAppointments: slot.appointments?.map(appt => ({
                    appointment_id: appt.appointment_id,
                    scheduled_date: appt.scheduled_date,
                    status: appt.appointment_status
                })) || []
            };
        });

        // Group by day of week for easier frontend consumption
        const availabilityByDay = processedAvailability.reduce((acc, slot) => {
            if (!acc[slot.dayOfWeek]) {
                acc[slot.dayOfWeek] = [];
            }
            acc[slot.dayOfWeek].push(slot);
            return acc;
        }, {});

        return res.status(200).json({
            message: 'Service listing details retrieved successfully',
            listing: {
                ...serviceListing,
                serviceProvider: {
                    ...serviceListing.serviceProvider,
                    available_time_slots: processedAvailability,
                    availability_by_day: availabilityByDay
                }
            }
        });

    } catch (err) {
        console.error('Error fetching service listing details:', err);
        return res.status(500).json({ message: 'Internal server error while fetching service listing details' });
    }
};





// Get customer's appointments
export const getCustomerAppointments = async (req, res) => {
    const { customer_id } = req.params;

    try {
        if (!customer_id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        // Validate that customer exists
        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(customer_id) }
        });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Get all appointments for the customer
        const appointments = await prisma.appointment.findMany({
            where: {
                customer_id: parseInt(customer_id)
            },
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true,
                        provider_exact_location: true
                    }
                },
                availability: {
                    select: {
                        availability_id: true,
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true,
                        availability_isActive: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_startingprice: true
                    }
                }
            },
            orderBy: {
                scheduled_date: 'desc'
            }
        });

        // Add slot times at root level for easier access
        const formattedAppointments = appointments.map(a => ({
            ...a,
            slot_start_time: a.availability?.startTime || null,
            slot_end_time: a.availability?.endTime || null,
            slot_day_of_week: a.availability?.dayOfWeek || null
        }));

        return res.status(200).json({
            message: 'Customer appointments retrieved successfully',
            customer: {
                customer_id: customer.user_id,
                customer_name: `${customer.first_name} ${customer.last_name}`
            },
            appointments: formattedAppointments
        });

    } catch (err) {
        console.error('Error fetching customer appointments:', err);
        return res.status(500).json({ message: 'Internal server error while fetching customer appointments' });
    }
};

// Cancel appointment (customer)
export const cancelAppointment = async (req, res) => {
    const { appointment_id } = req.params;
    const { customer_id } = req.body;

    try {
        if (!appointment_id) {
            return res.status(400).json({ message: 'Appointment ID is required' });
        }

        if (!customer_id) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        // Check if appointment exists and belongs to customer
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointment_id) },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true
                    }
                }
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (existingAppointment.customer_id !== parseInt(customer_id)) {
            return res.status(403).json({ message: 'You can only cancel your own appointments' });
        }

        // Check if appointment can be cancelled
        if (existingAppointment.appointment_status === 'finished') {
            return res.status(400).json({ message: 'Cannot cancel a finished appointment' });
        }

        if (existingAppointment.appointment_status === 'canceled') {
            return res.status(400).json({ message: 'Appointment is already cancelled' });
        }

        // Update appointment status to canceled
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointment_id) },
            data: { appointment_status: 'canceled' }
        });

        // Auto-detect penalty violations for cancellation patterns
        try {
            const customerId = parseInt(customer_id);
            
            // Check for late cancellation (< 2 hours before appointment)
            await PenaltyService.detectLateCancellation(customerId, parseInt(appointment_id));
            
            // Check for multiple cancellations on the same day
            await PenaltyService.detectMultipleCancellationsSameDay(customerId);
            
            // Check for consecutive day cancellations
            await PenaltyService.detectConsecutiveDayCancellations(customerId);
            
            console.log('✅ Penalty violation checks completed for customer:', customerId);
        } catch (penaltyError) {
            console.error('❌ Error checking penalty violations:', penaltyError);
            // Don't fail the cancellation if penalty check fails
        }

        // No need to update availability slot - the appointment is simply cancelled
        // The availability slot can be reused for the same time slot on different dates

        return res.status(200).json({
            message: 'Appointment cancelled successfully',
            cancelled_appointment: {
                appointment_id: updatedAppointment.appointment_id,
                customer: `${existingAppointment.customer.first_name} ${existingAppointment.customer.last_name}`,
                provider: `${existingAppointment.serviceProvider.provider_first_name} ${existingAppointment.serviceProvider.provider_last_name}`,
                scheduled_date: existingAppointment.scheduled_date,
                status: updatedAppointment.appointment_status
            }
        });

    } catch (err) {
        console.error('Error cancelling appointment:', err);
        return res.status(500).json({ message: 'Internal server error while cancelling appointment' });
    }
};

export const addRatetoProvider = async (req, res) => {
    const { rating, comment } = req.body;
    const { appointment_id } = req.params;
    const user_id = req.user?.user_id; // From auth middleware

    try {
        // Validate required fields
        if (!appointment_id || !rating) {
            return res.status(400).json({ 
                message: 'Appointment ID and rating are required' 
            });
        }

        // Validate rating value is between 1 and 5
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                message: 'Rating value must be between 1 and 5' 
            });
        }

        // Validate that the user exists and is authenticated
        if (!user_id) {
            return res.status(401).json({ message: 'User authentication required' });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: parseInt(user_id) }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate that the appointment exists and belongs to the user
        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointment_id) },
            include: {
                customer: true,
                serviceProvider: true
            }
        });

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if the appointment belongs to the user
        if (appointment.customer_id !== parseInt(user_id)) {
            return res.status(403).json({ message: 'You can only rate appointments you were involved in' });
        }

        // Get the provider ID from the appointment
        const provider_id = appointment.provider_id;

        // Validate that the service provider exists
        const serviceProvider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!serviceProvider) {
            return res.status(404).json({ message: 'Service provider not found' });
        }

        // Check if the appointment is completed (only completed appointments can be rated)
        if (appointment.appointment_status !== 'completed') {
            return res.status(400).json({ message: 'Only completed appointments can be rated' });
        }

        // Check if this appointment has already been rated by this user
        const existingRating = await prisma.rating.findFirst({
            where: {
                appointment_id: parseInt(appointment_id),
                user_id: parseInt(user_id),
                provider_id: parseInt(provider_id)
            }
        });

        if (existingRating) {
            return res.status(400).json({ message: 'You have already rated this appointment' });
        }

        // Create the rating
        const newRating = await prisma.rating.create({
            data: {
                rating_value: parseInt(rating),
                rating_comment: comment || null,
                appointment_id: parseInt(appointment_id),
                user_id: parseInt(user_id),
                provider_id: parseInt(provider_id)
            },
            include: {
                user: {
                    select: {
                        first_name: true,
                        last_name: true,
                        userName: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_userName: true
                    }
                },
                appointment: {
                    select: {
                        appointment_id: true,
                        scheduled_date: true,
                        repairDescription: true
                    }
                }
            }
        });

        // Update the service provider's average rating
        const allRatings = await prisma.rating.findMany({
            where: { provider_id: parseInt(provider_id) },
            select: { rating_value: true }
        });

        const averageRating = allRatings.reduce((sum, rating) => sum + rating.rating_value, 0) / allRatings.length;

        await prisma.serviceProviderDetails.update({
            where: { provider_id: parseInt(provider_id) },
            data: { provider_rating: parseFloat(averageRating.toFixed(2)) }
        });

        return res.status(201).json({
            success: true,
            message: 'Rating submitted successfully',
            rating: newRating,
            provider_new_average_rating: parseFloat(averageRating.toFixed(2))
        });

    } catch (err) {
        console.error('Error submitting rating:', err);
        return res.status(500).json({ message: 'Internal server error while submitting rating' });    }
};

// Standalone OTP verification endpoint (for registration flow)
export const verifyOTPOnly = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        const verificationResult = await verifyOTP(email, otp);
        
        if (verificationResult.success) {
            res.status(200).json({ 
                message: 'OTP verified successfully',
                verified: true 
            });
        } else {
            res.status(400).json({ 
                message: verificationResult.message,
                verified: false 
            });
        }
    } catch (err) {
        console.error('OTP verification error:', err);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

// CUSTOMER: Simple password reset (OTP already verified)
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

// CUSTOMER: Step 2 - Reset password without OTP verification (OTP already verified)
export const resetPasswordOnly = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required' });
    }

    try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

// Get user profile and verification status
export const getUserProfile = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {        const user = await prisma.user.findUnique({
            where: { user_id: parseInt(userId) },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                userName: true,
                email: true,
                phone_number: true,
                user_location: true,
                profile_photo: true,
                valid_id: true,
                is_verified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                created_at: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'User profile retrieved successfully',
            user: user
        });
    } catch (err) {
        console.error('Get user profile error:', err);
        res.status(500).json({ message: 'Server error retrieving user profile' });
    }
};

// Update user verification documents
export const updateVerificationDocuments = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // Handle file uploads
        const profilePictureFile = req.files && req.files['profilePicture'] ? req.files['profilePicture'][0] : null;
        const validIdFile = req.files && req.files['validId'] ? req.files['validId'][0] : null;

        const updateData = {};
          if (profilePictureFile) {
            updateData.profile_photo = profilePictureFile.path;
        }
        
        if (validIdFile) {
            updateData.valid_id = validIdFile.path;
        }

        // If documents are uploaded, set verification status to pending
        if (profilePictureFile || validIdFile) {
            updateData.is_verified = false; // Reset verification status, admin will need to verify
        }

        const updatedUser = await prisma.user.update({
            where: { user_id: parseInt(userId) },
            data: updateData,            select: {
                user_id: true,
                profile_photo: true,
                valid_id: true,
                is_verified: true
            }
        });

        res.status(200).json({
            message: 'Verification documents updated successfully',
            user: updatedUser
        });
    } catch (err) {
        console.error('Update verification documents error:', err);
        res.status(500).json({ message: 'Server error updating verification documents' });
    }
};

// Get all service listings with filtering and pagination (with date-based availability)
export const getServiceListingsForCustomer = async (req, res) => {
    const { 
        page = 1, 
        limit = 12, 
        search = '', 
        category = '', 
        location = '', 
        sortBy = 'rating',
        date = null // New parameter for availability filtering
    } = req.query;

    console.log('\n🔍 ========== GET SERVICE LISTINGS REQUEST ==========');
    console.log('📥 Query Parameters:');
    console.log(`   - page: ${page}`);
    console.log(`   - limit: ${limit}`);
    console.log(`   - search: "${search}"`);
    console.log(`   - category: "${category}"`);
    console.log(`   - location: "${location}"`);
    console.log(`   - sortBy: ${sortBy}`);
    console.log(`   - date: ${date || 'not specified'}`);

    try {
        // Get authenticated user info if available (optional authentication)
        const authenticatedUserId = req.userId; // From authMiddleware if token is provided
        const authenticatedUserType = req.userType;
        
        console.log(`🔐 Authentication: ${authenticatedUserId ? `User ID ${authenticatedUserId} (${authenticatedUserType})` : 'Not authenticated (public request)'}`);
        
        // Get customer details if authenticated to enable self-exclusion and distance calculation
        let customerDetails = null;
        if (authenticatedUserId && authenticatedUserType === 'customer') {
            customerDetails = await prisma.user.findUnique({
                where: { user_id: authenticatedUserId },
                select: {
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone_number: true,
                    exact_location: true // For distance calculation
                }
            });
            console.log('🔍 Customer authenticated:', {
                userId: authenticatedUserId,
                name: `${customerDetails?.first_name} ${customerDetails?.last_name}`,
                has_location: !!customerDetails?.exact_location
            });
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Parse the requested date and get day of week if date is provided
        let requestedDate = null;
        let dayOfWeek = null;
        let startOfDay = null;
        let endOfDay = null;
        
        if (date) {
            requestedDate = new Date(date + 'T00:00:00.000Z');
            dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
            startOfDay = new Date(requestedDate);
            endOfDay = new Date(requestedDate);
            endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        }
        
        // Build where clause for filtering
        const whereClause = {};
        
        // Search filter
        if (search) {
            whereClause.OR = [
                { service_title: { contains: search, mode: 'insensitive' } },
                { service_description: { contains: search, mode: 'insensitive' } },
                { serviceProvider: { 
                    OR: [
                        { provider_first_name: { contains: search, mode: 'insensitive' } },
                        { provider_last_name: { contains: search, mode: 'insensitive' } }
                    ]
                }}
            ];
        }

        // Location filter
        if (location) {
            whereClause.serviceProvider = {
                ...whereClause.serviceProvider,
                provider_location: { contains: location, mode: 'insensitive' }
            };
        }

        // Category filter (through specific services)
        if (category) {
            whereClause.specific_services = {
                some: {
                    category: {
                        category_name: { equals: category, mode: 'insensitive' }
                    }
                }
            };
        }

        // Only show services from verified and activated providers
        whereClause.serviceProvider = {
            ...whereClause.serviceProvider,
            provider_isVerified: true,
            provider_isActivated: true
        };

        // Build orderBy clause
        let orderBy = {};
        switch (sortBy) {
            case 'rating':
                orderBy = { serviceProvider: { provider_rating: 'desc' } };
                break;
            case 'price-low':
                orderBy = { service_startingprice: 'asc' };
                break;
            case 'price-high':
                orderBy = { service_startingprice: 'desc' };
                break;
            case 'newest':
                orderBy = { service_id: 'desc' };
                break;
            default:
                orderBy = { serviceProvider: { provider_rating: 'desc' } };
        }

        // Get service listings with availability data
        const serviceListings = await prisma.serviceListing.findMany({
            where: whereClause,
            include: {
                service_photos: {
                    orderBy: {
                        uploadedAt: 'asc'
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true,
                        provider_exact_location: true, // For distance calculation
                        provider_rating: true,
                        provider_isVerified: true,
                        provider_profile_photo: true,
                        provider_availability: {
                            where: {
                                availability_isActive: true
                            },
                            select: {
                                availability_id: true,
                                dayOfWeek: true,
                                startTime: true,
                                endTime: true,
                                availability_isActive: true,
                                _count: {
                                    select: {
                                        appointments: {
                                            where: {
                                                appointment_status: {
                                                    in: ['scheduled', 'confirmed', 'in-progress']
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            orderBy: [
                                { dayOfWeek: 'asc' },
                                { startTime: 'asc' }
                            ]
                        }
                    }
                },
                specific_services: {
                    select: {
                        specific_service_id: true,
                        specific_service_title: true,
                        specific_service_description: true,
                        category: {
                            select: {
                                category_name: true
                            }
                        }
                    }
                }
            },
            orderBy,
            skip,
            take: parseInt(limit)
        });

        // If date filtering is requested, filter providers based on availability
        let filteredListings = serviceListings;
        let availabilityInfo = {};
        
        // First, apply self-exclusion filter if customer is authenticated
        if (customerDetails) {
            const customerFirstName = customerDetails.first_name.toLowerCase().trim();
            const customerLastName = customerDetails.last_name.toLowerCase().trim();
            const customerEmail = customerDetails.email.toLowerCase().trim();
            const customerPhone = customerDetails.phone_number.trim();
            
            const beforeCount = filteredListings.length;
            
            filteredListings = filteredListings.filter(listing => {
                const provider = listing.serviceProvider;
                const providerFirstName = provider.provider_first_name.toLowerCase().trim();
                const providerLastName = provider.provider_last_name.toLowerCase().trim();
                const providerEmail = provider.provider_email.toLowerCase().trim();
                const providerPhone = provider.provider_phone_number.trim();
                
                // Exclude if names match AND (email matches OR phone matches)
                const namesMatch = customerFirstName === providerFirstName && customerLastName === providerLastName;
                const emailMatches = customerEmail === providerEmail;
                const phoneMatches = customerPhone === providerPhone;
                
                const isSamePerson = namesMatch && (emailMatches || phoneMatches);
                
                if (isSamePerson) {
                    console.log('🚫 Excluding provider (same person as customer):', {
                        provider_id: provider.provider_id,
                        name: `${provider.provider_first_name} ${provider.provider_last_name}`,
                        email: provider.provider_email
                    });
                }
                
                return !isSamePerson; // Keep if NOT the same person
            });
            
            const excludedCount = beforeCount - filteredListings.length;
            if (excludedCount > 0) {
                console.log(`✅ Self-exclusion filter applied: ${excludedCount} provider(s) excluded`);
            }
        }
        
        if (date && dayOfWeek && startOfDay && endOfDay) {
            // Get all provider IDs from the listings (use filteredListings after self-exclusion)
            const providerIds = filteredListings.map(listing => listing.serviceProvider.provider_id);
            
            // Get all active appointments for all providers on the requested date WITH availability_id
            const activeAppointments = await prisma.appointment.findMany({
                where: {
                    provider_id: { in: providerIds },
                    scheduled_date: {
                        gte: startOfDay,
                        lt: endOfDay
                    },
                    appointment_status: {
                        in: ['scheduled', 'on-the-way', 'in-progress']
                    }
                },
                select: {
                    provider_id: true,
                    availability_id: true,
                    appointment_status: true,
                    scheduled_date: true
                }
            });
            
            // Create a set of availability_ids that are booked (not provider IDs)
            const bookedAvailabilityIds = new Set(
                activeAppointments
                    .filter(apt => apt.availability_id !== null)
                    .map(apt => apt.availability_id)
            );
            
            // Get availability data for all providers for the requested day of week
            const providerAvailability = await prisma.availability.findMany({
                where: {
                    provider_id: { in: providerIds },
                    dayOfWeek: dayOfWeek,
                    availability_isActive: true
                }
            });
            
            // Group availability by provider ID and check if they have any available slots
            const availableProviderIds = new Set();
            
            providerAvailability.forEach(availability => {
                // Check if THIS SPECIFIC SLOT is booked
                const isSlotBooked = bookedAvailabilityIds.has(availability.availability_id);
                const isPastDate = requestedDate < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                
                // Check if booking is still allowed (for today only - until 3 PM)
                let isBookingAllowed = true;
                const today = new Date();
                const isToday = requestedDate.toDateString() === today.toDateString();
                
                if (isToday) {
                    const currentHour = today.getHours();
                    // Allow booking until 3 PM (15:00) today
                    isBookingAllowed = currentHour < 15;
                }
                
                // This slot is available if:
                // 1. Not a past date
                // 2. Booking is still allowed (before 3 PM if today)
                // 3. This specific slot is NOT booked
                const isSlotAvailable = !isPastDate && isBookingAllowed && !isSlotBooked;
                
                if (isSlotAvailable) {
                    availableProviderIds.add(availability.provider_id);
                }
                
                // Store availability info for response
                if (!availabilityInfo[availability.provider_id]) {
                    availabilityInfo[availability.provider_id] = {
                        totalSlots: 0,
                        availableSlots: 0,
                        bookedSlots: 0,
                        hasAvailability: false,
                        availableSlotsDetails: [] // Array to store available slot details with availability_id
                    };
                }
                
                availabilityInfo[availability.provider_id].totalSlots++;
                if (isSlotAvailable) {
                    availabilityInfo[availability.provider_id].availableSlots++;
                    availabilityInfo[availability.provider_id].hasAvailability = true;
                    // Add the available slot details including availability_id
                    availabilityInfo[availability.provider_id].availableSlotsDetails.push({
                        availability_id: availability.availability_id,
                        startTime: availability.startTime,
                        endTime: availability.endTime,
                        dayOfWeek: availability.dayOfWeek
                    });
                } else if (isSlotBooked) {
                    availabilityInfo[availability.provider_id].bookedSlots++;
                }
            });
            
            // Filter service listings to only include providers with available slots
            // Use filteredListings to preserve self-exclusion filter
            filteredListings = filteredListings.filter(listing => {
                const providerId = listing.serviceProvider.provider_id;
                const hasAvailability = availableProviderIds.has(providerId);
                
                // If provider has no availability data for this day, exclude them
                if (!availabilityInfo[providerId]) {
                    availabilityInfo[providerId] = {
                        totalSlots: 0,
                        availableSlots: 0,
                        bookedSlots: 0,
                        hasAvailability: false,
                        availableSlotsDetails: [], // Initialize empty array for consistency
                        reason: 'No availability set for this day of week'
                    };
                }
                
                return hasAvailability;
            });
        }

        // Get total count for pagination (after availability filtering if applied)
        let totalCount;
        if (date && dayOfWeek) {
            // For date filtering, we need to count only available providers
            totalCount = filteredListings.length;
        } else {
            // For regular filtering without date, use the original count
            totalCount = await prisma.serviceListing.count({
                where: whereClause
            });
        }

        // Format the response with availability information and distance
        console.log(`\n🔍 Formatting ${filteredListings.length} service listings...`);
        if (customerDetails?.exact_location) {
            console.log(`📍 Customer location: ${customerDetails.exact_location}`);
        } else {
            console.log(`⚠️ Customer location not available (not authenticated or no location set)`);
        }
        
        const formattedListings = filteredListings.map((listing, index) => {
            const providerId = listing.serviceProvider.provider_id;
            const availability = availabilityInfo[providerId] || null;
            
            console.log(`\n🏪 Provider ${index + 1}/${filteredListings.length}: ${listing.serviceProvider.provider_first_name} ${listing.serviceProvider.provider_last_name}`);
            console.log(`   Provider ID: ${providerId}`);
            console.log(`   Provider exact_location: ${listing.serviceProvider.provider_exact_location || 'NOT SET'}`);
            
            // Calculate distance if both customer and provider have locations
            let distanceInfo = null;
            if (customerDetails?.exact_location && listing.serviceProvider.provider_exact_location) {
                console.log(`   ✅ Both locations available, calculating distance...`);
                distanceInfo = calculateCustomerProviderDistance(
                    customerDetails.exact_location,
                    listing.serviceProvider.provider_exact_location
                );
                if (distanceInfo) {
                    console.log(`   📍 Distance: ${distanceInfo.formatted} (${distanceInfo.category})`);
                } else {
                    console.log(`   ❌ Distance calculation failed`);
                }
            } else {
                if (!customerDetails?.exact_location) {
                    console.log(`   ⚠️ Skipping distance calculation - customer location missing`);
                } else {
                    console.log(`   ⚠️ Skipping distance calculation - provider location missing`);
                }
            }
            
            return {
                id: listing.service_id,
                title: listing.service_title,
                description: listing.service_description,
                startingPrice: listing.service_startingprice,
                service_photos: listing.service_photos || [], // New photos array
                provider: {
                    id: listing.serviceProvider.provider_id,
                    name: `${listing.serviceProvider.provider_first_name} ${listing.serviceProvider.provider_last_name}`,
                    userName: listing.serviceProvider.provider_userName,
                    rating: listing.serviceProvider.provider_rating || 0,
                    location: listing.serviceProvider.provider_location,
                    exact_location: listing.serviceProvider.provider_exact_location, // Include exact location for mobile app
                    profilePhoto: listing.serviceProvider.provider_profile_photo,
                    // Add available time slots
                    available_time_slots: listing.serviceProvider.provider_availability ? 
                        listing.serviceProvider.provider_availability.map(slot => {
                            const totalBookings = slot._count?.appointments || 0;
                            const startHour = parseInt(slot.startTime.split(':')[0]);
                            const endHour = parseInt(slot.endTime.split(':')[0]);
                            const totalSlots = endHour - startHour;
                            const availableSlots = Math.max(0, totalSlots - totalBookings);
                            
                            return {
                                availability_id: slot.availability_id,
                                dayOfWeek: slot.dayOfWeek,
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                                isActive: slot.availability_isActive,
                                totalBookings: totalBookings,
                                estimatedAvailableSlots: availableSlots,
                                isFullyBooked: availableSlots === 0
                            };
                        }) : []
                },
                categories: listing.specific_services.map(service => service.category.category_name),
                specificServices: listing.specific_services.map(service => ({
                    id: service.specific_service_id,
                    title: service.specific_service_title,
                    description: service.specific_service_description
                })),
                // Include distance information if available
                ...(distanceInfo && {
                    distance: {
                        km: distanceInfo.distance,
                        formatted: distanceInfo.formatted,
                        category: distanceInfo.category // 'very-close', 'nearby', 'moderate', 'far'
                    }
                }),
                // Include availability information if date filtering was applied
                ...(date && availability && {
                    availability: {
                        date: date,
                        dayOfWeek: dayOfWeek,
                        hasAvailability: availability.hasAvailability,
                        totalSlots: availability.totalSlots,
                        availableSlots: availability.availableSlots,
                        bookedSlots: availability.bookedSlots,
                        availableSlotsDetails: availability.availableSlotsDetails || [], // Include detailed slots with availability_id
                        reason: availability.reason || null
                    }
                })
            };
        });

        // Sort by distance if customer has location (nearest first)
        if (customerDetails?.exact_location) {
            console.log(`\n🔄 Sorting ${formattedListings.length} listings by distance...`);
            
            formattedListings.sort((a, b) => {
                // Providers with distance info come first
                if (a.distance && !b.distance) return -1;
                if (!a.distance && b.distance) return 1;
                
                // Both have distance - sort by distance
                if (a.distance && b.distance) {
                    return a.distance.km - b.distance.km;
                }
                
                // Neither has distance - keep original order (by rating/price)
                return 0;
            });
            
            console.log('✅ Service listings sorted by distance (nearest first)');
            console.log('\n📋 Final sorted order:');
            formattedListings.forEach((listing, index) => {
                if (listing.distance) {
                    console.log(`   ${index + 1}. ${listing.provider.name} - ${listing.distance.formatted} (${listing.distance.category})`);
                } else {
                    console.log(`   ${index + 1}. ${listing.provider.name} - No distance info`);
                }
            });
        } else {
            console.log('\n⚠️ Skipping distance-based sorting (customer not authenticated or no location)');
        }

        // Prepare response with enhanced information
        const response = {
            message: date 
                ? `Service listings for ${date} (${dayOfWeek}) retrieved successfully`
                : 'Service listings retrieved successfully',
            listings: formattedListings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                hasNext: skip + parseInt(limit) < totalCount,
                hasPrev: parseInt(page) > 1
            }
        };

        // Add date filtering information if applicable
        if (date) {
            response.dateFilter = {
                requestedDate: date,
                dayOfWeek: dayOfWeek,
                totalProvidersBeforeFiltering: serviceListings.length,
                availableProvidersAfterFiltering: filteredListings.length,
                filteringApplied: true
            };
        }

        res.status(200).json(response);
    } catch (err) {
        console.error('Get service listings error:', err);
        res.status(500).json({ message: 'Server error retrieving service listings' });
    }
};

// Get service categories for filter dropdown
export const getServiceCategories = async (req, res) => {
    try {
        const categories = await prisma.serviceCategory.findMany({
            select: {
                category_id: true,
                category_name: true
            },
            orderBy: {
                category_name: 'asc'
            }
        });

        res.status(200).json({
            message: 'Service categories retrieved successfully',
            categories
        });
    } catch (err) {
        console.error('Get service categories error:', err);
        res.status(500).json({ message: 'Server error retrieving service categories' });
    }
};

// Get customer statistics (bookings, ratings, etc.)
export const getCustomerStats = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // Get appointment counts
        const [activeBookings, completedBookings, userRatings] = await Promise.all([
            prisma.appointment.count({
                where: {
                    customer_id: parseInt(userId),
                    appointment_status: {
                        in: ['pending', 'confirmed', 'in_progress']
                    }
                }
            }),
            prisma.appointment.count({
                where: {
                    customer_id: parseInt(userId),
                    appointment_status: 'completed'
                }
            }),
            prisma.rating.findMany({
                where: {
                    user_id: parseInt(userId)
                },
                select: {
                    rating_value: true
                }
            })
        ]);

        // Calculate average rating given by user
        const averageRating = userRatings.length > 0 
            ? userRatings.reduce((sum, rating) => sum + rating.rating_value, 0) / userRatings.length 
            : 0;

        res.status(200).json({
            message: 'Customer statistics retrieved successfully',
            stats: {
                activeBookings,
                completedBookings,
                averageRating: averageRating.toFixed(1)
            }
        });
    } catch (err) {
        console.error('Get customer stats error:', err);
        res.status(500).json({ message: 'Server error retrieving customer statistics' });
    }
};

// Get provider availability for booking (day-of-week based)
export const getProviderBookingAvailability = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { date } = req.query;

        // Properly parse the date to avoid timezone issues
        const requestedDate = new Date(date + 'T00:00:00.000Z');
        const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });

        console.log('📅 Getting availability for:', {
            providerId,
            date,
            requestedDate: requestedDate.toISOString(),
            dayOfWeek
        });

        // Create start and end of day for the requested date (UTC)
        const startOfDay = new Date(requestedDate);
        const endOfDay = new Date(requestedDate);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

        console.log('📅 Date range for appointment lookup:', {
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString()
        });

        // Get provider's weekly availability for the specific day
        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(providerId),
                dayOfWeek: dayOfWeek,
                availability_isActive: true
            },
            include: {
                appointments: {
                    where: {
                        scheduled_date: {
                            gte: startOfDay,
                            lt: endOfDay
                        },
                        appointment_status: {
                            in: ['accepted', 'pending', 'approved', 'confirmed'] // Include all active statuses
                        }
                    }
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        console.log('🔍 Found availability slots:', availability.map(slot => ({
            id: slot.availability_id,
            dayOfWeek: slot.dayOfWeek,
            time: `${slot.startTime}-${slot.endTime}`,
            appointmentsOnThisDate: slot.appointments.length,
            appointments: slot.appointments.map(apt => ({
                id: apt.appointment_id,
                date: apt.scheduled_date.toISOString(),
                status: apt.appointment_status
            }))
        })));

        // Check if each slot is booked by looking at appointments for the specific date
        const availabilityWithStatus = availability.map(slot => {
            // IMPORTANT: hasActiveAppointments only checks appointments for the SPECIFIC DATE requested
            // This implements rolling weekly recurrence - slots are only "booked" for the specific date,
            // not for the entire week or future weeks
            const hasActiveAppointments = slot.appointments && slot.appointments.length > 0;
            
            // Check if booking is still allowed (for today only - until 3 PM)
            let isBookingAllowed = true;
            const today = new Date();
            const isToday = requestedDate.toDateString() === today.toDateString();
            
            if (isToday) {
                const currentHour = today.getHours();
                // Allow booking until 3 PM (15:00) today, regardless of individual time slots
                isBookingAllowed = currentHour < 15;
            }
            
            // Rolling Weekly Recurring Logic:
            // - Past dates: not available
            // - After 3 PM today: not available for same-day booking
            // - Has active appointments on THIS SPECIFIC DATE: booked
            // - Otherwise: available (even if booked on previous weeks)
            //
            // Example: If Monday 9 AM was booked on Week 1, it's automatically 
            // available for Week 2 Monday 9 AM because we only check appointments
            // for the specific date being requested
            const isPastDate = requestedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            let status = 'available';
            let isAvailable = true;
            
            if (isPastDate) {
                status = 'past';
                isAvailable = false;
            } else if (isToday && !isBookingAllowed) {
                status = 'booking_closed_for_today';
                isAvailable = false;
            } else if (hasActiveAppointments) {
                status = 'booked';
                isAvailable = false;
            }
            
            return {
                availability_id: slot.availability_id,
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
                provider_id: slot.provider_id,
                availability_isActive: slot.availability_isActive,
                isBooked: hasActiveAppointments,
                isPastDate: isPastDate,
                isBookingAllowed: isBookingAllowed,
                isToday: isToday,
                isAvailable,
                status,
                appointmentsOnThisDate: slot.appointments.length,
                debugInfo: {
                    requestedDate: requestedDate.toISOString(),
                    dayOfWeek,
                    currentHour: isToday ? today.getHours() : null,
                    bookingCutoffTime: isToday ? '15:00' : null,
                    searchDateRange: {
                        start: startOfDay.toISOString(),
                        end: endOfDay.toISOString()
                    }
                }
            };
        });

        res.status(200).json({
            success: true,
            message: 'Provider weekly availability retrieved successfully',
            data: {
                date: date,
                dayOfWeek: dayOfWeek,
                providerId: parseInt(providerId),
                availability: availabilityWithStatus,
                isToday: requestedDate.toDateString() === new Date().toDateString(),
                note: 'Weekly recurring availability: Slots automatically become available again each week',
                schedulingType: 'weekly-recurring',
                debug: {
                    requestedDateParsed: requestedDate.toISOString(),
                    dayOfWeek: dayOfWeek,
                    searchDateRange: {
                        start: startOfDay.toISOString(),
                        end: endOfDay.toISOString()
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error getting provider availability:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving provider availability',
            error: error.message
        });
    }
};

// Add a debug endpoint to check weekly recurring availability
export const getWeeklyAvailabilityDebug = async (req, res) => {
    try {
        const { providerId } = req.params;
        
        // Get the current week dates
        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
        
        const nextWeekStart = new Date(currentWeekStart);
        nextWeekStart.setDate(currentWeekStart.getDate() + 7); // Start of next week
        
        console.log('🔍 Weekly Availability Debug for Provider:', providerId);
        console.log('Current week start:', currentWeekStart.toISOString());
        console.log('Next week start:', nextWeekStart.toISOString());
        
        // Get all availability slots for this provider
        const allAvailability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(providerId),
                availability_isActive: true
            },
            include: {
                appointments: {
                    where: {
                        scheduled_date: {
                            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14), // Last 2 weeks
                            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14)   // Next 2 weeks
                        }
                    },
                    orderBy: {
                        scheduled_date: 'asc'
                    }
                }
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });

        // Group appointments by week
        const debugData = allAvailability.map(slot => {
            const appointmentsByWeek = {};
            
            slot.appointments.forEach(apt => {
                const aptDate = new Date(apt.scheduled_date);
                const weekStart = new Date(aptDate);
                weekStart.setDate(aptDate.getDate() - aptDate.getDay());
                const weekKey = weekStart.toISOString().split('T')[0];
                
                if (!appointmentsByWeek[weekKey]) {
                    appointmentsByWeek[weekKey] = [];
                }
                
                appointmentsByWeek[weekKey].push({
                    appointment_id: apt.appointment_id,
                    scheduled_date: apt.scheduled_date.toISOString(),
                    appointment_status: apt.appointment_status,
                    customer_id: apt.customer_id
                });
            });
            
            return {
                availability_id: slot.availability_id,
                dayOfWeek: slot.dayOfWeek,
                timeSlot: `${slot.startTime}-${slot.endTime}`,
                isActive: slot.availability_isActive,
                totalAppointments: slot.appointments.length,
                appointmentsByWeek
            };
        });

        res.json({
            success: true,
            message: 'Weekly availability debug data',
            data: {
                providerId: parseInt(providerId),
                currentWeek: currentWeekStart.toISOString().split('T')[0],
                nextWeek: nextWeekStart.toISOString().split('T')[0],
                availability: debugData,
                summary: `This shows how appointments are distributed across weeks for recurring weekly slots`
            }
        });

    } catch (error) {
        console.error('Error in weekly availability debug:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting debug data',
            error: error.message
        });
    }
};

export const createAppointment = async (req, res) => {
    try {
        console.log('=== APPOINTMENT CREATION DEBUG ===');
        console.log('Auth headers:', req.headers.authorization);
        console.log('Customer ID from auth:', req.userId);
        console.log('Request body:', req.body);
        
        const customerId = req.userId; // From auth middleware
        const {
            provider_id,
            service_id,
            scheduled_date,
            scheduled_time,
            repairDescription
        } = req.body;

        // Validate required fields
        if (!provider_id || !service_id || !scheduled_date || !scheduled_time) {
            console.log('Missing required fields!');
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // ✅ PREVENT SELF-BOOKING: Check if customer is trying to book with themselves
        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(customerId) },
            select: {
                first_name: true,
                last_name: true,
                email: true,
                phone_number: true
            }
        });

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) },
            select: {
                provider_first_name: true,
                provider_last_name: true,
                provider_email: true,
                provider_phone_number: true
            }
        });

        if (!customer || !provider) {
            return res.status(404).json({
                success: false,
                message: 'Customer or provider not found'
            });
        }

        // Check if they are the same person
        const customerFullName = `${customer.first_name} ${customer.last_name}`.toLowerCase().trim();
        const providerFullName = `${provider.provider_first_name} ${provider.provider_last_name}`.toLowerCase().trim();
        const namesMatch = customerFullName === providerFullName;
        const emailMatches = customer.email.toLowerCase().trim() === provider.provider_email.toLowerCase().trim();
        const phoneMatches = customer.phone_number.trim() === provider.provider_phone_number.trim();

        if (namesMatch && (emailMatches || phoneMatches)) {
            console.log('🚫 SELF-BOOKING PREVENTED:', {
                customer: customerFullName,
                provider: providerFullName,
                email_match: emailMatches,
                phone_match: phoneMatches
            });
            return res.status(400).json({
                success: false,
                message: 'You cannot book an appointment with yourself. Please select a different service provider.',
                reason: 'self_booking_not_allowed'
            });
        }

        // ✅ NEW: Check booking limit - customer can only have 3 scheduled appointments at a time
        // Only 'scheduled' status counts toward the limit
        // Statuses that don't count: 'on the way', 'in-progress', 'finished', 'completed', 'cancelled'
        const customerScheduledAppointments = await prisma.appointment.count({
            where: {
                customer_id: parseInt(customerId),
                appointment_status: 'scheduled'  // Only count 'scheduled' status
            }
        });

        console.log('🔍 BOOKING CHECK - Customer scheduled appointments count:', customerScheduledAppointments);

        if (customerScheduledAppointments >= 3) {
            return res.status(400).json({
                success: false,
                message: 'Booking limit reached. You can only have 3 scheduled appointments at a time. Please wait for one of your appointments to change status (on the way, in-progress, completed, or cancelled) before booking again.',
                currentScheduledCount: customerScheduledAppointments,
                maxAllowed: 3
            });
        }

        // Combine date and time into a proper DateTime
        const appointmentDateTime = new Date(`${scheduled_date}T${scheduled_time}:00.000Z`);
        console.log('Appointment DateTime:', appointmentDateTime);

        // Check if the time slot is still available
        const dayOfWeek = appointmentDateTime.toLocaleDateString('en-US', { weekday: 'long' });
        console.log('Day of week:', dayOfWeek);
        
        // Check if the requested time slot exists in provider's availability
        const exactSlot = await prisma.availability.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek,
                startTime: scheduled_time,
                availability_isActive: true
            }
        });

        console.log('Looking for exact slot:', {
            provider_id: parseInt(provider_id),
            dayOfWeek: dayOfWeek,
            startTime: scheduled_time,
            availability_isActive: true
        });
        console.log('Found exact slot:', exactSlot);

        if (!exactSlot) {
            console.log('No exact slot found - checking availability slots in database');
            const allSlots = await prisma.availability.findMany({
                where: {
                    provider_id: parseInt(provider_id),
                    dayOfWeek: dayOfWeek
                }
            });
            console.log('All slots for this day:', allSlots);
            
            return res.status(400).json({
                success: false,
                message: 'Selected time slot is not available'
            });
        }

        // Check for conflicting appointments
        const existingAppointment = await prisma.appointment.findFirst({
            where: {
                provider_id: parseInt(provider_id),
                scheduled_date: appointmentDateTime,
                appointment_status: {
                    not: 'Cancelled'
                }
            }
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked'
            });
        }

        // Create the appointment
        const newAppointment = await prisma.appointment.create({
            data: {
                customer_id: parseInt(customerId),
                provider_id: parseInt(provider_id),
                service_id: parseInt(service_id), // ✅ ADD: Include service_id
                availability_id: exactSlot.availability_id, // ✅ ADD: Include availability_id
                appointment_status: 'Pending',
                scheduled_date: appointmentDateTime,
                repairDescription: repairDescription || null
            },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true,
                        service_startingprice: true
                    }
                },
                availability: {
                    select: {
                        availability_id: true,
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true
                    }
                }
            }
        });

        // Note: We don't mark the availability slot as booked because availability 
        // represents the provider's weekly schedule, not specific date bookings.
        // Specific bookings are tracked in the appointment table.

        // Send confirmation emails to both customer and provider
        try {
            const customerName = `${newAppointment.customer.first_name} ${newAppointment.customer.last_name}`;
            const providerName = `${newAppointment.serviceProvider.provider_first_name} ${newAppointment.serviceProvider.provider_last_name}`;
            
            const bookingDetails = {
                customerName,
                customerPhone: newAppointment.customer.phone_number,
                customerEmail: newAppointment.customer.email,
                serviceTitle: newAppointment.service.service_title,
                providerName,
                providerPhone: newAppointment.serviceProvider.provider_phone_number,
                providerEmail: newAppointment.serviceProvider.provider_email,
                scheduledDate: newAppointment.scheduled_date,
                appointmentId: newAppointment.appointment_id,
                startingPrice: newAppointment.service.service_startingprice,
                repairDescription: newAppointment.repairDescription
            };

            // Send confirmation email to customer
            await sendBookingConfirmationToCustomer(newAppointment.customer.email, bookingDetails);
            console.log('✅ Booking confirmation email sent to customer');

            // Send confirmation email to provider
            await sendBookingConfirmationToProvider(newAppointment.serviceProvider.provider_email, bookingDetails);
            console.log('✅ Booking confirmation email sent to provider');

        } catch (emailError) {
            console.error('❌ Failed to send booking confirmation emails:', emailError);
            // Continue with response even if emails fail
        }

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: newAppointment
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating appointment',
            error: error.message
        });
    }
};

// Provider updates appointment status (for provider dashboard)
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status, provider_id } = req.body;

        // Validate status
        const validStatuses = ['accepted', 'on the way', 'finished', 'canceled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        // Verify the appointment exists and belongs to the provider
        const appointment = await prisma.appointment.findFirst({
            where: {
                appointment_id: parseInt(appointmentId),
                provider_id: parseInt(provider_id)
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to this provider'
            });
        }

        // Update appointment status
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { appointment_status: status },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true
                    }
                },
                service: {
                    select: {
                        service_title: true,
                        service_startingprice: true
                    }
                }
            }
        });

        // Send completion emails when status is changed to 'completed'
        if (status === 'completed') {
            try {
                const customerName = `${updatedAppointment.customer.first_name} ${updatedAppointment.customer.last_name}`;
                const providerName = `${updatedAppointment.serviceProvider.provider_first_name} ${updatedAppointment.serviceProvider.provider_last_name}`;
                
                const completionDetails = {
                    customerName,
                    serviceTitle: updatedAppointment.service.service_title,
                    providerName,
                    scheduledDate: updatedAppointment.scheduled_date,
                    appointmentId: updatedAppointment.appointment_id,
                    startingPrice: updatedAppointment.service.service_startingprice,
                    finalPrice: updatedAppointment.final_price
                };

                // Send completion email to customer
                await sendBookingCompletionToCustomer(updatedAppointment.customer.email, completionDetails);
                console.log(`✅ Completion email sent to customer: ${updatedAppointment.customer.email}`);

                // Send completion email to provider
                await sendBookingCompletionToProvider(updatedAppointment.serviceProvider.provider_email, completionDetails);
                console.log(`✅ Completion email sent to provider: ${updatedAppointment.serviceProvider.provider_email}`);

            } catch (emailError) {
                console.error('❌ Failed to send completion emails:', emailError);
                // Continue with response even if emails fail
            }
        }

        // If appointment is finished or canceled, free up the availability slot
        if (status === 'finished' || status === 'canceled') {
            const dayOfWeek = appointment.scheduled_date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const startTime = appointment.scheduled_date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            await prisma.availability.updateMany({
                where: {
                    provider_id: appointment.provider_id,
                    dayOfWeek: dayOfWeek,
                    startTime: startTime
                },
                data: { availability_isBooked: false }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Appointment status updated successfully',
            appointment: updatedAppointment
        });

    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating appointment status',
            error: error.message
        });
    }
};

// Get appointment details
export const getAppointmentDetails = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true
                    }
                },
                availability: {
                    select: {
                        availability_id: true,
                        dayOfWeek: true,
                        startTime: true,
                        endTime: true,
                        availability_isActive: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true,
                        service_startingprice: true
                    }
                }
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Format response with slot details at root level for easier access
        const formattedAppointment = {
            ...appointment,
            slot_start_time: appointment.availability?.startTime || null,
            slot_end_time: appointment.availability?.endTime || null,
            slot_day_of_week: appointment.availability?.dayOfWeek || null
        };

        res.status(200).json({
            success: true,
            message: 'Appointment details retrieved successfully',
            appointment: formattedAppointment
        });

    } catch (error) {
        console.error('Error getting appointment details:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving appointment details',
            error: error.message
        });
    }
};

// Get provider's weekly availability days (which days they work)
export const getProviderWeeklyDays = async (req, res) => {
    try {
        const { providerId } = req.params;

        console.log('📅 Getting weekly availability days for provider:', providerId);

        // Get all active availability days for this provider
        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(providerId),
                availability_isActive: true
            },
            select: {
                dayOfWeek: true
            },
            distinct: ['dayOfWeek']
        });

        console.log('🔍 Provider available days:', availability);

        const availableDays = availability.map(slot => slot.dayOfWeek);

        res.json({
            success: true,
            data: {
                providerId: parseInt(providerId),
                availableDays,
                availability
            }
        });

    } catch (error) {
        console.error('❌ Error getting provider weekly days:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get provider availability days',
            error: error.message
        });
    }
};

// Enhanced function to get customer bookings with detailed information
export const getCustomerBookingsDetailed = async (req, res) => {
    try {
        const userId = req.userId; // Fixed: use req.userId instead of req.user.userId

        const appointments = await prisma.appointment.findMany({
            where: { customer_id: userId },
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_phone_number: true,
                        provider_email: true,
                        provider_profile_photo: true,
                        provider_rating: true,
                        provider_location: true,
                        provider_exact_location: true
                    }
                },
                service: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true,
                        service_startingprice: true,
                        service_picture: true
                    }
                },
                availability: {
                    select: {
                        startTime: true,
                        endTime: true,
                        dayOfWeek: true
                    }
                }
            },
            orderBy: {
                scheduled_date: 'desc'
            }
        });

        // Format the appointments for frontend use
        const formattedAppointments = appointments.map(appointment => {
            const canCancel = ['pending', 'accepted', 'approved', 'confirmed'].includes(appointment.appointment_status);
            
            const canCall = ['accepted', 'approved', 'confirmed', 'on the way', 'in progress'].includes(appointment.appointment_status);

            return {
                appointment_id: appointment.appointment_id,
                scheduled_date: appointment.scheduled_date,
                appointment_status: appointment.appointment_status,
                repairDescription: appointment.repairDescription,
                final_price: appointment.final_price,
                created_at: appointment.created_at,
                service: {
                    service_id: appointment.service.service_id,
                    title: appointment.service.service_title,
                    description: appointment.service.service_description,
                    startingPrice: appointment.service.service_startingprice,
                    picture: appointment.service.service_picture
                },
                provider: {
                    provider_id: appointment.serviceProvider.provider_id,
                    name: `${appointment.serviceProvider.provider_first_name} ${appointment.serviceProvider.provider_last_name}`,
                    phone_number: appointment.serviceProvider.provider_phone_number,
                    email: appointment.serviceProvider.provider_email,
                    profile_photo: appointment.serviceProvider.provider_profile_photo,
                    rating: appointment.serviceProvider.provider_rating,
                    location: appointment.serviceProvider.provider_location,
                    exact_location: appointment.serviceProvider.provider_exact_location
                },
                timeSlot: {
                    startTime: appointment.availability.startTime,
                    endTime: appointment.availability.endTime,
                    dayOfWeek: appointment.availability.dayOfWeek
                },
                actions: {
                    canCancel,
                    canCall
                }
            };
        });

        res.status(200).json({
            success: true,
            appointments: formattedAppointments,
            count: formattedAppointments.length
        });

    } catch (err) {
        console.error('Error fetching customer bookings:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error while fetching bookings' 
        });
    }
};

// Enhanced cancel appointment function with better status checks
export const cancelAppointmentEnhanced = async (req, res) => {
    try {
        const { appointment_id } = req.params;
        const userId = req.userId; // Fixed: use req.userId instead of req.user.userId

        // First, verify the appointment exists and belongs to the customer
        const existingAppointment = await prisma.appointment.findFirst({
            where: {
                appointment_id: parseInt(appointment_id),
                customer_id: userId
            },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_phone_number: true,
                        provider_email: true
                    }
                },
                service: {
                    select: {
                        service_title: true
                    }
                }
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({ 
                success: false,
                message: 'Appointment not found or you do not have permission to cancel this appointment' 
            });
        }

        // Check if appointment can be cancelled based on status
        const cancellableStatuses = ['pending', 'approved', 'accepted', 'confirmed'];
        if (!cancellableStatuses.includes(existingAppointment.appointment_status)) {
            return res.status(400).json({ 
                success: false,
                message: `Cannot cancel appointment. Current status: ${existingAppointment.appointment_status}. Only pending, approved, accepted, and confirmed appointments can be cancelled.` 
            });
        }

        // Get cancellation reason from request body
        const { cancellation_reason } = req.body;

        // Update appointment status to cancelled
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointment_id) },
            data: { 
                appointment_status: 'cancelled',
                cancellation_reason: cancellation_reason || 'No reason provided'
            }
        });

        // Auto-detect penalty violations for cancellation patterns
        try {
            const customerId = userId;
            
            // Check for late cancellation (< 2 hours before appointment)
            await PenaltyService.detectLateCancellation(customerId, parseInt(appointment_id));
            
            // Check for multiple cancellations on the same day
            await PenaltyService.detectMultipleCancellationsSameDay(customerId);
            
            // Check for consecutive day cancellations
            await PenaltyService.detectConsecutiveDayCancellations(customerId);
            
            console.log('✅ Penalty violation checks completed for customer:', customerId);
        } catch (penaltyError) {
            console.error('❌ Error checking penalty violations:', penaltyError);
            // Don't fail the cancellation if penalty check fails
        }

        // Send email notifications to both customer and service provider
        try {
            const customerName = `${existingAppointment.customer.first_name} ${existingAppointment.customer.last_name}`;
            const providerName = `${existingAppointment.serviceProvider.provider_first_name} ${existingAppointment.serviceProvider.provider_last_name}`;
            
            const cancellationDetails = {
                customerName,
                serviceTitle: existingAppointment.service.service_title,
                providerName,
                scheduledDate: existingAppointment.scheduled_date,
                appointmentId: existingAppointment.appointment_id,
                cancellationReason: cancellation_reason || 'No reason provided'
            };

            // Send cancellation email to provider
            await sendBookingCancellationEmail(existingAppointment.serviceProvider.provider_email, cancellationDetails);
            console.log(`✅ Cancellation email sent to provider: ${existingAppointment.serviceProvider.provider_email}`);

            // Send cancellation email to customer
            await sendBookingCancellationToCustomer(existingAppointment.customer.email, cancellationDetails);
            console.log(`✅ Cancellation email sent to customer: ${existingAppointment.customer.email}`);

        } catch (emailError) {
            console.error('❌ Failed to send cancellation emails:', emailError);
            // Continue with the response even if emails fail
        }

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            appointment: {
                appointment_id: updatedAppointment.appointment_id,
                status: updatedAppointment.appointment_status,
                provider_name: `${existingAppointment.serviceProvider.provider_first_name} ${existingAppointment.serviceProvider.provider_last_name}`,
                scheduled_date: existingAppointment.scheduled_date
            }
        });

    } catch (err) {
        console.error('Error cancelling appointment:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error while cancelling appointment' 
        });
    }
};

// Check phone number availability
export const checkPhoneAvailability = async (req, res) => {
    const { phoneNumber, userId } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        // Check if phone number is already in use by another customer
        const existingCustomer = await prisma.user.findFirst({
            where: { 
                phone_number: phoneNumber,
                ...(userId && { user_id: { not: parseInt(userId) } })
            }
        });

        if (existingCustomer) {
            return res.status(400).json({ message: 'Phone number is used' });
        }
        res.status(200).json({ message: 'Phone number is available' });

    } catch (err) {
        console.error('Error checking phone availability:', err);
        res.status(500).json({ message: 'Server error checking phone availability' });
    }
};

/**
 * @swagger
 * /auth/customer-profile:
 *   get:
 *     summary: Get authenticated customer profile data
 *     tags: [Customer Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     full_name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone_number:
 *                       type: string
 *                     profile_photo:
 *                       type: string
 *                       nullable: true
 *                     user_location:
 *                       type: string
 *                       nullable: true
 *                     exact_location:
 *                       type: string
 *                       nullable: true
 *                     birthday:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     is_activated:
 *                       type: boolean
 *                     is_verified:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
export const getCustomerProfile = async (req, res) => {
    try {
        // Use the user ID from the authentication middleware
        const userId = req.userId;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID not found in session' 
            });
        }

        const customer = await prisma.user.findUnique({
            where: { user_id: parseInt(userId) },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                userName: true,
                email: true,
                phone_number: true,
                profile_photo: true,
                valid_id: true,
                user_location: true,
                exact_location: true,
                birthday: true,
                is_activated: true,
                is_verified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                created_at: true
            }
        });

        if (!customer) {
            return res.status(404).json({ 
                success: false,
                message: 'Customer not found' 
            });
        }

        // Format the response data
        const profileData = {
            user_id: customer.user_id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            full_name: `${customer.first_name} ${customer.last_name}`,
            userName: customer.userName,
            email: customer.email,
            phone_number: customer.phone_number,
            profile_photo: customer.profile_photo,
            user_location: customer.user_location,
            exact_location: customer.exact_location,
            birthday: customer.birthday,
            is_activated: customer.is_activated,
            is_verified: customer.is_verified,
            verification_status: customer.verification_status,
            rejection_reason: customer.rejection_reason,
            verification_submitted_at: customer.verification_submitted_at,
            verification_reviewed_at: customer.verification_reviewed_at,
            created_at: customer.created_at
        };

        res.status(200).json({
            success: true,
            message: 'Customer profile retrieved successfully',
            data: profileData
        });

    } catch (error) {
        console.error('Error fetching customer profile:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message 
        });
    }
};

/**
 * Get customer's booking availability status
 * Returns how many appointment slots are available for booking
 */
export const getCustomerBookingAvailability = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware

        // Count scheduled appointments (statuses that count toward the limit)
        // Only 'scheduled' status counts toward the 3-appointment limit
        // Other statuses don't count: 'on the way', 'in-progress', 'finished', 'completed', 'cancelled'

        // DEBUG: Get all appointments for this customer to see actual statuses
        const allAppointments = await prisma.appointment.findMany({
            where: { customer_id: userId },
            select: {
                appointment_id: true,
                appointment_status: true,
                scheduled_date: true
            }
        });
        
        const scheduledCount = await prisma.appointment.count({
            where: {
                customer_id: userId,
                appointment_status: 'scheduled'  // Only count 'scheduled' status
            }
        });

        const maxAllowed = 3;
        const availableSlots = maxAllowed - scheduledCount;
        const canBook = scheduledCount < maxAllowed;

        // Get the scheduled appointments details
        const scheduledAppointments = await prisma.appointment.findMany({
            where: {
                customer_id: userId,
                appointment_status: { in: ['scheduled', 'in-progress'] }  // Only fetch 'scheduled' and 'ongoing' status
            },
            select: {
                appointment_id: true,
                appointment_status: true,
                scheduled_date: true,
                service: {
                    select: {
                        service_title: true,
                        service_startingprice: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_exact_location: true
                    }
                }
            },
            orderBy: {
                scheduled_date: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            message: 'Booking availability retrieved successfully',
            data: {
                canBook,
                scheduledCount,
                maxAllowed,
                availableSlots,
                message: canBook 
                    ? `You can book ${availableSlots} more appointment${availableSlots !== 1 ? 's' : ''}`
                    : 'Booking limit reached. Please wait for an appointment to be completed or cancelled.',
                scheduledAppointments: scheduledAppointments.map(apt => ({
                    appointment_id: apt.appointment_id,
                    status: apt.appointment_status,
                    scheduled_date: apt.scheduled_date,
                    service_startingprice: apt.service?.service_startingprice,
                    service_title: apt.service?.service_title,
                    provider_name: `${apt.serviceProvider?.provider_first_name} ${apt.serviceProvider?.provider_last_name}`,
                    provider_exact_location: apt.serviceProvider?.provider_exact_location
                }))
            }
        });

    } catch (error) {
        console.error('Error getting booking availability:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Step 1: Request OTP for profile update
 * Sends OTP to customer's current email
 */
export const requestCustomerProfileUpdateOTP = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware

        // Get customer's current email
        const customer = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { email: true, first_name: true }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await prisma.oTPVerification.create({
            data: {
                email: customer.email,
                otp: otp,
                expires_at: expiresAt
            }
        });

        // Send OTP via email
        await sendOTPEmail(customer.email, otp);

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email. Please verify to proceed with profile update.',
            email: customer.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Masked email
        });

    } catch (error) {
        console.error('Error requesting profile update OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
};

/**
 * Step 2: Verify OTP and update customer profile
 * Updates phone_number, email, user_location, and exact_location
 */
export const verifyOTPAndUpdateCustomerProfile = async (req, res) => {
    try {
        const userId = req.userId; // From auth middleware
        const { otp, phone_number, email, user_location, exact_location } = req.body;

        // Validate OTP is provided
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        // Validate at least one field is provided for update
        if (!phone_number && !email && !user_location && !exact_location) {
            return res.status(400).json({
                success: false,
                message: 'At least one field (phone_number, email, user_location, or exact_location) is required'
            });
        }

        // Get customer's current email
        const customer = await prisma.user.findUnique({
            where: { user_id: userId }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Verify OTP
        const verificationResult = await verifyOTP(customer.email, otp);

        if (!verificationResult.success) {
            return res.status(400).json({
                success: false,
                message: verificationResult.message
            });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== customer.email) {
            const emailExists = await prisma.user.findFirst({
                where: { 
                    email: email,
                    user_id: { not: userId }
                }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already registered to another account'
                });
            }

            // Also check in provider table
            const providerEmailExists = await prisma.serviceProviderDetails.findFirst({
                where: { provider_email: email }
            });

            if (providerEmailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already registered as a service provider'
                });
            }
        }

        // Check if phone number is being changed and if it's already taken
        if (phone_number && phone_number !== customer.phone_number) {
            const phoneExists = await prisma.user.findFirst({
                where: { 
                    phone_number: phone_number,
                    user_id: { not: userId }
                }
            });

            if (phoneExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is already registered to another account'
                });
            }

            // Also check in provider table
            const providerPhoneExists = await prisma.serviceProviderDetails.findFirst({
                where: { provider_phone_number: phone_number }
            });

            if (providerPhoneExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is already registered as a service provider'
                });
            }
        }

        // Prepare update data
        const updateData = {};

        if (phone_number) {
            updateData.phone_number = phone_number;
        }

        if (email) {
            updateData.email = email;
        }

        if (user_location) {
            updateData.user_location = user_location;
        }

        if (exact_location) {
            updateData.exact_location = exact_location;
        }

        // Update customer profile
        const updatedCustomer = await prisma.user.update({
            where: { user_id: userId },
            data: updateData,
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                userName: true,
                email: true,
                phone_number: true,
                user_location: true,
                exact_location: true,
                profile_photo: true
            }
        });

        // Clean up used OTP
        await cleanupOTP(customer.email);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedCustomer
        });

    } catch (error) {
        console.error('Error updating customer profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

/**
 * Customer reports provider no-show
 * Can report if scheduled appointment hasn't been updated past its time slot
 * Requires: photo evidence and description
 */
export const reportProviderNoShow = async (req, res) => {
    try {
        const customerId = req.userId; // From auth middleware
        const { appointmentId } = req.params;
        const { description } = req.body;

        console.log('🚫 Customer reporting provider no-show:', {
            customerId,
            appointmentId,
            hasPhoto: !!req.file,
            description
        });

        // Validate required fields
        if (!description || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Photo evidence and description are required to report a no-show'
            });
        }

        // Get appointment details with availability info
        const appointment = await prisma.appointment.findFirst({
            where: {
                appointment_id: parseInt(appointmentId),
                customer_id: customerId
            },
            include: {
                customer: {
                    select: {
                        first_name: true,
                        last_name: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true
                    }
                },
                service: {
                    select: {
                        service_title: true
                    }
                },
                availability: {
                    select: {
                        startTime: true,
                        endTime: true
                    }
                }
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found or does not belong to you'
            });
        }

        // Check if appointment is still in "scheduled" status
        if (appointment.appointment_status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: `Cannot report no-show. Appointment must be in "scheduled" status. Current status: ${appointment.appointment_status}`
            });
        }

        // Check if the scheduled time has passed
        const now = new Date();
        const scheduledDate = new Date(appointment.scheduled_date);
        
        // Get the end time from availability slot
        const endTime = appointment.availability?.endTime;
        if (!endTime) {
            return res.status(400).json({
                success: false,
                message: 'Cannot determine appointment end time'
            });
        }

        // Parse end time (HH:MM format) and add to scheduled date
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const appointmentEndTime = new Date(scheduledDate);
        appointmentEndTime.setHours(endHour, endMinute, 0, 0);

        console.log('⏱️ Time check:', {
            scheduledDate: scheduledDate.toISOString(),
            appointmentEndTime: appointmentEndTime.toISOString(),
            currentTime: now.toISOString(),
            timeSlot: `${appointment.availability.startTime} - ${endTime}`,
            hasTimePassed: now > appointmentEndTime
        });

        // Check if current time is past the appointment end time
        if (now <= appointmentEndTime) {
            return res.status(400).json({
                success: false,
                message: `Cannot report no-show yet. The appointment time slot has not ended. Appointment ends at ${appointmentEndTime.toLocaleString()}`,
                appointmentEndTime: appointmentEndTime.toISOString(),
                currentTime: now.toISOString()
            });
        }

        // Upload photo evidence to Cloudinary
        let evidencePhotoUrl;
        try {
            evidencePhotoUrl = await uploadToCloudinary(req.file.buffer, 'no-show-evidence');
            console.log('✅ Evidence photo uploaded:', evidencePhotoUrl);
        } catch (uploadError) {
            console.error('❌ Error uploading evidence photo:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload evidence photo'
            });
        }

        // Update appointment status to provider_no_show
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: {
                appointment_status: 'provider_no_show',
                cancellation_reason: `Customer reported provider no-show: ${description}`
            }
        });

        // Record no-show violation for provider
        try {
            await PenaltyService.detectProviderNoShow(parseInt(appointmentId));
            console.log('✅ Penalty violations checked for provider:', appointment.serviceProvider.provider_id);
        } catch (penaltyError) {
            console.error('❌ Error recording provider no-show penalty:', penaltyError);
            // Continue even if penalty recording fails
        }

        // Create a no-show report record
        const noShowReport = {
            appointment_id: appointment.appointment_id,
            reported_by: 'customer',
            reporter_id: customerId,
            evidence_photo: evidencePhotoUrl,
            description: description,
            reported_at: new Date(),
            time_past_appointment: Math.floor((now - appointmentEndTime) / (1000 * 60))
        };

        console.log('📝 No-show report created:', noShowReport);

        res.status(200).json({
            success: true,
            message: 'Provider no-show reported successfully',
            data: {
                appointment: {
                    appointment_id: updatedAppointment.appointment_id,
                    status: updatedAppointment.appointment_status,
                    provider_name: `${appointment.serviceProvider.provider_first_name} ${appointment.serviceProvider.provider_last_name}`,
                    service: appointment.service.service_title,
                    scheduled_date: appointment.scheduled_date,
                    time_slot: `${appointment.availability.startTime} - ${appointment.availability.endTime}`
                },
                report: noShowReport
            }
        });

    } catch (error) {
        console.error('❌ Error reporting provider no-show:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report no-show',
            error: error.message
        });
    }
};






