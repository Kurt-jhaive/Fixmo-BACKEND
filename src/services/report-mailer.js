import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.resend_API_KEY);

// Admin email for receiving reports
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ipafixmo@gmail.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Fixmo <onboarding@resend.dev>';

console.log('📧 Report Email Configuration:', {
    apiKeySet: process.env.resend_API_KEY ? '✓ Set' : '✗ Missing',
    adminEmail: ADMIN_EMAIL,
    fromEmail: FROM_EMAIL
});

// Helper function to send email via Resend
const sendEmailViaResend = async ({ to, subject, html, text, replyTo }) => {
    try {
        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: Array.isArray(to) ? to : [to],
            subject,
            html: html || `<pre>${text}</pre>`,
            replyTo: replyTo || undefined
        });
        console.log('✅ Report email sent successfully:', { to, subject });
        return data;
    } catch (error) {
        console.error('❌ Resend email error:', error);
        throw error;
    }
};

// Compatibility layer
const transporter = {
    sendMail: async (mailOptions) => {
        return sendEmailViaResend({
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html,
            text: mailOptions.text,
            replyTo: mailOptions.replyTo
        });
    }
};

// Map report types to readable labels
const REPORT_TYPE_LABELS = {
    'bug': '🐛 Bug Report',
    'complaint': '😠 Complaint',
    'feedback': '💡 Feedback',
    'account_issue': '👤 Account Issue',
    'payment_issue': '💳 Payment Issue',
    'provider_issue': '👨‍🔧 Provider Issue',
    'safety_concern': '⚠️ Safety Concern',
    'other': '📝 Other'
};

// Map priority to colors
const PRIORITY_COLORS = {
    'low': '#17a2b8',
    'normal': '#28a745',
    'high': '#ffc107',
    'urgent': '#dc3545'
};

// Map priority to labels
const PRIORITY_LABELS = {
    'low': '🔵 Low',
    'normal': '🟢 Normal',
    'high': '🟡 High',
    'urgent': '🔴 URGENT'
};

/**
 * Send report notification to admin
 * Admin can reply directly to the reporter's email
 */
