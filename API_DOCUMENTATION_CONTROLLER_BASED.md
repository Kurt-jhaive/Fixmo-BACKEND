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
  appointment_status: string,     // 'pending', 'approved', 'confirmed', 'in-progress', 'finished', 'completed', 'cancelled', 'no-show'
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
  rating_value: number,           // 1-5 stars (validated)
  rating_comment: string?,
  rating_photo: string?,          // Review photo path
  appointment_id: number,         // Foreign key
  user_id: number,               // Foreign key
  provider_id: number,           // Foreign key
  rated_by: string,              // 'customer' or 'provider'
  created_at: datetime
}
```

---

## Authentication Endpoints

### Customer Authentication (`/auth`)

#### 1. Customer Login
- **Endpoint:** `POST /auth/login`
- **Description:** Authenticate customer and create JWT token
- **Body:**
```javascript
{
  email: string,          // Required
  password: string        // Required
}
```
- **Success Response (200):**
```javascript
{
  message: "Login successful",
  token: string,          // JWT token (expires in 1 hour)
  userId: number,
  userName: string
}
```
- **Error Responses:**
  - `400`: Invalid email or password / Missing fields
  - `500`: Server error during login

#### 2. Request Customer Registration OTP
- **Endpoint:** `POST /auth/request-otp`
- **Description:** Send OTP for customer registration (validates uniqueness)
- **Body:**
```javascript
{
  email: string           // Required - checked for uniqueness across users and providers
}
```
- **Validation:**
  - Checks if user already exists
  - Rate limiting applied
  - Deletes previous OTPs for the email
- **Success Response (200):**
```javascript
{
  message: "OTP sent to email"
}
```
- **Error Responses:**
  - `400`: User already exists
  - `429`: Rate limit exceeded
  - `500`: Error sending OTP

#### 3. Complete Customer Registration
- **Endpoint:** `POST /auth/verify-register`
- **Description:** Verify OTP and complete customer registration
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  first_name: string,              // Required
  last_name: string,               // Required
  userName: string,                // Required - must be unique
  email: string,                   // Required
  password: string,                // Required - will be hashed
  phone_number: string,            // Required - validated for uniqueness
  user_location: string?,
  exact_location: string?,
  birthday: string?,               // ISO date string
  otp: string,                     // Required - 6-digit OTP
  profile_photo?: File,            // Image file (max 5MB)
  valid_id?: File                  // Image file (max 5MB)
}
```
- **Validation:**
  - Verifies OTP (10-minute expiry)
  - Checks email/phone uniqueness across users and providers
  - Hashes password with bcrypt
- **Success Response (201):**
```javascript
{
  message: "User registered successfully",
  userId: number,
  profile_photo: string?,          // File path if uploaded
  valid_id: string?                // File path if uploaded
}
```
- **Error Responses:**
  - `400`: Invalid OTP / User already exists / Phone number already registered
  - `500`: Server error during registration

---

## Service Provider Authentication (`/auth`)

#### 4. Provider Registration - Request OTP
- **Endpoint:** `POST /auth/provider-request-otp`
- **Body:**
```javascript
{
  provider_email: string           // Required - checked for uniqueness
}
```
- **Validation:**
  - Checks if provider already exists
  - Deletes previous OTPs for the email
- **Success Response (200):**
```javascript
{
  message: "OTP sent to provider email"
}
```

