import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail, sendAppointmentStatusUpdateEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword, verifyOTP, cleanupOTP } from '../services/otpUtils.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { checkForgotPasswordRateLimit, recordForgotPasswordAttempt, resetForgotPasswordAttempts } from '../services/rateLimitUtils.js';

const prisma = new PrismaClient();

// Helper function to convert time string (HH:MM) to minutes
const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

// Helper function to convert minutes back to time string (HH:MM)
const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * @swagger
 * /auth/provider/send-otp:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Step 1 - Send OTP to provider email
 *     description: Generates a 6-digit OTP and sends it to the service provider's email. OTP expires in 5 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *             properties:
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: "provider@example.com"
 *                 description: Service provider's email address
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
 *                   example: "OTP sent to provider email successfully"
 *       400:
 *         description: Bad request - Provider already exists or email invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provider already exists with this email"
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
// Step 1: Send OTP for service provider registration
export const sendProviderOTP = async (req, res) => {
    const { provider_email } = req.body;

    // Validate input
    if (!provider_email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        // Check if provider already exists
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (existingProvider) {
            return res.status(400).json({ message: 'Provider already exists with this email' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Check if OTP already exists for this email
        const existingOTP = await prisma.oTPVerification.findFirst({ where: { email: provider_email } });
        
        if (existingOTP) {
            // Update existing OTP record
            await prisma.oTPVerification.updateMany({
                where: { email: provider_email },
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
                    email: provider_email,
                    otp,
                    expires_at: expiresAt,
                    verified: false
                }
            });
        }

        // Send OTP email
        await sendOTPEmail(provider_email, otp);
        
        res.status(200).json({ message: 'OTP sent to provider email successfully' });
    } catch (err) {
        console.error('Send provider OTP error:', err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

/**
 * @swagger
 * /auth/provider/check-phone:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Check if provider phone number is unique
 *     description: Validates if the phone number is available for provider registration (not already in use)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_phone_number
 *             properties:
 *               provider_phone_number:
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
export const checkProviderPhoneUnique = async (req, res) => {
    const { provider_phone_number } = req.body;

    if (!provider_phone_number) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    try {
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ 
            where: { provider_phone_number } 
        });

        if (existingProvider) {
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
        console.error('Check provider phone uniqueness error:', err);
        res.status(500).json({ message: 'Error checking phone number' });
    }
};

/**
 * @swagger
 * /auth/provider/check-username:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Check if provider username is unique
 *     description: Validates if the username is available for provider registration (not already in use)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_userName
 *             properties:
 *               provider_userName:
 *                 type: string
 *                 example: "johndoe_provider"
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
export const checkProviderUsernameUnique = async (req, res) => {
    const { provider_userName } = req.body;

    if (!provider_userName) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ 
            where: { provider_userName } 
        });

        if (existingProvider) {
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
        console.error('Check provider username uniqueness error:', err);
        res.status(500).json({ message: 'Error checking username' });
    }
};

/**
 * @swagger
 * /auth/provider/verify-otp:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Step 2 - Verify OTP code
 *     description: Validates the OTP code sent to provider's email and marks it as verified
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *               - otp
 *             properties:
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: "provider@example.com"
 *                 description: Service provider's email address
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
// Step 2: Verify OTP for service provider registration
export const verifyProviderOTP = async (req, res) => {
    const { provider_email, otp } = req.body;

    // Validate input
    if (!provider_email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        // Find OTP record
        const otpRecord = await prisma.oTPVerification.findFirst({ 
            where: { email: provider_email }
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
            where: { email: provider_email },
            data: { verified: true }
        });

        res.status(200).json({ 
            message: 'Email verified successfully. You can now proceed to registration.',
            verified: true
        });

    } catch (err) {
        console.error('Verify provider OTP error:', err);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

// Legacy endpoint for backward compatibility - kept for existing integrations
export const requestProviderOTP = sendProviderOTP;

/**
 * @swagger
 * /auth/provider/register:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Step 3 - Register service provider account
 *     description: Creates a new service provider account after email verification. Requires OTP to be verified first. Automatically uploads files to Cloudinary.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *               - provider_password
 *               - provider_first_name
 *               - provider_last_name
 *               - provider_userName
 *               - provider_phone_number
 *               - provider_uli
 *             properties:
 *               provider_first_name:
 *                 type: string
 *                 example: "Jane"
 *               provider_last_name:
 *                 type: string
 *                 example: "Smith"
 *               provider_userName:
 *                 type: string
 *                 example: "janesmith"
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: "provider@example.com"
 *               provider_password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass123"
 *               provider_phone_number:
 *                 type: string
 *                 example: "+1234567890"
 *               provider_uli:
 *                 type: string
 *                 example: "ULI1234"
 *                 description: Unique Learner Identifier (4 digits)
 *               provider_birthday:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               provider_location:
 *                 type: string
 *                 example: "New York"
 *               provider_exact_location:
 *                 type: string
 *                 example: "123 Main St, New York, NY 10001"
 *               provider_profile_photo:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo image file (max 5MB)
 *               provider_valid_id:
 *                 type: string
 *                 format: binary
 *                 description: Valid ID image file (max 5MB)
 *               certificateFile:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Certificate files (max 10 files, 10MB each)
 *               certificateNames:
 *                 type: string
 *                 example: '["Certificate 1", "Certificate 2"]'
 *                 description: JSON array of certificate names
 *               certificateNumbers:
 *                 type: string
 *                 example: '["CERT001", "CERT002"]'
 *                 description: JSON array of certificate numbers
 *               expiryDates:
 *                 type: string
 *                 example: '["2025-12-31", "2026-06-30"]'
 *                 description: JSON array of expiry dates
 *               professions:
 *                 type: string
 *                 example: '["Plumber", "Electrician"]'
 *                 description: JSON array of professions
 *               experiences:
 *                 type: string
 *                 example: '["5 years", "3 years"]'
 *                 description: JSON array of experience durations
 *     responses:
 *       201:
 *         description: Service provider registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service provider registered successfully"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 providerId:
 *                   type: integer
 *                   example: 123
 *                 providerUserName:
 *                   type: string
 *                   example: "janesmith"
 *                 provider_profile_photo:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../profile.jpg"
 *                 provider_valid_id:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../id.jpg"
 *                 certificates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       certificate_id:
 *                         type: integer
 *                       certificate_name:
 *                         type: string
 *                       certificate_file_path:
 *                         type: string
 *                 professions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       profession:
 *                         type: string
 *                       experience:
 *                         type: string
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
 *                     - "Provider already exists"
 *                     - "Phone number is already registered with another provider account"
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
 *                   example: "Server error during provider registration"
 */
// Step 3: Register service provider after email verification
export const registerServiceProvider = async (req, res) => {
    try {
        console.log('Provider registration request received');
        console.log('Request body keys:', Object.keys(req.body));
        console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
        
        const {
            provider_first_name,
            provider_last_name,
            provider_password,
            provider_userName,
            provider_email,
            provider_birthday,
            provider_phone_number,
            provider_location,
            provider_exact_location,
            provider_uli,
            certificateNames,
            certificateNumbers,
            expiryDates,
            professions, // New field for professions
            experiences  // New field for experiences
        } = req.body;

        console.log('Provider registration data:', {
            provider_email,
            provider_userName,
            provider_first_name,
            provider_last_name,
            provider_birthday,
            provider_phone_number,
            provider_location,
            provider_uli,
            certificateNames,
            certificateNumbers,
            expiryDates,
            professions,
            experiences
        });

        // Validate required fields
        if (!provider_email || !provider_password || !provider_first_name || !provider_last_name || 
            !provider_userName || !provider_phone_number || !provider_uli) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        // Check if email is verified
        const otpRecord = await prisma.oTPVerification.findFirst({ 
            where: { email: provider_email }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: 'Email not found. Please verify your email first.' });
        }

        if (!otpRecord.verified) {
            return res.status(400).json({ message: 'Email not verified. Please verify your email before registering.' });
        }

        // Check if provider already exists (prevent duplicate registration)
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (existingProvider) {
            return res.status(400).json({ message: 'Provider already exists' });
        }

        // Check for duplicate phone number
        const existingPhoneProvider = await prisma.serviceProviderDetails.findFirst({ 
            where: { provider_phone_number: provider_phone_number } 
        });
        if (existingPhoneProvider) {
            return res.status(400).json({ message: 'Phone number is already registered with another provider account' });
        }

        // Parse certificate data if it's JSON
        let parsedCertificateNames, parsedCertificateNumbers, parsedExpiryDates;
        let parsedProfessions, parsedExperiences;
        
        console.log('Raw professions received:', professions);
        console.log('Raw experiences received:', experiences);
        console.log('Type of professions:', typeof professions);
        console.log('Type of experiences:', typeof experiences);
        
        try {
            parsedCertificateNames = typeof certificateNames === 'string' ? JSON.parse(certificateNames) : certificateNames;
            parsedCertificateNumbers = typeof certificateNumbers === 'string' ? JSON.parse(certificateNumbers) : certificateNumbers;
            parsedExpiryDates = typeof expiryDates === 'string' ? JSON.parse(expiryDates) : expiryDates;
            parsedProfessions = typeof professions === 'string' ? JSON.parse(professions) : professions;
            parsedExperiences = typeof experiences === 'string' ? JSON.parse(experiences) : experiences;
        } catch (e) {
            console.log('Error parsing JSON, using raw values:', e.message);
            parsedCertificateNames = certificateNames;
            parsedCertificateNumbers = certificateNumbers;
            parsedExpiryDates = expiryDates;
            parsedProfessions = professions;
            parsedExperiences = experiences;
        }
        
        console.log('Parsed professions:', parsedProfessions);
        console.log('Parsed experiences:', parsedExperiences);
        console.log('Is parsedProfessions an array?', Array.isArray(parsedProfessions));

        // Handle file uploads to Cloudinary
        const profilePhotoFile = req.files && req.files['provider_profile_photo'] ? req.files['provider_profile_photo'][0] : null;
        const validIdFile = req.files && req.files['provider_valid_id'] ? req.files['provider_valid_id'][0] : null;
        // Support both 'certificateFile' and 'certificate_images' field names
        const certificateFiles = req.files && (req.files['certificateFile'] || req.files['certificate_images']) 
            ? (req.files['certificateFile'] || req.files['certificate_images']) 
            : [];

        let provider_profile_photo = null;
        let provider_valid_id = null;

        try {
            // Upload profile photo
            if (profilePhotoFile) {
                provider_profile_photo = await uploadToCloudinary(
                    profilePhotoFile.buffer, 
                    'fixmo/provider-profiles',
                    `provider_profile_${provider_email.replace('@', '_').replace('.', '_')}_${Date.now()}`
                );
            }

            // Upload valid ID
            if (validIdFile) {
                provider_valid_id = await uploadToCloudinary(
                    validIdFile.buffer, 
                    'fixmo/provider-ids',
                    `provider_id_${provider_email.replace('@', '_').replace('.', '_')}_${Date.now()}`
                );
            }
        } catch (uploadError) {
            console.error('Error uploading images to Cloudinary:', uploadError);
            return res.status(500).json({ message: 'Error uploading images. Please try again.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(provider_password, 10);

        // Create new provider
        const newProvider = await prisma.serviceProviderDetails.create({
            data: {
                provider_first_name,
                provider_last_name,
                provider_password: hashedPassword,
                provider_userName,
                provider_email,
                provider_birthday: provider_birthday ? new Date(provider_birthday) : null,
                provider_phone_number,
                provider_profile_photo: provider_profile_photo,
                provider_valid_id: provider_valid_id,
                provider_location: provider_location || null,
                provider_exact_location: provider_exact_location || null,
                provider_uli
            }
        });

        // Create certificates if provided
        const createdCertificates = [];
        if (certificateFiles && certificateFiles.length > 0) {
            for (let i = 0; i < certificateFiles.length; i++) {
                const certificateFile = certificateFiles[i];
                const certificateName = Array.isArray(parsedCertificateNames) ? parsedCertificateNames[i] : parsedCertificateNames;
                const certificateNumber = Array.isArray(parsedCertificateNumbers) ? parsedCertificateNumbers[i] : parsedCertificateNumbers;
                const expiryDate = Array.isArray(parsedExpiryDates) ? parsedExpiryDates[i] : parsedExpiryDates;

                if (certificateName && certificateNumber && certificateFile) {
                    try {
                        // Check if certificate number already exists
                        const existingCert = await prisma.certificate.findUnique({
                            where: { certificate_number: certificateNumber }
                        });

                        if (existingCert) {
                            console.log(`Skipping certificate ${certificateNumber} - already exists`);
                            continue; // Skip this certificate
                        }

                        // Upload certificate to Cloudinary
                        const certificateUrl = await uploadToCloudinary(
                            certificateFile.buffer, 
                            'fixmo/certificates',
                            `certificate_${provider_email.replace('@', '_').replace('.', '_')}_${certificateName.replace(/\s+/g, '_')}_${Date.now()}`
                        );

                        const certificate = await prisma.certificate.create({
                            data: {
                                certificate_name: certificateName,
                                certificate_number: certificateNumber,
                                certificate_file_path: certificateUrl,
                                expiry_date: expiryDate ? new Date(expiryDate) : null,
                                provider_id: newProvider.provider_id
                            }
                        });
                        createdCertificates.push(certificate);
                    } catch (certUploadError) {
                        console.error('Error uploading certificate to Cloudinary:', certUploadError);
                        // Continue with other certificates but log the error
                    }
                }
            }
        }

        // Create provider professions if provided
        const createdProfessions = [];
        console.log('Starting profession creation...');
        console.log('parsedProfessions:', parsedProfessions);
        console.log('Is array?', Array.isArray(parsedProfessions));
        
        if (parsedProfessions && Array.isArray(parsedProfessions)) {
            console.log('Processing', parsedProfessions.length, 'professions');
            for (let i = 0; i < parsedProfessions.length; i++) {
                const profession = parsedProfessions[i];
                const experience = Array.isArray(parsedExperiences) ? parsedExperiences[i] : parsedExperiences;
                
                console.log(`Processing profession ${i}:`, profession);
                console.log(`Processing experience ${i}:`, experience);
                
                // Ensure profession is a string and not empty
                const professionStr = typeof profession === 'string' ? profession : String(profession);
                const experienceStr = typeof experience === 'string' ? experience : String(experience);
                
                if (professionStr && professionStr.trim()) {
                    try {
                        console.log('Creating profession in database...');
                        const providerProfession = await prisma.providerProfession.create({
                            data: {
                                provider_id: newProvider.provider_id,
                                profession: professionStr.trim(),
                                experience: experienceStr ? experienceStr.trim() : '0 years'
                            }
                        });
                        console.log('Profession created successfully:', providerProfession);
                        createdProfessions.push(providerProfession);
                    } catch (professionError) {
                        console.error('Error creating profession:', professionError);
                        // Continue with other professions but log the error
                    }
                } else {
                    console.log('Skipping empty profession at index', i);
                }
            }
        } else {
            console.log('No professions to process or not an array');
        }
        
        console.log('Final createdProfessions:', createdProfessions);
        
        // Delete the used OTP record
        await prisma.oTPVerification.deleteMany({ where: { email: provider_email } });

        // Send registration success email
        await sendRegistrationSuccessEmail(provider_email, provider_first_name, provider_userName);
        
        // Generate JWT token for immediate login after registration
        const token = jwt.sign(
            { 
                userId: newProvider.provider_id,
                id: newProvider.provider_id,
                providerId: newProvider.provider_id,
                userType: 'provider',
                email: newProvider.provider_email
            }, 
            process.env.JWT_SECRET || 'your-secret-key', 
            { expiresIn: '30d' } // 30 days for mobile app
        );
        
        res.status(201).json({ 
            message: 'Service provider registered successfully',
            token,
            providerId: newProvider.provider_id,
            providerUserName: newProvider.provider_userName,
            provider_profile_photo: provider_profile_photo,
            provider_valid_id: provider_valid_id,
            certificates: createdCertificates,
            professions: createdProfessions
        });

    } catch (err) {
        console.error('Provider registration error:', err);
        res.status(500).json({ message: 'Server error during provider registration' });
    }
};

// Legacy endpoint for backward compatibility - kept for existing integrations
export const verifyProviderOTPAndRegister = registerServiceProvider;

// Service provider login
export const providerLogin = async (req, res) => {
    const { provider_email, provider_password } = req.body;
    try {
        const provider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (!provider) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(provider_password, provider.provider_password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        // Create JWT token
        const token = jwt.sign(
            { 
                userId: provider.provider_id, // Use userId to match middleware expectation
                id: provider.provider_id,
                providerId: provider.provider_id,
                userType: 'provider',
                email: provider.provider_email
            }, 
            process.env.JWT_SECRET || 'your-secret-key', 
            { expiresIn: '30d' } // 30 days for mobile app
        );

        // Create session (only if sessions are enabled)
        if (req.session) {
            req.session.provider = {
                id: provider.provider_id,
                email: provider.provider_email,
                userName: provider.provider_userName,
                firstName: provider.provider_first_name,
                lastName: provider.provider_last_name,
                loginTime: new Date()
            };
        }

        // Prepare response
        const responseData = {
            success: true,
            message: 'Login successful',
            token,
            providerId: provider.provider_id,
            providerUserName: provider.provider_userName,
            userType: 'provider',
            provider: {
                id: provider.provider_id,
                firstName: provider.provider_first_name,
                lastName: provider.provider_last_name,
                email: provider.provider_email,
                userName: provider.provider_userName
            }
        };

        // Save session if it exists, otherwise respond immediately
        if (req.session && req.session.save) {
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ message: 'Session creation failed' });
                }
                res.status(200).json(responseData);
            });
        } else {
            // No session in production, just return JWT
            res.status(200).json(responseData);
        }
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

/**
 * @swagger
 * /auth/provider/forgot-password:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Step 1 - Request OTP for password reset
 *     description: Sends a 6-digit OTP to provider's email for password reset. Limited to 3 attempts per 30 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *             properties:
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: "provider@example.com"
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
 *         description: Provider not found
 *       429:
 *         description: Too many attempts
 *       500:
 *         description: Server error
 */
// PROVIDER: Step 1 - Request OTP for forgot password
export const requestProviderForgotPasswordOTP = async (req, res) => {
    const { provider_email } = req.body;
    
    if (!provider_email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    
    try {
        // Check rate limiting (3 attempts, 30-minute cooldown)
        const rateLimitCheck = await checkForgotPasswordRateLimit(provider_email);
        if (!rateLimitCheck.allowed) {
            return res.status(429).json({ 
                message: rateLimitCheck.message,
                remainingMinutes: rateLimitCheck.remainingMinutes
            });
        }
        
        // Check if provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({ 
            where: { provider_email } 
        });
        if (!provider) {
            return res.status(400).json({ message: 'No account found with this email' });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Store or update OTP
        const existingOTP = await prisma.oTPVerification.findFirst({ 
            where: { email: provider_email } 
        });
        
        if (existingOTP) {
            await prisma.oTPVerification.updateMany({
                where: { email: provider_email },
                data: {
                    otp,
                    expires_at: expiresAt,
                    verified: false
                }
            });
        } else {
            await prisma.oTPVerification.create({
                data: {
                    email: provider_email,
                    otp,
                    expires_at: expiresAt,
                    verified: false
                }
            });
        }
        
        // Send OTP email
        await sendOTPEmail(provider_email, otp, 'password reset');
        
        // Record attempt
        recordForgotPasswordAttempt(provider_email);
        
        res.status(200).json({ 
            message: 'Password reset OTP sent to your email',
            attemptsLeft: rateLimitCheck.attemptsLeft - 1
        });
        
    } catch (err) {
        console.error('Provider forgot password OTP error:', err);
        res.status(500).json({ message: 'Error processing password reset request' });
    }
};

/**
 * @swagger
 * /auth/provider/verify-forgot-password:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Step 2 - Verify OTP for password reset
 *     description: Verifies the OTP code sent to provider's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *               - otp
 *             properties:
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: "provider@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Server error
 */
// PROVIDER: Step 2 - Verify OTP (separate step)
export const verifyProviderForgotPasswordOTP = async (req, res) => {
    const { provider_email, otp } = req.body;
    
    if (!provider_email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    try {
        // Find OTP record
        const otpRecord = await prisma.oTPVerification.findFirst({ 
            where: { email: provider_email }
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
            where: { email: provider_email },
            data: { verified: true }
        });
        
        res.status(200).json({ 
            message: 'OTP verified. You can now reset your password.',
            verified: true
        });
        
    } catch (err) {
        console.error('Verify provider forgot password OTP error:', err);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

/**
 * @swagger
 * /auth/provider/reset-password:
 *   post:
 *     tags:
 *       - Service Provider Authentication
 *     summary: Step 3 - Reset password
 *     description: Resets provider password after OTP verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *               - newPassword
 *             properties:
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: "provider@example.com"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: OTP not verified or provider not found
 *       500:
 *         description: Server error
 */
// PROVIDER: Step 3 - Reset password after OTP verification
export const resetPasswordProvider = async (req, res) => {
    const { provider_email, newPassword } = req.body;
    
    if (!provider_email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required' });
    }
    
    try {
        // Check if OTP was verified
        const otpRecord = await prisma.oTPVerification.findFirst({ 
            where: { email: provider_email }
        });
        
        if (!otpRecord || !otpRecord.verified) {
            return res.status(400).json({ message: 'Please verify your OTP first' });
        }
        
        // Check if provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({ 
            where: { provider_email } 
        });
        if (!provider) {
            return res.status(400).json({ message: 'Provider not found' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await prisma.serviceProviderDetails.update({
            where: { provider_email },
            data: { provider_password: hashedPassword }
        });
        
        // Delete OTP record
        await prisma.oTPVerification.deleteMany({ where: { email: provider_email } });
        
        // Reset rate limiting for this email
        resetForgotPasswordAttempts(provider_email);
        
        res.status(200).json({ message: 'Password reset successfully' });
        
    } catch (err) {
        console.error('Reset provider password error:', err);
        res.status(500).json({ message: 'Error resetting password' });
    }
};

// LEGACY: Combined Step 2 - Verify OTP and reset password (for backward compatibility)
export const verifyProviderForgotPasswordOTPAndReset = async (req, res) => {
    await verifyOTPAndResetPassword({
        email: req.body.provider_email,
        otp: req.body.otp,
        newPassword: req.body.newPassword,
        userType: 'provider',
        updatePassword: async (email, hashedPassword) => await prisma.serviceProviderDetails.update({ where: { provider_email: email }, data: { provider_password: hashedPassword } }),
        notFoundMsg: 'Provider not found'
    }, res);
};


export const uploadCertificate = async (req, res) => {
    const { providerId } = req.params;
    const { certificate_name, certificate_number, expiry_date } = req.body;
    const certificate_file = req.file; // multer puts the file here

    if (!certificate_file) {
        return res.status(400).json({ message: 'No certificate file uploaded' });
    }

    try {
        const uploadedFilePath = certificate_file.path; // multer stores the file path

        const newCertificate = await prisma.certificate.create({
            data: {
                certificate_name,
                certificate_number,
                certificate_file_path: uploadedFilePath,
                expiry_date: expiry_date ? new Date(expiry_date) : null,
                provider_id: parseInt(providerId)
            }
        });

        res.status(201).json({ message: 'Certificate uploaded successfully', certificate: newCertificate });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error uploading certificate' });
    }
};


// Add a new service listing
// This function allows a service provider to create a new service listing

export const addServiceListing = async (req, res) => {
  const {
    provider_id,
    specific_service_id,
    service_title,
    service_description,
    service_price,
    category_id
  } = req.body;

  try {
    // Validate required fields
    if (!provider_id || !service_description || !service_price) {
      return res.status(400).json({ message: 'Provider ID, service description, and service price are required' });
    }

    // Verify the provider exists
    const provider = await prisma.serviceProviderDetails.findUnique({
      where: { provider_id: parseInt(provider_id) }
    });

    if (!provider) {
      return res.status(404).json({ message: 'Service provider not found' });
    }

    let serviceTitle = service_title;
    let specificService = null;

    // If specific_service_id is provided and not null, validate it and get the title
    if (specific_service_id && specific_service_id !== null && specific_service_id !== '') {
      specificService = await prisma.specificService.findUnique({
        where: { specific_service_id: parseInt(specific_service_id) }
      });

      if (!specificService) {
        return res.status(404).json({ message: 'Specific service not found' });
      }

      // Use the specific service title if available
      serviceTitle = specificService.specific_service_title;
    }

    // If no service title provided and no specific service, return error
    if (!serviceTitle) {
      return res.status(400).json({ message: 'Service title is required when no specific service is selected' });
    }

    // Handle service picture path
    let servicePicturePath = null;
    if (req.file) {
      // Store web-accessible path for database
      servicePicturePath = '/uploads/' + req.file.path.replace(/\\/g, '/').split('/uploads/')[1];
    }

    // Create the listing
    const listing = await prisma.serviceListing.create({
      data: {
        service_title: serviceTitle,
        service_description,
        service_startingprice: parseFloat(service_price),
        provider_id: parseInt(provider_id),
        service_picture: servicePicturePath
      }
    });

    // If we have a specific service, link it to the new listing
    if (specificService && specific_service_id) {
      await prisma.specificService.update({
        where: { specific_service_id: parseInt(specific_service_id) },
        data: {
          service_id: listing.service_id
        }
      });
    }

    return res.status(201).json({
      message: 'Service listing created successfully',
      listing
    });

  } catch (error) {
    console.error('Error creating service listing:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addAvailability = async (req, res) => {
    const { provider_id, dayOfWeek, startTime, endTime } = req.body;
    
    try {
        // Validate input
        if (!provider_id || !dayOfWeek || !startTime || !endTime) {
            return res.status(400).json({ message: 'Provider ID, day of week, start time, and end time are required' });
        }

        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });
    
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Validate dayOfWeek is valid
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(dayOfWeek)) {
            return res.status(400).json({ message: 'Invalid day of week. Must be one of: ' + validDays.join(', ') });
        }        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({ message: 'Invalid time format. Use HH:MM format (e.g., 09:00, 17:30)' });
        }

        // Validate that start time is before end time
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        
        if (startMinutes >= endMinutes) {
            return res.status(400).json({ message: 'Start time must be before end time' });
        }

        // Check for overlapping time slots for the same provider and day
        const existingAvailabilities = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek
            }
        });

        // Check for time overlaps
        for (const existing of existingAvailabilities) {
            const existingStartMinutes = timeToMinutes(existing.startTime);
            const existingEndMinutes = timeToMinutes(existing.endTime);
            
            // Check if new slot overlaps with existing slot
            if (
                (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) ||
                (startMinutes === existingStartMinutes || endMinutes === existingEndMinutes)
            ) {
                return res.status(400).json({ 
                    message: `Time slot overlaps with existing availability: ${existing.startTime} - ${existing.endTime}` 
                });
            }
        }
    
        // Create availability entry
        const availability = await prisma.availability.create({
            data: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek,
                startTime: startTime,
                endTime: endTime
            }
        });        res.status(201).json({ 
            message: 'Availability slot added successfully', 
            availability: {
                availability_id: availability.availability_id,
                dayOfWeek: availability.dayOfWeek,
                startTime: availability.startTime,
                endTime: availability.endTime,
                provider_id: availability.provider_id
            },
            note: 'You can add more time slots for the same day as long as they don\'t overlap'
        });
    } catch (error) {
        console.error('Error adding availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get availability for a provider
export const getProviderAvailability = async (req, res) => {
    const { provider_id } = req.params;
    
    try {
        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });
    
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Get all availability for the provider
        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(provider_id)
            },
            orderBy: {
                dayOfWeek: 'asc'
            }
        });
    
        res.status(200).json({ 
            message: 'Availability retrieved successfully', 
            provider_id: parseInt(provider_id),
            availability: availability
        });
    } catch (error) {
        console.error('Error getting availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update availability for a provider
export const updateAvailability = async (req, res) => {
    const { availability_id } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;
    
    try {
        // Validate input
        if (!dayOfWeek && !startTime && !endTime) {
            return res.status(400).json({ message: 'At least one field (dayOfWeek, startTime, endTime) is required to update' });
        }

        // Check if availability exists
        const existingAvailability = await prisma.availability.findUnique({
            where: { availability_id: parseInt(availability_id) }
        });

        if (!existingAvailability) {
            return res.status(404).json({ message: 'Availability not found' });
        }

        // Validate dayOfWeek if provided
        if (dayOfWeek) {
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(dayOfWeek)) {
                return res.status(400).json({ message: 'Invalid day of week. Must be one of: ' + validDays.join(', ') });
            }
        }

        // Validate time format if provided
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (startTime && !timeRegex.test(startTime)) {
            return res.status(400).json({ message: 'Invalid start time format. Use HH:MM format (e.g., 09:00, 17:30)' });
        }
        if (endTime && !timeRegex.test(endTime)) {
            return res.status(400).json({ message: 'Invalid end time format. Use HH:MM format (e.g., 09:00, 17:30)' });
        }

        // Prepare update data
        const updateData = {};
        if (dayOfWeek) updateData.dayOfWeek = dayOfWeek;
        if (startTime) updateData.startTime = startTime;
        if (endTime) updateData.endTime = endTime;
    
        // Update availability
        const updatedAvailability = await prisma.availability.update({
            where: { availability_id: parseInt(availability_id) },
            data: updateData
        });
    
        res.status(200).json({ 
            message: 'Availability updated successfully', 
            availability: updatedAvailability
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete availability for a provider
export const deleteAvailability = async (req, res) => {
    const { availability_id } = req.params;
    
    try {
        // Check if availability exists
        const existingAvailability = await prisma.availability.findUnique({
            where: { availability_id: parseInt(availability_id) }
        });

        if (!existingAvailability) {
            return res.status(404).json({ message: 'Availability not found' });
        }
    
        // Delete availability
        await prisma.availability.delete({
            where: { availability_id: parseInt(availability_id) }
        });
    
        res.status(200).json({ 
            message: 'Availability deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get available time slots for a specific provider and day (sorted by time)
export const getProviderDayAvailability = async (req, res) => {
    const { provider_id, dayOfWeek } = req.params;
    
    try {
        // Validate provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });
    
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Validate dayOfWeek
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        if (!validDays.includes(dayOfWeek)) {
            return res.status(400).json({ message: 'Invalid day of week. Must be one of: ' + validDays.join(', ') });
        }

        // Get all availability slots for the specific day
        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(provider_id),
                dayOfWeek: dayOfWeek
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        // Convert times to minutes and sort for better display
        const sortedSlots = availability.map(slot => ({
            ...slot,
            startMinutes: timeToMinutes(slot.startTime),
            endMinutes: timeToMinutes(slot.endTime)
        })).sort((a, b) => a.startMinutes - b.startMinutes);
    
        res.status(200).json({ 
            message: 'Day availability retrieved successfully', 
            provider_id: parseInt(provider_id),
            dayOfWeek: dayOfWeek,
            totalSlots: sortedSlots.length,
            availability: sortedSlots.map(slot => ({
                availability_id: slot.availability_id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                duration: `${Math.round((slot.endMinutes - slot.startMinutes) / 60 * 100) / 100} hours`
            }))
        });
    } catch (error) {
        console.error('Error getting day availability:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Standalone OTP verification endpoint for service providers
export const verifyProviderOTPOnly = async (req, res) => {
    const { provider_email, otp } = req.body;

    if (!provider_email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
        const verificationResult = await verifyOTP(provider_email, otp);
        
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
        console.error('Provider OTP verification error:', err);
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

// PROVIDER: Simple password reset (OTP already verified)
export const providerResetPassword = async (req, res) => {
    try {
        const { provider_email, newPassword } = req.body;

        if (!provider_email || !newPassword) {
            return res.status(400).json({ message: 'Provider email and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await prisma.serviceProviderDetails.update({
            where: { provider_email },
            data: { provider_password: hashedPassword }
        });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Provider password reset error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

// Provider dashboard endpoints

// Get provider profile
export const getProviderProfile = async (req, res) => {
    try {
        // Extract provider ID from JWT token (decoded by authMiddleware)
        const providerId = Number(req.userId);

        if (!providerId || Number.isNaN(providerId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token: Provider ID not found'
            });
        }

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: providerId },
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_userName: true,
                provider_email: true,
                provider_phone_number: true,
                provider_profile_photo: true,
                provider_valid_id: true,
                provider_location: true,
                provider_exact_location: true,
                provider_uli: true,
                provider_birthday: true,
                provider_isVerified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                provider_rating: true,
                provider_isActivated: true,
                created_at: true,
                provider_professions: {
                    select: {
                        id: true,
                        profession: true,
                        experience: true
                    },
                    orderBy: {
                        id: 'asc'
                    }
                },
                provider_certificates: {
                    select: {
                        certificate_id: true,
                        certificate_name: true,
                        certificate_number: true,
                        certificate_file_path: true,
                        expiry_date: true,
                        certificate_status: true,
                        created_at: true
                    }
                },
                provider_services: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true,
                        service_startingprice: true,
                        servicelisting_isActive: true
                    },
                    orderBy: {
                        service_id: 'desc'
                    },
                    take: 5
                }
            }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        const profileData = {
            provider_id: provider.provider_id,
            first_name: provider.provider_first_name,
            last_name: provider.provider_last_name,
            full_name: `${provider.provider_first_name} ${provider.provider_last_name}`.trim(),
            userName: provider.provider_userName,
            email: provider.provider_email,
            phone_number: provider.provider_phone_number,
            profile_photo: provider.provider_profile_photo,
            valid_id: provider.provider_valid_id,
            location: provider.provider_location,
            exact_location: provider.provider_exact_location,
            uli: provider.provider_uli,
            birthday: provider.provider_birthday,
            is_verified: provider.provider_isVerified,
            verification_status: provider.verification_status,
            rejection_reason: provider.rejection_reason,
            verification_submitted_at: provider.verification_submitted_at,
            verification_reviewed_at: provider.verification_reviewed_at,
            rating: provider.provider_rating,
            is_activated: provider.provider_isActivated,
            created_at: provider.created_at,
            professions: provider.provider_professions.map((profession) => ({
                id: profession.id,
                profession: profession.profession,
                experience: profession.experience
            })),
            certificates: provider.provider_certificates.map((certificate) => ({
                certificate_id: certificate.certificate_id,
                certificate_name: certificate.certificate_name,
                certificate_number: certificate.certificate_number,
                certificate_file_path: certificate.certificate_file_path,
                expiry_date: certificate.expiry_date,
                certificate_status: certificate.certificate_status,
                status: certificate.certificate_status,
                created_at: certificate.created_at
            })),
            recent_services: provider.provider_services.map((service) => ({
                service_id: service.service_id,
                service_title: service.service_title,
                service_description: service.service_description,
                service_startingprice: service.service_startingprice,
                is_active: service.servicelisting_isActive
            })),
            totals: {
                professions: provider.provider_professions.length,
                certificates: provider.provider_certificates.length,
                recent_services: provider.provider_services.length
            }
        };

        return res.status(200).json({
            success: true,
            message: 'Provider profile retrieved successfully',
            data: profileData
        });
    } catch (error) {
        console.error('Error fetching provider profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * @swagger
 * /auth/profile-detailed:
 *   get:
 *     tags:
 *       - Service Provider Profile
 *     summary: Get detailed provider profile (JWT authenticated)
 *     description: Retrieve detailed service provider information including ratings, certifications, and professions. Uses JWT token to identify the provider.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provider profile retrieved successfully"
 *                 provider:
 *                   type: object
 *                   properties:
 *                     provider_id:
 *                       type: integer
 *                     provider_first_name:
 *                       type: string
 *                     provider_last_name:
 *                       type: string
 *                     provider_userName:
 *                       type: string
 *                     provider_email:
 *                       type: string
 *                     provider_phone_number:
 *                       type: string
 *                     provider_profile_photo:
 *                       type: string
 *                     provider_rating:
 *                       type: number
 *                     provider_location:
 *                       type: string
 *                     provider_uli:
 *                       type: string
 *                     provider_isVerified:
 *                       type: boolean
 *                     verification_status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                     certificates:
 *                       type: array
 *                       items:
 *                         type: object
 *                     professions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     ratings_count:
 *                       type: integer
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: Provider not found
 *       500:
 *         description: Server error
 */
// Get detailed provider profile using JWT token
export const getProviderProfileById = async (req, res) => {
    const providerId = req.userId; // From JWT token via authMiddleware

    if (!providerId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(providerId) },
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_userName: true,
                provider_email: true,
                provider_phone_number: true,
                provider_profile_photo: true,
                provider_valid_id: true,
                provider_isVerified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                provider_rating: true,
                provider_location: true,
                provider_exact_location: true,
                provider_uli: true,
                provider_birthday: true,
                created_at: true,
                provider_isActivated: true,
                provider_certificates: {
                    select: {
                        certificate_id: true,
                        certificate_name: true,
                        certificate_number: true,
                        certificate_file_path: true,
                        expiry_date: true
                    }
                },
                provider_professions: {
                    select: {
                        id: true,
                        profession: true,
                        experience: true
                    }
                },
                provider_ratings: {
                    select: {
                        id: true,
                        rating_value: true,
                        rating_comment: true,
                        rating_photo: true,
                        created_at: true,
                        user: {
                            select: {
                                user_id: true,
                                first_name: true,
                                last_name: true,
                                profile_photo: true
                            }
                        }
                    },
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: 10 // Latest 10 ratings
                }
            }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Calculate ratings statistics
        const ratingsCount = await prisma.rating.count({
            where: { provider_id: parseInt(providerId) }
        });

        res.status(200).json({
            message: 'Provider profile retrieved successfully',
            provider: {
                ...provider,
                ratings_count: ratingsCount,
                certificates: provider.provider_certificates,
                professions: provider.provider_professions,
                recent_ratings: provider.provider_ratings
            }
        });
    } catch (err) {
        console.error('Get provider profile error:', err);
        res.status(500).json({ message: 'Server error retrieving provider profile' });
    }
};

/**
 * @swagger
 * /auth/availability/date:
 *   put:
 *     tags:
 *       - Service Provider Availability
 *     summary: Update provider availability for a specific date
 *     description: Change availability status (active/inactive) for a specific date. Providers can mark themselves unavailable for specific dates.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - isActive
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-15"
 *                 description: Date to update availability (YYYY-MM-DD)
 *               isActive:
 *                 type: boolean
 *                 example: false
 *                 description: Set to false to mark as unavailable, true for available
 *               dayOfWeek:
 *                 type: string
 *                 example: "Monday"
 *                 description: Optional - Day of week (auto-detected if not provided)
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Availability for 2025-10-15 (Monday) updated successfully"
 *                 date:
 *                   type: string
 *                 dayOfWeek:
 *                   type: string
 *                 isActive:
 *                   type: boolean
 *                 availability:
 *                   type: object
 *       400:
 *         description: Bad request - missing or invalid parameters
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Provider or availability not found
 *       500:
 *         description: Server error
 */
// Update provider availability for a specific date
export const updateAvailabilityByDate = async (req, res) => {
    try {
        const providerId = req.userId; // From auth middleware
        const { date, isActive, dayOfWeek } = req.body;

        // Validate input
        if (!date) {
            return res.status(400).json({ message: 'Date is required (format: YYYY-MM-DD)' });
        }

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive must be a boolean (true or false)' });
        }

        // Parse and validate date
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Get day of week from date
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const calculatedDayOfWeek = daysOfWeek[targetDate.getDay()];
        const finalDayOfWeek = dayOfWeek || calculatedDayOfWeek;

        // Check if provider exists
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(providerId) }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Find availability for this day of week
        const availability = await prisma.availability.findFirst({
            where: {
                provider_id: parseInt(providerId),
                dayOfWeek: finalDayOfWeek
            }
        });

        if (!availability) {
            return res.status(404).json({ 
                message: `No availability found for ${finalDayOfWeek}. Please create availability first.`,
                dayOfWeek: finalDayOfWeek
            });
        }

        // Update availability status
        const updatedAvailability = await prisma.availability.update({
            where: { availability_id: availability.availability_id },
            data: { availability_isActive: isActive }
        });

        res.status(200).json({
            message: `Availability for ${date} (${finalDayOfWeek}) updated successfully`,
            date: date,
            dayOfWeek: finalDayOfWeek,
            isActive: isActive,
            availability: {
                availability_id: updatedAvailability.availability_id,
                dayOfWeek: updatedAvailability.dayOfWeek,
                startTime: updatedAvailability.startTime,
                endTime: updatedAvailability.endTime,
                availability_isActive: updatedAvailability.availability_isActive
            }
        });
    } catch (error) {
        console.error('Error updating availability by date:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update provider profile
export const updateProviderProfile = async (req, res) => {
    const { provider_id } = req.params;
    const {
        provider_first_name,
        provider_last_name,
        provider_phone_number,
        provider_location,
        provider_uli
    } = req.body;
    
    try {
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(provider_id) }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        const updateData = {};
        if (provider_first_name) updateData.provider_first_name = provider_first_name;
        if (provider_last_name) updateData.provider_last_name = provider_last_name;
        if (provider_phone_number) updateData.provider_phone_number = provider_phone_number;
        if (provider_location) updateData.provider_location = provider_location;
        if (provider_uli) updateData.provider_uli = provider_uli;

        const updatedProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id: parseInt(provider_id) },
            data: updateData
        });

        res.status(200).json({
            message: 'Profile updated successfully',
            provider: updatedProvider
        });
    } catch (error) {
        console.error('Error updating provider profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get provider stats
export const getProviderStats = async (req, res) => {
    try {
        // Use the provider ID from the authentication middleware
        const providerId = req.userId;
        
        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(providerId) }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Get total completed appointments and earnings
        const completedAppointments = await prisma.appointment.findMany({
            where: {
                provider_id: parseInt(providerId),
                appointment_status: 'completed'
            }
        });

        const totalEarnings = completedAppointments.reduce((sum, appointment) => {
            return sum + (appointment.final_price || 0);
        }, 0);        // Get active bookings (pending, confirmed, in_progress)
        const activeBookings = await prisma.appointment.count({
            where: {
                provider_id: parseInt(providerId),
                appointment_status: {
                    in: ['pending', 'confirmed', 'in_progress']
                }
            }
        });

        // Get total services
        const totalServices = await prisma.serviceListing.count({
            where: { provider_id: parseInt(providerId) }
        });

        // Get monthly stats (current month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyBookings = await prisma.appointment.count({
            where: {
                provider_id: parseInt(providerId),
                created_at: {
                    gte: startOfMonth
                }
            }
        });        const monthlyCompletedAppointments = await prisma.appointment.findMany({
            where: {
                provider_id: parseInt(providerId),
                appointment_status: 'completed',
                created_at: {
                    gte: startOfMonth
                }
            }
        });

        const monthlyRevenue = monthlyCompletedAppointments.reduce((sum, appointment) => {
            return sum + (appointment.final_price || 0);
        }, 0);

        // Calculate completion rate
        const totalAppointments = await prisma.appointment.count({
            where: { provider_id: parseInt(providerId) }
        });

        const completionRate = totalAppointments > 0 
            ? Math.round((completedAppointments.length / totalAppointments) * 100)
            : 0;        // Get popular services (services with most bookings)
        const serviceBookings = await prisma.appointment.groupBy({
            by: ['provider_id'],
            where: { provider_id: parseInt(providerId) },
            _count: { appointment_id: true }
        });

        const popularServices = await prisma.serviceListing.findMany({
            where: { provider_id: parseInt(providerId) },
            take: 5,
            orderBy: { service_id: 'desc' } // Simple ordering for now
        });

        // Get total ratings count
        const totalRatings = await prisma.rating.count({
            where: { provider_id: parseInt(providerId) }
        });

        const stats = {
            totalEarnings,
            activeBookings,
            providerRating: provider.provider_rating,
            totalServices,
            monthlyBookings,
            monthlyRevenue,
            completionRate,
            totalRatings,
            popularServices: popularServices.map(service => ({
                name: service.service_title,
                bookings: Math.floor(Math.random() * 10) + 1 // Placeholder for actual booking count
            }))
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching provider stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get provider services
export const getProviderServices = async (req, res) => {
    try {
        // Use the provider ID from the authentication middleware
        const providerId = req.userId;
        
        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(providerId) }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        const services = await prisma.serviceListing.findMany({
            where: { provider_id: parseInt(providerId) },
            include: {
                specific_services: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: { service_id: 'desc' }
        });

        // Transform services to include service_picture and proper field mapping
        const transformedServices = services.map(service => ({
            ...service,
            listing_id: service.service_id, // Add alias for consistency
            service_picture: service.service_picture // Ensure service_picture is included
        }));

        res.status(200).json(transformedServices);
    } catch (error) {
        console.error('Error fetching provider services:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get provider bookings
export const getProviderBookings = async (req, res) => {
    try {
        // Use the provider ID from the authentication middleware
        const providerId = req.userId;        
        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(providerId) }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        const bookings = await prisma.appointment.findMany({
            where: { provider_id: parseInt(providerId) },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true,
                        exact_location: true
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
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error fetching provider bookings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get provider recent activity
export const getProviderActivity = async (req, res) => {
    try {        // Use the provider ID from the authentication middleware
        const providerId = req.userId;
        
        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(providerId) }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }        // Get recent bookings
        const recentBookings = await prisma.appointment.findMany({
            where: { provider_id: parseInt(providerId) },
            include: {
                customer: {
                    select: { 
                        first_name: true, 
                        last_name: true,
                        exact_location: true
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
            orderBy: { created_at: 'desc' },
            take: 5
        });        // Get recent ratings
        const recentRatings = await prisma.rating.findMany({
            where: { provider_id: parseInt(providerId) },
            include: {
                user: {
                    select: { first_name: true, last_name: true }
                },
                appointment: {
                    select: { appointment_id: true }
                }
            },
            orderBy: { id: 'desc' },
            take: 3
        });

        // Convert to activity format
        const activities = [];

        recentBookings.forEach(booking => {
            activities.push({
                type: 'booking',
                title: 'New Booking',
                description: `Booking from ${booking.customer.first_name} ${booking.customer.last_name}`,
                created_at: booking.created_at
            });
        });

        recentRatings.forEach(rating => {
            activities.push({
                type: 'review',
                title: 'New Review',
                description: `${rating.rating_value}-star review from ${rating.user.first_name} ${rating.user.last_name}`,
                created_at: rating.appointment.created_at || new Date()
            });
        });

        // Sort by date and take most recent
        activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.status(200).json(activities.slice(0, 10));
    } catch (error) {
        console.error('Error fetching provider activity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Provider logout
export const providerLogout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Logout failed' 
                });
            }
            
            res.clearCookie('connect.sid'); // Clear session cookie
            res.status(200).json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during logout' 
        });
    }
};

// Request OTP for profile update
export const requestProviderProfileUpdateOTP = async (req, res) => {
    const { provider_email } = req.body;
    
    try {
        // Check if provider exists
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ 
            where: { provider_email } 
        });
        
        if (!existingProvider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Delete any previous OTPs for this email to prevent re-use
        await prisma.oTPVerification.deleteMany({ where: { email: provider_email } });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        await prisma.oTPVerification.create({
            data: {
                email: provider_email,
                otp,
                expires_at: expiresAt
            }
        });

        await sendOTPEmail(provider_email, otp);
        res.status(200).json({ message: 'OTP sent to your current email for profile update verification' });
    } catch (err) {
        console.error('Profile update OTP request error:', err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

// Step 1: Verify original email OTP and request new email OTP (for email changes)
export const verifyOriginalEmailAndRequestNewEmailOTP = async (req, res) => {
    try {
        const {
            provider_email,
            provider_phone_number,
            new_email,
            otp
        } = req.body;

        console.log('Step 1 - Original email verification:', { provider_email, new_email, otp });

        // Verify OTP for original email first
        const verificationResult = await verifyOTP(provider_email, otp);
        if (!verificationResult.success) {
            return res.status(400).json({ message: verificationResult.message });
        }

        // Check if provider exists
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ 
            where: { provider_email } 
        });
        
        if (!existingProvider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Check if email is being changed
        const emailChanged = new_email && new_email !== provider_email;
        
        if (emailChanged) {
            // Validate new email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(new_email)) {
                return res.status(400).json({ message: 'Invalid email format' });
            }

            // Check if new email is already taken
            const emailExists = await prisma.serviceProviderDetails.findFirst({ 
                where: { provider_email: new_email } 
            });
            
            if (emailExists) {
                return res.status(400).json({ message: 'Email address is already registered with another provider account' });
            }

            // Also check customer table
            const customerEmailExists = await prisma.user.findFirst({ 
                where: { email: new_email } 
            });
            
            if (customerEmailExists) {
                return res.status(400).json({ message: 'Email address is already registered with a customer account' });
            }

            // Clean up any existing OTPs for the new email
            await prisma.oTPVerification.deleteMany({ where: { email: new_email } });

            // Generate 6-digit OTP for new email
            const newEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            
            await prisma.oTPVerification.create({
                data: {
                    email: new_email,
                    otp: newEmailOtp,
                    expires_at: expiresAt
                }
            });

            // Store pending profile update data temporarily (you could use a separate table for this)
            // For now, we'll store it in a way that can be retrieved in the next step
            await prisma.oTPVerification.create({
                data: {
                    email: `temp_${provider_email}`, // Temporary key
                    otp: JSON.stringify({
                        provider_email,
                        provider_phone_number,
                        new_email,
                        step: 'pending_new_email_verification'
                    }),
                    expires_at: expiresAt
                }
            });

            await sendOTPEmail(new_email, newEmailOtp);
            
            // Clean up original email OTP after successful verification
            await prisma.oTPVerification.deleteMany({ where: { email: provider_email } });

            res.status(200).json({ 
                message: 'Original email verified. OTP sent to new email address for verification.',
                nextStep: 'verify_new_email',
                newEmail: new_email
            });
        } else {
            // No email change, proceed with regular profile update
            await updateProviderProfileDirectly(req, res, provider_email, provider_phone_number, null);
        }

    } catch (err) {
        console.error('Original email verification error:', err);
        res.status(500).json({ message: 'Error processing verification' });
    }
};

// Step 2: Verify new email OTP and complete profile update
export const verifyNewEmailAndUpdateProfile = async (req, res) => {
    try {
        const {
            new_email,
            otp
        } = req.body;

        console.log('Step 2 - New email verification:', { new_email, otp });

        // Verify OTP for new email
        const verificationResult = await verifyOTP(new_email, otp);
        if (!verificationResult.success) {
            return res.status(400).json({ message: verificationResult.message });
        }

        // Retrieve pending profile update data
        const pendingUpdate = await prisma.oTPVerification.findFirst({
            where: {
                email: { startsWith: 'temp_' },
                otp: { contains: new_email }
            }
        });

        if (!pendingUpdate) {
            return res.status(400).json({ message: 'No pending profile update found. Please start the process again.' });
        }

        const updateData = JSON.parse(pendingUpdate.otp);
        
        // Proceed with profile update
        await updateProviderProfileDirectly(req, res, updateData.provider_email, updateData.provider_phone_number, new_email);

        // Clean up temporary data
        await prisma.oTPVerification.deleteMany({ 
            where: { 
                OR: [
                    { email: new_email },
                    { email: { startsWith: 'temp_' } }
                ]
            }
        });

    } catch (err) {
        console.error('New email verification error:', err);
        res.status(500).json({ message: 'Error completing profile update' });
    }
};

// Helper function to update provider profile directly
const updateProviderProfileDirectly = async (req, res, provider_email, provider_phone_number, new_email) => {
    try {
        // Check if provider exists
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ 
            where: { provider_email } 
        });
        
        if (!existingProvider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Check if new phone number is already taken (if phone is being changed)
        if (provider_phone_number && provider_phone_number !== existingProvider.provider_phone_number) {
            const phoneExists = await prisma.serviceProviderDetails.findFirst({ 
                where: { 
                    provider_phone_number: provider_phone_number,
                    provider_email: { not: provider_email }
                } 
            });
            
            if (phoneExists) {
                return res.status(400).json({ message: 'Phone number is already registered with another provider account' });
            }

            // Also check customer table
            const customerPhoneExists = await prisma.user.findFirst({ 
                where: { phone_number: provider_phone_number } 
            });
            
            if (customerPhoneExists) {
                return res.status(400).json({ message: 'Phone number is already registered with a customer account' });
            }
        }

        // Handle profile photo upload (if any)
        const profilePhotoFile = req.files && req.files['provider_profile_photo'] ? req.files['provider_profile_photo'][0] : null;
        const provider_profile_photo = profilePhotoFile ? profilePhotoFile.path : undefined;

        // Prepare update data
        const updateData = {};
        
        if (provider_phone_number) updateData.provider_phone_number = provider_phone_number;
        if (new_email) updateData.provider_email = new_email;
        if (provider_profile_photo) updateData.provider_profile_photo = provider_profile_photo;

        // Update provider profile
        const updatedProvider = await prisma.serviceProviderDetails.update({
            where: { provider_email },
            data: updateData,
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_email: true,
                provider_phone_number: true,
                provider_location: true,
                provider_exact_location: true,
                provider_profile_photo: true,
                provider_birthday: true,
                provider_uli: true,
                provider_userName: true,
                provider_isVerified: true
            }
        });

        res.status(200).json({ 
            message: 'Profile updated successfully',
            provider: updatedProvider 
        });

    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// Legacy function - now routes to appropriate step based on email change
export const updateProviderProfileWithOTP = async (req, res) => {
    try {
        const {
            provider_email,
            provider_phone_number,
            new_email,
            otp
        } = req.body;

        console.log('Profile update request:', { provider_email, provider_phone_number, new_email, otp });

        // Check if email is being changed
        const emailChanged = new_email && new_email !== provider_email;
        
        if (emailChanged) {
            // Route to step 1: verify original email and request new email OTP
            await verifyOriginalEmailAndRequestNewEmailOTP(req, res);
        } else {
            // No email change, proceed with regular verification and update
            const verificationResult = await verifyOTP(provider_email, otp);
            if (!verificationResult.success) {
                return res.status(400).json({ message: verificationResult.message });
            }
            
            await updateProviderProfileDirectly(req, res, provider_email, provider_phone_number, null);
        }

    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// Provider appointment management functions

// Get provider appointments/bookings
export const getProviderAppointments = async (req, res) => {
    try {
        const providerId = req.userId;
        
        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        const appointments = await prisma.appointment.findMany({
            where: { provider_id: parseInt(providerId) },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true,
                        profile_photo: true,
                        exact_location: true
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
                appointment_rating: {
                    select: {
                        rating_value: true,
                        rating_comment: true
                    }
                }
            },
            orderBy: { scheduled_date: 'asc' }
        });

        res.status(200).json({
            success: true,
            message: 'Appointments retrieved successfully',
            appointments
        });
    } catch (error) {
        console.error('Error fetching provider appointments:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Accept/reject appointment booking
export const acceptAppointmentBooking = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { action } = req.body; // 'accept' or 'reject'
        const providerId = req.userId;

        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

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
                }
            }
        });

        if (!appointment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Appointment not found' 
            });
        }

        if (appointment.provider_id !== parseInt(providerId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only manage your own appointments' 
            });
        }

        const newStatus = action === 'accept' ? 'approved' : 'cancelled';
        
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { appointment_status: newStatus },
            include: {
                customer: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone_number: true
                    }
                }
            }
        });

        // If rejecting, free up the availability slot
        if (action === 'reject') {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayOfWeek = dayNames[appointment.scheduled_date.getDay()];
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
            message: `Appointment ${action}ed successfully`,
            appointment: updatedAppointment
        });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Update appointment status (in progress, completed, etc.)
export const updateAppointmentStatusProvider = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status } = req.body;
        const providerId = req.userId;

        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Validate status values - use the correct valid statuses
        const validStatuses = ['pending', 'approved', 'confirmed', 'in-progress', 'finished', 'completed', 'cancelled', 'no-show'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!appointment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Appointment not found' 
            });
        }

        if (appointment.provider_id !== parseInt(providerId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only manage your own appointments' 
            });
        }

        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { appointment_status: status },
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
                service: {
                    select: {
                        service_title: true,
                        service_description: true
                    }
                },
                serviceProvider: {
                    select: {
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_phone_number: true
                    }
                }
            }
        });

        // Send email notification for 'on the way' and 'in-progress' status
        if (status === 'on the way' || status === 'in-progress') {
            try {
                await sendAppointmentStatusUpdateEmail(updatedAppointment.customer.email, {
                    customerName: `${updatedAppointment.customer.first_name} ${updatedAppointment.customer.last_name}`,
                    providerName: `${updatedAppointment.serviceProvider.provider_first_name} ${updatedAppointment.serviceProvider.provider_last_name}`,
                    providerPhone: updatedAppointment.serviceProvider.provider_phone_number,
                    serviceTitle: updatedAppointment.service.service_title,
                    scheduledDate: updatedAppointment.scheduled_date,
                    appointmentId: updatedAppointment.appointment_id,
                    newStatus: status,
                    statusMessage: status === 'on the way' 
                        ? 'Your service provider is heading to your location. Please be ready!' 
                        : 'Your service provider has started working on your request.'
                });
                console.log(`✅ Status update email sent to ${updatedAppointment.customer.email} for status: ${status}`);
            } catch (emailError) {
                // Log error but don't fail the status update
                console.error('❌ Failed to send status update email:', emailError);
            }
        }

        res.status(200).json({
            success: true,
            message: `Appointment status updated to ${status}`,
            emailSent: (status === 'on the way' || status === 'in-progress'),
            data: updatedAppointment
        });
    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get provider availability with booking status
export const getProviderAvailabilityWithBookings = async (req, res) => {
    try {
        const providerId = req.userId;
        
        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        const availability = await prisma.availability.findMany({
            where: {
                provider_id: parseInt(providerId),
                availability_isActive: true
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });

        // Group by day of week
        const availabilityByDay = {};
        availability.forEach(slot => {
            if (!availabilityByDay[slot.dayOfWeek]) {
                availabilityByDay[slot.dayOfWeek] = [];
            }
            availabilityByDay[slot.dayOfWeek].push({
                availability_id: slot.availability_id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isBooked: slot.availability_isBooked
            });
        });

        res.status(200).json({
            success: true,
            message: 'Availability with booking status retrieved successfully',
            availabilityByDay
        });
    } catch (error) {
        console.error('Error fetching availability with bookings:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Cancel appointment with reason (wrapper for appointment controller)
export const cancelProviderAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { cancellation_reason } = req.body;

        if (!cancellation_reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        // Check if appointment exists and belongs to this provider
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                serviceProvider: true
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Verify the provider owns this appointment
        if (existingAppointment.provider_id !== parseInt(req.userId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to cancel this appointment'
            });
        }

        // Update appointment status to cancelled with reason
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { 
                appointment_status: 'cancelled',
                cancellation_reason: cancellation_reason
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
                        provider_last_name: true
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: updatedAppointment
        });

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling appointment',
            error: error.message
        });
    }
};

// Rate customer/appointment (wrapper for appointment controller)
export const rateCustomerAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Check if appointment exists and belongs to this provider
        const existingAppointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) },
            include: {
                serviceProvider: true
            }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Verify the provider owns this appointment
        if (existingAppointment.provider_id !== parseInt(req.userId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to rate this appointment'
            });
        }

        if (existingAppointment.appointment_status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Can only rate completed appointments'
            });
        }

        // Create or update rating
        const ratingData = await prisma.rating.upsert({
            where: {
                appointment_id: parseInt(appointmentId)
            },
            update: {
                rating_value: parseInt(rating),
                rating_comment: comment || null
            },
            create: {
                appointment_id: parseInt(appointmentId),
                rating_value: parseInt(rating),
                rating_comment: comment || null,
                user_id: existingAppointment.customer_id,
                provider_id: existingAppointment.provider_id
            }
        });

        res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            data: ratingData
        });

    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting rating',
            error: error.message
        });
    }
};

