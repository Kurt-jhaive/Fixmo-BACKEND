# Fixmo Backend API Documentation

## Overview

The Fixmo Backend API is a comprehensive service management platform that connects customers with service providers. This documentation is based on the actual controller implementations and provides accurate request/response formats, validation rules, and business logic.

**Base URL:** `http://localhost:3000` (or your deployed URL)

> **Note:** This documentation is generated from actual controller implementations to ensure accuracy.

## Data Models (Based on Prisma Schema)

### User (Customer)
```javascript
{
  user_id: number,           // Primary key
  first_name: string,
  last_name: string,
  email: string,             // Unique
  phone_number: string,      // Unique
  profile_photo: string?,    // Optional file path
  valid_id: string?,         // Optional file path
  user_location: string?,
  created_at: datetime,
  is_verified: boolean,      // Default: false
  password: string,
  userName: string,          // Unique
  is_activated: boolean,     // Default: true
  birthday: datetime?,
  exact_location: string?
}
```

### ServiceProviderDetails
```javascript
{
  provider_id: number,               // Primary key
  provider_first_name: string,
  provider_last_name: string,
  provider_email: string,           // Unique
  provider_phone_number: string,    // Unique
  provider_profile_photo: string?,
  provider_valid_id: string?,
  provider_isVerified: boolean,     // Default: false
  created_at: datetime,
  provider_rating: float,           // Default: 0.0
  provider_location: string?,
  provider_uli: string,             // Unique
  provider_password: string,
  provider_userName: string,        // Unique
  provider_isActivated: boolean,    // Default: true
  provider_birthday: datetime?,
  provider_exact_location: string?
}
```

### ServiceListing
```javascript
{
  service_id: number,                   // Primary key
  service_title: string,
  service_description: string,
  service_startingprice: float,
  provider_id: number,                  // Foreign key
  servicelisting_isActive: boolean,     // Default: true
  service_picture: string?
}
```

### Appointment
```javascript
{
  appointment_id: number,         // Primary key
  customer_id: number,            // Foreign key
  provider_id: number,            // Foreign key
  appointment_status: string,
  scheduled_date: datetime,
  repairDescription: string?,
  created_at: datetime,
  final_price: float?,
  availability_id: number,        // Foreign key
  service_id: number,             // Foreign key
  cancellation_reason: string?
}
```

### Rating
```javascript
{
  id: number,                     // Primary key
  rating_value: number,           // 1-5 stars
  rating_comment: string?,
  rating_photo: string?,          // Review photo path
  appointment_id: number,         // Foreign key
  user_id: number,               // Foreign key
  provider_id: number,           // Foreign key
  rated_by: string,              // 'customer' or 'provider'
  created_at: datetime
}
```

### Certificate
```javascript
{
  certificate_id: number,         // Primary key
  certificate_name: string,
  certificate_file_path: string,
  expiry_date: datetime?,
  provider_id: number,           // Foreign key
  certificate_number: string,    // Unique
  certificate_status: string,    // Default: "Pending"
  created_at: datetime
}
```

### Availability
```javascript
{
  availability_id: number,        // Primary key
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  provider_id: number,           // Foreign key
  availability_isActive: boolean  // Default: true
}
```

---

## Authentication Endpoints

### Customer Authentication (`/auth`)

#### 1. Customer Login
- **Endpoint:** `POST /auth/login`
- **Description:** Authenticate customer and create session
- **Body:**
```javascript
{
  email: string,          // Customer email
  password: string        // Customer password
}
```
- **Response:**
```javascript
{
  success: boolean,
  message: string,
  user: {
    user_id: number,
    first_name: string,
    last_name: string,
    email: string,
    is_verified: boolean
  },
  token?: string          // JWT token if applicable
}
```

