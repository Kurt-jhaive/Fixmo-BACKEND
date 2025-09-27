# Backjob (Warranty Claims) API Documentation

## Overview
This document provides comprehensive documentation for all backjob-related API endpoints in the Fixmo backend system. The backjob system manages warranty claims where customers can request additional service work if issues persist after the initial appointment completion.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Backjob Workflow

### System Flow
1. **Customer applies for backjob** → Auto-approved immediately
2. **Provider receives notification** → Can reschedule OR dispute
3. **If provider reschedules** → New appointment created, emails sent
4. **If provider disputes** → Customer notified, admin review required
5. **Admin resolves disputes** → Final decision made

### Auto-Approval Feature
- All backjob applications are **automatically approved** when submitted
- No manual admin approval required for initial applications
- Providers can still dispute if they believe work was completed correctly

---

## Endpoints

### 1. Apply for Backjob (Customer)
Customer applies for warranty work when issues persist after service completion.

**Endpoint:** `POST /appointments/:appointmentId/apply-backjob`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID for warranty claim |

**Request Body:**
```json
{
  "reason": "The pipe is still leaking after the repair was completed",
  "evidence": "Photos showing the continuing leak and water damage"
}
```

**Required Fields:**
- `reason` (string) - Detailed description of the issue

**Optional Fields:**
- `evidence` (string) - Supporting evidence (photos, descriptions, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Backjob application automatically approved - provider can now reschedule or dispute",
  "data": {
    "backjob": {
      "backjob_id": 1,
      "appointment_id": 123,
      "customer_id": 456,
      "provider_id": 789,
      "status": "approved",
      "reason": "The pipe is still leaking after the repair was completed",
      "evidence": "Photos showing the continuing leak and water damage",
      "created_at": "2025-09-28T10:00:00.000Z",
      "updated_at": "2025-09-28T10:00:00.000Z"
    },
    "appointment": {
      "appointment_id": 123,
      "appointment_status": "backjob"
    }
  }
}
```

**Email Notifications:**
- ✅ Customer receives confirmation of approved warranty request
- ✅ Provider receives notification requiring action (reschedule or dispute)

**Error Responses:**

*400 - Missing Reason:*
```json
{
  "success": false,
  "message": "Reason is required"
}
```

*400 - Invalid Appointment Status:*
```json
{
  "success": false,
  "message": "Backjob can only be applied during warranty"
}
```

*403 - Unauthorized:*
```json
{
  "success": false,
  "message": "Only the appointment customer can apply for a backjob"
}
```

*409 - Duplicate Request:*
```json
{
  "success": false,
  "message": "An active approved backjob already exists for this appointment. Provider can reschedule or dispute it."
}
```

---

### 2. Dispute Backjob (Provider)
Provider can dispute a backjob claim if they believe the original work was completed correctly.

**Endpoint:** `POST /backjobs/:backjobId/dispute`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| backjobId | integer | Yes | The backjob application ID |

**Request Body:**
```json
{
  "dispute_reason": "The work was completed according to specifications and tested thoroughly. The issue may be unrelated to our service.",
  "dispute_evidence": "Photos of completed work, test results, and warranty documentation"
}
```

**Optional Fields:**
- `dispute_reason` (string) - Provider's explanation for disputing the claim
- `dispute_evidence` (string) - Supporting evidence for the dispute

**Response:**
```json
{
  "success": true,
  "message": "Backjob disputed",
  "data": {
    "backjob_id": 1,
    "appointment_id": 123,
    "customer_id": 456,
    "provider_id": 789,
    "status": "disputed",
    "reason": "The pipe is still leaking after the repair was completed",
    "evidence": "Photos showing the continuing leak",
    "provider_dispute_reason": "The work was completed according to specifications and tested thoroughly",
    "provider_dispute_evidence": "Photos of completed work, test results",
    "created_at": "2025-09-28T10:00:00.000Z",
    "updated_at": "2025-09-28T10:05:00.000Z"
  }
}
```

**Email Notifications:**
- ✅ Customer receives notification of dispute with provider's reasoning
- 📧 Admin receives notification for manual review (if configured)

**Error Responses:**

*400 - Invalid Status:*
```json
{
  "success": false,
  "message": "Cannot dispute a backjob with status: cancelled-by-admin"
}
```

*403 - Unauthorized:*
```json
{
  "success": false,
  "message": "Only the appointment provider can dispute a backjob"
}
```

---

### 3. Reschedule Backjob Appointment (Provider)
Provider reschedules an approved backjob to a new date and time.

**Endpoint:** `POST /appointments/:appointmentId/reschedule-backjob`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "new_scheduled_date": "2025-09-30T14:00:00.000Z",
  "availability_id": 156
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
    "appointment_id": 123,
    "customer_id": 456,
    "provider_id": 789,
    "scheduled_date": "2025-09-30T14:00:00.000Z",
    "appointment_status": "scheduled",
    "availability_id": 156,
    "service_id": 45,
    "warranty_days": 30,
    "customer": {
      "user_id": 456,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "serviceProvider": {
      "provider_id": 789,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "+0987654321"
    },
    "service": {
      "service_id": 45,
      "service_title": "Plumbing Repair",
      "service_startingprice": 150.00
    }
  }
}
```