// Finish appointment with final price
export const finishAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { final_price } = req.body;
        const providerId = req.userId;

        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

        if (!final_price || final_price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid final price is required'
            });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { appointment_id: parseInt(appointmentId) }
        });

        if (!appointment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Appointment not found' 
            });
        }

        if (appointment.provider_id !== parseInt(providerId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only finish your own appointments' 
            });
        }

        if (appointment.appointment_status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: 'Only in-progress appointments can be finished'
            });
        }

        // If this appointment was rescheduled from a backjob, mark the backjob as completed
        const activeBackjob = await prisma.backjobApplication.findFirst({
            where: {
                appointment_id: parseInt(appointmentId),
                status: 'approved'
            }
        });

        // Use transaction to update both appointment and backjob atomically
        const result = await prisma.$transaction(async (tx) => {
            // Update appointment status
            const updatedAppointment = await tx.appointment.update({
                where: { appointment_id: parseInt(appointmentId) },
                data: { 
                    appointment_status: 'finished',
                    final_price: parseFloat(final_price)
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
                    service: {
                        select: {
                            service_title: true,
                            service_description: true
                        }
                    }
                }
            });

            // If there's an active backjob, mark it as completed
            if (activeBackjob) {
                await tx.backjobApplication.update({
                    where: { backjob_id: activeBackjob.backjob_id },
                    data: { 
                        status: 'completed',
                        resolved_at: new Date()
                    }
                });
                console.log(`✅ Marked backjob ${activeBackjob.backjob_id} as completed after appointment finished`);
            }

            return updatedAppointment;
        });

        res.status(200).json({
            success: true,
            message: 'Appointment finished with final price',
            data: result
        });
    } catch (error) {
        console.error('Error finishing appointment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all service listings (public endpoint for browsing services)
export const getAllServiceListings = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            location = '', 
            min_price = '', 
            max_price = '',
            active_only = 'true',
            verified_only = 'true'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build where clause for filtering
        const whereClause = {};
        
        // Filter by active services only (default true)
        if (active_only === 'true') {
            whereClause.servicelisting_isActive = true;
        }

        // Search filter - search in service title and description
        if (search) {
            whereClause.OR = [
                { service_title: { contains: search, mode: 'insensitive' } },
                { service_description: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Price range filter
        if (min_price || max_price) {
            whereClause.service_startingprice = {};
            if (min_price) whereClause.service_startingprice.gte = parseFloat(min_price);
            if (max_price) whereClause.service_startingprice.lte = parseFloat(max_price);
        }

        // Provider location filter
        if (location) {
            whereClause.serviceProvider = {
                provider_location: { contains: location, mode: 'insensitive' }
            };
        }

        // Only show services from verified providers (default true)
        if (verified_only === 'true') {
            whereClause.serviceProvider = {
                ...whereClause.serviceProvider,
                provider_isVerified: true,
                provider_isActivated: true
            };
        }

        // Get service listings with provider details
        const serviceListings = await prisma.serviceListing.findMany({
            where: whereClause,
            include: {
                serviceProvider: {
                    select: {
                        provider_id: true,
                        provider_first_name: true,
                        provider_last_name: true,
                        provider_email: true,
                        provider_phone_number: true,
                        provider_location: true,
                        provider_exact_location: true,
                        provider_rating: true,
                        provider_isVerified: true,
                        provider_profile_photo: true,
                        created_at: true
                    }
                },
                specific_services: {
                    include: {
                        covered_by_certificates: {
                            include: {
                                certificate: {
                                    select: {
                                        certificate_id: true,
                                        certificate_name: true,
                                        certificate_status: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { servicelisting_isActive: 'desc' },  // Active services first
                { serviceProvider: { provider_rating: 'desc' } },  // Then by provider rating
                { service_startingprice: 'asc' }  // Then by price
            ],
            skip,
            take: parseInt(limit)
        });

        // Get total count for pagination
        const totalCount = await prisma.serviceListing.count({
            where: whereClause
        });

        // Format the response to match your specified fields
        const formattedListings = serviceListings.map(listing => ({
            service_id: listing.service_id,
            service_title: listing.service_title,
            service_description: listing.service_description,
            service_startingprice: listing.service_startingprice,
            provider_id: listing.provider_id,
            servicelisting_isActive: listing.servicelisting_isActive,
            service_picture: listing.service_picture,
            provider: {
                provider_id: listing.serviceProvider.provider_id,
                provider_name: `${listing.serviceProvider.provider_first_name} ${listing.serviceProvider.provider_last_name}`,
                provider_first_name: listing.serviceProvider.provider_first_name,
                provider_last_name: listing.serviceProvider.provider_last_name,
                provider_email: listing.serviceProvider.provider_email,
                provider_phone_number: listing.serviceProvider.provider_phone_number,
                provider_location: listing.serviceProvider.provider_location,
                provider_exact_location: listing.serviceProvider.provider_exact_location,
                provider_rating: listing.serviceProvider.provider_rating,
                provider_isVerified: listing.serviceProvider.provider_isVerified,
                provider_profile_photo: listing.serviceProvider.provider_profile_photo,
                provider_member_since: listing.serviceProvider.created_at
            },
            certificates: listing.specific_services.flatMap(service => 
                service.covered_by_certificates.map(cert => ({
                    certificate_id: cert.certificate.certificate_id,
                    certificate_name: cert.certificate.certificate_name,
                    certificate_status: cert.certificate.certificate_status
                }))
            ),
            specific_services: listing.specific_services.map(service => ({
                specific_service_id: service.specific_service_id,
                specific_service_title: service.specific_service_title,
                specific_service_description: service.specific_service_description
            }))
        }));

        res.status(200).json({
            success: true,
            message: 'Service listings retrieved successfully',
            data: formattedListings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / parseInt(limit)),
                totalCount,
                hasNext: skip + parseInt(limit) < totalCount,
                hasPrev: parseInt(page) > 1,
                limit: parseInt(limit)
            },
            filters: {
                search,
                location,
                min_price,
                max_price,
                active_only,
                verified_only
            }
        });

    } catch (error) {
        console.error('Error fetching service listings:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching service listings',
            error: error.message
        });
    }
};

// Get service listings by exact title match
export const getServiceListingsByTitle = async (req, res) => {
    try {
        const { title } = req.query;
        
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Service title is required'
            });
        }

        const serviceListings = await prisma.serviceListing.findMany({
            where: {
                service_title: { equals: title, mode: 'insensitive' },
                servicelisting_isActive: true
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
                        provider_exact_location: true,
                        provider_rating: true,
                        provider_isVerified: true,
                        provider_profile_photo: true,
                        created_at: true
                    }
                },
                specific_services: {
                    select: {
                        specific_service_id: true,
                        specific_service_title: true,
                        specific_service_description: true
                    }
                }
            },
            orderBy: [
                { serviceProvider: { provider_rating: 'desc' } },  // Order by provider rating
                { service_startingprice: 'asc' }  // Then by price
            ]
        });

        // Format the response
        const formattedListings = serviceListings.map(listing => ({
            service_id: listing.service_id,
            service_title: listing.service_title,
            service_description: listing.service_description,
            service_startingprice: listing.service_startingprice,
            provider_id: listing.provider_id,
            servicelisting_isActive: listing.servicelisting_isActive,
            service_picture: listing.service_picture,
            provider: {
                provider_id: listing.serviceProvider.provider_id,
                provider_name: `${listing.serviceProvider.provider_first_name} ${listing.serviceProvider.provider_last_name}`,
                provider_first_name: listing.serviceProvider.provider_first_name,
                provider_last_name: listing.serviceProvider.provider_last_name,
                provider_email: listing.serviceProvider.provider_email,
                provider_phone_number: listing.serviceProvider.provider_phone_number,
                provider_location: listing.serviceProvider.provider_location,
                provider_exact_location: listing.serviceProvider.provider_exact_location,
                provider_rating: listing.serviceProvider.provider_rating,
                provider_isVerified: listing.serviceProvider.provider_isVerified,
                provider_profile_photo: listing.serviceProvider.provider_profile_photo,
                provider_member_since: listing.serviceProvider.created_at
            },
            specific_services: listing.specific_services.map(service => ({
                specific_service_id: service.specific_service_id,
                specific_service_title: service.specific_service_title,
                specific_service_description: service.specific_service_description
            }))
        }));

        res.status(200).json({
            success: true,
            message: `Found ${formattedListings.length} service listing(s) for "${title}"`,
            data: formattedListings,
            count: formattedListings.length,
            search_title: title
        });

    } catch (error) {
        console.error('Error fetching services by title:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching services by title',
            error: error.message
        });
    }
};