#### 2. Request Customer Registration OTP
- **Endpoint:** `POST /auth/request-otp`
- **Description:** Send OTP for customer registration
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  first_name: string,
  last_name: string,
  email: string,
  phone_number: string,
  user_location: string,
  userName: string,
  password: string,
  birthday?: string,      // ISO date string
  exact_location?: string,
  profile_photo?: File,   // Image file (max 5MB)
  valid_id?: File         // Image file (max 5MB)
}
```

#### 3. Verify OTP Only
- **Endpoint:** `POST /auth/verify-otp`
- **Description:** Verify OTP without completing registration
- **Body:**
```javascript
{
  email: string,
  otp: string
}
```

#### 4. Complete Registration with OTP
- **Endpoint:** `POST /auth/verify-register`
- **Description:** Verify OTP and complete customer registration
- **Content-Type:** `multipart/form-data`
- **Body:** Same as request-otp plus:
```javascript
{
  otp: string
}
```

#### 5. Forgot Password - Request OTP
- **Endpoint:** `POST /auth/forgot-password-request-otp`
- **Body:**
```javascript
{
  email: string
}
```

#### 6. Forgot Password - Verify and Reset
- **Endpoint:** `POST /auth/forgot-password-verify-otp`
- **Body:**
```javascript
{
  email: string,
  otp: string,
  newPassword: string
}
```

#### 7. Reset Password (OTP already verified)
- **Endpoint:** `POST /auth/reset-password`
- **Body:**
```javascript
{
  email: string,
  newPassword: string
}
```

### Service Provider Authentication (`/auth`)

#### 8. Provider Registration - Request OTP
- **Endpoint:** `POST /auth/provider-request-otp`
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  provider_first_name: string,
  provider_last_name: string,
  provider_email: string,
  provider_phone_number: string,
  provider_location: string,
  provider_uli: string,           // Unique provider identifier
  provider_userName: string,
  provider_password: string,
  provider_birthday?: string,
  provider_exact_location?: string,
  provider_profile_photo?: File,
  provider_valid_id?: File
}
```

#### 9. Provider Verify OTP Only
- **Endpoint:** `POST /auth/provider-verify-otp`
- **Body:**
```javascript
{
  provider_email: string,
  otp: string
}
```

#### 10. Provider Complete Registration
- **Endpoint:** `POST /auth/provider-verify-register`
- **Content-Type:** `multipart/form-data`
- **Body:** Same as provider-request-otp plus:
```javascript
{
  otp: string
}
```

#### 11. Provider Login
- **Endpoint:** `POST /auth/provider-login` or `POST /auth/loginProvider`
- **Body:**
```javascript
{
  provider_email: string,
  provider_password: string
}
```

#### 12. Provider Forgot Password
- **Endpoint:** `POST /auth/provider-forgot-password-request-otp`
- **Body:**
```javascript
{
  provider_email: string
}
```

#### 13. Provider Reset Password
- **Endpoint:** `POST /auth/provider-forgot-password-verify-otp`
- **Body:**
```javascript
{
  provider_email: string,
  otp: string,
  newPassword: string
}
```

---

## Customer Profile & Services

#### 14. Get Customer Profile
- **Endpoint:** `GET /auth/user-profile/:userId`
- **Parameters:** `userId` (number)
- **Response:**
```javascript
{
  user_id: number,
  first_name: string,
  last_name: string,
  email: string,
  phone_number: string,
  profile_photo: string?,
  valid_id: string?,
  user_location: string?,
  is_verified: boolean,
  is_activated: boolean,
  birthday: datetime?,
  exact_location: string?
}
```

#### 15. Update Customer Verification Documents
- **Endpoint:** `POST /auth/update-verification-documents`
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  userId: number,
  profilePicture?: File,
  validId?: File
}
```

#### 16. Get Service Listings for Customer
- **Endpoint:** `GET /auth/service-listings`
- **Query Parameters:**
  - `location?` (string): Filter by location
  - `category?` (string): Filter by service category
  - `page?` (number): Page number for pagination
  - `limit?` (number): Number of results per page

#### 17. Get Service Categories
- **Endpoint:** `GET /auth/service-categories`
- **Response:**
```javascript
[
  {
    category_id: number,
    category_name: string
  }
]
```

#### 18. Get Customer Statistics
- **Endpoint:** `GET /auth/customer-stats/:userId`
- **Parameters:** `userId` (number)
- **Response:**
```javascript
{
  totalAppointments: number,
  completedAppointments: number,
  cancelledAppointments: number,
  pendingAppointments: number,
  totalSpent: number
}
```

---

## Service Provider Management (`/api/serviceProvider`)

#### 19. Get Provider Profile
- **Endpoint:** `GET /api/serviceProvider/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
```javascript
{
  provider_id: number,
  provider_first_name: string,
  provider_last_name: string,
  provider_email: string,
  provider_phone_number: string,
  provider_profile_photo: string?,
  provider_rating: number,
  provider_location: string?,
  provider_isVerified: boolean,
  provider_isActivated: boolean
}
```