#### 5. Provider Complete Registration
- **Endpoint:** `POST /auth/provider-verify-register`
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  provider_first_name: string,     // Required
  provider_last_name: string,      // Required
  provider_email: string,          // Required
  provider_phone_number: string,   // Required - validated for uniqueness
  provider_location: string,       // Required
  provider_uli: string,            // Required - unique provider identifier
  provider_userName: string,       // Required - must be unique
  provider_password: string,       // Required - will be hashed
  provider_birthday: string?,      // ISO date string
  provider_exact_location: string?,
  otp: string,                     // Required - 6-digit OTP
  provider_profile_photo?: File,   // Image file
  provider_valid_id?: File,        // Image file
  certificateNames?: string[],     // Array of certificate names
  certificateNumbers?: string[],   // Array of certificate numbers
  expiryDates?: string[]           // Array of expiry dates
}
```
- **Validation:**
  - Verifies OTP
  - Checks email/phone uniqueness across providers and customers
  - Hashes password with bcrypt
- **Success Response (201):** Similar to customer registration

#### 6. Provider Login
- **Endpoint:** `POST /auth/provider-login` or `POST /auth/loginProvider`
- **Body:**
```javascript
{
  provider_email: string,          // Required
  provider_password: string        // Required
}
```
- **Success Response (200):**
```javascript
{
  message: "Login successful",
  token: string,                   // JWT token
  providerId: number,
  providerUserName: string
}
```

---

## Service Management (`/api/services`)

#### 7. Get Provider Services
- **Endpoint:** `GET /api/services/services`
- **Headers:** `Authorization: Bearer <token>` (Provider auth required)
- **Description:** Get all services for authenticated provider with enhanced data
- **Success Response (200):**
```javascript
{
  success: true,
  data: [
    {
      listing_id: number,
      service_id: number,
      service_name: string,
      service_title: string,
      description: string,
      service_description: string,
      service_picture: string?,        // Validated path or null
      price: number,
      service_startingprice: number,
      price_per_hour: number,
      provider_id: number,
      is_available: boolean,           // Based on servicelisting_isActive
      status: string,                  // "active" or "inactive"
      specific_services: array,
      category_name: string,           // From related category or "Uncategorized"
      category: object?,
      category_id: number?,
      certificates: array,             // Certificates covering the service
      booking_count: number            // Default: 0
    }
  ],
  count: number
}
```

#### 8. Get Service Categories
- **Endpoint:** `GET /api/services/categories`
- **Description:** Get all available service categories (Public endpoint)
- **Success Response (200):**
```javascript
[
  {
    category_id: number,
    category_name: string
  }
]
```

#### 9. Create New Service
- **Endpoint:** `POST /api/services/services`
- **Headers:** `Authorization: Bearer <token>` (Provider auth required)
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  service_title: string,           // Required
  service_description: string,     // Required
  service_startingprice: number,   // Required
  category_id: number,             // Required
  service_picture?: File           // Image file (processed by middleware)
}
```

#### 10. Update Service
- **Endpoint:** `PUT /api/services/services/:serviceId`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `serviceId` (number)

#### 11. Delete Service
- **Endpoint:** `DELETE /api/services/services/:serviceId`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `serviceId` (number)

#### 12. Toggle Service Availability
- **Endpoint:** `PATCH /api/services/services/:serviceId/toggle`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `serviceId` (number)
- **Description:** Toggle servicelisting_isActive status

---

## Appointment Management (`/api/appointments`)

#### 13. Get All Appointments (with Advanced Filtering)
- **Endpoint:** `GET /api/appointments/`
- **Query Parameters:**
```javascript
{
  page?: number,              // Default: 1
  limit?: number,             // Default: 10
  status?: string,            // Filter by appointment status
  provider_id?: number,       // Filter by provider
  customer_id?: number,       // Filter by customer
  from_date?: string,         // ISO date string
  to_date?: string,           // ISO date string
  sort_by?: string,           // Default: 'scheduled_date'
  sort_order?: string         // Default: 'desc'
}
```
- **Success Response (200):**
```javascript
{
  success: true,
  data: [
    {
      appointment_id: number,
      customer_id: number,
      provider_id: number,
      appointment_status: string,
      scheduled_date: string,
      repairDescription: string?,
      created_at: string,
      final_price: number?,
      availability_id: number,
      service_id: number,
      cancellation_reason: string?,
      customer: {
        user_id: number,
        first_name: string,
        last_name: string,
        email: string,
        phone_number: string,
        user_location: string,
        profile_photo: string?
      },
      serviceProvider: {
        provider_id: number,
        provider_first_name: string,
        provider_last_name: string,
        provider_email: string,
        provider_phone_number: string,
        provider_location: string,
        provider_profile_photo: string?,
        provider_rating: number
      },
      appointment_rating: array
    }
  ],
  pagination: {
    current_page: number,
    total_pages: number,
    total_count: number,
    limit: number,
    has_next: boolean,
    has_prev: boolean
  }
}
```

