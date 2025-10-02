# 📧 Admin Email Notification System Documentation

## Overview
The Fixmo Backend now includes a comprehensive email notification system that sends professional emails to users, service providers, and certificate holders when admin actions are performed. This system ensures transparent communication and provides reasons for administrative decisions.

## 🎯 Features
- ✅ **User Management Emails**: Approval, rejection, and deactivation notifications
- ✅ **Provider Management Emails**: Verification, rejection, and deactivation notifications  
- ✅ **Certificate Management Emails**: Approval and rejection notifications
- ✅ **Professional HTML Templates**: Responsive design with branding
- ✅ **Reason Tracking**: All rejection/deactivation actions require explanatory reasons
- ✅ **Error Handling**: Email failures don't interrupt admin workflows
- ✅ **Database Integration**: Reasons are stored in the database for audit trails

---

## 📋 API Endpoints

### 🔐 Base URL
```
/api/admin
```

### 👥 User Management Endpoints

#### ✅ Verify User
```http
PUT /api/admin/users/:userId/verify
```
**Description**: Approves user verification and sends approval email
**Parameters**: 
- `userId` (path) - User ID to verify
**Response**: User object with verification status
**Email Sent**: User Approval Email

#### ❌ Reject User
```http
PUT /api/admin/users/:userId/reject
```
**Description**: Rejects user verification with reason and sends rejection email
**Parameters**: 
- `userId` (path) - User ID to reject
**Body**:
```json
{
    "reason": "ID document is unclear and needs to be resubmitted"
}
```
**Response**: User object with rejection status
**Email Sent**: User Rejection Email
**Database**: Stores reason in `user_reason` field

#### 🔒 Deactivate User
```http
PUT /api/admin/users/:userId/deactivate
```
**Description**: Deactivates user account with reason and sends deactivation email
**Parameters**: 
- `userId` (path) - User ID to deactivate
**Body**:
```json
{
    "reason": "Violation of terms of service"
}
```
**Response**: User object with deactivation status
**Email Sent**: User Deactivation Email
**Database**: Stores reason in `user_reason` field

#### 🔓 Activate User
```http
PUT /api/admin/users/:userId/activate
```
**Description**: Activates user account
**Parameters**: 
- `userId` (path) - User ID to activate
**Response**: User object with activation status

---

### 🏢 Provider Management Endpoints

#### ✅ Verify Provider
```http
PUT /api/admin/providers/:providerId/verify
```
**Description**: Approves provider verification and sends approval email
**Parameters**: 
- `providerId` (path) - Provider ID to verify
**Response**: Provider object with verification status
**Email Sent**: Provider Approval Email

#### ❌ Reject Provider
```http
PUT /api/admin/providers/:providerId/reject
```
**Description**: Rejects provider verification with reason and sends rejection email
**Parameters**: 
- `providerId` (path) - Provider ID to reject
**Body**:
```json
{
    "reason": "Business license verification failed"
}
```
**Response**: Provider object with rejection status
**Email Sent**: Provider Rejection Email
**Database**: Stores reason in `provider_reason` field

#### 🔒 Deactivate Provider
```http
PUT /api/admin/providers/:providerId/deactivate
```
**Description**: Deactivates provider account with reason and sends deactivation email
**Parameters**: 
- `providerId` (path) - Provider ID to deactivate
**Body**:
```json
{
    "reason": "Multiple customer complaints regarding service quality"
}
```
**Response**: Provider object with deactivation status
**Email Sent**: Provider Deactivation Email
**Database**: Stores reason in `provider_reason` field

#### 🔓 Activate Provider
```http
PUT /api/admin/providers/:providerId/activate
```
**Description**: Activates provider account
**Parameters**: 
- `providerId` (path) - Provider ID to activate
**Response**: Provider object with activation status

---

### 📜 Certificate Management Endpoints

#### ✅ Approve Certificate
```http
PUT /api/admin/certificates/:certificateId/approve
```
**Description**: Approves certificate and sends approval email
**Parameters**: 
- `certificateId` (path) - Certificate ID to approve
**Response**: Certificate object with approval status
**Email Sent**: Certificate Approval Email

#### ❌ Reject Certificate
```http
PUT /api/admin/certificates/:certificateId/reject
```
**Description**: Rejects certificate with reason and sends rejection email
**Parameters**: 
- `certificateId` (path) - Certificate ID to reject
**Body**:
```json
{
    "reason": "Certificate image is blurry and unreadable"
}
```
**Response**: Certificate object with rejection status
**Email Sent**: Certificate Rejection Email
**Database**: Stores reason in `certificate_reason` field

---

## 📧 Email Templates

### 🎨 Design Features
- **Responsive HTML Layout**: Works on all devices
- **Professional Branding**: Fixmo colors and styling
- **Color-Coded Actions**: 
  - 🟢 Green for approvals
  - 🔴 Red for rejections/deactivations
