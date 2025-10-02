# Admin Password Reset System

## 🔄 Enhanced Admin Password Reset Functionality

The admin system now includes a comprehensive password reset feature that allows super administrators to reset passwords for other admins when needed, with automatic email notifications and security safeguards.

## 🎯 Key Features

### ✅ Secure Password Reset
- **Super admin only** - Requires super_admin role
- **Automatic password generation** - 12 character complex passwords
- **Email notifications** - Professional HTML email sent automatically
- **Security restrictions** - Cannot reset own password via this method
- **Audit trail** - Optional reason field for documentation

### 🔐 Security Features
- **Role-based access** - Only super admins can reset passwords
- **Self-protection** - Super admins cannot reset their own password
- **Force password change** - Sets must_change_password flag to true
- **Secure generation** - Random 12-character passwords with special characters
- **Email validation** - Confirms target admin exists before reset

### 📧 Email Notifications
- **Professional template** - Branded HTML email design
- **Complete information** - New password, reset reason, timestamp
- **Security instructions** - Best practices and immediate action required
- **Direct login link** - Easy access to admin panel
- **Support contacts** - Help information included

## 📍 API Endpoint

### PUT `/api/admin/:admin_id/reset-password` - Reset Admin Password

**Authentication Required**: Super Admin Bearer Token

#### URL Parameters:
- `admin_id` (integer, required): ID of the admin whose password to reset

#### Request Body:
```json
{
  "reason": "Admin forgot password and requested reset via support ticket #12345"
}
```

**Note**: The `reason` field is optional but recommended for audit trails.

#### Success Response (200):
```json
{
  "message": "Admin password reset successfully and notification email sent",
  "admin": {
    "id": 2,
    "username": "admin.user_1634567890",
    "email": "admin.user@company.com",
    "name": "Admin User",
    "role": "admin",
    "is_active": true,
    "must_change_password": true
  },
  "note": "Password reset notification email sent to admin"
}
```

#### Error Responses:

**400 - Invalid Input:**
```json
{
  "message": "Cannot reset your own password. Use the change password endpoint instead."
}
```

**404 - Admin Not Found:**
```json
{
  "message": "Admin not found"
}
```

**403 - Forbidden:**
```json
{
  "message": "Access denied. Super admin privileges required."
}
```

## 🚀 Usage Examples

### 1. Reset Admin Password with Reason
```bash
curl -X PUT http://localhost:3000/api/admin/2/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "reason": "Admin forgot password - support ticket #12345"
  }'
```

### 2. Reset Password Without Reason
```bash
curl -X PUT http://localhost:3000/api/admin/3/reset-password \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

## 📧 Email Template Features

### 🎨 Professional Design
- **Responsive HTML** layout optimized for all devices
- **Warning theme** with orange/red colors to indicate security action
- **Clear sections** for different types of information
- **Professional branding** consistent with Fixmo design

### 📋 Information Included
1. **Security alert** - Clear indication password was reset
2. **Reset details** - Who performed reset, when, and why
3. **Account information** - Name, email, username confirmation
4. **New credentials** - Temporary password prominently displayed
5. **Next steps** - Clear instructions for immediate action
6. **Security recommendations** - Best practices and guidelines
7. **Support contacts** - Multiple ways to get help if needed

### 🔒 Security Elements
- **Immediate action required** - Emphasizes password must be changed
- **Security warnings** - Reminds about confidentiality and best practices
- **Contact information** - Security team contact for concerns
- **Timestamp** - When the reset occurred for audit purposes

## 🛠 Technical Implementation

### Files Modified:
1. **`src/services/mailer.js`** - Added `sendAdminPasswordResetEmail` function
2. **`src/controller/adminControllerNew.js`** - Added `resetAdminPassword` method
3. **`src/route/adminRoutes.js`** - Added password reset route
4. **`src/swagger/paths/admin.js`** - Added comprehensive API documentation

### Email Service Function:
```javascript
export const sendAdminPasswordResetEmail = async (adminEmail, resetDetails) => {
  const { name, username, newTemporaryPassword, resetBy, reason } = resetDetails;
  // Professional HTML email template with security focus
  // Includes all reset details and instructions
}
```

### Controller Method:
```javascript
async resetAdminPassword(req, res) {
  // Validate admin ID and find target admin
  // Prevent self password reset
  // Generate secure temporary password
  // Update database with new password and must_change_password flag
  // Send notification email
  // Return success response
}
```

### Route Configuration:
```javascript
// Super Admin Only Routes
router.use(superAdminMiddleware);
router.put('/:admin_id/reset-password', adminController.resetAdminPassword);
```

## 🔧 Configuration

### Environment Variables:
```env
# Email service configuration (required)
MAILER_USER=your-email@company.com
MAILER_PASS=your-email-password