#### 14. Get Appointment by ID
- **Endpoint:** `GET /api/appointments/:appointmentId`
- **Parameters:** `appointmentId` (number)
- **Success Response (200):**
```javascript
{
  success: true,
  data: {
    // Full appointment object with relations (same structure as above)
  }
}
```
- **Error Response (404):**
```javascript
{
  success: false,
  message: "Appointment not found"
}
```

#### 15. Create Appointment
- **Endpoint:** `POST /api/appointments/`
- **Body:**
```javascript
{
  customer_id: number,             // Required - validated to exist
  provider_id: number,             // Required - validated to exist
  scheduled_date: string,          // Required - ISO datetime
  appointment_status?: string,     // Default: 'pending'
  final_price?: number,
  repairDescription?: string
}
```
- **Validation:**
  - Customer and provider must exist
  - Scheduled date must be valid datetime
  - Checks for appointment conflicts
- **Success Response (201):**
```javascript
{
  success: true,
  message: "Appointment created successfully",
  data: {
    // Created appointment with customer and provider details
  }
}
```

#### 16. Update Appointment
- **Endpoint:** `PUT /api/appointments/:appointmentId`
- **Parameters:** `appointmentId` (number)
- **Body:**
```javascript
{
  scheduled_date?: string,         // Validated for conflicts if changed
  appointment_status?: string,
  final_price?: number,
  repairDescription?: string
}
```
- **Validation:**
  - Appointment must exist
  - Date format validation
  - Conflict checking for date changes

#### 17. Update Appointment Status
- **Endpoint:** `PUT /api/appointments/:appointmentId/status` (Legacy)
- **Parameters:** `appointmentId` (number)
- **Body:**
```javascript
{
  status: string                   // Required
}
```
- **Valid Status Values:**
  - `'pending'`, `'approved'`, `'confirmed'`, `'in-progress'`, `'finished'`, `'completed'`, `'cancelled'`, `'no-show'`
- **Success Response (200):**
```javascript
{
  success: true,
  message: "Appointment status updated to {status}",
  data: {
    // Updated appointment with customer and provider names
  }
}
```

#### 18. Cancel Appointment
- **Endpoint:** `PUT /api/appointments/:appointmentId/cancel`
- **Parameters:** `appointmentId` (number)
- **Body:**
```javascript
{
  cancellation_reason: string      // Required
}
```
- **Success Response (200):**
```javascript
{
  success: true,
  message: "Appointment cancelled successfully",
  data: {
    // Updated appointment with cancellation details
  }
}
```

#### 19. Delete Appointment
- **Endpoint:** `DELETE /api/appointments/:appointmentId`
- **Parameters:** `appointmentId` (number)
- **Description:** Permanently deletes appointment and related ratings
- **Success Response (200):**
```javascript
{
  success: true,
  message: "Appointment deleted successfully"
}
```

#### 20. Get Appointment Statistics
- **Endpoint:** `GET /api/appointments/stats`
- **Query Parameters:**
```javascript
{
  provider_id?: number,            // Provider-specific stats
  customer_id?: number             // Customer-specific stats
}
```
- **Success Response (200):**
```javascript
{
  success: true,
  data: {
    total_appointments: number,
    pending_appointments: number,
    confirmed_appointments: number,
    completed_appointments: number,
    cancelled_appointments: number,
    monthly_appointments: number,
    yearly_appointments: number,
    total_revenue: number,
    average_rating: number,
    completion_rate: number          // Percentage
  }
}
```

#### 21. Get Provider Appointments
- **Endpoint:** `GET /api/appointments/provider/:providerId`
- **Parameters:** `providerId` (number)
- **Query Parameters:** Same as Get All Appointments

#### 22. Get Customer Appointments
- **Endpoint:** `GET /api/appointments/customer/:customerId`
- **Parameters:** `customerId` (number)
- **Query Parameters:** Same as Get All Appointments

---

## Rating System (`/api/ratings`)

#### 23. Get Rateable Appointments
- **Endpoint:** `GET /api/ratings/rateable-appointments`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Description:** Get completed appointments that customer can rate