#### 20. Get Provider Services
- **Endpoint:** `GET /api/serviceProvider/my-services`
- **Headers:** `Authorization: Bearer <token>`

#### 21. Request Profile Update OTP
- **Endpoint:** `POST /api/serviceProvider/profile-update-request-otp`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```javascript
{
  newEmail?: string    // If changing email
}
```

---

## Service Management (`/api/services`)

#### 22. Get Service Categories
- **Endpoint:** `GET /api/services/categories`
- **Response:**
```javascript
[
  {
    category_id: number,
    category_name: string
  }
]
```

#### 23. Get Provider Services
- **Endpoint:** `GET /api/services/services`
- **Headers:** `Authorization: Bearer <token>` (Provider auth required)

#### 24. Get Service by ID
- **Endpoint:** `GET /api/services/services/:serviceId`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `serviceId` (number)

#### 25. Create New Service
- **Endpoint:** `POST /api/services/services`
- **Headers:** `Authorization: Bearer <token>`
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  service_title: string,
  service_description: string,
  service_startingprice: number,
  category_id: number,
  service_picture?: File
}
```

#### 26. Update Service
- **Endpoint:** `PUT /api/services/services/:serviceId`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `serviceId` (number)
- **Body:**
```javascript
{
  service_title?: string,
  service_description?: string,
  service_startingprice?: number,
  servicelisting_isActive?: boolean
}
```

#### 27. Delete Service
- **Endpoint:** `DELETE /api/services/services/:serviceId`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `serviceId` (number)

#### 28. Toggle Service Availability
- **Endpoint:** `PATCH /api/services/services/:serviceId/toggle`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `serviceId` (number)

---

## Certificate Management (`/api/certificates`)

#### 29. Get Provider Certificates
- **Endpoint:** `GET /api/certificates/`
- **Headers:** `Authorization: Bearer <token>` (Provider auth required)

#### 30. Get Valid Certificate Types
- **Endpoint:** `GET /api/certificates/valid-types`
- **Response:**
```javascript
[
  "Electrical Certificate",
  "Plumbing License",
  "HVAC Certification",
  "General Contractor License",
  // ... more certificate types
]
```

#### 31. Get Certificate by ID
- **Endpoint:** `GET /api/certificates/:certificateId`
- **Parameters:** `certificateId` (number)

#### 32. Upload Certificate
- **Endpoint:** `POST /api/certificates/upload`
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  certificate_name: string,
  certificate_number: string,
  expiry_date?: string,      // ISO date string
  provider_id: number,
  certificateFile: File      // PDF, image, or document
}
```

#### 33. Delete Certificate
- **Endpoint:** `DELETE /api/certificates/:certificateId`
- **Parameters:** `certificateId` (number)

---

## Availability Management (`/api/availability`)

#### 34. Get Provider Availability
- **Endpoint:** `GET /api/availability/`
- **Query Parameters:**
  - `provider_id` (number): Provider ID
  - `day?` (string): Specific day of week

#### 35. Set Provider Availability
- **Endpoint:** `POST /api/availability/`
- **Body:**
```javascript
{
  provider_id: number,
  dayOfWeek: string,       // "Monday", "Tuesday", etc.
  startTime: string,       // "09:00"
  endTime: string,         // "17:00"
  availability_isActive?: boolean
}
```

#### 36. Delete Availability
- **Endpoint:** `DELETE /api/availability/:availabilityId`
- **Parameters:** `availabilityId` (number)