export const sendReportToAdmin = async (reportDetails) => {
    const {
        report_id,
        reporter_name,
        reporter_email,
        reporter_phone,
        reporter_type,
        provider_id,
        appointment_id,
        report_type,
        subject,
        description,
        priority,
        attachment_urls,
        created_at
    } = reportDetails;

    const reportTypeLabel = REPORT_TYPE_LABELS[report_type] || '📝 Report';
    const priorityLabel = PRIORITY_LABELS[priority] || '🟢 Normal';
    const priorityColor = PRIORITY_COLORS[priority] || '#28a745';

    const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Build attachments section if exists
    let attachmentsHTML = '';
    if (attachment_urls && attachment_urls.length > 0) {
        const attachmentLinks = attachment_urls.map((url, index) => 
            `<li><a href="${url}" target="_blank" style="color: #007bff;">Attachment ${index + 1}</a></li>`
        ).join('');
        attachmentsHTML = `
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 10px;">📎 Attachments</h3>
                <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
                    ${attachmentLinks}
                </ul>
            </div>
        `;
    }

    const mailOptions = {
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        replyTo: reporter_email, // Admin can reply directly to reporter
        subject: `[Fixmo Report #${report_id}] ${reportTypeLabel} - ${subject}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: ${priorityColor}; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">📢 New Report Received</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Priority Badge -->
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="display: inline-block; background-color: ${priorityColor}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                            ${priorityLabel}
                        </span>
                    </div>

                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                        A new report has been submitted on the Fixmo platform. Please review and respond as needed.
                    </p>

                    <!-- Report Details -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${priorityColor};">
                        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">📋 Report Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 10px 0; font-weight: bold; color: #495057; width: 35%;">Report ID:</td>
                                <td style="padding: 10px 0; color: #333;">#${report_id}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 10px 0; font-weight: bold; color: #495057;">Type:</td>
                                <td style="padding: 10px 0; color: #333;">${reportTypeLabel}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 10px 0; font-weight: bold; color: #495057;">Subject:</td>
                                <td style="padding: 10px 0; color: #333;"><strong>${subject}</strong></td>
                            </tr>
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 10px 0; font-weight: bold; color: #495057;">Submitted:</td>
                                <td style="padding: 10px 0; color: #333;">${formattedDate}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Reporter Information -->
                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 15px;">👤 Reporter Information</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #bee5eb;">
                                <td style="padding: 10px 0; font-weight: bold; color: #0c5460; width: 35%;">Name:</td>
                                <td style="padding: 10px 0; color: #0c5460;">${reporter_name}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #bee5eb;">
                                <td style="padding: 10px 0; font-weight: bold; color: #0c5460;">Email:</td>
                                <td style="padding: 10px 0; color: #0c5460;">
                                    <a href="mailto:${reporter_email}" style="color: #0c5460; text-decoration: underline;">
                                        ${reporter_email}
                                    </a>
                                </td>
                            </tr>
                            ${reporter_phone ? `
                            <tr style="border-bottom: 1px solid #bee5eb;">
                                <td style="padding: 10px 0; font-weight: bold; color: #0c5460;">Phone:</td>
                                <td style="padding: 10px 0; color: #0c5460;">
                                    <a href="tel:${reporter_phone}" style="color: #0c5460; text-decoration: underline;">
                                        ${reporter_phone}
                                    </a>
                                </td>
                            </tr>
                            ` : ''}
                            ${reporter_type ? `
                            <tr style="border-bottom: 1px solid #bee5eb;">
                                <td style="padding: 10px 0; font-weight: bold; color: #0c5460;">User Type:</td>
                                <td style="padding: 10px 0; color: #0c5460;">${reporter_type.toUpperCase()}</td>
                            </tr>
                            ` : ''}
                            ${provider_id ? `
                            <tr style="border-bottom: 1px solid #bee5eb;">
                                <td style="padding: 10px 0; font-weight: bold; color: #0c5460;">Provider ID:</td>
                                <td style="padding: 10px 0; color: #0c5460;">#${provider_id}</td>
                            </tr>
                            ` : ''}
                            ${appointment_id ? `
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold; color: #0c5460;">Booking ID:</td>
                                <td style="padding: 10px 0; color: #0c5460;">#${appointment_id}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>

                    <!-- Description -->
                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h3 style="color: #856404; margin-top: 0; margin-bottom: 15px;">📝 Description</h3>
                        <p style="color: #856404; line-height: 1.8; white-space: pre-wrap; margin: 0;">
${description}
                        </p>
                    </div>

                    ${attachmentsHTML}

                    <!-- Action Instructions -->
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #155724; margin-top: 0; margin-bottom: 15px;">✅ Next Steps</h3>
                        <ul style="color: #155724; line-height: 1.8; padding-left: 20px; margin: 0;">
                            <li><strong>Reply directly to this email</strong> to respond to ${reporter_name}</li>
                            <li>Review the report details and any attachments carefully</li>
                            <li>Take appropriate action based on the report type and priority</li>
                            <li>Update the report status in the admin dashboard</li>
                            <li>For urgent matters, contact the reporter immediately via phone</li>
                        </ul>
                    </div>

                    <!-- Quick Reply Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="mailto:${reporter_email}?subject=Re: ${subject} (Report #${report_id})" 
                           style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            📧 Reply to Reporter
                        </a>
                    </div>

                    <div style="border-top: 2px solid #eee; margin-top: 30px; padding-top: 20px;">
                        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                            This is an automated notification from the Fixmo Report System<br>
                            Report ID: #${report_id} | Submitted: ${formattedDate}
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

/**
 * Send confirmation email to reporter
 */
export const sendReportConfirmationToReporter = async (reportDetails) => {
    const {
        report_id,
        reporter_name,
        reporter_email,
        report_type,
        subject,
        description,
        created_at
    } = reportDetails;

    const reportTypeLabel = REPORT_TYPE_LABELS[report_type] || '📝 Report';

    const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const mailOptions = {
        from: FROM_EMAIL,
        to: reporter_email,
        subject: `Report Received - ${subject} (Report #${report_id})`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #28a745; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">✅ Report Received</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear <strong>${reporter_name}</strong>,</p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Thank you for contacting Fixmo. We have received your report and our admin team will review it as soon as possible.
                    </p>

                    <!-- Report Summary -->
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <h3 style="color: #155724; margin-top: 0; margin-bottom: 15px;">📋 Your Report Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724; width: 30%;">Report ID:</td>
                                <td style="padding: 8px 0; color: #155724;">#${report_id}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Type:</td>
                                <td style="padding: 8px 0; color: #155724;">${reportTypeLabel}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #c3e6cb;">
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Subject:</td>
                                <td style="padding: 8px 0; color: #155724;">${subject}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #155724;">Submitted:</td>
                                <td style="padding: 8px 0; color: #155724;">${formattedDate}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- What to Expect -->
                    <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <h3 style="color: #0c5460; margin-top: 0; margin-bottom: 15px;">⏳ What Happens Next?</h3>
                        <ul style="color: #0c5460; line-height: 1.8; padding-left: 20px; margin: 0;">
                            <li>Our admin team will review your report carefully</li>
                            <li>You'll receive a response directly to this email address</li>
                            <li>Response time is typically within 24-48 hours</li>
                            <li>For urgent matters, we may contact you via phone</li>
                        </ul>
                    </div>

                    <!-- Your Description (Reminder) -->
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c757d;">
                        <h3 style="color: #495057; margin-top: 0; margin-bottom: 15px;">📝 Your Description</h3>
                        <p style="color: #495057; line-height: 1.6; white-space: pre-wrap; margin: 0; font-style: italic;">
${description}
                        </p>
                    </div>

                    <!-- Important Note -->
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <p style="color: #856404; margin: 0; line-height: 1.6;">
                            <strong>💡 Note:</strong> Please do not reply to this automated email. Our admin will reach out to you directly from their email address.
                        </p>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        Thank you for helping us improve Fixmo!<br>
                        <strong>Fixmo Support Team</strong>
                    </p>
                </div>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};
