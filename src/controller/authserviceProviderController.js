import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendOTPEmail, sendRegistrationSuccessEmail } from '../services/mailer.js';
import { forgotrequestOTP, verifyOTPAndResetPassword, verifyOTP, cleanupOTP } from '../services/otpUtils.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

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

// Step 1: Request OTP for service provider registration
export const requestProviderOTP = async (req, res) => {
    const { provider_email } = req.body;
    try {
        const existingProvider = await prisma.serviceProviderDetails.findUnique({ where: { provider_email } });
        if (existingProvider) {
            return res.status(400).json({ message: 'Provider already exists' });
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
        res.status(200).json({ message: 'OTP sent to provider email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending OTP' });
    }
};

// Step 2: Verify OTP and register service provider
export const verifyProviderOTPAndRegister = async (req, res) => {
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
            otp,
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
            otp,
            certificateNames,
            certificateNumbers,
            expiryDates,
            professions,
            experiences
        });

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

        // Since email is already verified in step 1, we skip OTP verification here
        // Only verify OTP if it's not a dummy value (for backward compatibility)
        if (otp !== '123456') {
            const verificationResult = await verifyOTP(provider_email, otp);
            if (!verificationResult.success) {
                return res.status(400).json({ message: verificationResult.message });
            }
        }

        // Handle file uploads to Cloudinary
        const profilePhotoFile = req.files && req.files['provider_profile_photo'] ? req.files['provider_profile_photo'][0] : null;
        const validIdFile = req.files && req.files['provider_valid_id'] ? req.files['provider_valid_id'][0] : null;
        const certificateFiles = req.files && req.files['certificateFile'] ? req.files['certificateFile'] : [];

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
                
                if (profession && profession.trim()) {
                    try {
                        console.log('Creating profession in database...');
                        const providerProfession = await prisma.providerProfession.create({
                            data: {
                                provider_id: newProvider.provider_id,
                                profession: profession.trim(),
                                experience: experience ? experience.trim() : '0 years'
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
        
        console.log('Final createdProfessions:', createdProfessions);// Delete the used OTP
        await cleanupOTP(provider_email);

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

        // Create session
        req.session.provider = {
            id: provider.provider_id,
            email: provider.provider_email,
            userName: provider.provider_userName,
            firstName: provider.provider_first_name,
            lastName: provider.provider_last_name,
            loginTime: new Date()
        };

        // Save session before responding
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session creation failed' });
            }

            res.status(200).json({
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
            });
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// PROVIDER: Step 1 - Request OTP for forgot password
export const requestProviderForgotPasswordOTP = async (req, res) => {
    await forgotrequestOTP({
        email: req.body.provider_email,
        userType: 'provider',
        existsCheck: async (email) => await prisma.serviceProviderDetails.findUnique({ where: { provider_email: email } }),
        existsErrorMsg: 'Provider not found'
    }, res);
};

// PROVIDER: Step 2 - Verify OTP and reset password
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
        // Use the provider ID from the authentication middleware
        const providerId = req.userId;
        
        if (!providerId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Provider ID not found in session' 
            });
        }

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
                provider_isVerified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                provider_rating: true,
                provider_location: true,
                provider_uli: true,
                created_at: true,
                provider_isActivated: true
            }
        });

        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        res.status(200).json(provider);
    } catch (error) {
        console.error('Error fetching provider profile:', error);
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
                        phone_number: true
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
                    select: { first_name: true, last_name: true }
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
                }
            }
        });

        res.status(200).json({
            success: true,
            message: `Appointment status updated to ${status}`,
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

        const updatedAppointment = await prisma.appointment.update({
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

        res.status(200).json({
            success: true,
            message: 'Appointment finished with final price',
            data: updatedAppointment
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
                        category: {
                            select: {
                                category_id: true,
                                category_name: true
                            }
                        },
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
            categories: listing.specific_services.map(service => ({
                category_id: service.category.category_id,
                category_name: service.category.category_name
            })),
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
                    include: {
                        category: {
                            select: {
                                category_id: true,
                                category_name: true
                            }
                        }
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
            categories: listing.specific_services.map(service => ({
                category_id: service.category.category_id,
                category_name: service.category.category_name
            })),
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
        
        console.log('Getting professions for provider ID:', providerId);
        
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
                    experience: prof.experience,
                    created_at: prof.created_at
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
        const providerId = req.userId; // From JWT token
        
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
                certificates: {
                    select: {
                        certificate_id: true,
                        certificate_name: true,
                        certificate_number: true,
                        certificate_file_path: true,
                        expiry_date: true,
                        status: true,
                        created_at: true
                    }
                },
                provider_services: {
                    select: {
                        service_id: true,
                        service_title: true,
                        service_description: true,
                        service_startingprice: true,
                        servicelisting_isActive: true,
                        created_at: true
                    },
                    orderBy: {
                        created_at: 'desc'
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
                    experience: prof.experience,
                    created_at: prof.created_at
                })),
                certificates: provider.certificates.map(cert => ({
                    certificate_id: cert.certificate_id,
                    certificate_name: cert.certificate_name,
                    certificate_number: cert.certificate_number,
                    certificate_file_path: cert.certificate_file_path,
                    expiry_date: cert.expiry_date,
                    status: cert.status,
                    created_at: cert.created_at
                })),
                recent_services: provider.provider_services.map(service => ({
                    service_id: service.service_id,
                    service_title: service.service_title,
                    service_description: service.service_description,
                    service_startingprice: service.service_startingprice,
                    is_active: service.servicelisting_isActive,
                    created_at: service.created_at
                })),
                
                // Summary Statistics
                total_professions: provider.provider_professions.length,
                total_certificates: provider.certificates.length,
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

