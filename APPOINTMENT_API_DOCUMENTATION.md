# Appointment API Documentation

## Overview
This document provides comprehensive documentation for all appointment-related API endpoints in the Fixmo backend system. The appointment system manages scheduling, tracking, and rating of service appointments between customers and service providers.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Email Notifications
The appointment system automatically sends email notifications to both customers and service providers when certain actions occur:

### Booking Confirmation Emails
- **When:** Automatically sent when a new appointment is created via `POST /appointments`
- **Recipients:** Both customer and service provider receive separate emails
- **Email Templates:** 
  - Customer: Booking confirmation with provider details
  - Provider: New booking notification with customer details
- **Content Includes:**
  - Customer/Provider name and contact information
  - Service title and starting price
  - Scheduled date and time
  - Appointment ID for reference
  - Repair description (if provided)
- **Implementation:** Uses `sendBookingConfirmationToCustomer()` and `sendBookingConfirmationToProvider()` from mailer service

### Email Error Handling
- **Resilient Design:** Email sending failures do not prevent appointment operations from completing successfully
- **Logging:** Email errors are logged with detailed error messages for debugging
- **User Experience:** Appointments are created even if email delivery fails, ensuring smooth booking process

### Email Content Format
**Booking Details Object:**
```javascript
{
  customerName: "John Doe",
  customerPhone: "+1234567890", 
  customerEmail: "john@example.com",
  serviceTitle: "Plumbing Repair",
  providerName: "Jane Smith",
  providerPhone: "+0987654321",
  providerEmail: "jane@example.com", 
  scheduledDate: "2025-09-25T10:00:00.000Z",
  appointmentId: 1,
  startingPrice: 150.00,
  repairDescription: "Fix leaking pipe"
}
```

**Note:** All email operations are asynchronous and won't block the main appointment creation flow.

---

## Endpoints

### 1. Get All Appointments
Retrieve all appointments with filtering, pagination, and sorting options.

**Endpoint:** `GET /appointments`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 10 | Number of items per page |
| status | string | No | - | Filter by appointment status |
| provider_id | integer | No | - | Filter by service provider ID |
| customer_id | integer | No | - | Filter by customer ID |
| from_date | string | No | - | Filter appointments from this date (ISO format) |
| to_date | string | No | - | Filter appointments until this date (ISO format) |
| sort_by | string | No | scheduled_date | Field to sort by |
| sort_order | string | No | desc | Sort order (asc/desc) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 1,
      "customer_id": 1,
      "provider_id": 1,
      "scheduled_date": "2025-09-25T10:00:00.000Z",
      "appointment_status": "in-warranty",
      "final_price": 150.00,
      "repairDescription": "Fix leaking pipe",
      "cancellation_reason": null,
      "warranty_days": 30,
      "finished_at": "2025-09-20T14:30:00.000Z",
      "warranty_expires_at": "2025-10-20T14:30:00.000Z",
      "completed_at": null,
      "days_left": 26,
      "needs_rating": false,
      "customer": {
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "+1234567890",
        "user_location": "123 Main St"
      },
      "serviceProvider": {
        "provider_id": 1,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane@example.com",
        "provider_phone_number": "+0987654321",
        "provider_location": "456 Service Ave",
        "provider_rating": 4.5
      },
      "service": {
        "service_id": 1,
        "service_title": "Plumbing Repair",
        "service_startingprice": 100.00
      },
      "appointment_rating": []
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 45,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 2. Get Appointment by ID
Retrieve a specific appointment by its ID.