#### 24. Create Rating
- **Endpoint:** `POST /api/ratings/create`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  appointment_id: number,          // Required
  provider_id: number,             // Required
  rating_value: number,            // Required - 1-5 stars (validated)
  rating_comment?: string,
  rating_photo?: File              // Image file for review proof
}
```
- **Validation:**
  - Rating value must be 1-5
  - Appointment must exist, be completed, and belong to customer
  - Customer cannot rate same appointment twice
  - Only completed appointments can be rated
- **Success Response (201):**
```javascript
{
  success: true,
  message: "Rating submitted successfully",
  data: {
    id: number,
    rating_value: number,
    rating_comment: string?,
    rating_photo: string?,
    appointment_id: number,
    user_id: number,
    provider_id: number,
    rated_by: "customer",
    created_at: string,
    user: {
      user_id: number,
      first_name: string,
      last_name: string,
      profile_photo: string?
    },
    serviceProvider: {
      provider_id: number,
      provider_first_name: string,
      provider_last_name: string
    }
  }
}
```
- **Error Responses:**
  - `400`: Missing required fields / Invalid rating value / Already rated
  - `404`: Appointment not found or not authorized

#### 25. Update Rating
- **Endpoint:** `PUT /api/ratings/update/:ratingId`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Parameters:** `ratingId` (number)
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  rating_value?: number,           // 1-5 stars (validated)
  rating_comment?: string,
  rating_photo?: File              // Replaces existing photo
}
```
- **Validation:**
  - Rating must exist and belong to authenticated customer
  - Rating value validation (1-5)
  - Handles old photo deletion if new photo uploaded

#### 26. Delete Rating
- **Endpoint:** `DELETE /api/ratings/delete/:ratingId`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Parameters:** `ratingId` (number)
- **Description:** Deletes rating and associated photo file

#### 27. Get Customer Ratings
- **Endpoint:** `GET /api/ratings/customer/:customerId`
- **Headers:** `Authorization: Bearer <token>` (Customer auth required)
- **Parameters:** `customerId` (number)

#### 28. Get Provider Ratings (Public)
- **Endpoint:** `GET /api/ratings/provider/:providerId`
- **Parameters:** `providerId` (number)
- **Description:** Public endpoint to view provider ratings and reviews

---

## Provider Rating Customer Endpoints (NEW)

#### 29. Get Provider Rateable Appointments
- **Endpoint:** `GET /api/ratings/provider/rateable-appointments`
- **Headers:** `Authorization: Bearer <token>` (Provider auth required)
- **Description:** Get appointments that provider can rate (finished appointments not yet rated)
- **Success Response (200):**
```javascript
{
  success: true,
  message: "Appointments that can be rated by provider",
  data: [
    {
      appointment_id: number,
      customer_id: number,
      scheduled_date: string,
      appointment_status: "finished",
      customer: {
        user_id: number,
        first_name: string,
        last_name: string,
        profile_photo: string?
      },
      service: {
        service_id: number,
        service_title: string,
        service_description: string
      }
    }
  ]
}
```

#### 30. Create Provider Rating for Customer
- **Endpoint:** `POST /api/ratings/provider/rate-customer`
- **Headers:** `Authorization: Bearer <token>` (Provider auth required)
- **Content-Type:** `multipart/form-data`
- **Body:**
```javascript
{
  appointment_id: number,          // Required
  customer_id: number,             // Required
  rating_value: number,            // Required - 1-5 stars (validated)
  rating_comment?: string,
  rating_photo?: File              // Image file for review proof
}
```
- **Validation:**
  - Rating value must be 1-5
  - Appointment must exist, be finished, and belong to provider
  - Provider cannot rate same customer for same appointment twice
  - Only finished appointments can be rated (settled but not completed with warranty)
- **Success Response (201):**
```javascript
{
  success: true,
  message: "Customer rating created successfully",
  data: {
    id: number,
    rating_value: number,
    rating_comment: string?,
    rating_photo: string?,
    appointment_id: number,
    user_id: number,
    provider_id: number,
    rated_by: "provider",
    created_at: string,
    user: {
      user_id: number,
      first_name: string,
      last_name: string,
      profile_photo: string?
    },
    serviceProvider: {
      provider_id: number,
      provider_first_name: string,
      provider_last_name: string
    },
    appointment: {
      appointment_id: number,
      scheduled_date: string,
      service: {
        service_title: string
      }
    }
  }
}
```