// Get provider professions and experience
export const getProviderProfessions = async (req, res) => {
    try {
        const { providerId } = req.params;
        
        // Get provider details with professions
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: parseInt(providerId) },
            include: {
                provider_professions: {
                    orderBy: {
                        id: 'asc'
                    }
                }
            }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Provider professions retrieved successfully',
            data: {
                provider_id: provider.provider_id,
                provider_name: `${provider.provider_first_name} ${provider.provider_last_name}`,
                provider_email: provider.provider_email,
                provider_phone_number: provider.provider_phone_number,
                provider_location: provider.provider_location,
                provider_rating: provider.provider_rating,
                provider_isVerified: provider.provider_isVerified,
                provider_profile_photo: provider.provider_profile_photo,
                provider_member_since: provider.created_at,
                total_professions: provider.provider_professions.length,
                professions: provider.provider_professions.map(prof => ({
                    id: prof.id,
                    profession: prof.profession,
                    experience: prof.experience
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching provider professions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching provider professions',
            error: error.message
        });
    }
};

// Get provider details (for the authenticated provider)
export const getProviderDetails = async (req, res) => {
    try {
        // Extract provider ID from JWT token (decoded by authMiddleware)
        const providerId = Number(req.userId);

        if (!providerId || Number.isNaN(providerId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token: Provider ID not found'
            });
        }

        console.log('Getting details for provider ID:', providerId);
        
        // Get provider details with all related information
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: providerId },
            include: {
                provider_professions: {
                    orderBy: {
                        id: 'asc'
                    }
                },
                provider_certificates: {
                    select: {
                        certificate_id: true,
                        certificate_name: true,
                        certificate_number: true,
                        certificate_file_path: true,
                        expiry_date: true,
                        certificate_status: true,
                        created_at: true
                    }
                },
                provider_services: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true,
                        service_startingprice: true,
                        servicelisting_isActive: true
                    },
                    orderBy: {
                        service_id: 'desc'
                    },
                    take: 5 // Get latest 5 services
                }
            }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Provider details retrieved successfully',
            data: {
                // Basic Information
                provider_id: provider.provider_id,
                provider_first_name: provider.provider_first_name,
                provider_last_name: provider.provider_last_name,
                provider_full_name: `${provider.provider_first_name} ${provider.provider_last_name}`,
                provider_email: provider.provider_email,
                provider_phone_number: provider.provider_phone_number,
                provider_userName: provider.provider_userName,
                provider_birthday: provider.provider_birthday,
                provider_location: provider.provider_location,
                provider_exact_location: provider.provider_exact_location,
                provider_uli: provider.provider_uli,
                
                // Status and Ratings
                provider_rating: provider.provider_rating,
                provider_isVerified: provider.provider_isVerified,
                provider_isActivated: provider.provider_isActivated,
                provider_rejection_reason: provider.provider_rejection_reason,
                
                // Media
                provider_profile_photo: provider.provider_profile_photo,
                provider_valid_id: provider.provider_valid_id,
                
                // Timestamps
                created_at: provider.created_at,
                provider_member_since: provider.created_at,
                
                // Related Data
                professions: provider.provider_professions.map(prof => ({
                    id: prof.id,
                    profession: prof.profession,
                    experience: prof.experience
                })),
                certificates: provider.provider_certificates.map(cert => ({
                    certificate_id: cert.certificate_id,
                    certificate_name: cert.certificate_name,
                    certificate_number: cert.certificate_number,
                    certificate_file_path: cert.certificate_file_path,
                    expiry_date: cert.expiry_date,
                    certificate_status: cert.certificate_status,
                    status: cert.certificate_status,
                    created_at: cert.created_at
                })),
                recent_services: provider.provider_services.map(service => ({
                    service_id: service.service_id,
                    service_title: service.service_title,
                    service_description: service.service_description,
                    service_startingprice: service.service_startingprice,
                    is_active: service.servicelisting_isActive
                })),
                
                // Summary Statistics
                total_professions: provider.provider_professions.length,
                total_certificates: provider.provider_certificates.length,
                total_services: provider.provider_services.length
            }
        });

    } catch (error) {
        console.error('Error fetching provider details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching provider details',
            error: error.message
        });
    }
};