**Email Notifications:**
- ✅ Customer receives new appointment confirmation with warranty service details
- ✅ Provider receives appointment confirmation with service expectations

**Error Responses:**

*400 - Missing Fields:*
```json
{
  "success": false,
  "message": "New scheduled date and availability_id are required"
}
```

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

*409 - Scheduling Conflict:*
```json
{
  "success": false,
  "message": "Provider already has an appointment at this time"
}
```

---

### 4. List Backjob Applications (Admin)
Admin endpoint to retrieve and filter backjob applications.

**Endpoint:** `GET /backjobs`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | - | Filter by backjob status |
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 10 | Number of items per page |

**Valid Status Values:**
- `approved` - Auto-approved and awaiting provider action
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
      "appointment_id": 123,
      "customer_id": 456,
      "provider_id": 789,
      "status": "approved",
      "reason": "The pipe is still leaking after the repair",
      "evidence": "Photos showing continued leak",
      "provider_dispute_reason": null,
      "provider_dispute_evidence": null,
      "admin_notes": null,
      "created_at": "2025-09-28T10:00:00.000Z",
      "updated_at": "2025-09-28T10:00:00.000Z",
      "appointment": {
        "appointment_id": 123,
        "scheduled_date": "2025-09-25T10:00:00.000Z",
        "appointment_status": "backjob",
        "final_price": 150.00
      },
      "customer": {
        "user_id": 456,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "provider": {
        "provider_id": 789,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane@example.com"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 25,
    "limit": 10
  }
}
```

---

### 5. Update Backjob Status (Admin)
Admin endpoint to manage backjob application statuses.

**Endpoint:** `PATCH /backjobs/:backjobId/status`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| backjobId | integer | Yes | The backjob application ID |

**Request Body:**
```json
{
  "action": "cancel-by-admin",
  "admin_notes": "Reviewed evidence - original work appears to meet standards. Customer dispute not justified."
}
```

**Required Fields:**
- `action` (string) - Action to take: "approve", "cancel-by-admin", or "cancel-by-user"

**Optional Fields:**
- `admin_notes` (string) - Administrative notes for the decision

**Response:**
```json
{
  "success": true,
  "message": "Backjob updated",
  "data": {
    "backjob_id": 1,
    "appointment_id": 123,
    "status": "cancelled-by-admin",
    "admin_notes": "Reviewed evidence - original work appears to meet standards",
    "updated_at": "2025-09-28T11:00:00.000Z"
  }
}
```

**Action Effects:**
- `approve`: Backjob is approved (usually already auto-approved)
- `cancel-by-admin`: Backjob cancelled, appointment returns to 'completed'
- `cancel-by-user`: Backjob cancelled, appointment returns to 'in-warranty'

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid action"
}
```

---

## Email System Integration

### Email Templates
The backjob system uses comprehensive HTML email templates with professional styling:

#### 1. Backjob Application Emails
- **Customer Confirmation**: Green-themed approval notification with next steps
- **Provider Alert**: Yellow-themed action required notification

#### 2. Backjob Dispute Emails
- **Customer Notification**: Red-themed dispute alert with admin review process

#### 3. Backjob Reschedule Emails
- **Customer Confirmation**: Green-themed new appointment details
- **Provider Confirmation**: Blue-themed service expectations

### Email Features
- **Responsive Design**: Mobile-friendly HTML templates
- **Rich Content**: Appointment details, contact info, and clear next steps
- **Professional Branding**: Consistent Fixmo styling and colors
- **Error Resilience**: Email failures don't block backjob operations

---

## Status Definitions

### Backjob Application Statuses
| Status | Description | Next Actions |
|--------|-------------|--------------|
| `approved` | Auto-approved upon submission | Provider can reschedule or dispute |
| `disputed` | Provider has disputed the claim | Admin review required |
| `cancelled-by-admin` | Admin cancelled after review | Case closed, appointment completed |
| `cancelled-by-user` | User/customer cancelled | Appointment returns to warranty |

### Appointment Status Changes
| Original Status | After Backjob Applied | After Resolution |
|----------------|----------------------|------------------|
| `in-warranty` | `backjob` | `scheduled` (if rescheduled) |
| `in-warranty` | `backjob` | `completed` (if cancelled by admin) |
| `in-warranty` | `backjob` | `in-warranty` (if cancelled by user) |

---

## Usage Examples

### Complete Backjob Flow

