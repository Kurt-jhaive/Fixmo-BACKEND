# Swagger Documentation for Admin System

## Overview

The Swagger documentation has been updated to include comprehensive documentation for the new admin management system. This guide explains how to use the Swagger UI to test the admin endpoints.

## Accessing Swagger UI

1. Start your server:
   ```bash
   npm start
   ```

2. Open Swagger UI in your browser:
   ```
   http://localhost:3000/api-docs
   ```

## Admin Authentication in Swagger

### Step 1: Login as Super Admin

1. Navigate to **Admin Authentication** section
2. Find **POST /api/admin/login**
3. Click "Try it out"
4. Use these credentials:
   ```json
   {
     "username": "super@fixmo.local",
     "password": "SuperAdmin2024!"
   }
   ```
5. Click "Execute"
6. Copy the `token` from the response

### Step 2: Authorize in Swagger

1. Click the **"Authorize"** button (🔒) at the top right of Swagger UI
2. In the bearerAuth field, paste your token
3. **Do NOT include "Bearer "** - Swagger adds it automatically
4. Click "Authorize"
5. Click "Close"

### Step 3: Test Protected Endpoints

Now you can test any endpoint with the 🔒 icon. The admin system includes:

## Available Admin Endpoints

### 🔐 Authentication Endpoints

#### POST /api/admin/login
- **Purpose**: Login and get JWT token
- **Access**: Public
- **Test Data**:
  ```json
  {
    "username": "super@fixmo.local",
    "password": "SuperAdmin2024!"
  }
  ```

#### PUT /api/admin/change-password
- **Purpose**: Change admin password
- **Access**: Authenticated admins
- **Test Data**:
  ```json
  {
    "current_password": "SuperAdmin2024!",
    "new_password": "NewSecurePassword2024!"
  }
  ```

#### POST /api/admin/logout
- **Purpose**: Logout (client-side token removal)
- **Access**: Authenticated admins

### 👑 Super Admin Only Endpoints

#### POST /api/admin/
- **Purpose**: Invite new admin
- **Access**: Super admins only
- **Test Data**:
  ```json
  {
    "email": "test.admin@fixmo.local",
    "name": "Test Administrator",
    "role": "admin"
  }
  ```

#### GET /api/admin/
- **Purpose**: Get all admins
- **Access**: Super admins only

#### PUT /api/admin/{admin_id}/toggle-status
- **Purpose**: Activate/deactivate admin
- **Access**: Super admins only
- **Test Data**:
  ```json
  {
    "is_active": false
  }
  ```

## Testing Workflow

### 1. First Login (Password Change Required)

1. Login with default credentials
2. Note the `must_change_password: true` in response
3. Use the change password endpoint
4. Login again with new password

### 2. Admin Management Flow

1. Login as super admin
2. Create a new admin using POST /api/admin/
3. Note the temporary password in response
4. View all admins using GET /api/admin/
5. Test deactivating/reactivating admin status

### 3. Role-Based Access Testing

1. Try accessing super admin endpoints without authentication (should get 401)
2. Login as regular admin and try super admin endpoints (should get 403)
3. Login as super admin and access all endpoints (should work)

## Swagger Features

### 📋 Schema Documentation

All admin-related schemas are documented with:
- **Required fields** marked clearly
- **Example values** for easy testing
- **Field descriptions** explaining purpose
- **Validation rules** (password requirements, email format, etc.)

### 🔍 Detailed Responses

Each endpoint documents:
- **Success responses** with example data
- **Error responses** with common error cases
- **Status codes** and their meanings
- **Security requirements**

### 🛡️ Security Information

- **Authentication requirements** clearly marked
- **Role-based access** documented
- **Security restrictions** explained
- **Token format** and usage instructions

## Schema Highlights

### Admin Schema
```json
{
  "admin_id": 1,
  "admin_username": "superadmin",
  "admin_email": "super@fixmo.local",
  "admin_name": "Super Administrator",
  "admin_role": "super_admin",
  "is_active": true,
  "must_change_password": true,
  "created_at": "2024-01-15T08:30:00Z",
  "last_login": "2024-12-01T14:25:00Z"
}
```

### Error Response Schema
```json
{
  "message": "Invalid credentials",
  "error": "UNAUTHORIZED"
}
```

## Tags Organization

The admin endpoints are organized into logical tags:

- **Admin Authentication**: Login, logout, password change
- **Admin Management**: Admin creation, listing, status management
- **Admin Dashboard**: Statistics and monitoring

## Best Practices for Testing

1. **Always test authentication first** - Get a valid token before testing protected endpoints
2. **Test error scenarios** - Try invalid data to see error responses
3. **Verify role restrictions** - Ensure super admin endpoints reject regular admins
4. **Test security features** - Verify password requirements, account restrictions
5. **Use realistic data** - Use proper email formats and strong passwords

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: 
   - Check if you're using the Authorization button
   - Verify token is not expired (24h limit)
   - Ensure admin account is active

2. **403 Forbidden**:
   - Verify you have the correct role (super_admin for management endpoints)
   - Check if password change is required

3. **400 Bad Request**:
   - Check required fields are provided
   - Verify password complexity requirements
   - Ensure email format is valid

### Token Debugging

If you're having token issues:
1. Check the token format in the authorization header
2. Verify the JWT_SECRET matches your server configuration
3. Ensure the token hasn't expired

## Production Considerations

When using this documentation in production:

1. **Change default credentials** immediately
2. **Use HTTPS** for all admin operations
3. **Set strong JWT_SECRET** environment variable
4. **Limit Swagger access** to authorized users only
5. **Monitor admin activities** through logs

The Swagger documentation provides a complete testing environment for the admin system with security best practices and comprehensive endpoint coverage.