**Endpoint:** `GET /appointments/:appointmentId`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "appointment_id": 1,
    "customer_id": 1,
    "provider_id": 1,
    "scheduled_date": "2025-09-25T10:00:00.000Z",
    "appointment_status": "scheduled",
    "final_price": 150.00,
    "repairDescription": "Fix leaking pipe",
    "customer": {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "user_location": "123 Main St",
      "profile_photo": "https://cloudinary.com/profile1.jpg"
    },
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "+0987654321",
      "provider_location": "456 Service Ave",
      "provider_profile_photo": "https://cloudinary.com/provider1.jpg",
      "provider_rating": 4.5
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    },
    "appointment_rating": []
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Appointment not found"
}
```

---

### 3. Create New Appointment
Create a new appointment between a customer and service provider.

**Endpoint:** `POST /appointments`

**Request Body:**
```json
{
  "customer_id": 1,
  "provider_id": 1,
  "scheduled_date": "2025-09-25T10:00:00.000Z",
  "appointment_status": "scheduled",
  "final_price": 150.00,
  "repairDescription": "Fix leaking pipe in bathroom",
  "availability_id": 1,
  "service_id": 1
}
```

**Required Fields:**
- `customer_id` (integer)
- `provider_id` (integer)
- `scheduled_date` (string, ISO format)
- `availability_id` (integer) - The availability slot ID from service listings endpoint
- `service_id` (integer) - The service listing ID

**Important Note:** 
The `availability_id` should be obtained from the Service Listings endpoint (endpoint #15) when filtering by date. The endpoint returns `availableSlotsDetails` array where each slot contains the required `availability_id` value.

**Optional Fields:**
- `appointment_status` (string, default: "scheduled")
- `final_price` (number)
- `repairDescription` (string)

**Response:**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment_id": 1,
    "customer_id": 1,
    "provider_id": 1,
    "scheduled_date": "2025-09-25T10:00:00.000Z",
    "appointment_status": "scheduled",
    "final_price": 150.00,
    "repairDescription": "Fix leaking pipe in bathroom",
    "customer": {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "+0987654321"
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    }
  }
}
```

**Error Responses:**

*400 - Missing Required Fields:*
```json
{
  "success": false,
  "message": "Customer ID, Provider ID, scheduled date, availability ID, and service ID are required"
}
```

*404 - Customer Not Found:*
```json
{
  "success": false,
  "message": "Customer not found"
}
```

*404 - Provider Not Found:*
```json
{
  "success": false,
  "message": "Service provider not found"
}
```

*409 - Scheduling Conflict:*
```json
{
  "success": false,
  "message": "Provider already has an appointment at this time"
}
```

---

### 4. Update Appointment
Update an existing appointment's details.

**Endpoint:** `PUT /appointments/:appointmentId`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "scheduled_date": "2025-09-25T14:00:00.000Z",
  "appointment_status": "confirmed",
  "final_price": 175.00,
  "repairDescription": "Fix leaking pipe and check water pressure"
}
```

**All fields are optional - only include fields you want to update**

**Response:**
```json
{
  "success": true,
  "message": "Appointment updated successfully",
  "data": {
    "appointment_id": 1,
    "customer_id": 1,
    "provider_id": 1,
    "scheduled_date": "2025-09-25T14:00:00.000Z",
    "appointment_status": "confirmed",
    "final_price": 175.00,
    "repairDescription": "Fix leaking pipe and check water pressure",
    "customer": {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "+0987654321"
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    }
  }
}
```

---

### 5. Delete Appointment
Delete an appointment and all related ratings.

**Endpoint:** `DELETE /appointments/:appointmentId`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Response:**
```json
{
  "success": true,
  "message": "Appointment deleted successfully"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Appointment not found"
}
```

---

### 6. Update Appointment Status
Update only the status of an appointment.

**Endpoint:** `PATCH /appointments/:appointmentId/status`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "status": "in-progress"
}
```

**Valid Status Values:**
- `scheduled` - Initial status when appointment is booked
- `on-the-way` - Provider is traveling to the appointment
- `in-progress` - Service is currently being performed
- `finished` - Service work is completed (automatically transitions to 'in-warranty' if warranty period exists)
- `in-warranty` - Service is completed and within warranty period
- `completed` - Appointment fully completed (warranty period ended or manually completed by customer)
- `backjob` - Customer has applied for warranty work due to issues
- `cancelled` - Appointment has been cancelled

