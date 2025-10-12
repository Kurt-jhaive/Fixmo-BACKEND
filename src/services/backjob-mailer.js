import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.resend_API_KEY);

// Resend requires a verified domain. Use Resend's default or your verified domain
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Fixmo <onboarding@resend.dev>';

console.log('📧 Backjob Email Configuration: Using Resend API', {
    apiKeySet: process.env.resend_API_KEY ? '✓ Set' : '✗ Missing',
    fromEmail: FROM_EMAIL
});

// Helper function to send email via Resend
const sendEmailViaResend = async ({ to, subject, html, text }) => {
    try {
        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject,
            html: html || `<pre>${text}</pre>`
        });
        console.log('✅ Backjob email sent successfully:', { to, subject });
        return data;
    } catch (error) {
        console.error('❌ Resend email error:', error);
        throw error;
    }
};

// Compatibility layer: Create a transporter-like object for existing code
const transporter = {
    sendMail: async (mailOptions) => {
        return sendEmailViaResend({
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html,
            text: mailOptions.text
        });
    }
};

// BACKJOB EMAIL FUNCTIONS

// 1. BACKJOB APPLICATION - Send to Customer (Confirmation)
export const sendBackjobApplicationToCustomer = async (customerEmail, backjobDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        providerPhone,
        appointmentId,
        backjobId,
        reason,
        scheduledDate
    } = backjobDetails;

    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `Warranty Service Request Approved - Booking #${appointmentId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #28a745; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Warranty Service Approved</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${customerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Your warranty service request has been <strong style="color: #28a745;">automatically approved</strong>! 
                        The service provider will now reschedule your appointment or may dispute if they believe the original work was completed correctly.
                    </p>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Warranty Request Details</h3>
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                        <p style="margin: 5px 0;"><strong>Original Appointment:</strong> #${appointmentId}</p>
                        <p style="margin: 5px 0;"><strong>Backjob ID:</strong> #${backjobId}</p>
                        <p style="margin: 5px 0;"><strong>Original Date:</strong> ${formattedDate}</p>
                        <p style="margin: 5px 0;"><strong>Issue Reported:</strong> ${reason}</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">👨‍🔧 Service Provider</h3>
                        <p style="margin: 5px 0;"><strong>Provider:</strong> ${providerName}</p>
                        <p style="margin: 5px 0;"><strong>Contact:</strong> ${providerPhone}</p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">⏳ Next Steps</h3>
                        <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
                            <li>The provider will contact you to reschedule the warranty service</li>
                            <li>Or they may dispute the claim if they believe the work was done correctly</li>
                            <li>You'll receive updates on any status changes</li>
                            <li>If disputed, an admin will review the case</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for using our service warranty system.<br>
                        <strong>Fixmo Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 2. BACKJOB APPLICATION - Send to Provider (Notification)
export const sendBackjobApplicationToProvider = async (providerEmail, backjobDetails) => {
    const { 
        customerName, 
        customerPhone,
        serviceTitle, 
        providerName,
        appointmentId,
        backjobId,
        reason,
        scheduledDate
    } = backjobDetails;

    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `⚠️ Warranty Claim Submitted - Action Required - Booking #${appointmentId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #ffc107; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: #333; margin: 0; font-size: 24px;">⚠️ Warranty Claim Notification</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${providerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        A customer has submitted a warranty claim for a previous service. The claim has been <strong style="color: #28a745;">automatically approved</strong> 
                        and requires your immediate attention.
                    </p>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Warranty Claim Details</h3>
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                        <p style="margin: 5px 0;"><strong>Original Appointment:</strong> #${appointmentId}</p>
                        <p style="margin: 5px 0;"><strong>Backjob ID:</strong> #${backjobId}</p>
                        <p style="margin: 5px 0;"><strong>Original Date:</strong> ${formattedDate}</p>
                        <p style="margin: 5px 0;"><strong>Customer Issue:</strong> ${reason}</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">👤 Customer Information</h3>
                        <p style="margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
                        <p style="margin: 5px 0;"><strong>Contact:</strong> ${customerPhone}</p>
                    </div>

                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🎯 Required Action</h3>
                        <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">You have <strong>2 options</strong>:</p>
                        <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
                            <li><strong>Reschedule:</strong> Contact the customer and provide a new appointment time</li>
                            <li><strong>Dispute:</strong> If you believe the original work was completed correctly, you can dispute this claim</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Please take action within 24 hours to maintain good service standards.<br>
                        <strong>Fixmo Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 3. BACKJOB DISPUTE - Send to Customer (Notification)
