# Email System Documentation - Fixmo Backend

## Overview
This document provides comprehensive documentation for the email notification system in the Fixmo backend application. The email system handles various types of notifications including OTP verification, booking confirmations, status updates, user approvals, and administrative notifications.

## Configuration

### Environment Variables
The email system requires the following environment variables to be configured:

```env
MAILER_HOST=your-smtp-host
MAILER_PORT=587
MAILER_SECURE=false
MAILER_USER=your-email@domain.com
MAILER_PASS=your-email-password
```

### SMTP Setup
The system uses Nodemailer with SMTP transport configuration:

```javascript
const transporter = nodemailer.createTransporter({
    host: process.env.MAILER_HOST,
    port: process.env.MAILER_PORT,
    secure: process.env.MAILER_SECURE === 'true',
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS
    }
});
```

---

## Email Functions

### 1. Authentication & Verification Emails

#### `sendOTPEmail(to, otp)`
Sends One-Time Password (OTP) for verification purposes.

**Parameters:**
- `to` (string): Recipient email address
- `otp` (string/number): The OTP code to send

**Usage:**
```javascript
import { sendOTPEmail } from '../services/mailer.js';
await sendOTPEmail('user@example.com', '123456');
```

**Email Content:**
- Subject: "Your OTP Code"
- Plain text format with OTP code

---

#### `sendRegistrationSuccessEmail(to, userName)`
Sends confirmation email after successful user registration.

**Parameters:**
- `to` (string): Recipient email address
- `userName` (string): User's username for personalization

**Usage:**
```javascript
import { sendRegistrationSuccessEmail } from '../services/mailer.js';
await sendRegistrationSuccessEmail('user@example.com', 'johndoe');
```

**Email Content:**
- Subject: "Registration Successful"
- Welcome message with username
- Plain text format

---

### 2. Booking & Appointment Emails

#### `sendBookingConfirmationToCustomer(customerEmail, bookingDetails)`
Sends booking confirmation to customers when an appointment is created.

**Parameters:**
- `customerEmail` (string): Customer's email address
- `bookingDetails` (object): Booking information object

**Required bookingDetails properties:**
```javascript
{
    customerName: string,
    serviceTitle: string,
    providerName: string,
    providerPhone: string,
    providerEmail: string,
    scheduledDate: Date,
    appointmentId: number,
    startingPrice: number,
    repairDescription?: string
}
```

**Usage:**
```javascript
import { sendBookingConfirmationToCustomer } from '../services/mailer.js';

const bookingDetails = {
    customerName: "John Doe",
    serviceTitle: "Plumbing Repair",
    providerName: "Jane Smith",
    providerPhone: "+1234567890",
    providerEmail: "jane@example.com",
    scheduledDate: new Date("2025-09-25T10:00:00.000Z"),
    appointmentId: 123,
    startingPrice: 150.00,
    repairDescription: "Fix leaking pipe"
};

await sendBookingConfirmationToCustomer('customer@example.com', bookingDetails);
```

**Email Features:**
- HTML formatted email with professional styling
- Green confirmation theme with checkmark
- Detailed booking information in organized sections
- Service provider contact details
- Next steps guidance
- Support contact information

---

#### `sendBookingConfirmationToProvider(providerEmail, bookingDetails)`
Sends booking notification to service providers when they receive a new appointment.

**Parameters:**
- `providerEmail` (string): Service provider's email address
- `bookingDetails` (object): Same booking information object as customer confirmation

**Usage:**
```javascript
import { sendBookingConfirmationToProvider } from '../services/mailer.js';
await sendBookingConfirmationToProvider('provider@example.com', bookingDetails);
```

**Email Features:**
- Professional HTML design with blue theme
- New booking notification with bell icon
- Customer contact information
- Service details and scheduling
- Provider action items
- Earnings information

---

### 3. Cancellation Emails

#### `sendBookingCancellationToCustomer(customerEmail, bookingDetails)`
Notifies customers when their appointment is cancelled.

**Parameters:**
- `customerEmail` (string): Customer's email address
- `bookingDetails` (object): Booking information with cancellation details

**Additional required properties:**
```javascript
{
    // ... standard booking details ...
    cancellation_reason?: string
}
```

**Usage:**
```javascript
import { sendBookingCancellationToCustomer } from '../services/mailer.js';

const bookingDetails = {
    // ... standard booking details ...
    cancellation_reason: "Customer request"
};

await sendBookingCancellationToCustomer('customer@example.com', bookingDetails);
```