// Update provider details (for the authenticated provider)
export const updateProviderDetails = async (req, res) => {
    try {
        const providerId = req.userId; // From JWT token
        const {
            provider_first_name,
            provider_last_name,
            provider_phone_number,
            provider_birthday,
            provider_location,
            provider_exact_location,
            professions, // Array of profession objects: [{ profession: "...", experience: "..." }]
        } = req.body;

        console.log('Updating details for provider ID:', providerId);
        console.log('Update data received:', req.body);

        // Check if provider exists
        const existingProvider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: providerId }
        });

        if (!existingProvider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Handle file uploads if provided
        let updateData = {};
        
        // Handle profile photo update
        if (req.files && req.files['provider_profile_photo']) {
            try {
                const profilePhotoFile = req.files['provider_profile_photo'][0];
                const profilePhotoUrl = await uploadToCloudinary(
                    profilePhotoFile.buffer, 
                    'fixmo/provider-profiles',
                    `provider_profile_${providerId}_${Date.now()}`
                );
                updateData.provider_profile_photo = profilePhotoUrl;
            } catch (uploadError) {
                console.error('Error uploading profile photo:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading profile photo. Please try again.'
                });
            }
        }

        // Handle valid ID update
        if (req.files && req.files['provider_valid_id']) {
            try {
                const validIdFile = req.files['provider_valid_id'][0];
                const validIdUrl = await uploadToCloudinary(
                    validIdFile.buffer, 
                    'fixmo/provider-ids',
                    `provider_id_${providerId}_${Date.now()}`
                );
                updateData.provider_valid_id = validIdUrl;
            } catch (uploadError) {
                console.error('Error uploading valid ID:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: 'Error uploading valid ID. Please try again.'
                });
            }
        }

        // Update basic provider information
        if (provider_first_name !== undefined) updateData.provider_first_name = provider_first_name;
        if (provider_last_name !== undefined) updateData.provider_last_name = provider_last_name;
        if (provider_phone_number !== undefined) updateData.provider_phone_number = provider_phone_number;
        if (provider_birthday !== undefined) updateData.provider_birthday = new Date(provider_birthday);
        if (provider_location !== undefined) updateData.provider_location = provider_location;
        if (provider_exact_location !== undefined) updateData.provider_exact_location = provider_exact_location;

        // Use transaction to update provider and professions
        const updatedProvider = await prisma.$transaction(async (prisma) => {
            // Update provider details
            const provider = await prisma.serviceProviderDetails.update({
                where: { provider_id: providerId },
                data: updateData
            });

            // Handle professions update if provided
            if (professions && Array.isArray(professions)) {
                // Delete existing professions
                await prisma.providerProfession.deleteMany({
                    where: { provider_id: providerId }
                });

                // Create new professions
                if (professions.length > 0) {
                    await prisma.providerProfession.createMany({
                        data: professions.map(prof => ({
                            provider_id: providerId,
                            profession: prof.profession,
                            experience: prof.experience || '0 years'
                        }))
                    });
                }
            }

            // Return updated provider with professions
            return await prisma.serviceProviderDetails.findUnique({
                where: { provider_id: providerId },
                include: {
                    provider_professions: {
                        orderBy: { id: 'asc' }
                    }
                }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Provider details updated successfully',
            data: {
                provider_id: updatedProvider.provider_id,
                provider_first_name: updatedProvider.provider_first_name,
                provider_last_name: updatedProvider.provider_last_name,
                provider_full_name: `${updatedProvider.provider_first_name} ${updatedProvider.provider_last_name}`,
                provider_email: updatedProvider.provider_email,
                provider_phone_number: updatedProvider.provider_phone_number,
                provider_userName: updatedProvider.provider_userName,
                provider_birthday: updatedProvider.provider_birthday,
                provider_location: updatedProvider.provider_location,
                provider_exact_location: updatedProvider.provider_exact_location,
                provider_rating: updatedProvider.provider_rating,
                provider_isVerified: updatedProvider.provider_isVerified,
                provider_profile_photo: updatedProvider.provider_profile_photo,
                provider_valid_id: updatedProvider.provider_valid_id,
                professions: updatedProvider.provider_professions.map(prof => ({
                    id: prof.id,
                    profession: prof.profession,
                    experience: prof.experience
                })),
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error updating provider details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating provider details',
            error: error.message
        });
    }
};

/**
 * Step 1: Request OTP for provider profile update
 * Sends OTP to provider's current email
 */
export const requestProviderProfileEditOTP = async (req, res) => {
    try {
        const providerId = req.userId; // From auth middleware

        // Get provider's current email
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: providerId },
            select: { provider_email: true, provider_first_name: true }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await prisma.oTPVerification.create({
            data: {
                email: provider.provider_email,
                otp: otp,
                expires_at: expiresAt
            }
        });

        // Send OTP via email
        await sendOTPEmail(provider.provider_email, otp);

        res.status(200).json({
            success: true,
            message: 'OTP sent to your email. Please verify to proceed with profile update.',
            email: provider.provider_email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Masked email
        });

    } catch (error) {
        console.error('Error requesting provider profile update OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: error.message
        });
    }
};