**Status Transition Flow:**
1. `scheduled` → `on-the-way` → `in-progress` → `finished`
2. `finished` → `in-warranty` (automatic if warranty_days exists)
3. `in-warranty` → `completed` (manual by customer or automatic after warranty expires)
4. `in-warranty` → `backjob` (if customer applies for warranty work)
5. `backjob` → `scheduled` (when provider reschedules after approved backjob)
6. Any status → `cancelled` (with cancellation reason)

**Response:**
```json
{
  "success": true,
  "message": "Appointment status updated to in-progress",
  "data": {
    "appointment_id": 1,
    "customer_id": 1,
    "provider_id": 1,
    "scheduled_date": "2025-09-25T10:00:00.000Z",
    "appointment_status": "in-progress",
    "final_price": 150.00,
    "repairDescription": "Fix leaking pipe",
    "customer": {
      "first_name": "John",
      "last_name": "Doe"
    },
    "serviceProvider": {
      "provider_first_name": "Jane",
      "provider_last_name": "Smith"
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    }
  }
}
```

---

### 7. Cancel Appointment
Cancel an appointment with a reason.

**Endpoint:** `POST /appointments/:appointmentId/cancel`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "cancellation_reason": "Customer emergency - needs to reschedule"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "data": {
    "appointment_id": 1,
    "appointment_status": "cancelled",
    "cancellation_reason": "Customer emergency - needs to reschedule",
    "customer": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "serviceProvider": {
      "provider_first_name": "Jane",
      "provider_last_name": "Smith"
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    }
  }
}
```

---

### 8. Reschedule Appointment
Reschedule an appointment to a new date and time.

**Endpoint:** `POST /appointments/:appointmentId/reschedule`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "new_scheduled_date": "2025-09-26T10:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "data": {
    "appointment_id": 1,
    "customer_id": 1,
    "provider_id": 1,
    "scheduled_date": "2025-09-26T10:00:00.000Z",
    "appointment_status": "scheduled",
    "customer": {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "+0987654321"
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    }
  }
}
```

**Error Responses:**

*400 - Past Date:*
```json
{
  "success": false,
  "message": "New scheduled date must be in the future"
}
```

*409 - Scheduling Conflict:*
```json
{
  "success": false,
  "message": "Provider already has an appointment at the new time"
}
```

---

### 9. Get Provider Appointments
Get all appointments for a specific service provider.