**Email Features:**
- Red/orange cancellation theme
- Cancellation reason display
- Refund information (if applicable)
- Rebooking guidance
- Support contact for assistance

---

#### `sendBookingCancellationEmail(providerEmail, bookingDetails)`
Notifies service providers when an appointment is cancelled.

**Parameters:**
- `providerEmail` (string): Service provider's email address
- `bookingDetails` (object): Booking information with cancellation details

**Usage:**
```javascript
import { sendBookingCancellationEmail } from '../services/mailer.js';
await sendBookingCancellationEmail('provider@example.com', bookingDetails);
```

**Email Features:**
- Professional cancellation notification
- Impact on provider schedule
- Availability update information
- Customer service guidelines

---

### 4. Completion Emails

#### `sendBookingCompletionToCustomer(customerEmail, bookingDetails)`
Notifies customers when their service is completed.

**Parameters:**
- `customerEmail` (string): Customer's email address
- `bookingDetails` (object): Completed booking information

**Additional properties for completion:**
```javascript
{
    // ... standard booking details ...
    finalPrice?: number,
    completedDate?: Date
}
```

**Usage:**
```javascript
import { sendBookingCompletionToCustomer } from '../services/mailer.js';

const bookingDetails = {
    // ... standard details ...
    finalPrice: 175.00,
    completedDate: new Date()
};

await sendBookingCompletionToCustomer('customer@example.com', bookingDetails);
```

**Email Features:**
- Green completion theme with celebration icons
- Service summary and final pricing
- Rating and review prompts
- Payment instructions
- Service warranty information

---

#### `sendBookingCompletionToProvider(providerEmail, bookingDetails)`
Notifies service providers when a service is marked as completed.

**Parameters:**
- `providerEmail` (string): Service provider's email address
- `bookingDetails` (object): Completed booking information

**Usage:**
```javascript
import { sendBookingCompletionToProvider } from '../services/mailer.js';
await sendBookingCompletionToProvider('provider@example.com', bookingDetails);
```

**Email Features:**
- Congratulatory completion message
- Earnings summary
- Payment processing instructions
- Rating expectation notice
- Performance encouragement

---

### 5. Administrative Approval Emails

#### `sendUserApprovalEmail(userEmail, userDetails)`
Sends approval notification to users when their account is verified by admin.

**Parameters:**
- `userEmail` (string): User's email address
- `userDetails` (object): User information

**Required userDetails properties:**
```javascript
{
    firstName: string,
    lastName: string,
    userName: string
}
```

**Usage:**
```javascript
import { sendUserApprovalEmail } from '../services/mailer.js';

const userDetails = {
    firstName: "John",
    lastName: "Doe",
    userName: "johndoe"
};

await sendUserApprovalEmail('user@example.com', userDetails);
```

**Email Features:**
- Celebratory approval design
- Personalized welcome message
- Account access information
- Next steps guidance
- Platform features overview

---

#### `sendServiceProviderApprovalEmail(providerEmail, providerDetails)`
Sends approval notification to service providers when verified by admin.

**Parameters:**
- `providerEmail` (string): Service provider's email address
- `providerDetails` (object): Provider information

**Required providerDetails properties:**
```javascript
{
    firstName: string,
    lastName: string,
    userName: string,
    services?: string[]
}
```

**Usage:**
```javascript
import { sendServiceProviderApprovalEmail } from '../services/mailer.js';

const providerDetails = {
    firstName: "Jane",
    lastName: "Smith",
    userName: "janesmith_plumber",
    services: ["Plumbing", "Electrical"]
};

await sendServiceProviderApprovalEmail('provider@example.com', providerDetails);
```

**Email Features:**
- Professional provider welcome
- Service categories confirmation
- Provider dashboard access
- Earning potential information
- Best practices guidance

---

### 6. Rejection Notification Emails

#### `sendUserRejectionEmail(userEmail, userDetails)`
Notifies users when their account application is rejected by admin.

**Parameters:**
- `userEmail` (string): User's email address
- `userDetails` (object): User information with rejection details

**Additional required properties:**
```javascript
{
    // ... user details ...
    rejection_reason: string
}
```

**Usage:**
```javascript
import { sendUserRejectionEmail } from '../services/mailer.js';

const userDetails = {
    firstName: "John",
    lastName: "Doe",
    userName: "johndoe",
    rejection_reason: "Incomplete documentation"
};

await sendUserRejectionEmail('user@example.com', userDetails);
```

**Email Features:**
- Sympathetic but clear rejection notice
- Specific rejection reasons
- Reapplication guidance
- Support contact information
- Appeal process details

---