#### 37. Get Availability Summary
- **Endpoint:** `GET /api/availability/summary`
- **Query Parameters:**
  - `provider_id` (number): Provider ID

---

## Appointment Management (`/api/appointments`)

#### 38. Get All Appointments
- **Endpoint:** `GET /api/appointments/`
- **Query Parameters:**
  - `status?` (string): Filter by appointment status
  - `provider_id?` (number): Filter by provider
  - `customer_id?` (number): Filter by customer
  - `from_date?` (string): Start date filter (ISO)
  - `to_date?` (string): End date filter (ISO)
  - `page?` (number): Page number
  - `limit?` (number): Results per page

#### 39. Get Appointment Statistics
- **Endpoint:** `GET /api/appointments/stats`
- **Query Parameters:**
  - `provider_id?` (number): Provider-specific stats
  - `customer_id?` (number): Customer-specific stats

#### 40. Get Appointment by ID
- **Endpoint:** `GET /api/appointments/:appointmentId`
- **Parameters:** `appointmentId` (number)

#### 41. Create Appointment
- **Endpoint:** `POST /api/appointments/`
- **Body:**
```javascript
{
  customer_id: number,
  provider_id: number,
  service_id: number,
  availability_id: number,
  scheduled_date: string,        // ISO datetime
  repairDescription?: string,
  appointment_status?: string    // Default: "Pending"
}
```

#### 42. Update Appointment
- **Endpoint:** `PUT /api/appointments/:appointmentId`
- **Parameters:** `appointmentId` (number)
- **Body:**
```javascript
{
  appointment_status?: string,
  scheduled_date?: string,
  repairDescription?: string,
  final_price?: number,
  cancellation_reason?: string
}
```

#### 43. Delete Appointment
- **Endpoint:** `DELETE /api/appointments/:appointmentId`
- **Parameters:** `appointmentId` (number)

#### 44. Cancel Appointment
- **Endpoint:** `PUT /api/appointments/:appointmentId/cancel`
- **Parameters:** `appointmentId` (number)
- **Body:**
```javascript
{
  cancellation_reason: string,
  cancelled_by: string           // "customer" or "provider"
}
```

#### 45. Rate Appointment
- **Endpoint:** `POST /api/appointments/:appointmentId/rate`
- **Parameters:** `appointmentId` (number)
- **Body:**
```javascript
{
  rating_value: number,          // 1-5
  rating_comment?: string,
  rating_photo?: string          // Base64 or file path
}
```

#### 46. Get Provider Appointments
- **Endpoint:** `GET /api/appointments/provider/:providerId`
- **Parameters:** `providerId` (number)
- **Query Parameters:**
  - `status?` (string): Filter by status
  - `from_date?` (string): Start date
  - `to_date?` (string): End date

#### 47. Get Customer Appointments
- **Endpoint:** `GET /api/appointments/customer/:customerId`
- **Parameters:** `customerId` (number)
- **Query Parameters:**
  - `status?` (string): Filter by status
  - `from_date?` (string): Start date
  - `to_date?` (string): End date

---

## Rating System (`/api/ratings`)

#### 48. Get Rateable Appointments
- **Endpoint:** `GET /api/ratings/rateable-appointments`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Description:** Get appointments that can be rated by the authenticated customer

#### 49. Create Rating
- **Endpoint:** `POST /api/ratings/create`
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  appointment_id: number,
  rating_value: number,          // 1-5 stars
  rating_comment?: string,
  rating_photo?: File            // Image file for review
}
```

#### 50. Update Rating
- **Endpoint:** `PUT /api/ratings/update/:ratingId`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Parameters:** `ratingId` (number)
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  rating_value?: number,
  rating_comment?: string,
  rating_photo?: File
}
```

#### 51. Delete Rating
- **Endpoint:** `DELETE /api/ratings/delete/:ratingId`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Parameters:** `ratingId` (number)

#### 52. Get Customer Ratings
- **Endpoint:** `GET /api/ratings/customer/:customerId`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Parameters:** `customerId` (number)