/**
 * Step 2: Verify OTP and update provider profile
 * Updates provider_phone_number, provider_email, provider_location, and exact_location
 */
export const verifyOTPAndUpdateProviderProfile = async (req, res) => {
    try {
        const providerId = req.userId; // From auth middleware
        const { otp, provider_phone_number, provider_email, provider_location, exact_location } = req.body;

        // Validate OTP is provided
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        // Validate at least one field is provided for update
        if (!provider_phone_number && !provider_email && !provider_location && !exact_location) {
            return res.status(400).json({
                success: false,
                message: 'At least one field (provider_phone_number, provider_email, provider_location, or exact_location) is required'
            });
        }

        // Get provider's current email
        const provider = await prisma.serviceProviderDetails.findUnique({
            where: { provider_id: providerId }
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Verify OTP
        const verificationResult = await verifyOTP(provider.provider_email, otp);

        if (!verificationResult.success) {
            return res.status(400).json({
                success: false,
                message: verificationResult.message
            });
        }

        // Check if email is being changed and if it's already taken
        if (provider_email && provider_email !== provider.provider_email) {
            const emailExists = await prisma.serviceProviderDetails.findFirst({
                where: { 
                    provider_email: provider_email,
                    provider_id: { not: providerId }
                }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already registered to another provider'
                });
            }

            // Also check in customer table
            const customerEmailExists = await prisma.user.findFirst({
                where: { email: provider_email }
            });

            if (customerEmailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already registered as a customer'
                });
            }
        }

        // Check if phone number is being changed and if it's already taken
        if (provider_phone_number && provider_phone_number !== provider.provider_phone_number) {
            const phoneExists = await prisma.serviceProviderDetails.findFirst({
                where: { 
                    provider_phone_number: provider_phone_number,
                    provider_id: { not: providerId }
                }
            });

            if (phoneExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is already registered to another provider'
                });
            }

            // Also check in customer table
            const customerPhoneExists = await prisma.user.findFirst({
                where: { phone_number: provider_phone_number }
            });

            if (customerPhoneExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone number is already registered as a customer'
                });
            }
        }

        // Prepare update data
        const updateData = {};

        if (provider_phone_number) {
            updateData.provider_phone_number = provider_phone_number;
        }

        if (provider_email) {
            updateData.provider_email = provider_email;
        }

        if (provider_location) {
            updateData.provider_location = provider_location;
        }

        if (exact_location) {
            updateData.exact_location = exact_location;
        }

        // Update provider profile
        const updatedProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id: providerId },
            data: updateData,
            select: {
                provider_id: true,
                provider_first_name: true,
                provider_last_name: true,
                provider_userName: true,
                provider_email: true,
                provider_phone_number: true,
                provider_location: true,
                exact_location: true,
                provider_profile_photo: true
            }
        });

        // Clean up used OTP
        await cleanupOTP(provider.provider_email);

        res.status(200).json({
            success: true,
            message: 'Provider profile updated successfully',
            data: updatedProvider
        });

    } catch (error) {
        console.error('Error updating provider profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update provider profile',
            error: error.message
        });
    }
};


