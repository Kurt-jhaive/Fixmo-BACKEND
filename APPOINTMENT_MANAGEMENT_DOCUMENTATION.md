# Appointment Management System - Complete Documentation

## Overview
This documentation covers the complete appointment management system for the Fixmo platform, including appointment lifecycle, backjob (warranty claims) system, admin controls, dispute handling, and no-show management.

**Last Updated:** October 3, 2025  
**Version:** 2.0

---

## Table of Contents

1. [Appointment System Overview](#appointment-system-overview)
2. [Database Schema](#database-schema)
3. [Appointment Lifecycle](#appointment-lifecycle)
4. [API Endpoints](#api-endpoints)
5. [Backjob System (Warranty Claims)](#backjob-system-warranty-claims)
6. [Admin Management Features](#admin-management-features)
7. [Dispute Management](#dispute-management)
8. [No-Show Handling](#no-show-handling)
9. [Implementation Examples](#implementation-examples)
10. [Testing Guide](#testing-guide)

---

## Appointment System Overview

### Core Features
- ✅ **Appointment Booking & Scheduling**
- ✅ **Status Tracking** (13 different statuses)
- ✅ **Warranty System** with automatic expiry tracking
- ✅ **Backjob Applications** (warranty claims)
- ✅ **Dispute Management** (provider vs customer)
- ✅ **Admin Cancellation** (for no-shows, violations, etc.)
- ✅ **Rating System** (bidirectional: customer ↔ provider)
- ✅ **Warranty Pause/Resume** during backjob claims

### User Roles
- **Customer**: Books appointments, applies for backjobs, rates providers
- **Provider**: Manages appointments, disputes backjobs, reschedules
- **Admin**: Monitors system, cancels appointments, resolves disputes

---

## Database Schema

### Appointment Model

```prisma
model Appointment {
  appointment_id      Int                    @id @default(autoincrement())
  customer_id         Int
  provider_id         Int
  appointment_status  String
  scheduled_date      DateTime
  repairDescription   String?
  created_at          DateTime               @default(now())
  final_price         Float?
  availability_id     Int
  service_id          Int
  cancellation_reason String?
  
  // Warranty tracking
  warranty_days       Int?                   // Copied from ServiceListing.warranty at creation
  finished_at         DateTime?              // When provider marks service done
  completed_at        DateTime?              // When customer marks service completed (or auto-completed)
  warranty_expires_at DateTime?              // finished_at + warranty_days
  
  // Warranty pause for backjobs
  warranty_paused_at  DateTime?              // When warranty was paused (backjob applied)
  warranty_remaining_days Int?               // Days remaining when paused
  
  // Relations
  availability        Availability           @relation(fields: [availability_id], references: [availability_id])
  customer            User                   @relation(fields: [customer_id], references: [user_id])
  serviceProvider     ServiceProviderDetails @relation(fields: [provider_id], references: [provider_id])
  service             ServiceListing         @relation(fields: [service_id], references: [service_id])
  appointment_rating  Rating[]
  backjob_applications BackjobApplication[]
}
```

### BackjobApplication Model (Warranty Claims)

```prisma
model BackjobApplication {
  backjob_id               Int                    @id @default(autoincrement())
  appointment_id           Int
  customer_id              Int
  provider_id              Int
  status                   String                 @default("pending") 
  // Status options: pending, approved, disputed, cancelled-by-admin, 
  //                 cancelled-by-user, cancelled-by-customer, rescheduled
  
  reason                   String
  evidence                 Json?                  // Photos, videos, descriptions
  provider_dispute_reason  String?
  provider_dispute_evidence Json?
  customer_cancellation_reason String?
  admin_notes              String?
  created_at               DateTime               @default(now())
  updated_at               DateTime               @updatedAt

  // Relations
  appointment              Appointment            @relation(fields: [appointment_id], references: [appointment_id])
  customer                 User                   @relation("UserBackjobs", fields: [customer_id], references: [user_id])
  provider                 ServiceProviderDetails @relation("ProviderBackjobs", fields: [provider_id], references: [provider_id])

  @@index([appointment_id])
}
```

---

## Appointment Lifecycle

### Status Flow Diagram

```
[pending] → [accepted] → [scheduled] → [on-the-way] → [in-progress] 
    ↓                                                         ↓
[cancelled]                                           [finished]
                                                           ↓
                                                    [completed]
                                                           ↓
                                                    [in-warranty]
                                                      ↙       ↘
                                              [backjob]    [expired]
                                                   ↓
                                          [disputed/rescheduled]
```

### Status Definitions

| Status | Description | Who Sets It | Next Possible States |
|--------|-------------|-------------|---------------------|
| `pending` | Initial state, awaiting provider acceptance | System | accepted, cancelled |
| `accepted` | Provider accepted the booking | Provider | scheduled, cancelled |
| `scheduled` | Confirmed and scheduled | Provider | on-the-way, cancelled |
| `on-the-way` | Provider is traveling to customer | Provider | in-progress, cancelled |
| `in-progress` | Service is being performed | Provider | finished, cancelled |
| `finished` | Provider marked work as complete | Provider | completed |
| `completed` | Customer confirmed completion | Customer/System | in-warranty, expired |
| `in-warranty` | Active warranty period | System | backjob, expired |
| `backjob` | Warranty claim (backjob) applied | Customer | in-warranty, completed, disputed |
| `disputed` | Provider disputes backjob claim | Provider | (Admin resolves) |
| `cancelled` | Appointment cancelled | Any | (Terminal state) |
| `expired` | Warranty period expired | System | (Terminal state) |

### Warranty System Flow

1. **Service Completion**
   ```javascript
   // Provider finishes service
   finished_at = new Date();
   warranty_expires_at = finished_at + warranty_days;
   appointment_status = 'finished';
   ```

2. **Customer Confirmation**
   ```javascript
   // Customer confirms completion
   completed_at = new Date();
   appointment_status = 'completed';
   // If warranty_days > 0
   appointment_status = 'in-warranty';
   ```

3. **Warranty Expiration** (Automatic)
   ```javascript
   // System checks daily
   if (now > warranty_expires_at) {
     appointment_status = 'expired';
   }
   ```

4. **Backjob Applied** (Warranty Pause)
   ```javascript
   // Customer applies for backjob
   warranty_paused_at = new Date();
   warranty_remaining_days = calculate_remaining_days(warranty_expires_at);
   appointment_status = 'backjob';
   ```

5. **Warranty Resume** (After Backjob Resolution)
   ```javascript
   // When backjob is cancelled/disputed
   new_warranty_expires_at = now + warranty_remaining_days;
   warranty_paused_at = null;
   warranty_remaining_days = null;
   appointment_status = 'in-warranty';
   ```

---

## API Endpoints

### Base URL
```
/api/appointments
```

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

### 1. Get All Appointments (with Filtering)

**Endpoint:** `GET /api/appointments`

**Description:** Retrieve all appointments with advanced filtering, pagination, and sorting.

**Access:** Authenticated users (customers, providers, admins)

**Query Parameters:**
```typescript
{
  page?: number;          // Page number (default: 1)
  limit?: number;         // Items per page (default: 10)
  status?: string;        // Filter by appointment_status
  provider_id?: number;   // Filter by provider
  customer_id?: number;   // Filter by customer
  from_date?: string;     // Filter by scheduled_date >= from_date (ISO 8601)
  to_date?: string;       // Filter by scheduled_date <= to_date (ISO 8601)
  sort_by?: string;       // Sort field (default: 'scheduled_date')
  sort_order?: 'asc' | 'desc'; // Sort order (default: 'desc')
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 1,
      "customer_id": 10,
      "provider_id": 5,
      "appointment_status": "in-warranty",
      "scheduled_date": "2025-10-10T09:00:00.000Z",
      "created_at": "2025-10-01T12:00:00.000Z",
      "final_price": 1500.00,
      "repairDescription": "AC unit not cooling properly",
      "warranty_days": 30,
      "finished_at": "2025-10-10T12:00:00.000Z",
      "completed_at": "2025-10-10T12:30:00.000Z",
      "warranty_expires_at": "2025-11-09T12:00:00.000Z",
      "warranty_paused_at": null,
      "warranty_remaining_days": null,
      "cancellation_reason": null,
      "days_left": 20,
      "needs_rating": false,
      "is_rated": true,
      "rating_status": {
        "is_rated": true,
        "is_rated_by_customer": true,
        "is_rated_by_provider": true,
        "needs_rating": false,
        "customer_rating_value": 5,
        "provider_rating_value": 5
      },
      "customer": {
        "user_id": 10,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "+639123456789",
        "user_location": "Manila, Philippines"
      },
      "serviceProvider": {
        "provider_id": 5,
        "provider_first_name": "Mike",
        "provider_last_name": "Smith",
        "provider_email": "mike@provider.com",
        "provider_phone_number": "+639987654321",
        "provider_location": "Quezon City, Philippines",
        "provider_rating": 4.8
      },
      "service": {
        "service_title": "Air Conditioning Repair",
        "service_startingprice": 1000.00
      },
      "appointment_rating": [
        {
          "rating_value": 5,
          "rating_comment": "Excellent service!",
          "rated_by": "customer",
          "user": {
            "first_name": "John",
            "last_name": "Doe"
          }
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 48,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

**Example Usage:**
```javascript
// Get all in-warranty appointments
const response = await fetch('/api/appointments?status=in-warranty&page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get appointments for a specific provider in date range
const response = await fetch(
  '/api/appointments?provider_id=5&from_date=2025-10-01&to_date=2025-10-31',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

---

### 2. Get Appointment by ID

**Endpoint:** `GET /api/appointments/:appointmentId`

**Description:** Retrieve detailed information about a specific appointment.

**Access:** Authenticated users

**URL Parameters:**
- `appointmentId` (integer): The appointment ID

**Response:**
```json
{
  "success": true,
  "data": {
    "appointment_id": 1,
    "customer_id": 10,
    "provider_id": 5,
    "appointment_status": "backjob",
    "scheduled_date": "2025-10-10T09:00:00.000Z",
    "warranty_days": 30,
    "warranty_paused_at": "2025-10-20T10:00:00.000Z",
    "warranty_remaining_days": 18,
    "days_left": 18,
    "customer": { /* customer details */ },
    "serviceProvider": { /* provider details */ },
    "service": { /* service details */ },
    "appointment_rating": []
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "success": false,
  "message": "Appointment not found"
}

// 400 Bad Request
{
  "success": false,
  "message": "Invalid appointment ID format"
}
```

---

### 3. Get Appointment Statistics

**Endpoint:** `GET /api/appointments/stats`

**Description:** Get aggregated statistics about appointments (useful for admin dashboards).

**Access:** Authenticated users (typically admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_appointments": 1250,
    "pending_appointments": 45,
    "completed_appointments": 890,
    "cancelled_appointments": 78,
    "active_warranties": 156,
    "backjobs_pending": 12,
    "backjobs_disputed": 3
  }
}
```

---

### 4. Get Provider's Appointments

**Endpoint:** `GET /api/appointments/provider/:providerId`

**Description:** Get all appointments for a specific provider.

**Access:** Authenticated provider (can only view own appointments)

**Query Parameters:** Same as Get All Appointments

**Response:** Same structure as Get All Appointments

---

### 5. Get Customer's Appointments

**Endpoint:** `GET /api/appointments/customer/:customerId`

**Description:** Get all appointments for a specific customer.

**Access:** Authenticated customer (can only view own appointments)

**Query Parameters:** Same as Get All Appointments

**Response:** Same structure as Get All Appointments

---

### 6. Create Appointment

**Endpoint:** `POST /api/appointments`

**Description:** Create a new appointment booking.

**Access:** Authenticated customer

**Request Body:**
```json
{
  "customer_id": 10,
  "provider_id": 5,
  "service_id": 3,
  "availability_id": 15,
  "scheduled_date": "2025-10-15T10:00:00.000Z",
  "repairDescription": "AC unit making strange noises",
  "final_price": 1500.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment_id": 125,
    "appointment_status": "accepted",
    /* ... other appointment fields */
  }
}
```

---

### 7. Update Appointment Status

**Endpoint:** `PATCH /api/appointments/:appointmentId/status`

**Description:** Update the status of an appointment.

**Access:** Provider or Customer (depending on status transition)

**Request Body:**
```json
{
  "status": "in-progress"
}
```

**Valid Status Transitions:**

| From | To | Who Can Update |
|------|-----|----------------|
| pending | accepted | Provider |
| accepted | scheduled | Provider |
| scheduled | on-the-way | Provider |
| on-the-way | in-progress | Provider |
| in-progress | finished | Provider |
| finished | completed | Customer or Auto (24h) |
| completed | in-warranty | System (if warranty > 0) |

**Response:**
```json
{
  "success": true,
  "message": "Appointment status updated successfully",
  "data": { /* updated appointment */ }
}
```

---

### 8. Cancel Appointment

**Endpoint:** `PUT /api/appointments/:appointmentId/cancel`

**Description:** Cancel an appointment (customer or provider).

**Access:** Customer or Provider

**Request Body:**
```json
{
  "cancellation_reason": "Customer not available"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "data": {
    "appointment_id": 125,
    "appointment_status": "cancelled",
    "cancellation_reason": "Customer not available"
  }
}
```

---

### 9. Admin Cancel Appointment (No-Show Management)

**Endpoint:** `POST /api/appointments/:appointmentId/admin-cancel`

**Description:** Admin cancels an appointment (e.g., for no-shows, policy violations, disputes).

**Access:** Admin only (requires admin JWT)

**Request Body:**
```json
{
  "cancellation_reason": "Customer reported as no-show by provider",
  "admin_notes": "Provider provided photo evidence. Customer will receive penalty.",
  "cancelled_by": "admin",
  "penalty_applied": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled by admin successfully",
  "data": {
    "appointment_id": 125,
    "appointment_status": "cancelled",
    "cancellation_reason": "Customer reported as no-show by provider",
    "cancelled_by_admin": true,
    "admin_notes": "Provider provided photo evidence. Customer will receive penalty."
  }
}
```

**Use Cases:**
1. **No-Show**: Customer doesn't show up
2. **Policy Violation**: Terms of service violation
3. **Dispute Resolution**: Admin resolves conflict by cancelling
4. **System Error**: Booking error that needs admin intervention

---

### 10. Complete Appointment (Customer)

**Endpoint:** `POST /api/appointments/:appointmentId/complete`

**Description:** Customer marks appointment as completed (triggers warranty start).

**Access:** Customer

**Request Body:**
```json
{
  "rating": 5,
  "rating_comment": "Excellent work!",
  "rating_photo": "https://cloudinary.com/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment completed successfully. Warranty period started.",
  "data": {
    "appointment_id": 125,
    "appointment_status": "in-warranty",
    "completed_at": "2025-10-10T15:30:00.000Z",
    "warranty_expires_at": "2025-11-09T15:30:00.000Z",
    "warranty_days": 30
  }
}
```

---

### 11. Reschedule Appointment

**Endpoint:** `PATCH /api/appointments/:appointmentId/reschedule`

**Description:** Reschedule an appointment to a new date/time.

**Access:** Provider or Customer

**Request Body:**
```json
{
  "new_scheduled_date": "2025-10-16T14:00:00.000Z",
  "availability_id": 18,
  "reschedule_reason": "Provider unavailable due to emergency"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "data": {
    "appointment_id": 125,
    "scheduled_date": "2025-10-16T14:00:00.000Z",
    "previous_date": "2025-10-15T10:00:00.000Z"
  }
}
```

---

## Backjob System (Warranty Claims)

### Overview
The backjob system allows customers to report issues during the warranty period and request the provider to fix the problem. The system includes automatic warranty pause, dispute handling, and admin oversight.

### Backjob Status Flow

```
Customer applies → [approved] → Provider reschedules OR disputes
                                      ↓                    ↓
                                [rescheduled]        [disputed]
                                                           ↓
                                                    Admin resolves
```

---

### 12. Apply for Backjob (Customer)

**Endpoint:** `POST /api/appointments/:appointmentId/apply-backjob`

**Description:** Customer reports an issue during warranty period.

**Access:** Customer (must own the appointment)

**Requirements:**
- Appointment status must be `in-warranty`
- No active approved backjob exists
- Evidence required (photos/videos or detailed description)

**Request Body:**
```json
{
  "reason": "AC unit stopped cooling after 2 weeks",
  "evidence": {
    "description": "Unit makes loud noise and blows warm air",
    "files": [
      "https://cloudinary.com/.../evidence1.jpg",
      "https://cloudinary.com/.../evidence2.jpg"
    ],
    "additional_notes": "Issue started 3 days ago"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob application automatically approved - provider can now reschedule or dispute",
  "data": {
    "backjob": {
      "backjob_id": 45,
      "appointment_id": 125,
      "customer_id": 10,
      "provider_id": 5,
      "status": "approved",
      "reason": "AC unit stopped cooling after 2 weeks",
      "evidence": { /* ... */ },
      "created_at": "2025-10-20T10:00:00.000Z"
    },
    "appointment": {
      "appointment_id": 125,
      "appointment_status": "backjob",
      "warranty_paused_at": "2025-10-20T10:00:00.000Z",
      "warranty_remaining_days": 18
    }
  }
}
```

**What Happens:**
1. ✅ Backjob application created with status `approved`
2. ✅ Appointment status changed to `backjob`
3. ✅ Warranty countdown **PAUSED** (remaining days saved)
4. ✅ Email sent to customer (confirmation)
5. ✅ Email sent to provider (notification to reschedule or dispute)

**Error Responses:**
```json
// 400 - Appointment not in warranty
{
  "success": false,
  "message": "Backjob can only be applied during warranty"
}

// 409 - Active backjob exists
{
  "success": false,
  "message": "An active approved backjob already exists for this appointment"
}

// 400 - Missing evidence
{
  "success": false,
  "message": "Evidence is required. Please upload photos/videos or provide detailed description."
}
```

---

### 13. Upload Backjob Evidence

**Endpoint:** `POST /api/appointments/:appointmentId/backjob-evidence`

**Description:** Upload evidence files (photos/videos) for backjob application.

**Access:** Customer or Provider

**Content-Type:** `multipart/form-data`

**Form Data:**
```
evidence_files: File[] (max 5 files, 10MB each)
```

**Response:**
```json
{
  "success": true,
  "message": "Evidence uploaded successfully",
  "data": {
    "uploaded_files": [
      "https://cloudinary.com/.../evidence_1.jpg",
      "https://cloudinary.com/.../evidence_2.mp4"
    ]
  }
}
```

**Example (React Native):**
```javascript
const formData = new FormData();
formData.append('evidence_files', {
  uri: photo1.uri,
  type: 'image/jpeg',
  name: 'evidence1.jpg'
});
formData.append('evidence_files', {
  uri: video1.uri,
  type: 'video/mp4',
  name: 'evidence1.mp4'
});

const response = await fetch(
  `/api/appointments/${appointmentId}/backjob-evidence`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
    body: formData
  }
);
```

---

### 14. Dispute Backjob (Provider)

**Endpoint:** `POST /api/appointments/backjobs/:backjobId/dispute`

**Description:** Provider disputes a backjob claim (requires evidence).

**Access:** Provider (must be assigned to the appointment)

**Requirements:**
- Backjob status must be `approved` or `pending`
- Dispute reason required
- Evidence recommended

**Request Body:**
```json
{
  "dispute_reason": "Issue is caused by customer misuse, not installation defect",
  "dispute_evidence": {
    "description": "Customer admitted to using wrong voltage",
    "files": [
      "https://cloudinary.com/.../provider_evidence1.jpg"
    ],
    "installation_photos": [
      "https://cloudinary.com/.../original_install1.jpg",
      "https://cloudinary.com/.../original_install2.jpg"
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob disputed successfully. Warranty resumed. Admin will review the dispute.",
  "data": {
    "backjob_id": 45,
    "status": "disputed",
    "provider_dispute_reason": "Issue is caused by customer misuse...",
    "provider_dispute_evidence": { /* ... */ },
    "updated_at": "2025-10-21T11:00:00.000Z"
  }
}
```

**What Happens:**
1. ✅ Backjob status changed to `disputed`
2. ✅ Appointment status changed back to `in-warranty`
3. ✅ Warranty countdown **RESUMED** from where it was paused
4. ✅ Email sent to customer (dispute notification)
5. ✅ Email sent to admin (review request)

---

### 15. Cancel Backjob (Customer)

**Endpoint:** `POST /api/appointments/backjobs/:backjobId/cancel`

**Description:** Customer cancels their own backjob application.

**Access:** Customer (must own the backjob)

**Requirements:**
- Backjob status must be `approved`, `pending`, or `disputed`
- Cancellation reason required

**Request Body:**
```json
{
  "cancellation_reason": "Issue resolved itself / I fixed it / False alarm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob cancelled successfully by customer and warranty resumed",
  "data": {
    "backjob_id": 45,
    "status": "cancelled-by-customer",
    "customer_cancellation_reason": "Issue resolved itself"
  }
}
```

**What Happens:**
1. ✅ Backjob status changed to `cancelled-by-customer`
2. ✅ Appointment status changed back to `in-warranty`
3. ✅ Warranty countdown **RESUMED**
4. ✅ Email sent to provider (cancellation notification)

---

### 16. List All Backjobs (Admin)

**Endpoint:** `GET /api/appointments/backjobs`

**Description:** Get all backjob applications with filtering and pagination.

**Access:** Admin only

**Query Parameters:**
```typescript
{
  status?: string;  // Filter by status: pending, approved, disputed, etc.
  page?: number;    // Page number (default: 1)
  limit?: number;   // Items per page (default: 10)
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "backjob_id": 45,
      "appointment_id": 125,
      "customer_id": 10,
      "provider_id": 5,
      "status": "disputed",
      "reason": "AC unit stopped cooling after 2 weeks",
      "evidence": { /* customer evidence */ },
      "provider_dispute_reason": "Issue is caused by customer misuse",
      "provider_dispute_evidence": { /* provider evidence */ },
      "admin_notes": null,
      "created_at": "2025-10-20T10:00:00.000Z",
      "updated_at": "2025-10-21T11:00:00.000Z",
      "appointment": {
        "appointment_id": 125,
        "appointment_status": "in-warranty",
        "scheduled_date": "2025-10-10T09:00:00.000Z",
        "final_price": 1500.00
      },
      "customer": {
        "user_id": 10,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "provider": {
        "provider_id": 5,
        "provider_first_name": "Mike",
        "provider_last_name": "Smith",
        "provider_email": "mike@provider.com"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 28,
    "limit": 10
  }
}
```

**Example Usage:**
```javascript
// Get all disputed backjobs
const response = await fetch('/api/appointments/backjobs?status=disputed', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Get all pending backjobs (need approval)
const response = await fetch('/api/appointments/backjobs?status=pending&page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

---

### 17. Update Backjob Status (Admin)

**Endpoint:** `PATCH /api/appointments/backjobs/:backjobId`

**Description:** Admin updates backjob status (approve, cancel, or resolve dispute).

**Access:** Admin only

**Request Body:**
```json
{
  "action": "cancel-by-admin",
  "admin_notes": "Customer evidence insufficient. Provider's dispute is valid. Closing case in provider's favor."
}
```

**Actions:**
- `approve`: Approve backjob (if it was pending)
- `cancel-by-admin`: Admin cancels backjob (ends warranty, marks appointment completed)
- `cancel-by-user`: Admin cancels on behalf of user (resumes warranty)

**Response:**
```json
{
  "success": true,
  "message": "Backjob updated",
  "data": {
    "backjob_id": 45,
    "status": "cancelled-by-admin",
    "admin_notes": "Customer evidence insufficient..."
  }
}
```

**What Happens by Action:**

| Action | Backjob Status | Appointment Status | Warranty |
|--------|----------------|-------------------|----------|
| `approve` | approved | backjob | Paused |
| `cancel-by-admin` | cancelled-by-admin | completed | Ended |
| `cancel-by-user` | cancelled-by-user | in-warranty | Resumed |

---

### 18. Reschedule from Backjob (Provider)

**Endpoint:** `PATCH /api/appointments/:appointmentId/reschedule-backjob`

**Description:** Provider reschedules an approved backjob to fix the issue.

**Access:** Provider (must be assigned to the appointment)

**Requirements:**
- Appointment status must be `backjob`
- Approved backjob must exist
- New date and availability_id required

**Request Body:**
```json
{
  "new_scheduled_date": "2025-10-25T10:00:00.000Z",
  "availability_id": 20
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob rescheduled successfully",
  "data": {
    "appointment_id": 125,
    "scheduled_date": "2025-10-25T10:00:00.000Z",
    "appointment_status": "scheduled",
    "backjob": {
      "backjob_id": 45,
      "status": "rescheduled"
    }
  }
}
```

**What Happens:**
1. ✅ Backjob status changed to `rescheduled`
2. ✅ Appointment rescheduled to new date
3. ✅ Appointment status changed to `scheduled`
4. ✅ Warranty remains **paused** until issue is resolved
5. ✅ Email sent to customer (reschedule confirmation)

---

## Admin Management Features

### No-Show Management

#### Scenario: Customer No-Show

**Problem:** Provider arrives at location, customer doesn't show up.

**Solution:**
1. Provider reports no-show to admin (via support system)
2. Admin verifies evidence (location screenshot, photos, timestamp)
3. Admin cancels appointment with penalty flag

**API Call:**
```javascript
POST /api/appointments/125/admin-cancel
{
  "cancellation_reason": "Customer no-show - Provider provided location evidence",
  "admin_notes": "Provider sent GPS location screenshot at appointment time. Customer phone unreachable. Penalty applied.",
  "cancelled_by": "admin",
  "penalty_applied": true,
  "penalty_type": "no_show_customer",
  "penalty_amount": 200.00
}
```

**Implementation:**
```javascript
export const handleCustomerNoShow = async (appointmentId, evidence) => {
  try {
    // Admin cancels appointment
    const response = await fetch(`/api/appointments/${appointmentId}/admin-cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cancellation_reason: 'Customer no-show',
        admin_notes: `Provider evidence: ${evidence.description}`,
        penalty_applied: true
      })
    });

    if (response.ok) {
      // Log penalty in system
      await logPenalty({
        user_id: appointment.customer_id,
        type: 'no_show',
        amount: 200.00,
        appointment_id: appointmentId,
        notes: 'Customer failed to show up for scheduled appointment'
      });

      // Send notification to customer
      await sendNoShowNotification(appointment.customer_id, appointmentId);

      // Provider gets compensation/reimbursement
      await providerCompensation(appointment.provider_id, 200.00);
    }
  } catch (error) {
    console.error('Error handling no-show:', error);
  }
};
```

#### Scenario: Provider No-Show

**Problem:** Customer waits, provider doesn't show up.

**Solution:**
1. Customer reports no-show to admin
2. Admin verifies evidence
3. Admin cancels appointment with provider penalty

**API Call:**
```javascript
POST /api/appointments/125/admin-cancel
{
  "cancellation_reason": "Provider no-show - Customer provided timestamped photo evidence",
  "admin_notes": "Customer waited 30 minutes past scheduled time. Provider phone unreachable. Penalty applied to provider account.",
  "cancelled_by": "admin",
  "penalty_applied": true,
  "penalty_type": "no_show_provider",
  "provider_penalty": true
}
```

---

### Dispute Resolution Dashboard

**Admin Dashboard Features:**

1. **View All Disputes**
   ```javascript
   GET /api/appointments/backjobs?status=disputed
   ```

2. **Review Evidence**
   - Customer evidence (photos, videos, description)
   - Provider dispute evidence
   - Appointment history
   - Provider rating history
   - Customer complaint history

3. **Make Decision**
   ```javascript
   // Approve customer's claim (provider must fix)
   PATCH /api/appointments/backjobs/45
   {
     "action": "approve",
     "admin_notes": "Customer evidence is convincing. Issue is clearly installation defect."
   }

   // Reject customer's claim (close case)
   PATCH /api/appointments/backjobs/45
   {
     "action": "cancel-by-admin",
     "admin_notes": "Provider evidence shows customer misuse. Warranty void."
   }
   ```

**Admin UI Flow:**
```javascript
const DisputeResolution = () => {
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    const response = await fetch('/api/appointments/backjobs?status=disputed', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    setDisputes(data.data);
  };

  const resolveDispute = async (backjobId, decision, notes) => {
    await fetch(`/api/appointments/backjobs/${backjobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: decision, // 'approve' or 'cancel-by-admin'
        admin_notes: notes
      })
    });
    
    fetchDisputes(); // Refresh list
  };

  return (
    <div>
      <h2>Dispute Resolution</h2>
      {disputes.map(dispute => (
        <DisputeCard 
          key={dispute.backjob_id}
          dispute={dispute}
          onResolve={resolveDispute}
        />
      ))}
    </div>
  );
};
```

---

## Implementation Examples

### Example 1: Customer Books Appointment

```javascript
// Frontend (React Native)
const bookAppointment = async (serviceId, providerId, dateTime) => {
  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: currentUser.user_id,
        provider_id: providerId,
        service_id: serviceId,
        scheduled_date: dateTime,
        availability_id: availabilitySlot.availability_id,
        repairDescription: description
      })
    });

    const result = await response.json();
    
    if (result.success) {
      Alert.alert('Success', 'Appointment booked successfully!');
      navigation.navigate('AppointmentDetails', { 
        appointmentId: result.data.appointment_id 
      });
    }
  } catch (error) {
    console.error('Booking error:', error);
    Alert.alert('Error', 'Failed to book appointment');
  }
};
```

---

### Example 2: Provider Updates Appointment Status

```javascript
// Provider marks service as finished
const markServiceFinished = async (appointmentId) => {
  try {
    const response = await fetch(
      `/api/appointments/${appointmentId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'finished'
        })
      }
    );

    const result = await response.json();
    
    if (result.success) {
      Alert.alert(
        'Service Marked as Finished',
        'Customer will be notified to confirm completion and start warranty period.'
      );
    }
  } catch (error) {
    console.error('Status update error:', error);
  }
};
```

---

### Example 3: Customer Applies for Backjob

```javascript
// Customer reports issue during warranty
const applyForBackjob = async (appointmentId, reason, evidenceFiles) => {
  try {
    // Step 1: Upload evidence files
    const formData = new FormData();
    evidenceFiles.forEach(file => {
      formData.append('evidence_files', {
        uri: file.uri,
        type: file.type,
        name: file.name
      });
    });

    const uploadResponse = await fetch(
      `/api/appointments/${appointmentId}/backjob-evidence`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      }
    );

    const uploadResult = await uploadResponse.json();
    const evidenceUrls = uploadResult.data.uploaded_files;

    // Step 2: Apply for backjob with evidence URLs
    const backjobResponse = await fetch(
      `/api/appointments/${appointmentId}/apply-backjob`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason,
          evidence: {
            description: reason,
            files: evidenceUrls,
            additional_notes: additionalNotes
          }
        })
      }
    );

    const result = await backjobResponse.json();
    
    if (result.success) {
      Alert.alert(
        'Backjob Approved',
        'Your warranty claim has been automatically approved. The provider will contact you to reschedule.'
      );
      navigation.navigate('AppointmentDetails', { appointmentId });
    }
  } catch (error) {
    console.error('Backjob application error:', error);
    Alert.alert('Error', 'Failed to submit warranty claim');
  }
};
```

---

### Example 4: Provider Disputes Backjob

```javascript
// Provider disputes customer's warranty claim
const disputeBackjob = async (backjobId, disputeReason, evidenceFiles) => {
  try {
    // Upload dispute evidence
    const formData = new FormData();
    evidenceFiles.forEach(file => {
      formData.append('evidence_files', file);
    });

    const uploadResponse = await fetch(
      `/api/appointments/${appointmentId}/backjob-evidence`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      }
    );

    const uploadResult = await uploadResponse.json();
    const evidenceUrls = uploadResult.data.uploaded_files;

    // Submit dispute
    const disputeResponse = await fetch(
      `/api/appointments/backjobs/${backjobId}/dispute`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dispute_reason: disputeReason,
          dispute_evidence: {
            description: disputeReason,
            files: evidenceUrls,
            installation_photos: originalInstallationPhotos
          }
        })
      }
    );

    const result = await disputeResponse.json();
    
    if (result.success) {
      Alert.alert(
        'Dispute Submitted',
        'Your dispute has been submitted. Admin will review the evidence and make a decision.'
      );
    }
  } catch (error) {
    console.error('Dispute submission error:', error);
  }
};
```

---

### Example 5: Admin Handles No-Show

```javascript
// Admin dashboard - Handle no-show report
const AdminNoShowHandler = ({ appointmentId, reportedBy, evidence }) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState(200);

  const handleNoShow = async () => {
    try {
      // Cancel appointment with penalty
      const response = await fetch(
        `/api/appointments/${appointmentId}/admin-cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cancellation_reason: `No-show reported by ${reportedBy}`,
            admin_notes: adminNotes,
            penalty_applied: true,
            penalty_type: reportedBy === 'provider' 
              ? 'no_show_customer' 
              : 'no_show_provider',
            penalty_amount: penaltyAmount
          })
        }
      );

      const result = await response.json();
      
      if (result.success) {
        alert('No-show handled successfully. Penalty applied.');
        
        // Log the penalty in system
        await logPenalty({
          appointment_id: appointmentId,
          reported_by: reportedBy,
          penalty_amount: penaltyAmount,
          evidence: evidence,
          admin_notes: adminNotes
        });
      }
    } catch (error) {
      console.error('Error handling no-show:', error);
    }
  };

  return (
    <div className="no-show-handler">
      <h3>No-Show Report</h3>
      <div>Appointment ID: {appointmentId}</div>
      <div>Reported by: {reportedBy}</div>
      
      <div className="evidence">
        <h4>Evidence</h4>
        {evidence.photos.map(photo => (
          <img key={photo} src={photo} alt="Evidence" />
        ))}
        <p>{evidence.description}</p>
      </div>

      <textarea 
        placeholder="Admin notes..."
        value={adminNotes}
        onChange={(e) => setAdminNotes(e.target.value)}
      />

      <input 
        type="number"
        placeholder="Penalty amount"
        value={penaltyAmount}
        onChange={(e) => setPenaltyAmount(e.target.value)}
      />

      <button onClick={handleNoShow}>
        Apply Penalty and Cancel Appointment
      </button>
    </div>
  );
};
```

---

## Testing Guide

### Test Scenarios

#### 1. Complete Appointment Lifecycle
```javascript
describe('Appointment Lifecycle', () => {
  it('should complete full appointment flow', async () => {
    // 1. Customer books appointment
    const booking = await bookAppointment();
    expect(booking.appointment_status).toBe('accepted');

    // 2. Provider marks on-the-way
    await updateStatus(booking.appointment_id, 'on-the-way');

    // 3. Provider marks in-progress
    await updateStatus(booking.appointment_id, 'in-progress');

    // 4. Provider marks finished
    await updateStatus(booking.appointment_id, 'finished');

    // 5. Customer marks completed (with rating)
    const completed = await completeAppointment(booking.appointment_id);
    expect(completed.appointment_status).toBe('in-warranty');
    expect(completed.warranty_expires_at).toBeDefined();
  });
});
```

#### 2. Backjob Application and Resolution
```javascript
describe('Backjob System', () => {
  it('should handle backjob application and warranty pause', async () => {
    // 1. Apply for backjob
    const backjob = await applyBackjob(appointmentId, reason, evidence);
    expect(backjob.status).toBe('approved');

    // 2. Check warranty paused
    const appointment = await getAppointment(appointmentId);
    expect(appointment.warranty_paused_at).toBeDefined();
    expect(appointment.warranty_remaining_days).toBeGreaterThan(0);
    expect(appointment.appointment_status).toBe('backjob');
  });

  it('should resume warranty on backjob cancellation', async () => {
    // 1. Cancel backjob
    await cancelBackjob(backjobId, 'Issue resolved');

    // 2. Check warranty resumed
    const appointment = await getAppointment(appointmentId);
    expect(appointment.appointment_status).toBe('in-warranty');
    expect(appointment.warranty_paused_at).toBeNull();
    expect(appointment.warranty_remaining_days).toBeNull();
  });
});
```

#### 3. Dispute Handling
```javascript
describe('Dispute System', () => {
  it('should handle provider dispute', async () => {
    // 1. Provider disputes backjob
    const disputed = await disputeBackjob(backjobId, reason, evidence);
    expect(disputed.status).toBe('disputed');

    // 2. Admin resolves dispute
    const resolved = await adminUpdateBackjob(backjobId, {
      action: 'cancel-by-admin',
      admin_notes: 'Provider evidence is valid'
    });
    expect(resolved.status).toBe('cancelled-by-admin');
  });
});
```


---

## Best Practices

### For Customers
1. ✅ **Book appointments during provider's available hours**
2. ✅ **Provide detailed repair descriptions**
3. ✅ **Be present during scheduled time**
4. ✅ **Take photos before and after service**
5. ✅ **Apply for backjob immediately if issues arise**
6. ✅ **Provide clear evidence for backjob claims**
7. ✅ **Rate providers after service completion**

### For Providers
1. ✅ **Update appointment status in real-time**
2. ✅ **Take installation/completion photos**
3. ✅ **Respond to backjobs within 24 hours**
4. ✅ **Dispute only with valid evidence**
5. ✅ **Reschedule backjobs promptly**
6. ✅ **Maintain communication with customers**

### For Admins
1. ✅ **Review disputes within 48 hours**
2. ✅ **Request additional evidence if needed**
3. ✅ **Apply penalties fairly based on evidence**
4. ✅ **Document all decisions with notes**
5. ✅ **Monitor repeat offenders (customers and providers)**
6. ✅ **Send clear notifications for all actions**

---

## Security Considerations

### Authorization
- ✅ Customers can only view/modify their own appointments
- ✅ Providers can only view/modify appointments assigned to them
- ✅ Admins have full access with audit logging
- ✅ JWT tokens required for all endpoints

### Data Privacy
- ✅ Personal information (phone, email) only visible to relevant parties
- ✅ Evidence files stored securely on Cloudinary
- ✅ Admin notes visible only to admins

### Audit Trail
- ✅ All status changes logged with timestamp
- ✅ All admin actions logged with admin ID
- ✅ All cancellations logged with reason

---

## Error Handling

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Invalid appointment ID format | Check appointmentId is a valid integer |
| 403 | Unauthorized access | Verify JWT token and user permissions |
| 404 | Appointment not found | Verify appointmentId exists |
| 409 | Active backjob already exists | Cancel existing backjob first |
| 500 | Internal server error | Contact support with request details |

---

## Support

For technical support or questions:
- **Email**: support@fixmo.com
- **Developer Slack**: #fixmo-api-support
- **Documentation**: https://docs.fixmo.com

---

**Document Version:** 2.0  
**Last Updated:** October 3, 2025  
**Maintained By:** Fixmo Backend Team