#### 31. Get Provider Given Ratings
- **Endpoint:** `GET /api/ratings/provider/given-ratings`
- **Headers:** `Authorization: Bearer <token>` (Provider auth required)
- **Query Parameters:** 
  - `page` (number, optional) - Default: 1
  - `limit` (number, optional) - Default: 10
- **Description:** Get all ratings given by the provider to customers
- **Success Response (200):**
```javascript
{
  success: true,
  data: {
    ratings: [
      {
        id: number,
        rating_value: number,
        rating_comment: string?,
        rating_photo: string?,
        rated_by: "provider",
        created_at: string,
        user: {
          user_id: number,
          first_name: string,
          last_name: string,
          profile_photo: string?
        },
        appointment: {
          appointment_id: number,
          scheduled_date: string,
          service: {
            service_title: string
          }
        }
      }
    ],
    pagination: {
      current_page: number,
      total_pages: number,
      total_ratings: number,
      has_next: boolean,
      has_prev: boolean
    }
  }
}
```

#### 32. Get Customer Received Ratings
- **Endpoint:** `GET /api/ratings/customer/:customerId/received-ratings`
- **Parameters:** `customerId` (number)
- **Query Parameters:** 
  - `page` (number, optional) - Default: 1
  - `limit` (number, optional) - Default: 10
- **Description:** Public endpoint to view ratings received by customer from providers
- **Success Response (200):**
```javascript
{
  success: true,
  data: {
    ratings: [
      {
        id: number,
        rating_value: number,
        rating_comment: string?,
        rating_photo: string?,
        rated_by: "provider",
        created_at: string,
        serviceProvider: {
          provider_id: number,
          provider_first_name: string,
          provider_last_name: string,
          provider_profile_photo: string?
        },
        appointment: {
          appointment_id: number,
          scheduled_date: string,
          service: {
            service_title: string
          }
        }
      }
    ],
    pagination: {
      current_page: number,
      total_pages: number,
      total_ratings: number,
      has_next: boolean,
      has_prev: boolean
    },
    statistics: {
      average_rating: number,
      total_ratings: number,
      rating_distribution: [
        { star: 1, count: number },
        { star: 2, count: number },
        { star: 3, count: number },
        { star: 4, count: number },
        { star: 5, count: number }
      ]
    }
  }
}
```

---

## Appointment Rating Endpoints (Alternative Implementation)

#### 33. Submit Rating for Appointment
- **Endpoint:** `POST /api/appointments/:appointmentId/ratings`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `appointmentId` (number)
- **Body:**
```javascript
{
  rating_value: number,            // Required - 1-5 stars
  rating_comment?: string,
  rater_type: string              // Required - 'customer' or 'provider'
}
```
- **Validation:**
  - Appointment must exist and be completed
  - Rating value between 1-5
  - Cannot rate same appointment twice with same rater_type

#### 34. Get Appointment Ratings
- **Endpoint:** `GET /api/appointments/:appointmentId/ratings`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `appointmentId` (number)
- **Success Response (200):**
```javascript
{
  success: true,
  ratings: [
    {
      id: number,
      rating_value: number,
      rating_comment: string?,
      rating_photo: string?,
      rated_by: string,
      created_at: string,
      user: {
        first_name: string,
        last_name: string,
        profile_photo: string?
      },
      serviceProvider: {
        provider_first_name: string,
        provider_last_name: string,
        provider_profile_photo: string?
      }
    }
  ]
}
```

#### 31. Check if User Can Rate Appointment
- **Endpoint:** `GET /api/appointments/:appointmentId/can-rate`
- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `appointmentId` (number)
- **Query Parameters:**
```javascript
{
  rater_type: string              // Required - 'customer' or 'provider'
}
```
- **Success Response (200):**
```javascript
{
  success: true,
  can_rate: boolean,
  reason?: string                 // Reason if cannot rate
}
```
- **Possible Reasons:**
  - "Appointment not completed"
  - "Rating already submitted"

---

## File Upload & Static Files

#### 32. Static File Access
- **Endpoint:** `GET /uploads/:filePath`
- **Description:** Access uploaded files (profile photos, IDs, certificates, service images, rating photos)
- **Parameters:** `filePath` (string) - Path to the uploaded file
- **Examples:**
  - `/uploads/customer-profiles/profile_photo-1234567890.jpg`
  - `/uploads/certificates/certificateFile-1234567890.pdf`
  - `/uploads/rating-photos/rating_photo-1234567890.jpg`

