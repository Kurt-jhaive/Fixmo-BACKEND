# Fixmo Admin System Documentation

## 📋 Overview

The Fixmo Admin System provides comprehensive management capabilities for administrators to oversee the entire platform, including user management, service provider verification, certificate approval, and system monitoring.

## 🔐 Admin Authentication

### Default Admin Credentials
- **Username:** `admin`
- **Email:** `admin@fixmo.com`
- **Password:** `admin123`

### Admin Access Points
1. **Web Interface:** `http://localhost:3000/admin`
2. **Login Page:** `http://localhost:3000/admin-login`
3. **Dashboard:** `http://localhost:3000/admin-dashboard`
4. **API Documentation:** `http://localhost:3000/api-docs` (Admin section)

## 🛠 Admin API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login with JWT token
- `POST /api/admin/logout` - Admin logout

### Dashboard & Analytics
- `GET /api/admin/dashboard-stats` - Platform statistics
- `GET /api/admin/recent-activity` - Recent platform activities

### User Management
- `GET /api/admin/users` - List all users with filtering
- `GET /api/admin/users/{userId}` - Get specific user details
- `PUT /api/admin/users/{userId}/verify` - Verify/unverify user
- `PUT /api/admin/users/{userId}/activate` - Activate user account
- `PUT /api/admin/users/{userId}/deactivate` - Deactivate user account

### Service Provider Management
- `GET /api/admin/providers` - List all service providers
- `GET /api/admin/providers/{providerId}` - Get provider details
- `PUT /api/admin/providers/{providerId}/verify` - Verify provider
- `PUT /api/admin/providers/{providerId}/activate` - Activate provider
- `PUT /api/admin/providers/{providerId}/deactivate` - Deactivate provider

### Certificate Management
- `GET /api/admin/certificates` - List all certificates
- `GET /api/admin/certificates/{certificateId}` - Get certificate details
- `PUT /api/admin/certificates/{certificateId}/approve` - Approve certificate
- `PUT /api/admin/certificates/{certificateId}/reject` - Reject certificate

### Booking Management
- `GET /api/admin/bookings` - Get booking statistics and data

### Legacy Endpoints (Backward Compatibility)
- `POST /api/admin/verify-service-provider` - Legacy provider verification
- `POST /api/admin/verify-customer` - Legacy customer verification
- `GET /api/admin/unverified-service-providers` - Get unverified providers
- `GET /api/admin/unverified-customers` - Get unverified customers

## 🔧 Using Admin APIs in Swagger UI

### Step 1: Login to Get Admin Token
1. Go to `http://localhost:3000/api-docs`
2. Find the **Admin** section
3. Use `POST /api/admin/login` endpoint
4. Login with admin credentials:
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
5. Copy the JWT token from the response

### Step 2: Authorize in Swagger
1. Click the **"Authorize"** button (🔒) at the top
2. Enter your token: `Bearer your-admin-jwt-token`
3. Click "Authorize" and "Close"

### Step 3: Use Admin Endpoints
Now you can access all admin endpoints that require authentication.

## 📊 Admin Dashboard Features

### Platform Statistics
- Total users and service providers
- Verification status counts
- Certificate approval metrics
- Booking statistics
- Revenue tracking

### User Management
- View all registered users
- Verify/unverify user accounts
- Activate/deactivate accounts
- View user details and history

### Provider Management
- Review service provider applications
- Verify provider credentials
- Manage provider status
- View provider certificates and services

### Certificate Verification
- Review submitted certificates
- Approve/reject certificates
- View certificate details and files
- Track certificate status

### Recent Activity Monitor
- Real-time platform activities
- New registrations
- Certificate submissions
- System events

## 🎯 Key Admin Functions

### 1. User Verification Process
```javascript
// Verify a user
PUT /api/admin/users/{userId}/verify
{
  "isVerified": true,
  "reason": "ID verification successful"
}
```

### 2. Provider Verification Process
```javascript
// Verify a service provider
PUT /api/admin/providers/{providerId}/verify
{
  "isVerified": true,
  "reason": "All documents verified"
}
```

### 3. Certificate Approval Process
```javascript
// Approve a certificate
PUT /api/admin/certificates/{certificateId}/approve
{
  "adminNotes": "Certificate verified and approved"
}

// Reject a certificate
PUT /api/admin/certificates/{certificateId}/reject
{
  "reason": "Certificate image not clear",
  "adminNotes": "Please resubmit with clearer image"
}
```

## 🔄 Admin Workflow

### Daily Admin Tasks
1. **Review Dashboard** - Check platform statistics
2. **Process Verifications** - Review pending user/provider verifications
3. **Certificate Review** - Approve/reject pending certificates
4. **Monitor Activity** - Check recent platform activities
5. **Handle Issues** - Respond to any reported problems

### User/Provider Verification Workflow
1. New user/provider registers
2. Admin receives notification
3. Admin reviews submitted documents
4. Admin approves or requests additional information
5. User/provider receives verification status

### Certificate Verification Workflow
1. Provider submits certificate
2. Certificate appears in admin pending list
3. Admin reviews certificate authenticity
4. Admin approves or rejects with reason
5. Provider receives notification

## 🚨 Admin Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access** - Admin-only endpoints
- **Session Management** - Secure session handling
- **Audit Trail** - All admin actions are logged
- **Secure Password Storage** - Bcrypt password hashing

## 🌐 Web Interface Files

### Admin HTML Files
- `src/public/admin-access.html` - Admin access portal
- `src/public/admin-login.html` - Admin login interface
- `src/public/admin-dashboard.html` - Admin dashboard interface

### Admin Assets
- CSS files for styling
- JavaScript files for functionality
- Images and icons

## 🗄️ Database Schema

### Admin Table Structure
```sql
admin {
  admin_id: Integer (Primary Key)
  admin_username: String (Unique)
  admin_email: String (Unique)
  admin_password: String (Hashed)
  admin_name: String
  admin_role: String
  is_active: Boolean
  created_at: DateTime
  last_login: DateTime
}
```

## 🔍 Monitoring & Analytics

### Platform Metrics
- User growth tracking
- Provider verification rates
- Certificate approval metrics
- Booking completion rates
- Revenue analytics

### Performance Monitoring
- API response times
- Database query performance
- System resource usage
- Error rate tracking

## 🛡️ Best Practices

### Security
- Change default admin password
- Use strong authentication
- Implement rate limiting
- Regular security audits

### Management
- Regular data backups
- Monitor system performance
- Keep audit logs
- Regular platform updates

## 📞 Support & Maintenance

### Admin Support
- System monitoring dashboard
- Error logging and tracking
- Performance metrics
- User feedback systems

### Maintenance Tasks
- Database optimization
- Cache management
- Log rotation
- Security updates

---

**Note:** This admin system provides complete control over the Fixmo platform. All admin endpoints are now fully documented in Swagger UI with proper authentication requirements.