#### `sendServiceProviderRejectionEmail(providerEmail, providerDetails)`
Notifies service providers when their application is rejected.

**Parameters:**
- `providerEmail` (string): Service provider's email address
- `providerDetails` (object): Provider information with rejection details

**Usage:**
```javascript
import { sendServiceProviderRejectionEmail } from '../services/mailer.js';

const providerDetails = {
    firstName: "Jane",
    lastName: "Smith",
    userName: "janesmith_plumber",
    rejection_reason: "Invalid certification documents"
};

await sendServiceProviderRejectionEmail('provider@example.com', providerDetails);
```

**Email Features:**
- Professional rejection notification
- Detailed rejection reasons
- Improvement recommendations
- Resubmission guidelines
- Alternative service suggestions

---

## Email Templates & Design

### Common Design Elements

All HTML emails follow consistent design patterns:

#### Color Scheme
- **Success/Confirmation**: Green (#28a745, #d4edda)
- **Warning/Pending**: Yellow (#ffc107, #fff3cd)
- **Info/Updates**: Blue (#007bff, #e7f3ff)
- **Error/Rejection**: Red (#dc3545, #f8d7da)
- **Neutral**: Gray (#6c757d, #f8f9fa)

#### Typography
- **Font Family**: Arial, sans-serif
- **Headers**: Bold, colored text matching theme
- **Body Text**: #333 for primary text, #666 for secondary
- **Small Text**: #888, 12px for disclaimers

#### Layout Structure
```html
<div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header Section -->
        <!-- Content Sections -->
        <!-- Footer Section -->
    </div>
</div>
```

#### Content Sections
1. **Header**: Icon + Title + Subtitle
2. **Main Content**: Color-coded information blocks
3. **Action Items**: Bulleted lists or numbered steps
4. **Support**: Contact information
5. **Footer**: Automated message disclaimer

---

## Error Handling

### Best Practices

#### 1. Graceful Degradation
```javascript
try {
    await sendBookingConfirmationToCustomer(email, details);
    console.log('✅ Email sent successfully');
} catch (emailError) {
    console.error('❌ Email sending failed:', emailError);
    // Don't fail the main operation if email fails
}
```

#### 2. Email Validation
```javascript
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

if (!isValidEmail(customerEmail)) {
    throw new Error('Invalid email address');
}
```

#### 3. Required Field Validation
```javascript
const validateBookingDetails = (details) => {
    const required = ['customerName', 'serviceTitle', 'scheduledDate', 'appointmentId'];
    for (const field of required) {
        if (!details[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }
};
```

### Common Error Types

#### SMTP Connection Errors
- **Cause**: Invalid SMTP credentials or network issues
- **Solution**: Verify environment variables and network connectivity

#### Template Rendering Errors
- **Cause**: Missing required data fields
- **Solution**: Validate all required parameters before sending

#### Rate Limiting
- **Cause**: Too many emails sent in short period
- **Solution**: Implement queuing system for high-volume scenarios

---

## Integration Examples

### 1. Appointment Creation
```javascript
// In appointmentController.js
import { sendBookingConfirmationToCustomer, sendBookingConfirmationToProvider } from '../services/mailer.js';

export const createAppointment = async (req, res) => {
    try {
        // ... create appointment logic ...
        
        // Send confirmation emails
        const bookingDetails = {
            customerName: `${appointment.customer.first_name} ${appointment.customer.last_name}`,
            serviceTitle: appointment.service.service_title,
            providerName: `${appointment.serviceProvider.provider_first_name} ${appointment.serviceProvider.provider_last_name}`,
            providerPhone: appointment.serviceProvider.provider_phone_number,
            providerEmail: appointment.serviceProvider.provider_email,
            scheduledDate: appointment.scheduled_date,
            appointmentId: appointment.appointment_id,
            startingPrice: appointment.service.service_startingprice,
            repairDescription: appointment.repairDescription
        };
        
        // Send to customer
        await sendBookingConfirmationToCustomer(appointment.customer.email, bookingDetails);
        
        // Send to provider
        await sendBookingConfirmationToProvider(appointment.serviceProvider.provider_email, bookingDetails);
        
        res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        // Handle errors...
    }
};
```

### 2. Status Update with Email
```javascript
// In appointmentController.js
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        // Update appointment
        const updatedAppointment = await prisma.appointment.update({
            where: { appointment_id: parseInt(appointmentId) },
            data: { appointment_status: status },
            include: {
                customer: true,
                serviceProvider: true,
                service: true
            }
        });
        
        // Send appropriate email based on status
        const bookingDetails = {
            // ... format booking details ...
        };
        
        if (status === 'completed' || status === 'finished') {
            await sendBookingCompletionToCustomer(updatedAppointment.customer.email, bookingDetails);
            await sendBookingCompletionToProvider(updatedAppointment.serviceProvider.provider_email, bookingDetails);
        } else if (status === 'cancelled') {
            await sendBookingCancellationToCustomer(updatedAppointment.customer.email, bookingDetails);
            await sendBookingCancellationEmail(updatedAppointment.serviceProvider.provider_email, bookingDetails);
        }
        
        res.status(200).json({ success: true, data: updatedAppointment });
    } catch (error) {
        // Handle errors...
    }
};
```

### 3. Admin Approval Workflow
```javascript
// In adminController.js
export const approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Update user status
        const approvedUser = await prisma.user.update({
            where: { user_id: parseInt(userId) },
            data: { is_verified: true }
        });
        
        // Send approval email
        const userDetails = {
            firstName: approvedUser.first_name,
            lastName: approvedUser.last_name,
            userName: approvedUser.userName
        };
        
        await sendUserApprovalEmail(approvedUser.email, userDetails);
        
        res.status(200).json({ success: true, message: 'User approved and notified' });
    } catch (error) {
        // Handle errors...
    }
};
```

---

## Testing Email Functions

### 1. Unit Testing Example
```javascript
// tests/mailer.test.js
import { sendOTPEmail } from '../src/services/mailer.js';

describe('Email Functions', () => {
    test('should send OTP email successfully', async () => {
        const result = await sendOTPEmail('test@example.com', '123456');
        expect(result).toBeDefined();
    });
    
    test('should handle invalid email addresses', async () => {
        await expect(sendOTPEmail('invalid-email', '123456')).rejects.toThrow();
    });
});
```

### 2. Manual Testing
```javascript
// test-email.js (already exists in project)
import { sendBookingConfirmationToCustomer } from './src/services/mailer.js';

const testBookingDetails = {
    customerName: "Test Customer",
    serviceTitle: "Test Service",
    providerName: "Test Provider",
    providerPhone: "+1234567890",
    providerEmail: "provider@test.com",
    scheduledDate: new Date(),
    appointmentId: 999,
    startingPrice: 100.00,
    repairDescription: "Test repair description"
};

await sendBookingConfirmationToCustomer('test@example.com', testBookingDetails);
console.log('Test email sent successfully!');
```

---

## Monitoring & Analytics

### 1. Email Delivery Tracking
```javascript
// Add to each email function
const emailResult = await transporter.sendMail(mailOptions);
console.log('Email sent:', {
    messageId: emailResult.messageId,
    recipient: to,
    subject: mailOptions.subject,
    timestamp: new Date().toISOString()
});
```

### 2. Error Logging
```javascript
// Enhanced error handling
try {
    await transporter.sendMail(mailOptions);
} catch (error) {
    console.error('Email sending failed:', {
        error: error.message,
        recipient: to,
        emailType: 'booking_confirmation',
        timestamp: new Date().toISOString()
    });
    
    // Optional: Log to external service
    // logger.error('Email delivery failed', { error, recipient: to });
}
```

### 3. Performance Monitoring
```javascript
// Track email sending performance
const startTime = Date.now();
await transporter.sendMail(mailOptions);
const endTime = Date.now();

console.log(`Email sent in ${endTime - startTime}ms`);
```

---

## Security Considerations

### 1. Environment Variables
- Never hardcode SMTP credentials in source code
- Use secure environment variable management
- Rotate email passwords regularly

### 2. Email Content Security
- Sanitize all user-provided content in emails
- Avoid including sensitive information in email bodies
- Use HTTPS links only

### 3. Rate Limiting
- Implement email rate limiting to prevent spam
- Use queuing for high-volume scenarios
- Monitor for unusual sending patterns

### 4. Data Privacy
- Follow GDPR/privacy regulations for email content
- Provide unsubscribe mechanisms where required
- Secure email logs and analytics data

---

## Maintenance & Updates

### 1. Template Updates
- Keep email templates consistent with brand guidelines
- Test template changes across different email clients
- Version control email template changes

### 2. Monitoring
- Set up alerts for email delivery failures
- Monitor bounce rates and delivery statistics
- Regular testing of all email functions

### 3. Performance Optimization
- Optimize email template size and loading
- Implement email queuing for better performance
- Consider using email service providers for scale

---

This documentation covers all email functions in the Fixmo backend system. Each function is designed to provide professional, user-friendly notifications that enhance the user experience and keep all parties informed about appointment and account status changes.