export const sendBackjobDisputeToCustomer = async (customerEmail, backjobDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        appointmentId,
        backjobId,
        disputeReason,
        originalReason
    } = backjobDetails;

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `🚨 Warranty Claim Disputed - Booking #${appointmentId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #dc3545; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Warranty Claim Disputed</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${customerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        The service provider has <strong style="color: #dc3545;">disputed</strong> your warranty claim. 
                        An admin will now review the case and make a final decision.
                    </p>

                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Dispute Details</h3>
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                        <p style="margin: 5px 0;"><strong>Appointment:</strong> #${appointmentId}</p>
                        <p style="margin: 5px 0;"><strong>Backjob ID:</strong> #${backjobId}</p>
                        <p style="margin: 5px 0;"><strong>Provider:</strong> ${providerName}</p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📝 Your Original Issue</h3>
                        <p style="color: #333; line-height: 1.6; font-style: italic;">"${originalReason}"</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🛡️ Provider's Response</h3>
                        <p style="color: #333; line-height: 1.6; font-style: italic;">"${disputeReason}"</p>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">⏳ Next Steps</h3>
                        <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
                            <li>An admin will review both your claim and the provider's dispute</li>
                            <li>You may be contacted for additional information</li>
                            <li>A final decision will be made within 2-3 business days</li>
                            <li>You'll receive an email with the final resolution</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        We're committed to fair resolution for all parties.<br>
                        <strong>Fixmo Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 4. BACKJOB RESCHEDULED - Send to Customer (Confirmation)
export const sendBackjobRescheduleToCustomer = async (customerEmail, backjobDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        providerPhone,
        appointmentId,
        backjobId,
        newScheduledDate,
        originalReason
    } = backjobDetails;

    const formattedDate = new Date(newScheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const formattedTime = new Date(newScheduledDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `✅ Warranty Service Rescheduled - Booking #${appointmentId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #28a745; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Warranty Service Rescheduled</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${customerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Great news! Your warranty service has been <strong style="color: #28a745;">rescheduled</strong>. 
                        The service provider will return to address the issues you reported.
                    </p>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📅 New Appointment Details</h3>
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                        <p style="margin: 5px 0;"><strong>Appointment ID:</strong> #${appointmentId}</p>
                        <p style="margin: 5px 0;"><strong>Backjob ID:</strong> #${backjobId}</p>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">👨‍🔧 Service Provider</h3>
                        <p style="margin: 5px 0;"><strong>Provider:</strong> ${providerName}</p>
                        <p style="margin: 5px 0;"><strong>Contact:</strong> ${providerPhone}</p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🔧 Issue to Address</h3>
                        <p style="color: #333; line-height: 1.6; font-style: italic;">"${originalReason}"</p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c757d;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📝 Important Notes</h3>
                        <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
                            <li>This is a warranty service at no additional cost</li>
                            <li>Please be available at the scheduled time</li>
                            <li>The provider will address the specific issues mentioned</li>
                            <li>Contact the provider if you need to make changes</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for your patience with our warranty service.<br>
                        <strong>Fixmo Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 5. BACKJOB RESCHEDULED - Send to Provider (Confirmation)