#### 53. Get Provider Ratings
- **Endpoint:** `GET /api/ratings/provider/:providerId`
- **Parameters:** `providerId` (number)
- **Response:**
```javascript
{
  provider_id: number,
  average_rating: number,
  total_ratings: number,
  ratings: [
    {
      id: number,
      rating_value: number,
      rating_comment: string?,
      rating_photo: string?,
      created_at: datetime,
      customer_name: string
    }
  ]
}
```

---

## Admin Management (`/api/admin`)

#### 54. Admin Login
- **Endpoint:** `POST /api/admin/login`
- **Body:**
```javascript
{
  admin_username: string,
  admin_password: string
}
```

#### 55. Admin Logout
- **Endpoint:** `POST /api/admin/logout`

#### 56. Get Dashboard Statistics
- **Endpoint:** `GET /api/admin/dashboard-stats`
- **Response:**
```javascript
{
  totalUsers: number,
  totalProviders: number,
  totalAppointments: number,
  pendingVerifications: number,
  recentSignups: number
}
```

#### 57. Get Recent Activity
- **Endpoint:** `GET /api/admin/recent-activity`

#### 58. Get All Users
- **Endpoint:** `GET /api/admin/users`
- **Query Parameters:**
  - `page?` (number): Page number
  - `limit?` (number): Results per page
  - `search?` (string): Search term
  - `verified?` (boolean): Filter by verification status

#### 59. Get User by ID
- **Endpoint:** `GET /api/admin/users/:userId`
- **Parameters:** `userId` (number)

#### 60. Verify User
- **Endpoint:** `PUT /api/admin/users/:userId/verify`
- **Parameters:** `userId` (number)

#### 61. Activate/Deactivate User
- **Endpoint:** `PUT /api/admin/users/:userId/activate`
- **Endpoint:** `PUT /api/admin/users/:userId/deactivate`
- **Parameters:** `userId` (number)

#### 62. Get All Providers
- **Endpoint:** `GET /api/admin/providers`
- **Query Parameters:**
  - `page?` (number): Page number
  - `limit?` (number): Results per page
  - `search?` (string): Search term
  - `verified?` (boolean): Filter by verification status

#### 63. Get Provider by ID
- **Endpoint:** `GET /api/admin/providers/:providerId`
- **Parameters:** `providerId` (number)

#### 64. Verify Provider
- **Endpoint:** `PUT /api/admin/providers/:providerId/verify`
- **Parameters:** `providerId` (number)

#### 65. Activate/Deactivate Provider
- **Endpoint:** `PUT /api/admin/providers/:providerId/activate`
- **Endpoint:** `PUT /api/admin/providers/:providerId/deactivate`
- **Parameters:** `providerId` (number)

#### 66. Get All Certificates
- **Endpoint:** `GET /api/admin/certificates`
- **Query Parameters:**
  - `status?` (string): Filter by certificate status ("Pending", "Approved", "Rejected")

#### 67. Get Certificate by ID
- **Endpoint:** `GET /api/admin/certificates/:certificateId`
- **Parameters:** `certificateId` (number)

#### 68. Approve Certificate
- **Endpoint:** `PUT /api/admin/certificates/:certificateId/approve`
- **Parameters:** `certificateId` (number)

#### 69. Reject Certificate
- **Endpoint:** `PUT /api/admin/certificates/:certificateId/reject`
- **Parameters:** `certificateId` (number)
- **Body:**
```javascript
{
  rejection_reason: string
}
```

#### 70. Get All Bookings
- **Endpoint:** `GET /api/admin/bookings`
- **Query Parameters:**
  - `status?` (string): Filter by booking status
  - `from_date?` (string): Start date filter
  - `to_date?` (string): End date filter

#### 71. Get Unverified Service Providers
- **Endpoint:** `GET /api/admin/unverified-service-providers`

#### 72. Get Unverified Customers
- **Endpoint:** `GET /api/admin/unverified-customers`

---

## Booking Management (Additional Routes)

#### 73. Get Provider Booking Availability
- **Endpoint:** `GET /auth/provider/:providerId/booking-availability`
- **Parameters:** `providerId` (number)
- **Query Parameters:**
  - `date?` (string): Specific date (YYYY-MM-DD)