# Optional: Custom admin login URL
ADMIN_LOGIN_URL=https://your-domain.com/admin/login

# Password hashing rounds (optional, defaults to 12)
BCRYPT_SALT_ROUNDS=12
```

## 🧪 Testing

### Test Script Available:
```bash
node test-admin-password-reset.js
```

**Test Coverage:**
- ✅ Super admin authentication
- ✅ Password reset functionality
- ✅ Email notification sending
- ✅ Security restrictions (cannot reset own password)
- ✅ Invalid admin ID handling
- ✅ Unauthorized access prevention
- ✅ Database updates verification

### Manual Testing Steps:
1. **Login** as super admin
2. **Identify** target admin for password reset
3. **Send reset request** with optional reason
4. **Verify** email received by target admin
5. **Check** must_change_password flag is set
6. **Test** target admin can login with new password
7. **Confirm** forced password change on first login

## 🔍 Security Considerations

### ✅ Security Safeguards:
- **Role validation** - Only super admins can perform resets
- **Self-protection** - Cannot reset own password via this endpoint
- **Secure generation** - Cryptographically secure random passwords
- **Force change** - Temporary passwords must be changed immediately
- **Email delivery** - Credentials sent via secure email channel
- **Audit trail** - Reset reason and performer tracked

### ⚠️ Important Notes:
- **Use sparingly** - Only for legitimate forgotten password scenarios
- **Document reasons** - Include reason for audit and compliance
- **Monitor usage** - Track who resets passwords and when
- **Verify recipients** - Ensure email reaches intended admin
- **Support process** - Integrate with support ticket system

## 📊 Monitoring & Logs

### Success Indicators:
- ✅ 200 response from API
- ✅ Email sent without errors
- ✅ Database updated with new password hash
- ✅ must_change_password flag set to true
- ✅ Target admin can login with new password

### Error Scenarios:
- **Email failure** - Password still reset, admin notified via other means
- **Invalid admin ID** - 404 error, no changes made
- **Unauthorized access** - 403 error, security violation logged
- **Self-reset attempt** - 400 error, security violation logged

## 🎯 Use Cases

### 👤 For Super Admins:
- **Forgotten passwords** - Quick resolution for locked-out admins
- **Security incidents** - Force password change after compromise
- **Account maintenance** - Regular security updates
- **Emergency access** - Restore admin access quickly

### 🔒 For Target Admins:
- **Clear instructions** - Know exactly what to do next
- **Security awareness** - Understand why reset occurred
- **Easy access** - Direct link to login and change password
- **Support options** - Know how to get help if needed

### 🏢 For Organization:
- **Security compliance** - Proper password reset procedures
- **Audit trail** - Documentation of all password resets
- **Reduced downtime** - Quick resolution of access issues
- **Professional communication** - Branded, clear email notifications

## 📞 Support Information

### Email Template Includes:
- **Primary Support**: admin-support@fixmo.com
- **Security Team**: security@fixmo.com
- **Phone Support**: 1-800-FIXMO-ADMIN

### For Technical Issues:
- Check email service configuration and SMTP settings
- Verify super admin permissions and token validity
- Review server logs for detailed error information
- Test with known working email addresses

## 🎉 Benefits

### Enhanced Security:
- **Controlled access** - Only authorized super admins can reset
- **Secure delivery** - Credentials sent via encrypted email
- **Forced updates** - Ensures passwords are changed immediately
- **Audit compliance** - Full tracking of reset activities

### Improved User Experience:
- **Quick resolution** - Forgotten passwords resolved in minutes
- **Clear communication** - Professional emails with clear instructions
- **Self-service** - Admins know exactly what to do next
- **Support integration** - Easy escalation if issues arise

### Operational Efficiency:
- **Reduced support tickets** - Automated password reset process
- **Better compliance** - Proper documentation and audit trails
- **Faster resolution** - No manual password sharing required
- **Professional appearance** - Branded, consistent communications

---

## 🚀 Ready for Production!

The admin password reset system is now fully functional and ready for production use. Super admins can securely reset passwords for other administrators with automatic email notifications and comprehensive security safeguards.

**Key Capabilities:**
- ✅ Secure password reset for any admin account
- ✅ Professional email notifications with new credentials
- ✅ Complete security restrictions and validations
- ✅ Comprehensive audit trail and documentation
- ✅ Easy integration with existing admin workflows

**Next Steps:**
1. Train super admins on proper usage
2. Integrate with support ticket system
3. Monitor reset activities for compliance
4. Set up email service for production environment