**Endpoint:** `GET /appointments/provider/:providerId`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| providerId | integer | Yes | The service provider ID |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | - | Filter by appointment status |
| from_date | string | No | - | Filter appointments from this date |
| to_date | string | No | - | Filter appointments until this date |
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 10 | Number of items per page |
| sort_order | string | No | desc | Sort order (asc/desc) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 1,
      "customer_id": 1,
      "provider_id": 1,
      "scheduled_date": "2025-09-25T10:00:00.000Z",
      "appointment_status": "scheduled",
      "final_price": 150.00,
      "repairDescription": "Fix leaking pipe",
      "customer": {
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "+1234567890",
        "user_location": "123 Main St",
        "profile_photo": "https://cloudinary.com/profile1.jpg"
      },
      "service": {
        "service_id": 1,
        "service_title": "Plumbing Repair",
        "service_startingprice": 100.00
      },
      "appointment_rating": [
        {
          "rating_value": 5,
          "rating_comment": "Excellent service!"
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 25,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 10. Get Customer Appointments
Get all appointments for a specific customer.

**Endpoint:** `GET /appointments/customer/:customerId`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerId | integer | Yes | The customer ID |

**Query Parameters:**
Same as provider appointments endpoint.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 1,
      "customer_id": 1,
      "provider_id": 1,
      "scheduled_date": "2025-09-25T10:00:00.000Z",
      "appointment_status": "scheduled",
      "final_price": 150.00,
      "repairDescription": "Fix leaking pipe",
      "serviceProvider": {
        "provider_id": 1,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane@example.com",
        "provider_phone_number": "+0987654321",
        "provider_location": "456 Service Ave",
        "provider_profile_photo": "https://cloudinary.com/provider1.jpg",
        "provider_rating": 4.5
      },
      "service": {
        "service_id": 1,
        "service_title": "Plumbing Repair",
        "service_startingprice": 100.00
      },
      "appointment_rating": []
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_count": 15,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 11. Get Appointment Statistics
Get comprehensive statistics about appointments.

**Endpoint:** `GET /appointments/stats`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| provider_id | integer | No | Get stats for specific provider only |

**Response:**
```json
{
  "success": true,
  "data": {
    "total_appointments": 150,
    "pending_appointments": 10,
    "confirmed_appointments": 25,
    "completed_appointments": 100,
    "cancelled_appointments": 15,
    "monthly_appointments": 35,
    "yearly_appointments": 150,
    "total_revenue": 15000.00,
    "average_rating": 4.3,
    "completion_rate": 67
  }
}
```

---

## Service Provider Search and Availability

### 21. Get Service Listings with Availability Filtering
Search for service providers with optional date-based availability filtering. When a date is provided, only providers with available slots on that date are returned, including their `availability_id` values needed for booking.

**Endpoint:** `GET /service-listings-customer`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 12 | Number of items per page |
| search | string | No | - | Search term for service title, description, or provider name |
| category | string | No | - | Filter by service category |
| location | string | No | - | Filter by provider location |
| sortBy | string | No | rating | Sort order (rating, price-low, price-high, newest) |
| date | string | No | - | Filter by availability date (YYYY-MM-DD format) |

**Response (without date filtering):**
```json
{
  "message": "Service listings retrieved successfully",
  "listings": [
    {
      "id": 1,
      "title": "Plumbing Services",
      "description": "Professional plumbing repairs and installations",
      "startingPrice": 150.00,
      "service_photos": [
        {
          "id": 1,
          "imageUrl": "https://cloudinary.com/image1.jpg",
          "uploadedAt": "2025-09-20T10:00:00.000Z"
        }
      ],
      "provider": {
        "id": 1,
        "name": "John Smith",
        "userName": "johnsmith_plumber",
        "rating": 4.5,
        "location": "Downtown Area",
        "profilePhoto": "https://cloudinary.com/profile1.jpg"
      },
      "categories": ["Plumbing", "Home Maintenance"],
      "specificServices": [
        {
          "id": 1,
          "title": "Leak Repair",
          "description": "Fix all types of pipe leaks"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 48,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Response (with date filtering - includes availability_id):**
```json
{
  "message": "Service listings for 2025-09-25 (Thursday) retrieved successfully",
  "listings": [
    {
      "id": 1,
      "title": "Plumbing Services",
      "description": "Professional plumbing repairs and installations",
      "startingPrice": 150.00,
      "service_photos": [
        {
          "id": 1,
          "imageUrl": "https://cloudinary.com/image1.jpg",
          "uploadedAt": "2025-09-20T10:00:00.000Z"
        }
      ],
      "provider": {
        "id": 1,
        "name": "John Smith",
        "userName": "johnsmith_plumber",
        "rating": 4.5,
        "location": "Downtown Area",
        "profilePhoto": "https://cloudinary.com/profile1.jpg"
      },
      "categories": ["Plumbing", "Home Maintenance"],
      "specificServices": [
        {
          "id": 1,
          "title": "Leak Repair",
          "description": "Fix all types of pipe leaks"
        }
      ],
      "availability": {
        "date": "2025-09-25",
        "dayOfWeek": "Thursday",
        "hasAvailability": true,
        "totalSlots": 3,
        "availableSlots": 2,
        "bookedSlots": 1,
        "availableSlotsDetails": [
          {
            "availability_id": 15,
            "startTime": "09:00",
            "endTime": "10:00",
            "dayOfWeek": "Thursday"
          },
          {
            "availability_id": 16,
            "startTime": "14:00",
            "endTime": "15:00",
            "dayOfWeek": "Thursday"
          }
        ],
        "reason": null
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalCount": 15,
    "hasNext": true,
    "hasPrev": false
  },
  "dateFilter": {
    "requestedDate": "2025-09-25",
    "dayOfWeek": "Thursday",
    "totalProvidersBeforeFiltering": 48,
    "availableProvidersAfterFiltering": 15,
    "filteringApplied": true
  }
}
```

**Key Features:**
- **Date-based filtering**: When `date` parameter is provided, only providers available on that date are returned
- **Active appointment filtering**: Providers are excluded if they have active appointments (scheduled, in-progress, pending, etc.) on the searched date
- **Completed appointment inclusion**: Providers with finished, cancelled, or completed appointments can still be booked again
- **Availability details**: Each available provider includes `availableSlotsDetails` array with `availability_id` values
- **Booking integration**: The `availability_id` values can be used directly in appointment creation requests
- **Smart filtering**: Excludes past dates and applies 3 PM cutoff for same-day bookings
- **3 PM same-day rule**: Cannot book appointments for today after 3 PM, regardless of provider availability
- **Comprehensive search**: Supports search by service title, description, provider name, category, and location

**Usage Example:**
```bash
# Search for plumbers available on September 25, 2025
curl "http://localhost:3000/api/service-listings-customer?search=plumber&date=2025-09-25&location=downtown"

# Get highest rated providers without date filtering
curl "http://localhost:3000/api/service-listings-customer?sortBy=rating&limit=10"
```

---

## Backjob (Warranty Claims) Endpoints

### 12. Apply for Backjob
Apply for a backjob when an appointment is under warranty and requires additional work.

**Endpoint:** `POST /appointments/:appointmentId/apply-backjob`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "reason": "The pipe is still leaking after the initial repair",
  "evidence": "Photo URL or description of the issue"
}
```

**Required Fields:**
- `reason` (string) - Detailed reason for the backjob request

**Optional Fields:**
- `evidence` (string) - Supporting evidence (photos, descriptions, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Backjob application submitted",
  "data": {
    "backjob": {
      "backjob_id": 1,
      "appointment_id": 1,
      "customer_id": 1,
      "provider_id": 1,
      "reason": "The pipe is still leaking after the initial repair",
      "evidence": "Photo URL or description of the issue",
      "status": "pending",
      "created_at": "2025-09-24T10:00:00.000Z"
    },
    "appointment": {
      "appointment_id": 1,
      "appointment_status": "backjob"
    }
  }
}
```

**Error Responses:**

*403 - Unauthorized:*
```json
{
  "success": false,
  "message": "Only the appointment customer can apply for a backjob"
}
```

*400 - Invalid Status:*
```json
{
  "success": false,
  "message": "Backjob can only be applied during warranty"
}
```

*409 - Duplicate Request:*
```json
{
  "success": false,
  "message": "An active backjob request already exists for this appointment"
}
```

---

### 13. Dispute Backjob
Provider can dispute a backjob request with evidence.

**Endpoint:** `POST /backjobs/:backjobId/dispute`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| backjobId | integer | Yes | The backjob application ID |

**Request Body:**
```json
{
  "dispute_reason": "The work was completed according to specifications and is functioning properly",
  "dispute_evidence": "Photos showing completed work and current status"
}
```

**Optional Fields:**
- `dispute_reason` (string) - Reason for disputing the backjob
- `dispute_evidence` (string) - Supporting evidence for the dispute

**Response:**
```json
{
  "success": true,
  "message": "Backjob disputed",
  "data": {
    "backjob_id": 1,
    "appointment_id": 1,
    "status": "disputed",
    "provider_dispute_reason": "The work was completed according to specifications and is functioning properly",
    "provider_dispute_evidence": "Photos showing completed work and current status"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Only the appointment provider can dispute a backjob"
}
```

---

### 14. List Backjob Applications
Admin endpoint to list all backjob applications with filtering.

**Endpoint:** `GET /backjobs`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | - | Filter by backjob status |
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 10 | Number of items per page |

**Valid Status Values:**
- `pending` - Awaiting admin review
- `approved` - Approved for rescheduling
- `disputed` - Provider has disputed the claim
- `cancelled-by-admin` - Admin cancelled the request
- `cancelled-by-user` - User cancelled the request

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "backjob_id": 1,
      "appointment_id": 1,
      "customer_id": 1,
      "provider_id": 1,
      "reason": "The pipe is still leaking after the initial repair",
      "evidence": "Photo evidence",
      "status": "pending",
      "created_at": "2025-09-24T10:00:00.000Z",
      "appointment": {
        "appointment_id": 1,
        "scheduled_date": "2025-09-20T10:00:00.000Z",
        "appointment_status": "backjob"
      },
      "customer": {
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "provider": {
        "provider_id": 1,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane@example.com"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_count": 15,
    "limit": 10
  }
}
```

---

### 15. Update Backjob Status
Admin endpoint to approve, cancel, or update backjob applications.

**Endpoint:** `PATCH /backjobs/:backjobId/status`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| backjobId | integer | Yes | The backjob application ID |

**Request Body:**
```json
{
  "action": "approve",
  "admin_notes": "Approved after review of evidence"
}
```

**Required Fields:**
- `action` (string) - Action to take: "approve", "cancel-by-admin", or "cancel-by-user"

**Optional Fields:**
- `admin_notes` (string) - Administrative notes

**Response:**
```json
{
  "success": true,
  "message": "Backjob updated",
  "data": {
    "backjob_id": 1,
    "status": "approved",
    "admin_notes": "Approved after review of evidence"
  }
}
```

**Action Effects:**
- `approve`: Backjob is approved, provider can reschedule
- `cancel-by-admin`: Backjob cancelled, appointment returns to 'completed'
- `cancel-by-user`: Backjob cancelled, appointment returns to 'in-warranty'

---

### 16. Reschedule from Backjob
Provider reschedules an approved backjob to a new date.

**Endpoint:** `POST /appointments/:appointmentId/reschedule-backjob`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "new_scheduled_date": "2025-09-26T10:00:00.000Z",
  "availability_id": 25
}
```

**Required Fields:**
- `new_scheduled_date` (string, ISO format) - New appointment date and time
- `availability_id` (integer) - Provider's availability slot ID

**Response:**
```json
{
  "success": true,
  "message": "Backjob appointment rescheduled",
  "data": {
    "appointment_id": 1,
    "scheduled_date": "2025-09-26T10:00:00.000Z",
    "availability_id": 25,
    "appointment_status": "scheduled",
    "customer": {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "+0987654321"
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    }
  }
}
```

**Error Responses:**

*400 - No Approved Backjob:*
```json
{
  "success": false,
  "message": "No approved backjob found for this appointment"
}
```

*403 - Unauthorized:*
```json
{
  "success": false,
  "message": "Only the appointment provider can reschedule a backjob"
}
```

---

### 17. Complete Appointment by Customer
Customer can manually mark an appointment as completed during the warranty window.

**Endpoint:** `POST /appointments/:appointmentId/complete-by-customer`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Response:**
```json
{
  "success": true,
  "message": "Appointment marked as completed",
  "data": {
    "appointment_id": 1,
    "appointment_status": "completed",
    "completed_at": "2025-09-24T10:00:00.000Z",
    "warranty_expires_at": "2025-10-24T10:00:00.000Z",
    "customer": {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe"
    },
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith"
    },
    "service": {
      "service_id": 1,
      "service_title": "Plumbing Repair",
      "service_startingprice": 100.00
    }
  }
}
```

**Error Responses:**

*400 - Invalid Status:*
```json
{
  "success": false,
  "message": "Appointment is not eligible for completion"
}
```

*403 - Unauthorized:*
```json
{
  "success": false,
  "message": "Only the appointment customer can mark as completed"
}
```

---

## Rating Endpoints

### 18. Submit Rating
Submit a rating for a completed appointment.

**Endpoint:** `POST /appointments/:appointmentId/rating`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "rating_value": 5,
  "rating_comment": "Excellent service, very professional!",
  "rater_type": "customer"
}
```

**Required Fields:**
- `rating_value` (integer, 1-5)
- `rater_type` (string: "customer" or "provider")

**Optional Fields:**
- `rating_comment` (string)

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "rating": {
    "rating_id": 1,
    "rating_value": 5,
    "rating_comment": "Excellent service, very professional!",
    "appointment_id": 1,
    "user_id": 1,
    "provider_id": 1,
    "rated_by": "customer"
  }
}
```

**Error Responses:**

*400 - Invalid Rating:*
```json
{
  "success": false,
  "message": "Rating value must be between 1 and 5"
}
```

*400 - Appointment Not Completed:*
```json
{
  "success": false,
  "message": "Can only rate completed appointments"
}
```

*400 - Already Rated:*
```json
{
  "success": false,
  "message": "Rating already submitted for this appointment"
}
```

---

### 19. Get Appointment Ratings
Get all ratings for a specific appointment.

**Endpoint:** `GET /appointments/:appointmentId/ratings`

**Response:**
```json
{
  "success": true,
  "ratings": [
    {
      "rating_id": 1,
      "rating_value": 5,
      "rating_comment": "Excellent service!",
      "rated_by": "customer",
      "user": {
        "first_name": "John",
        "last_name": "Doe",
        "profile_photo": "https://cloudinary.com/profile1.jpg"
      },
      "serviceProvider": {
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_profile_photo": "https://cloudinary.com/provider1.jpg"
      }
    }
  ]
}
```

---

### 20. Check Rating Eligibility
Check if a user can rate a specific appointment.

**Endpoint:** `GET /appointments/:appointmentId/can-rate`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| rater_type | string | Yes | Who is checking ("customer" or "provider") |

**Response:**
```json
{
  "success": true,
  "can_rate": true,
  "reason": null
}
```

**Response when cannot rate:**
```json
{
  "success": true,
  "can_rate": false,
  "reason": "Appointment not completed"
}
```

---

## Error Handling

### Common Error Responses

**400 - Bad Request:**
```json
{
  "success": false,
  "message": "Invalid input data",
  "error": "Detailed error message"
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**404 - Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**409 - Conflict:**
```json
{
  "success": false,
  "message": "Resource conflict occurred"
}
```

**500 - Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

---

## Data Models

### Appointment Status Values
- `scheduled` - Appointment is scheduled
- `on-the-way` - Provider is traveling to appointment location
- `in-progress` - Service is currently being performed
- `finished` - Service work is finished (triggers warranty period if applicable)
- `in-warranty` - Service completed and within warranty period
- `completed` - Appointment fully completed and ready for rating
- `backjob` - Customer has requested warranty work
- `cancelled` - Appointment was cancelled

### Warranty System
- **warranty_days**: Number of warranty days for the service (from service listing)
- **finished_at**: Timestamp when service work was completed
- **warranty_expires_at**: Calculated expiration date (finished_at + warranty_days)
- **completed_at**: Timestamp when appointment was marked as fully completed
- **days_left**: Calculated remaining warranty days (null if no warranty)
- **needs_rating**: Boolean indicating if customer rating is pending

### Rating Values
- Rating values must be integers between 1 and 5
- 1 = Very Poor
- 2 = Poor
- 3 = Average
- 4 = Good
- 5 = Excellent

### Date Format
All dates should be in ISO 8601 format:
```
2025-09-25T10:00:00.000Z
```

---

## Usage Examples

### Complete Appointment Flow

1. **Create Appointment:**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "customer_id": 1,
    "provider_id": 1,
    "scheduled_date": "2025-09-25T10:00:00.000Z",
    "repairDescription": "Fix leaking pipe"
  }'
```

2. **Update Status to In-Progress:**
```bash
curl -X PATCH http://localhost:3000/api/appointments/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"status": "in-progress"}'
```

3. **Complete Appointment:**
```bash
curl -X PATCH http://localhost:3000/api/appointments/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"status": "completed"}'
```

4. **Submit Rating:**
```bash
curl -X POST http://localhost:3000/api/appointments/1/rating \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "rating_value": 5,
    "rating_comment": "Excellent service!",
    "rater_type": "customer"
  }'
```

---

## Notes

- All endpoints return JSON responses
- Pagination is available for list endpoints
- Date filtering supports ISO 8601 format
- Rating system supports both customer and provider ratings
- Appointment conflicts are automatically detected and prevented
- Statistics endpoint provides comprehensive analytics data
- All appointments include related customer and provider information
