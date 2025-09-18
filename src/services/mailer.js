import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST,
    port: process.env.MAILER_PORT,
    secure: process.env.MAILER_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS
    }
});

export const sendOTPEmail = async (to, otp) => {
    const mailOptions = {
        from: process.env.MAILER_USER,
        to,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`
    };
    await transporter.sendMail(mailOptions);
};

export const sendRegistrationSuccessEmail = async (to, userName) => {
    const mailOptions = {
        from: process.env.MAILER_USER,
        to,
        subject: 'Registration Successful',
        text: `Hello ${userName},\n\nYour registration was successful! Welcome aboard.\n\nBest regards,\nYour Team`
    };
    await transporter.sendMail(mailOptions);
};

// 1. BOOKING CONFIRMATION - Send to Customer
export const sendBookingConfirmationToCustomer = async (customerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        providerPhone,
        providerEmail,
        scheduledDate, 
        appointmentId,
        startingPrice,
        repairDescription
    } = bookingDetails;
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `Booking Confirmation - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #28a745; margin-bottom: 10px;">✅ Booking Confirmed!</h1>
                        <p style="color: #666; font-size: 16px;">Your service appointment has been successfully booked</p>
                    </div>
                    
                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
                        <h3 style="margin-top: 0; color: #155724;">Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'TBD'}</p>
                        ${repairDescription ? `<p><strong>Description:</strong> ${repairDescription}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404;">Service Provider Details</h3>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Phone:</strong> ${providerPhone}</p>
                        <p><strong>Email:</strong> ${providerEmail}</p>
                    </div>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #155724;">Next Steps</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #155724;">
                            <li>Your service provider will contact you to confirm the appointment</li>
                            <li>The final price will be determined after the service assessment</li>
                            <li>You can track your booking status in your dashboard</li>
                            <li>Please be available at the scheduled time</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Need help? Contact us:</p>
                        <p style="color: #007bff; margin: 0;">support@fixmo.com</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 1. BOOKING CONFIRMATION - Send to Service Provider
export const sendBookingConfirmationToProvider = async (providerEmail, bookingDetails) => {
    const { 
        customerName, 
        customerPhone,
        customerEmail,
        serviceTitle, 
        providerName,
        scheduledDate, 
        appointmentId,
        startingPrice,
        repairDescription
    } = bookingDetails;
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `New Booking Received - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #007bff; margin-bottom: 10px;">🔔 New Booking Received!</h1>
                        <p style="color: #666; font-size: 16px;">You have a new service appointment</p>
                    </div>
                    
                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #007bff;">
                        <h3 style="margin-top: 0; color: #0056b3;">Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'TBD'}</p>
                        ${repairDescription ? `<p><strong>Service Description:</strong> ${repairDescription}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404;">Customer Information</h3>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Phone:</strong> ${customerPhone}</p>
                        <p><strong>Email:</strong> ${customerEmail}</p>
                    </div>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #155724;">Action Required</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #155724;">
                            <li>Contact the customer to confirm the appointment details</li>
                            <li>Assess the service requirements and provide final pricing</li>
                            <li>Update the booking status in your dashboard</li>
                            <li>Prepare for the scheduled appointment</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Manage your bookings:</p>
                        <p style="color: #007bff; margin: 0;">Login to your provider dashboard</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated notification from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 2. BOOKING CANCELLATION - Send to Customer
export const sendBookingCancellationToCustomer = async (customerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        scheduledDate, 
        appointmentId,
        cancellationReason 
    } = bookingDetails;
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `Booking Cancellation Confirmed - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #e74c3c; margin-bottom: 10px;">❌ Booking Cancelled</h1>
                        <p style="color: #666; font-size: 16px;">Your booking has been successfully cancelled</p>
                    </div>
                    
                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #e74c3c;">
                        <h3 style="margin-top: 0; color: #721c24;">Cancelled Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404;">Cancellation Reason</h3>
                        <p style="margin-bottom: 0; color: #856404;">${cancellationReason || 'No reason provided'}</p>
                    </div>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #155724;">What's Next?</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #155724;">
                            <li>Your booking has been cancelled and the provider has been notified</li>
                            <li>You can book a new service anytime from your dashboard</li>
                            <li>No charges will be applied for this cancellation</li>
                            <li>Thank you for using Fixmo</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Need help? Contact us:</p>
                        <p style="color: #007bff; margin: 0;">support@fixmo.com</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 2. BOOKING CANCELLATION - Send to Service Provider (Already exists, keeping it)
export const sendBookingCancellationEmail = async (providerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        scheduledDate, 
        appointmentId,
        cancellationReason 
    } = bookingDetails;
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `Booking Cancellation - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #e74c3c; margin-bottom: 20px;">Booking Cancellation Notification</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
                    <p><strong>Customer:</strong> ${customerName}</p>
                    <p><strong>Service:</strong> ${serviceTitle}</p>
                    <p><strong>Scheduled Date:</strong> ${formattedDate}</p>
                    <p><strong>Appointment ID:</strong> #${appointmentId}</p>
                </div>

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                    <h4 style="margin-top: 0; color: #856404;">Cancellation Reason</h4>
                    <p style="margin-bottom: 0; color: #856404;">${cancellationReason || 'No reason provided'}</p>
                </div>

                <p style="color: #666; margin-bottom: 20px;">
                    The customer has canceled their booking. This time slot is now available for new bookings.
                </p>

                <div style="text-align: center; margin-top: 30px;">
                    <p style="color: #888; font-size: 12px;">
                        This is an automated notification from Fixmo.<br>
                        Please do not reply to this email.
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 3. BOOKING COMPLETION - Send to Customer
export const sendBookingCompletionToCustomer = async (customerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        scheduledDate, 
        appointmentId,
        finalPrice,
        startingPrice
    } = bookingDetails;
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `Service Completed - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #28a745; margin-bottom: 10px;">✅ Service Completed!</h1>
                        <p style="color: #666; font-size: 16px;">Your service has been successfully completed</p>
                    </div>
                    
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
                        <h3 style="margin-top: 0; color: #155724;">Service Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Completed Date:</strong> ${formattedDate}</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #007bff;">
                        <h3 style="margin-top: 0; color: #0056b3;">Pricing Summary</h3>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'N/A'}</p>
                        <p><strong>Final Price:</strong> ₱${finalPrice ? finalPrice.toFixed(2) : 'To be determined'}</p>
                        ${finalPrice ? `<p style="color: #28a745;"><strong>Total Amount:</strong> ₱${finalPrice.toFixed(2)}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #856404;">What's Next?</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #856404;">
                            <li>Please rate your experience with the service provider</li>
                            <li>Process payment with the service provider directly</li>
                            <li>Keep this email for your records</li>
                            <li>Book another service anytime from your dashboard</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Thank you for using Fixmo!</p>
                        <p style="color: #007bff; margin: 0;">support@fixmo.com</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 3. BOOKING COMPLETION - Send to Service Provider
export const sendBookingCompletionToProvider = async (providerEmail, bookingDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        scheduledDate, 
        appointmentId,
        finalPrice,
        startingPrice
    } = bookingDetails;
    
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `Service Completion Confirmed - ${serviceTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Service Completed!</h1>
                        <p style="color: #666; font-size: 16px;">Great job completing the service!</p>
                    </div>
                    
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #28a745;">
                        <h3 style="margin-top: 0; color: #155724;">Completed Service Details</h3>
                        <p><strong>Booking ID:</strong> #${appointmentId}</p>
                        <p><strong>Service:</strong> ${serviceTitle}</p>
                        <p><strong>Customer:</strong> ${customerName}</p>
                        <p><strong>Provider:</strong> ${providerName}</p>
                        <p><strong>Completed Date:</strong> ${formattedDate}</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #007bff;">
                        <h3 style="margin-top: 0; color: #0056b3;">Pricing Information</h3>
                        <p><strong>Starting Price:</strong> ₱${startingPrice ? startingPrice.toFixed(2) : 'N/A'}</p>
                        <p><strong>Final Price:</strong> ₱${finalPrice ? finalPrice.toFixed(2) : 'To be determined'}</p>
                        ${finalPrice ? `<p style="color: #28a745;"><strong>Service Fee:</strong> ₱${finalPrice.toFixed(2)}</p>` : ''}
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #856404;">Payment & Next Steps</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #856404;">
                            <li>The customer has been notified of the completion</li>
                            <li>Process payment with the customer directly</li>
                            <li>The customer may rate and review your service</li>
                            <li>Keep this email for your records</li>
                        </ul>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Thank you for providing excellent service!</p>
                        <p style="color: #007bff; margin: 0;">Keep up the great work!</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            This is an automated confirmation from Fixmo.<br>
                            Please do not reply to this email.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};
// =======================
// ADMIN NOTIFICATION EMAILS
// =======================

// 1. USER APPROVAL EMAIL
export const sendUserApprovalEmail = async (userEmail, userDetails) => {
    const { firstName, lastName, userName } = userDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: userEmail,
        subject: '🎉 Account Approved - Welcome to Fixmo!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Account Approved!</h1>
                        <p style="color: #666; font-size: 16px;">Congratulations! Your Fixmo account has been verified and approved</p>
                    </div>
                    
                    <div style="background-color: #d4f6d4; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #28a745;">
                        <h3 style="margin-top: 0; color: #155724; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">✅</span>
                            Account Details
                        </h3>
                        <p style="margin: 10px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                        <p style="margin: 10px 0;"><strong>Username:</strong> ${userName}</p>
                        <p style="margin: 10px 0;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">✓ Verified & Active</span></p>
                    </div>

                    <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #1976d2; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🚀</span>
                            What's Next?
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #1976d2;">
                            <li>Browse and book services from verified providers</li>
                            <li>Track your appointments in real-time</li>
                            <li>Rate and review service providers</li>
                            <li>Manage your profile and preferences</li>
                        </ul>
                    </div>

                    <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #ef6c00;">📱 Download the Fixmo App</h3>
                        <p style="color: #ef6c00; margin: 0;">Get the best experience with our mobile app - book services, chat with providers, and track your appointments on the go!</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            Start Booking Services
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Need assistance? We're here to help!</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 support@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📞 1-800-FIXMO</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            Welcome to the Fixmo family!<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 2. SERVICE PROVIDER APPROVAL EMAIL  
export const sendProviderApprovalEmail = async (providerEmail, providerDetails) => {
    const { firstName, lastName, userName, location } = providerDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: '🏆 Provider Account Approved - Start Earning with Fixmo!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #007bff; margin-bottom: 10px;">🏆 Provider Account Approved!</h1>
                        <p style="color: #666; font-size: 16px;">Congratulations! You're now a verified Fixmo service provider</p>
                    </div>
                    
                    <div style="background-color: #e3f2fd; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #007bff;">
                        <h3 style="margin-top: 0; color: #0d47a1; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">👨‍🔧</span>
                            Provider Details
                        </h3>
                        <p style="margin: 10px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                        <p style="margin: 10px 0;"><strong>Username:</strong> ${userName}</p>
                        <p style="margin: 10px 0;"><strong>Email:</strong> ${providerEmail}</p>
                        <p style="margin: 10px 0;"><strong>Service Area:</strong> ${location || 'Not specified'}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #007bff; font-weight: bold;">✓ Verified Provider</span></p>
                    </div>

                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #2e7d32; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">💰</span>
                            Start Earning Today!
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #2e7d32;">
                            <li>Create your service listings and set your rates</li>
                            <li>Upload certificates to boost credibility</li>
                            <li>Set your availability schedule</li>
                            <li>Accept bookings and grow your business</li>
                        </ul>
                    </div>

                    <div style="background-color: #fff8e1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #f57f17; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">⭐</span>
                            Pro Tips for Success
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #f57f17;">
                            <li>Complete your profile with professional photos</li>
                            <li>Respond quickly to customer inquiries</li>
                            <li>Maintain high service quality for better ratings</li>
                            <li>Keep your availability updated</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
                            Access Provider Dashboard
                        </a>
                        <a href="#" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            Create Service Listings
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Provider Support & Resources</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 providers@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📚 Provider Handbook</p>
                        <p style="color: #007bff; margin: 5px 0;">💬 Provider Community</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            Welcome to the Fixmo provider network!<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 3. CERTIFICATE APPROVAL EMAIL
export const sendCertificateApprovalEmail = async (providerEmail, certificateDetails) => {
    const { certificateName, providerName, certificateNumber } = certificateDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: '📜 Certificate Approved - Enhanced Credibility on Fixmo!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6f42c1; margin-bottom: 10px;">📜 Certificate Approved!</h1>
                        <p style="color: #666; font-size: 16px;">Your professional certificate has been verified and approved</p>
                    </div>
                    
                    <div style="background-color: #f3e5f5; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #6f42c1;">
                        <h3 style="margin-top: 0; color: #4a148c; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">🎖️</span>
                            Certificate Details
                        </h3>
                        <p style="margin: 10px 0;"><strong>Provider:</strong> ${providerName}</p>
                        <p style="margin: 10px 0;"><strong>Certificate:</strong> ${certificateName}</p>
                        <p style="margin: 10px 0;"><strong>Certificate Number:</strong> ${certificateNumber}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #6f42c1; font-weight: bold;">✓ Approved & Verified</span></p>
                    </div>

                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #2e7d32; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🚀</span>
                            Benefits of Verified Certificates
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #2e7d32;">
                            <li>Enhanced credibility and trust with customers</li>
                            <li>Higher visibility in search results</li>
                            <li>Ability to offer specialized services</li>
                            <li>Increased booking potential</li>
                        </ul>
                    </div>

                    <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #ef6c00; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">💡</span>
                            Next Steps
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #ef6c00;">
                            <li>Update your service listings to highlight your certification</li>
                            <li>Add this certificate to your professional portfolio</li>
                            <li>Consider earning additional certifications</li>
                            <li>Share your verified status with potential customers</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #6f42c1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            View My Certificates
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Questions about your certification?</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 certifications@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📋 Certification Guidelines</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            Congratulations on your verified certification!<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 4. USER DEACTIVATION EMAIL
export const sendUserDeactivationEmail = async (userEmail, userDetails, reason) => {
    const { firstName, lastName, userName } = userDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: userEmail,
        subject: '⚠️ Account Deactivated - Fixmo Support Required',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #dc3545; margin-bottom: 10px;">⚠️ Account Deactivated</h1>
                        <p style="color: #666; font-size: 16px;">Your Fixmo account has been temporarily deactivated</p>
                    </div>
                    
                    <div style="background-color: #f8d7da; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #dc3545;">
                        <h3 style="margin-top: 0; color: #721c24; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">👤</span>
                            Account Information
                        </h3>
                        <p style="margin: 10px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                        <p style="margin: 10px 0;"><strong>Username:</strong> ${userName}</p>
                        <p style="margin: 10px 0;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">⏸️ Deactivated</span></p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">📋</span>
                            Reason for Deactivation
                        </h3>
                        <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
                            <p style="margin: 0; color: #856404; font-weight: bold;">${reason}</p>
                        </div>
                    </div>

                    <div style="background-color: #cce5ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #004085; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🔄</span>
                            How to Reactivate Your Account
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #004085;">
                            <li>Review and address the reason for deactivation</li>
                            <li>Contact our support team for assistance</li>
                            <li>Provide any required documentation</li>
                            <li>Wait for account review and reactivation</li>
                        </ol>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #0c5460;">🛡️ Account Security Notice</h3>
                        <p style="color: #0c5460; margin: 0;">While your account is deactivated, you will not be able to access Fixmo services. Your data remains secure and will be restored upon reactivation.</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            Contact Support
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Need immediate assistance?</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 support@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📞 1-800-FIXMO</p>
                        <p style="color: #007bff; margin: 5px 0;">💬 Live Chat Support</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            We're here to help resolve this matter quickly.<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 5. PROVIDER DEACTIVATION EMAIL
export const sendProviderDeactivationEmail = async (providerEmail, providerDetails, reason) => {
    const { firstName, lastName, userName, location } = providerDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: '⚠️ Provider Account Deactivated - Action Required',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #dc3545; margin-bottom: 10px;">⚠️ Provider Account Deactivated</h1>
                        <p style="color: #666; font-size: 16px;">Your service provider account has been temporarily deactivated</p>
                    </div>
                    
                    <div style="background-color: #f8d7da; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #dc3545;">
                        <h3 style="margin-top: 0; color: #721c24; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">👨‍🔧</span>
                            Provider Information
                        </h3>
                        <p style="margin: 10px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                        <p style="margin: 10px 0;"><strong>Username:</strong> ${userName}</p>
                        <p style="margin: 10px 0;"><strong>Email:</strong> ${providerEmail}</p>
                        <p style="margin: 10px 0;"><strong>Service Area:</strong> ${location || 'Not specified'}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">⏸️ Deactivated</span></p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                        <h3 style="margin-top: 0; color: #856404; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">📋</span>
                            Reason for Deactivation
                        </h3>
                        <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
                            <p style="margin: 0; color: #856404; font-weight: bold;">${reason}</p>
                        </div>
                    </div>

                    <div style="background-color: #ffe6e6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #d63031; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🚫</span>
                            Service Impact
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #d63031;">
                            <li>Your services are no longer visible to customers</li>
                            <li>You cannot accept new bookings</li>
                            <li>Existing appointments may be affected</li>
                            <li>Earnings and payments are temporarily on hold</li>
                        </ul>
                    </div>

                    <div style="background-color: #cce5ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #004085; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🔄</span>
                            Steps to Reactivation
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #004085;">
                            <li>Address the specific issue mentioned in the reason</li>
                            <li>Contact our provider support team</li>
                            <li>Submit any required documentation or evidence</li>
                            <li>Complete additional verification if needed</li>
                            <li>Wait for account review and approval</li>
                        </ol>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
                            Contact Provider Support
                        </a>
                        <a href="#" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            Submit Appeal
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Provider Support & Appeals</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 providers@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📞 1-800-PROVIDER</p>
                        <p style="color: #007bff; margin: 5px 0;">📋 Provider Guidelines</p>
                        <p style="color: #007bff; margin: 5px 0;">⚖️ Appeals Process</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            We value your partnership and want to resolve this quickly.<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 6. USER VERIFICATION REJECTION EMAIL
export const sendUserRejectionEmail = async (userEmail, userDetails, reason) => {
    const { firstName, lastName, userName } = userDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: userEmail,
        subject: '❌ Account Verification Declined - Additional Information Needed',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #e74c3c; margin-bottom: 10px;">❌ Verification Declined</h1>
                        <p style="color: #666; font-size: 16px;">Your account verification requires additional attention</p>
                    </div>
                    
                    <div style="background-color: #ffeaa7; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #fdcb6e;">
                        <h3 style="margin-top: 0; color: #e17055; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">👤</span>
                            Account Information
                        </h3>
                        <p style="margin: 10px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                        <p style="margin: 10px 0;"><strong>Username:</strong> ${userName}</p>
                        <p style="margin: 10px 0;"><strong>Email:</strong> ${userEmail}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #e17055; font-weight: bold;">⏳ Verification Pending</span></p>
                    </div>

                    <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f44336;">
                        <h3 style="margin-top: 0; color: #c62828; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">📋</span>
                            Reason for Decline
                        </h3>
                        <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ffcdd2;">
                            <p style="margin: 0; color: #c62828; font-weight: bold;">${reason}</p>
                        </div>
                    </div>

                    <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #1976d2; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🔄</span>
                            Next Steps to Complete Verification
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #1976d2;">
                            <li>Review the reason for decline carefully</li>
                            <li>Gather the required documentation or information</li>
                            <li>Update your profile with corrected details</li>
                            <li>Resubmit your verification request</li>
                            <li>Contact support if you need assistance</li>
                        </ol>
                    </div>

                    <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #7b1fa2;">📝 Common Verification Requirements</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #7b1fa2;">
                            <li>Clear, readable photo of valid government ID</li>
                            <li>Complete and accurate personal information</li>
                            <li>Verifiable contact details</li>
                            <li>Professional profile photo (if required)</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
                            Update Profile
                        </a>
                        <a href="#" style="background-color: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            Contact Support
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Need help with verification?</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 verification@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📞 1-800-VERIFY</p>
                        <p style="color: #007bff; margin: 5px 0;">📋 Verification Guide</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            We're here to help you complete the verification process.<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 7. PROVIDER VERIFICATION REJECTION EMAIL
export const sendProviderRejectionEmail = async (providerEmail, providerDetails, reason) => {
    const { firstName, lastName, userName, location } = providerDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: '❌ Provider Verification Declined - Resubmission Required',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #e74c3c; margin-bottom: 10px;">❌ Provider Verification Declined</h1>
                        <p style="color: #666; font-size: 16px;">Your provider application requires additional documentation</p>
                    </div>
                    
                    <div style="background-color: #ffeaa7; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #fdcb6e;">
                        <h3 style="margin-top: 0; color: #e17055; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">👨‍🔧</span>
                            Provider Application Details
                        </h3>
                        <p style="margin: 10px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                        <p style="margin: 10px 0;"><strong>Username:</strong> ${userName}</p>
                        <p style="margin: 10px 0;"><strong>Email:</strong> ${providerEmail}</p>
                        <p style="margin: 10px 0;"><strong>Service Area:</strong> ${location || 'Not specified'}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #e17055; font-weight: bold;">⏳ Verification Pending</span></p>
                    </div>

                    <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f44336;">
                        <h3 style="margin-top: 0; color: #c62828; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">📋</span>
                            Reason for Decline
                        </h3>
                        <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ffcdd2;">
                            <p style="margin: 0; color: #c62828; font-weight: bold;">${reason}</p>
                        </div>
                    </div>

                    <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #1976d2; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🔄</span>
                            Steps to Complete Provider Verification
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #1976d2;">
                            <li>Address the specific issues mentioned above</li>
                            <li>Update your provider profile information</li>
                            <li>Upload clear, valid identification documents</li>
                            <li>Provide proof of professional qualifications</li>
                            <li>Resubmit your provider application</li>
                        </ol>
                    </div>

                    <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #7b1fa2;">📝 Provider Verification Checklist</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #7b1fa2;">
                            <li>✓ Clear government-issued photo ID</li>
                            <li>✓ Proof of business registration (if applicable)</li>
                            <li>✓ Professional certifications and licenses</li>
                            <li>✓ Complete service area information</li>
                            <li>✓ Professional profile photo</li>
                            <li>✓ Accurate contact and location details</li>
                        </ul>
                    </div>

                    <div style="background-color: #fff8e1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #f57c00;">⏰ Important Notes</h3>
                        <p style="color: #f57c00; margin: 0;">Your application will remain active for 30 days. Please resubmit with the required information within this timeframe to avoid having to restart the process.</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
                            Update Application
                        </a>
                        <a href="#" style="background-color: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            Provider Support
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Provider Application Support</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 providers@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📞 1-800-PROVIDER</p>
                        <p style="color: #007bff; margin: 5px 0;">📋 Provider Guidelines</p>
                        <p style="color: #007bff; margin: 5px 0;">🎥 Verification Tutorial</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            We look forward to welcoming you to our provider network.<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 8. CERTIFICATE REJECTION EMAIL
export const sendCertificateRejectionEmail = async (providerEmail, certificateDetails, reason) => {
    const { certificateName, providerName, certificateNumber } = certificateDetails;
    
    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: '❌ Certificate Verification Declined - Resubmission Required',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #e74c3c; margin-bottom: 10px;">❌ Certificate Verification Declined</h1>
                        <p style="color: #666; font-size: 16px;">Your certificate submission requires additional review</p>
                    </div>
                    
                    <div style="background-color: #ffeaa7; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #fdcb6e;">
                        <h3 style="margin-top: 0; color: #e17055; display: flex; align-items: center;">
                            <span style="font-size: 24px; margin-right: 10px;">📜</span>
                            Certificate Submission Details
                        </h3>
                        <p style="margin: 10px 0;"><strong>Provider:</strong> ${providerName}</p>
                        <p style="margin: 10px 0;"><strong>Certificate:</strong> ${certificateName}</p>
                        <p style="margin: 10px 0;"><strong>Certificate Number:</strong> ${certificateNumber}</p>
                        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #e17055; font-weight: bold;">❌ Declined</span></p>
                    </div>

                    <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f44336;">
                        <h3 style="margin-top: 0; color: #c62828; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">📋</span>
                            Reason for Decline
                        </h3>
                        <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ffcdd2;">
                            <p style="margin: 0; color: #c62828; font-weight: bold;">${reason}</p>
                        </div>
                    </div>

                    <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #1976d2; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">🔄</span>
                            Steps to Resubmit Certificate
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #1976d2;">
                            <li>Review the specific decline reason above</li>
                            <li>Obtain the correct or updated certificate</li>
                            <li>Ensure document quality and legibility</li>
                            <li>Verify all certificate information is current</li>
                            <li>Resubmit through your provider dashboard</li>
                        </ol>
                    </div>

                    <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #7b1fa2;">📝 Certificate Requirements</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #7b1fa2;">
                            <li>✓ High-resolution, clear image or PDF</li>
                            <li>✓ Current and not expired</li>
                            <li>✓ Issued by recognized authority</li>
                            <li>✓ Complete certificate with all details visible</li>
                            <li>✓ Matches your registered provider name</li>
                            <li>✓ Relevant to your service offerings</li>
                        </ul>
                    </div>

                    <div style="background-color: #fff8e1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="margin-top: 0; color: #f57c00; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">💡</span>
                            Tips for Successful Submission
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #f57c00;">
                            <li>Use good lighting when photographing certificates</li>
                            <li>Ensure all text is clearly readable</li>
                            <li>Include the complete certificate, not partial views</li>
                            <li>Submit official copies, not photocopies when possible</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin-right: 10px;">
                            Resubmit Certificate
                        </a>
                        <a href="#" style="background-color: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                            Get Help
                        </a>
                    </div>

                    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 10px;">Certificate Verification Support</p>
                        <p style="color: #007bff; margin: 5px 0;">📧 certifications@fixmo.com</p>
                        <p style="color: #007bff; margin: 5px 0;">📞 1-800-CERTIFY</p>
                        <p style="color: #007bff; margin: 5px 0;">📋 Certificate Guidelines</p>
                        <p style="color: #007bff; margin: 5px 0;">❓ FAQ - Certificate Verification</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #888; font-size: 12px;">
                            We appreciate your commitment to professional standards.<br>
                            This is an automated notification from Fixmo.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};