#### 74. Get Provider Weekly Days
- **Endpoint:** `GET /auth/provider/:providerId/weekly-days`
- **Parameters:** `providerId` (number)

#### 75. Get Service Listing Details
- **Endpoint:** `GET /auth/service-listing/:service_id`
- **Parameters:** `service_id` (number)

---

## File Upload Endpoints

#### 76. Static File Access
- **Endpoint:** `GET /uploads/:filePath`
- **Description:** Access uploaded files (profile photos, IDs, certificates, service images)
- **Parameters:** `filePath` (string) - Path to the uploaded file

---

## Error Responses

All endpoints may return these standard error responses:

### 400 Bad Request
```javascript
{
  error: "Bad Request",
  message: "Specific error description",
  details?: any
}
```

### 401 Unauthorized
```javascript
{
  error: "Unauthorized",
  message: "Authentication required or invalid credentials"
}
```

### 403 Forbidden
```javascript
{
  error: "Forbidden",
  message: "Insufficient permissions"
}
```

### 404 Not Found
```javascript
{
  error: "Not Found",
  message: "Resource not found"
}
```

### 422 Validation Error
```javascript
{
  error: "Validation Error",
  message: "Invalid input data",
  details: {
    field: "error description"
  }
}
```

### 500 Internal Server Error
```javascript
{
  error: "Internal Server Error",
  message: "Something went wrong on our end"
}
```

---

## Status Codes Reference

### Appointment Status
- `"Pending"` - Appointment requested, awaiting provider acceptance
- `"Confirmed"` - Provider has accepted the appointment
- `"In Progress"` - Service is currently being performed
- `"Completed"` - Service has been completed successfully
- `"Cancelled"` - Appointment has been cancelled
- `"Rejected"` - Provider rejected the appointment request

### Certificate Status
- `"Pending"` - Certificate submitted, awaiting admin review
- `"Approved"` - Certificate has been verified and approved
- `"Rejected"` - Certificate was rejected during review

### User/Provider Verification
- `is_verified: false` - Account not yet verified
- `is_verified: true` - Account has been verified by admin

### Account Activation
- `is_activated: true` - Account is active and can be used
- `is_activated: false` - Account has been deactivated

---

## Authentication & Authorization

### Session-Based Authentication
The API uses express-session for maintaining user sessions. After successful login, a session is created and maintained via cookies.

### JWT Token Authentication (where applicable)
Some endpoints may use JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Role-Based Access
- **Customer routes:** Require customer authentication
- **Provider routes:** Require service provider authentication  
- **Admin routes:** Require admin authentication

---

## File Upload Guidelines

### Supported File Types
- **Profile Photos:** JPG, PNG, GIF (max 5MB)
- **ID Documents:** JPG, PNG, PDF (max 5MB)
- **Certificates:** PDF, JPG, PNG, DOC, DOCX (max 10MB)
- **Service Images:** JPG, PNG (max 5MB)

### Upload Directories
- Customer profiles: `/uploads/customer-profiles/`
- Customer IDs: `/uploads/customer-ids/`
- Provider profiles: `/uploads/profiles/`
- Provider IDs: `/uploads/ids/`
- Certificates: `/uploads/certificates/`
- Service images: `/uploads/service-images/`
- Rating photos: `/uploads/rating-photos/`

---

## Rate Limiting & Performance

- API requests are not currently rate-limited, but this may be implemented in production
- Large file uploads are limited by size (see File Upload Guidelines)
- Pagination is available on list endpoints with `page` and `limit` parameters

---

## Development & Testing

### Health Check
- **Endpoint:** `GET /`
- **Response:**
```javascript
{
  message: "Fixmo Backend API is running",
  status: "OK",
  timestamp: "2024-01-01T12:00:00.000Z",
  version: "1.0.0"
}
```

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption
- `PORT` - Server port (default: 3000)

---

This documentation covers all the main endpoints in your Fixmo Backend API. Each endpoint is designed to work with the Prisma schema you provided, ensuring data consistency and proper relationships between users, providers, services, appointments, and ratings.