- **Emoji Integration**: Visual indicators for better readability
- **Contact Information**: Support details included
- **Action Buttons**: Clear next steps for users

### 📨 Email Types

#### 1. User Approval Email
```
Subject: 🎉 Your Fixmo Account Has Been Approved!
Content: Welcome message with account activation confirmation
```

#### 2. User Rejection Email
```
Subject: ❌ Fixmo Account Verification Update
Content: Rejection notification with specific reason and resubmission instructions
```

#### 3. User Deactivation Email
```
Subject: 🔒 Important: Your Fixmo Account Status Update
Content: Deactivation notice with reason and appeal process
```

#### 4. Provider Approval Email
```
Subject: 🎉 Your Fixmo Provider Account Has Been Approved!
Content: Business verification confirmation with next steps
```

#### 5. Provider Rejection Email
```
Subject: ❌ Fixmo Provider Verification Update
Content: Rejection notification with specific reason and improvement guidance
```

#### 6. Provider Deactivation Email
```
Subject: 🔒 Important: Your Fixmo Provider Account Status Update
Content: Deactivation notice with reason and resolution process
```

#### 7. Certificate Approval Email
```
Subject: ✅ Your Certificate Has Been Approved on Fixmo!
Content: Certificate verification confirmation
```

#### 8. Certificate Rejection Email
```
Subject: ❌ Fixmo Certificate Verification Update
Content: Rejection notification with specific reason and resubmission guidelines
```

---

## 💾 Database Schema Updates

### User Table
```sql
ALTER TABLE "User" ADD COLUMN "user_reason" TEXT;
```

### Service Provider Table
```sql
ALTER TABLE "ServiceProviderDetails" ADD COLUMN "provider_reason" TEXT;
```

### Certificate Table
```sql
ALTER TABLE "Certificate" ADD COLUMN "certificate_reason" TEXT;
```

---

## 🔧 Technical Implementation

### Email Service Functions
Located in: `src/services/mailer.js`

```javascript
// User Emails
export const sendUserApprovalEmail = async (userEmail, userDetails)
export const sendUserRejectionEmail = async (userEmail, userDetails, reason)
export const sendUserDeactivationEmail = async (userEmail, userDetails, reason)

// Provider Emails
export const sendProviderApprovalEmail = async (providerEmail, providerDetails)
export const sendProviderRejectionEmail = async (providerEmail, providerDetails, reason)
export const sendProviderDeactivationEmail = async (providerEmail, providerDetails, reason)

// Certificate Emails
export const sendCertificateApprovalEmail = async (providerEmail, details)
export const sendCertificateRejectionEmail = async (providerEmail, details, reason)
```

### Controller Updates
Located in: `src/controller/adminControllerNew.js`

All admin action methods now include:
- ✅ Email notification integration
- ✅ Error handling for email failures
- ✅ Reason parameter validation
- ✅ Database reason storage

---

## 🚀 Usage Examples

### Rejecting a User with Reason
```bash
curl -X PUT http://localhost:3000/api/admin/users/123/reject \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "ID document is expired. Please submit a valid, current ID."
  }'
```

### Deactivating a Provider with Reason
```bash
curl -X PUT http://localhost:3000/api/admin/providers/456/deactivate \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Multiple reports of unprofessional behavior from customers."
  }'
```

### Rejecting a Certificate with Reason
```bash
curl -X PUT http://localhost:3000/api/admin/certificates/789/reject \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Certificate image is too blurry to verify authenticity."
  }'
```

---

## ⚠️ Error Handling

### Email Failures
- Email sending errors are logged but don't interrupt admin workflows
- Admin actions complete successfully even if email delivery fails
- Error messages are captured in server logs for debugging

### Validation Errors
- Reason field is required for rejection and deactivation actions
- Returns 400 Bad Request if reason is missing
- Provides clear error messages for missing parameters

---

## 🔒 Security Considerations

- All admin endpoints require proper authentication
- Reasons are stored securely in the database
- Email content is sanitized to prevent XSS
- Sensitive information is not exposed in error messages

---

## 📊 Monitoring & Logging

### Email Delivery Tracking
- Success/failure status logged for each email
- Email errors captured with full stack traces
- Delivery statistics available in server logs

### Audit Trail
- All admin actions with reasons stored in database
- Timestamp tracking for administrative decisions
- Complete history of user/provider/certificate status changes

---

## 🎯 Future Enhancements

- **Email Templates Management**: Admin interface for customizing email templates
- **Bulk Actions**: Mass approval/rejection with batch email notifications
- **Email Analytics**: Delivery rates and engagement tracking
- **Multi-language Support**: Localized email templates
- **SMS Notifications**: Alternative notification channels

---

## 📞 Support

For technical support or questions about the email notification system:
- **Email**: support@fixmo.com
- **Documentation**: This file and API_DOCUMENTATION_CONTROLLER_BASED.md
- **Error Logs**: Check server logs for email delivery issues

---

*Last Updated: September 17, 2025*
*Version: 2.0.0*