export const sendBackjobRescheduleToProvider = async (providerEmail, backjobDetails) => {
    const { 
        customerName, 
        customerPhone,
        serviceTitle, 
        providerName,
        appointmentId,
        backjobId,
        newScheduledDate,
        originalReason
    } = backjobDetails;

    const formattedDate = new Date(newScheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const formattedTime = new Date(newScheduledDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `📅 Warranty Service Scheduled - Booking #${appointmentId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #007bff; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">📅 Warranty Service Scheduled</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${providerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        You have successfully rescheduled the warranty service appointment. 
                        Please ensure you're prepared to address the customer's concerns.
                    </p>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📅 Appointment Schedule</h3>
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                        <p style="margin: 5px 0;"><strong>Appointment ID:</strong> #${appointmentId}</p>
                        <p style="margin: 5px 0;"><strong>Backjob ID:</strong> #${backjobId}</p>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">👤 Customer Information</h3>
                        <p style="margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
                        <p style="margin: 5px 0;"><strong>Contact:</strong> ${customerPhone}</p>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🔧 Issue to Address</h3>
                        <p style="color: #333; line-height: 1.6; font-style: italic;">"${originalReason}"</p>
                    </div>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">✅ Service Expectations</h3>
                        <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
                            <li>Address the specific warranty issues reported</li>
                            <li>Provide quality service to maintain customer satisfaction</li>
                            <li>This is warranty work - no additional charge to customer</li>
                            <li>Update appointment status after completion</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for honoring your service warranty commitment.<br>
                        <strong>Fixmo Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 7. BACKJOB CANCELLATION - Send to Customer (Confirmation)
export const sendBackjobCancellationToCustomer = async (customerEmail, cancellationDetails) => {
    const { 
        customerName, 
        serviceTitle, 
        providerName,
        providerPhone,
        appointmentId,
        backjobId,
        cancellationReason,
        originalReason
    } = cancellationDetails;

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `Warranty Service Request Cancelled - Booking #${appointmentId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #6c757d; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🚫 Warranty Service Cancelled</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${customerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        You have successfully cancelled your warranty service request for <strong>${serviceTitle}</strong>.
                        Your warranty period has been resumed from where it was paused.
                    </p>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c757d;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Cancellation Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057; width: 40%;">Appointment ID:</td>
                                <td style="padding: 8px 0; color: #333;">#${appointmentId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Backjob ID:</td>
                                <td style="padding: 8px 0; color: #333;">#${backjobId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Service Provider:</td>
                                <td style="padding: 8px 0; color: #333;">${providerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Original Reason:</td>
                                <td style="padding: 8px 0; color: #333;">${originalReason}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Cancellation Reason:</td>
                                <td style="padding: 8px 0; color: #333;">${cancellationReason}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">ℹ️ What Happens Next</h3>
                        <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
                            <li>Your warranty period has been resumed</li>
                            <li>You can still file another warranty claim if needed</li>
                            <li>Your appointment status is back to "In Warranty"</li>
                            <li>No further action needed from you</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        If you have any questions, please contact our support team.<br>
                        <strong>Fixmo Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 8. BACKJOB CANCELLATION - Send to Provider (Notification)
export const sendBackjobCancellationToProvider = async (providerEmail, cancellationDetails) => {
    const { 
        customerName, 
        customerPhone,
        serviceTitle, 
        providerName,
        appointmentId,
        backjobId,
        cancellationReason,
        originalReason
    } = cancellationDetails;

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `Customer Cancelled Warranty Request - Booking #${appointmentId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #6c757d; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🚫 Warranty Request Cancelled</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${providerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        The customer <strong>${customerName}</strong> has cancelled their warranty service request for <strong>${serviceTitle}</strong>.
                        No action is required from you.
                    </p>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c757d;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Cancellation Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057; width: 40%;">Appointment ID:</td>
                                <td style="padding: 8px 0; color: #333;">#${appointmentId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Backjob ID:</td>
                                <td style="padding: 8px 0; color: #333;">#${backjobId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Customer:</td>
                                <td style="padding: 8px 0; color: #333;">${customerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Customer Phone:</td>
                                <td style="padding: 8px 0; color: #333;">${customerPhone}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Original Issue:</td>
                                <td style="padding: 8px 0; color: #333;">${originalReason}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Cancellation Reason:</td>
                                <td style="padding: 8px 0; color: #333;">${cancellationReason}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">ℹ️ Status Update</h3>
                        <ul style="color: #333; line-height: 1.6; padding-left: 20px;">
                            <li>The warranty service request has been cancelled</li>
                            <li>Customer's warranty period has been resumed</li>
                            <li>No rescheduling action needed from you</li>
                            <li>Customer may submit another warranty claim if needed</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for your attention to this matter.<br>
                        <strong>Fixmo Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 7. BACKJOB DISPUTE APPROVED BY ADMIN - Send to Customer
export const sendDisputeApprovedToCustomer = async (customerEmail, disputeDetails) => {
    const {
        customerName,
        serviceTitle,
        providerName,
        appointmentId,
        backjobId,
        originalReason,
        providerDisputeReason,
        adminNotes
    } = disputeDetails;

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `Warranty Dispute Approved - Backjob #${backjobId} Cancelled`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #ff9800; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">⚖️ Dispute Resolution Update</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${customerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        After reviewing the warranty service request dispute filed by <strong>${providerName}</strong>, 
                        our admin team has <strong style="color: #ff9800;">approved the provider's dispute</strong>. 
                        This means the provider's original work was completed as specified, and your warranty service request has been cancelled.
                    </p>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Service:</td>
                                <td style="padding: 8px 0; color: #333;">${serviceTitle}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Appointment ID:</td>
                                <td style="padding: 8px 0; color: #333;">#${appointmentId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Backjob ID:</td>
                                <td style="padding: 8px 0; color: #333;">#${backjobId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Provider:</td>
                                <td style="padding: 8px 0; color: #333;">${providerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Your Issue:</td>
                                <td style="padding: 8px 0; color: #333;">${originalReason}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Provider's Response:</td>
                                <td style="padding: 8px 0; color: #333;">${providerDisputeReason || 'N/A'}</td>
                            </tr>
                            ${adminNotes ? `
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Admin Notes:</td>
                                <td style="padding: 8px 0; color: #333;">${adminNotes}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                        <h3 style="color: #721c24; margin-top: 0; margin-bottom: 15px;">⚠️ What This Means</h3>
                        <ul style="color: #721c24; line-height: 1.6; padding-left: 20px;">
                            <li>Your warranty service request has been <strong>cancelled</strong></li>
                            <li>The provider's original work was determined to be satisfactory</li>
                            <li>Your warranty period will resume from its paused state</li>
                            <li>No rescheduling will occur</li>
                        </ul>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 15px;">💡 Need Further Assistance?</h3>
                        <p style="color: #0c5460; margin: 0; line-height: 1.6;">
                            If you believe this decision was made in error or if you have additional evidence, please contact our customer support team for further review.
                        </p>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        We appreciate your understanding.<br>
                        <strong>Fixmo Admin Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 8. BACKJOB DISPUTE APPROVED BY ADMIN - Send to Provider
export const sendDisputeApprovedToProvider = async (providerEmail, disputeDetails) => {
    const {
        providerName,
        customerName,
        serviceTitle,
        appointmentId,
        backjobId,
        originalReason,
        providerDisputeReason,
        adminNotes
    } = disputeDetails;

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `Dispute Approved - Backjob #${backjobId} Cancelled`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #28a745; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Your Dispute Was Approved!</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${providerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Good news! Our admin team has <strong style="color: #28a745;">approved your dispute</strong> 
                        regarding the warranty service request from <strong>${customerName}</strong>. 
                        Your original work has been confirmed as satisfactory, and the backjob request has been cancelled.
                    </p>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #155724; margin-top: 0; margin-bottom: 15px;">✓ Resolution Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Service:</td>
                                <td style="padding: 8px 0; color: #155724;">${serviceTitle}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Appointment ID:</td>
                                <td style="padding: 8px 0; color: #155724;">#${appointmentId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Backjob ID:</td>
                                <td style="padding: 8px 0; color: #155724;">#${backjobId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Customer:</td>
                                <td style="padding: 8px 0; color: #155724;">${customerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Customer's Issue:</td>
                                <td style="padding: 8px 0; color: #155724;">${originalReason}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Your Response:</td>
                                <td style="padding: 8px 0; color: #155724;">${providerDisputeReason || 'N/A'}</td>
                            </tr>
                            ${adminNotes ? `
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Admin Notes:</td>
                                <td style="padding: 8px 0; color: #155724;">${adminNotes}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 15px;">📌 What Happens Next</h3>
                        <ul style="color: #0c5460; line-height: 1.6; padding-left: 20px;">
                            <li>The warranty service request has been cancelled</li>
                            <li><strong>No action required from you</strong></li>
                            <li>Customer's warranty period will resume</li>
                            <li>This case is now closed</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for your professional service.<br>
                        <strong>Fixmo Admin Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 9. BACKJOB DISPUTE REJECTED BY ADMIN - Send to Customer
export const sendDisputeRejectedToCustomer = async (customerEmail, disputeDetails) => {
    const {
        customerName,
        serviceTitle,
        providerName,
        providerPhone,
        appointmentId,
        backjobId,
        originalReason,
        providerDisputeReason,
        adminNotes
    } = disputeDetails;

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: customerEmail,
        subject: `Dispute Rejected - Backjob #${backjobId} Remains Active`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #28a745; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Your Request Stands!</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${customerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Good news! After reviewing the dispute filed by <strong>${providerName}</strong>, 
                        our admin team has <strong style="color: #28a745;">rejected the provider's dispute</strong>. 
                        Your warranty service request remains <strong>active and valid</strong>, and the provider will proceed with rescheduling your appointment.
                    </p>

                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #155724; margin-top: 0; margin-bottom: 15px;">📋 Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Service:</td>
                                <td style="padding: 8px 0; color: #155724;">${serviceTitle}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Appointment ID:</td>
                                <td style="padding: 8px 0; color: #155724;">#${appointmentId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Backjob ID:</td>
                                <td style="padding: 8px 0; color: #155724;">#${backjobId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Provider:</td>
                                <td style="padding: 8px 0; color: #155724;">${providerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Provider Phone:</td>
                                <td style="padding: 8px 0; color: #155724;">${providerPhone}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Your Issue:</td>
                                <td style="padding: 8px 0; color: #155724;">${originalReason}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Provider's Dispute:</td>
                                <td style="padding: 8px 0; color: #155724;">${providerDisputeReason || 'N/A'}</td>
                            </tr>
                            ${adminNotes ? `
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Admin Notes:</td>
                                <td style="padding: 8px 0; color: #155724;">${adminNotes}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 15px;">⏳ What Happens Next</h3>
                        <ul style="color: #0c5460; line-height: 1.6; padding-left: 20px;">
                            <li>Your warranty service request remains <strong>active</strong></li>
                            <li>The provider (<strong>${providerName}</strong>) will contact you to reschedule</li>
                            <li>Your warranty remains paused until the service is completed</li>
                            <li>You'll receive another notification once rescheduled</li>
                        </ul>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for your patience.<br>
                        <strong>Fixmo Admin Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

// 10. BACKJOB DISPUTE REJECTED BY ADMIN - Send to Provider
export const sendDisputeRejectedToProvider = async (providerEmail, disputeDetails) => {
    const {
        providerName,
        customerName,
        customerPhone,
        serviceTitle,
        appointmentId,
        backjobId,
        originalReason,
        providerDisputeReason,
        adminNotes
    } = disputeDetails;

    const mailOptions = {
        from: process.env.MAILER_USER,
        to: providerEmail,
        subject: `Dispute Rejected - Please Reschedule Backjob #${backjobId}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #dc3545; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Dispute Decision Update</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${providerName}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        After careful review, our admin team has <strong style="color: #dc3545;">rejected your dispute</strong> 
                        regarding the warranty service request from <strong>${customerName}</strong>. 
                        The customer's warranty claim is valid, and you are required to reschedule the appointment to address the reported issue.
                    </p>

                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                        <h3 style="color: #721c24; margin-top: 0; margin-bottom: 15px;">📋 Backjob Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #f5c6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Service:</td>
                                <td style="padding: 8px 0; color: #721c24;">${serviceTitle}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f5c6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Appointment ID:</td>
                                <td style="padding: 8px 0; color: #721c24;">#${appointmentId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f5c6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Backjob ID:</td>
                                <td style="padding: 8px 0; color: #721c24;">#${backjobId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f5c6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Customer:</td>
                                <td style="padding: 8px 0; color: #721c24;">${customerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f5c6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Customer Phone:</td>
                                <td style="padding: 8px 0; color: #721c24;">${customerPhone}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f5c6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Customer's Issue:</td>
                                <td style="padding: 8px 0; color: #721c24;">${originalReason}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f5c6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Your Dispute:</td>
                                <td style="padding: 8px 0; color: #721c24;">${providerDisputeReason || 'N/A'}</td>
                            </tr>
                            ${adminNotes ? `
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #721c24;">Admin Notes:</td>
                                <td style="padding: 8px 0; color: #721c24;">${adminNotes}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #856404; margin-top: 0; margin-bottom: 15px;">⚠️ Action Required</h3>
                        <ul style="color: #856404; line-height: 1.6; padding-left: 20px;">
                            <li><strong>Contact the customer immediately</strong> to schedule a new appointment</li>
                            <li>Address the reported issue: <em>${originalReason}</em></li>
                            <li>Complete the warranty service at no additional charge to the customer</li>
                            <li>Use the app to reschedule the backjob appointment</li>
                        </ul>
                    </div>

                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 15px;">💡 Important Notes</h3>
                        <p style="color: #0c5460; margin: 0; line-height: 1.6;">
                            Failure to complete warranty services may impact your provider rating and future bookings. 
                            If you have concerns about this decision, please contact our admin team for further discussion.
                        </p>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for your cooperation.<br>
                        <strong>Fixmo Admin Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};