1. **Customer applies for backjob:**
```bash
curl -X POST http://localhost:3000/api/appointments/123/apply-backjob \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_JWT_TOKEN" \
  -d '{
    "reason": "The sink is still dripping after the repair",
    "evidence": "Video showing continued dripping"
  }'
```

2. **Provider reschedules the appointment:**
```bash
curl -X POST http://localhost:3000/api/appointments/123/reschedule-backjob \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROVIDER_JWT_TOKEN" \
  -d '{
    "new_scheduled_date": "2025-09-30T14:00:00.000Z",
    "availability_id": 156
  }'
```

3. **OR Provider disputes the claim:**
```bash
curl -X POST http://localhost:3000/api/backjobs/1/dispute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROVIDER_JWT_TOKEN" \
  -d '{
    "dispute_reason": "Work was completed correctly and tested",
    "dispute_evidence": "Photos and test documentation"
  }'
```

4. **Admin reviews disputes:**
```bash
curl -X GET http://localhost:3000/api/backjobs?status=disputed \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

5. **Admin resolves dispute:**
```bash
curl -X PATCH http://localhost:3000/api/backjobs/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "action": "cancel-by-admin",
    "admin_notes": "After review, original work meets standards"
  }'
```

---

## Integration Notes

### Database Schema
Based on the Prisma schema:
```prisma
model BackjobApplication {
  backjob_id               Int                    @id @default(autoincrement())
  appointment_id           Int
  customer_id              Int
  provider_id              Int
  status                   String                 @default("pending")
  reason                   String
  evidence                 Json?
  provider_dispute_reason  String?
  provider_dispute_evidence Json?
  admin_notes              String?
  created_at               DateTime               @default(now())
  updated_at               DateTime               @updatedAt
}
```

### Authentication Requirements
- **Customer endpoints**: Require customer JWT with matching customer_id
- **Provider endpoints**: Require provider JWT with matching provider_id  
- **Admin endpoints**: Require admin JWT with appropriate permissions

### Error Handling
- All endpoints return consistent JSON error responses
- Email failures are logged but don't prevent operations
- Validation errors provide clear feedback
- Authentication/authorization errors return appropriate HTTP codes

---

## Best Practices

### For Customers
- Provide detailed reason for warranty claims
- Include evidence (photos, videos) when possible
- Be available for follow-up questions during disputes

### For Providers
- Respond promptly to backjob notifications (within 24 hours)
- Provide clear documentation when disputing claims
- Honor valid warranty claims to maintain service quality

### for Administrators
- Review disputed claims thoroughly and fairly
- Document decisions clearly in admin notes
- Monitor backjob patterns for service quality insights

---

## Monitoring & Analytics

The backjob system provides insights into:
- **Service Quality**: Track warranty claim rates by provider
- **Dispute Resolution**: Monitor dispute outcomes and patterns  
- **Customer Satisfaction**: Analyze backjob frequency and reasons
- **Provider Performance**: Evaluate response times and dispute rates

This comprehensive system ensures fair and efficient handling of warranty claims while maintaining high service standards for the Fixmo platform.
- Query:
  - `status` (optional; filter)
  - `page` (default 1)
  - `limit` (default 10)
- Response: `{ success, data: [ ... ], pagination: { current_page, total_pages, total_count, limit } }`

### 4) Update Backjob Status (Admin)
- Method: PATCH
- Path: `/api/appointments/backjobs/:backjobId`
- Auth: `admin`
- Body:
  - `action`: one of `approve` | `cancel-by-admin` | `cancel-by-user`
  - `admin_notes` (string, optional)
- Effects:
  - `approve` → backjob `approved`; appointment stays `backjob` until rescheduled by provider
  - `cancel-by-admin` → backjob `cancelled-by-admin`; appointment becomes `completed`
  - `cancel-by-user` → backjob `cancelled-by-user`; appointment returns to `in-warranty`

### 5) Reschedule From Backjob (Provider)
- Method: PATCH
- Path: `/api/appointments/:appointmentId/backjob/reschedule`
- Auth: `provider` (must match appointment provider)
- Body:
  - `new_scheduled_date` (ISO string, required)
  - `availability_id` (number, required)
- Preconditions:
  - Appointment status is `backjob`
  - There exists an `approved` backjob for the appointment
  - No provider conflict at the chosen time
- Response: `{ success, message, data: appointment }` (includes `customer`, `serviceProvider`, `service`) with status `scheduled`.

## Status Reference
- Backjob status: `pending` (default), `approved`, `disputed`, `cancelled-by-admin`, `cancelled-by-user`.
- Appointment statuses used in this flow: `in-warranty`, `backjob`, `scheduled`, `completed`.

## Notes
- Evidence fields accept JSON to support arrays of links, objects, etc.
- All IDs in path params are numeric.
- Appointment ID remains the same throughout the backjob rescheduling.
