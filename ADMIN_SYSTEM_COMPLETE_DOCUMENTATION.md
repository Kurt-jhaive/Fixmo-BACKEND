# Admin System Documentation

## Overview
This admin system provides secure authentication and role-based access control for managing the Fixmo application. It includes super admin functionality, password management, and admin invitation features.

## Features

### 1. Super Admin Seeding
- **Location**: `src/seeders/seedSuperAdmin.js`
- **Purpose**: Creates the initial super admin account on first deployment
- **Credentials**:
  - Email: `super@fixmo.local`
  - Initial Password: `SuperAdmin2024!`
  - Role: `super_admin`
  - Must change password on first login

### 2. Admin Authentication
- JWT-based authentication
- Validates email + password
- Checks `is_active` status
- Returns `must_change_password` flag if password change required

### 3. Password Management
- Strong password requirements (8+ chars, uppercase, lowercase, number, special char)
- Bcrypt hashing with configurable salt rounds (default: 12)
- Mandatory password change for new admins
- Cannot reuse current password

### 4. Role-Based Access Control
- **Admin**: Standard admin privileges
- **Super Admin**: Can create, manage, and deactivate other admins

### 5. Admin Management (Super Admin Only)
- Invite new admins with auto-generated temporary passwords
- View all admins
- Activate/deactivate admin accounts
- Prevent self-deactivation
- Prevent deactivating last super admin

## API Endpoints

### Public Endpoints

#### POST `/api/admin/login`
Login admin user.

**Request Body:**
```json
{
  "username": "super@fixmo.local",
  "password": "SuperAdmin2024!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "admin": {
    "id": 1,
    "username": "superadmin",
    "email": "super@fixmo.local",
    "name": "Super Administrator",
    "role": "super_admin",
    "is_active": true
  },
  "must_change_password": true
}
```

### Protected Endpoints (Require Authentication)

#### PUT `/api/admin/change-password`
Change admin password.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "current_password": "current_password",
  "new_password": "new_secure_password"
}
```

#### POST `/api/admin/logout`
Logout admin (client-side token removal).

### Super Admin Only Endpoints

#### POST `/api/admin/`
Invite new admin.

**Request Body:**
```json
{
  "email": "new.admin@fixmo.local",
  "name": "New Administrator",
  "role": "admin"
}
```

**Response:**
```json
{
  "message": "Admin invited successfully",
  "admin": {
    "id": 2,
    "username": "new.admin_1634567890",
    "email": "new.admin@fixmo.local",
    "name": "New Administrator",
    "role": "admin",
    "is_active": true
  },
  "temporary_password": "randomPassword123!",
  "note": "Please share this temporary password securely with the new admin"
}
```

#### GET `/api/admin/`
Get all admins.

#### PUT `/api/admin/:admin_id/toggle-status`
Activate/deactivate admin.

**Request Body:**
```json
{
  "is_active": false
}
```

## Middleware

### 1. `adminAuthMiddleware`
- Validates JWT tokens
- Checks if admin exists and is active
- Attaches admin info to request object

### 2. `superAdminMiddleware`
- Ensures admin has super_admin role
- Must be used after `adminAuthMiddleware`

### 3. `checkPasswordChangeRequired`
- Blocks access if password change is required
- Allows access to change-password endpoint

## Security Features

1. **Password Hashing**: Bcrypt with 12 salt rounds (configurable via `BCRYPT_SALT_ROUNDS` env var)
2. **JWT Expiration**: 24-hour token expiry
3. **Input Validation**: Email format, password complexity, role validation
4. **Account Protection**: 
   - Cannot deactivate own account
   - Cannot deactivate last super admin
   - Must change password on first login
5. **Error Handling**: Secure error messages without sensitive data exposure

## Environment Variables

```env
JWT_SECRET=your-jwt-secret-key
BCRYPT_SALT_ROUNDS=12
DATABASE_URL=your-database-url
```

## Setup Instructions

1. **Run Database Migrations**:
   ```bash
   npx prisma migrate dev
   ```

2. **Seed Super Admin**:
   ```bash
   node run-seeder.js
   ```

3. **Start Server** and test endpoints

## Testing

Run the test suite:
```bash
node test-admin-system.js
```

This will test all admin endpoints including:
- Login with initial credentials
- Password change
- Admin invitation
- Status management

## Database Schema

The `Admin` model includes:
- `admin_id`: Primary key
- `admin_username`: Unique username
- `admin_email`: Unique email
- `admin_password`: Bcrypt hashed password
- `admin_name`: Display name
- `admin_role`: 'admin' or 'super_admin'
- `is_active`: Account status
- `must_change_password`: Password change requirement
- `created_at`: Creation timestamp
- `last_login`: Last login timestamp

## Best Practices

1. **Always use HTTPS in production**
2. **Set strong JWT_SECRET in production**
3. **Regularly rotate admin credentials**
4. **Monitor admin login activities**
5. **Use environment variables for sensitive configuration**
6. **Implement proper logging for security events**