---

## Health Check & System

#### 33. Health Check
- **Endpoint:** `GET /`
- **Description:** System health check and API status
- **Success Response (200):**
```javascript
{
  message: "Fixmo Backend API is running",
  status: "OK",
  timestamp: "2024-01-01T12:00:00.000Z",
  version: "1.0.0"
}
```

#### 34. Admin Web Interface
- **Endpoint:** `GET /admin`
- **Description:** Serves admin access HTML page
- **Endpoint:** `GET /admin-login`
- **Description:** Serves admin login HTML page
- **Endpoint:** `GET /admin-dashboard`
- **Description:** Serves admin dashboard HTML page

---

## Error Handling

### Standard Error Response Format
```javascript
{
  success: false,
  message: string,
  error?: string                   // Additional error details
}
```

### Common HTTP Status Codes

#### 400 Bad Request
- Missing required fields
- Invalid input format (dates, numbers)
- Business logic violations (already rated, appointment not completed)
- Validation failures

#### 401 Unauthorized
- Missing or invalid JWT token
- Authentication required

#### 404 Not Found
- Resource not found (appointment, rating, user)
- Endpoint does not exist

#### 422 Unprocessable Entity
- Invalid file uploads
- Data validation errors

#### 429 Too Many Requests
- OTP rate limiting
- Request throttling

#### 500 Internal Server Error
- Database errors
- Unexpected server errors

---

## Authentication & Sessions

### JWT Token Authentication
- **Token Expiry:** 1 hour
- **Header Format:** `Authorization: Bearer <token>`
- **Token Payload:** `{ userId: number }` (customer) or `{ providerId: number }` (provider)

### Session Configuration
- **Session Duration:** 7 days
- **Cookie Settings:**
  - `httpOnly: true`
  - `secure: false` (development) / `true` (production)
  - `maxAge: 7 * 24 * 60 * 60 * 1000`

### Role-Based Access Control
- **Customer Endpoints:** Require customer JWT token
- **Provider Endpoints:** Require provider JWT token  
- **Admin Endpoints:** Require admin authentication
- **Public Endpoints:** No authentication required (health check, provider ratings)

---

## File Upload Specifications

### Supported File Types
- **Images:** JPG, PNG, GIF
- **Documents:** PDF, DOC, DOCX
- **Size Limits:** 5MB (images), 10MB (certificates)

### Upload Middleware
- **Multer Configuration:** Handles multipart/form-data
- **File Naming:** `{fieldname}-{timestamp}-{random}.{ext}`
- **Path Validation:** Ensures proper directory structure

### Upload Directories
```
uploads/
├── customer-profiles/    # Customer profile photos
├── customer-ids/         # Customer ID documents
├── profiles/             # Provider profile photos
├── ids/                  # Provider ID documents
├── certificates/         # Certificate files
├── service-images/       # Service listing images
└── rating-photos/        # Review photos
```

---

## Rate Limiting & Security

### OTP Rate Limiting
- **Implementation:** Email-based rate limiting for OTP requests
- **Validation:** Prevents spam and abuse

### Password Security
- **Hashing:** bcrypt with salt rounds
- **Validation:** Server-side password requirements

### File Security
- **Validation:** File type and size checking
- **Storage:** Secure file path generation
- **Access Control:** Proper directory permissions

---

## Database Relationships & Constraints

### Key Relationships
- **User ↔ Appointments:** One-to-many (customer_id)
- **ServiceProvider ↔ Appointments:** One-to-many (provider_id)
- **Appointment ↔ Ratings:** One-to-many (appointment_id)
- **ServiceListing ↔ Appointments:** One-to-many (service_id)

### Unique Constraints
- **User:** email, phone_number, userName
- **ServiceProvider:** provider_email, provider_phone_number, provider_userName, provider_uli
- **Certificate:** certificate_number

### Foreign Key Validations
- All controller methods validate foreign key relationships
- Error responses for invalid references
- Cascade delete handling for related records

---

This documentation provides accurate, controller-based information for all API endpoints in the Fixmo Backend system. Each endpoint includes proper validation rules, error handling, and response formats as implemented in the actual controllers.
