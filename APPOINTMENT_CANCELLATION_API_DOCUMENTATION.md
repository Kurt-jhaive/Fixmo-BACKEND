# Appointment Cancellation Endpoints Documentation

## Overview
This document covers the appointment cancellation functionality with automatic email notifications for both user and admin cancellations.

## Base URL
```
http://localhost:3000/api
```

## Authentication
All cancellation endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Cancellation Endpoints

### 1. User Cancel Appointment
Cancel an appointment with a reason. Automatically sends email notifications to both customer and service provider.

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

**Required Fields:**
- `cancellation_reason` (string) - Detailed reason for the cancellation

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully and notifications sent",
  "data": {
    "appointment_id": 1,
    "appointment_status": "cancelled",
    "cancellation_reason": "Customer emergency - needs to reschedule",
    "cancelled_at": "2025-09-28T10:30:00.000Z",
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

**Email Notifications:**
- **Customer Email:** Cancellation confirmation with booking details and reason
- **Provider Email:** Cancellation notification with customer details and reason
- **Resilient Design:** Cancellation completes successfully even if email delivery fails

---

### 2. Admin Cancel Appointment
Admin endpoint to cancel appointments with enhanced tracking and notifications.

**Endpoint:** `POST /appointments/:appointmentId/admin-cancel`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The appointment ID |

**Request Body:**
```json
{
  "cancellation_reason": "Provider unavailable due to emergency",
  "admin_notes": "Customer will be contacted for rescheduling options"
}
```

**Required Fields:**
- `cancellation_reason` (string) - Reason for the cancellation

**Optional Fields:**
- `admin_notes` (string) - Additional administrative notes

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled by admin successfully and notifications sent",
  "data": {
    "appointment_id": 1,
    "appointment_status": "cancelled",
    "cancellation_reason": "Provider unavailable due to emergency",
    "cancelled_at": "2025-09-28T10:30:00.000Z",
    "cancelled_by": "admin",
    "admin_notes": "Customer will be contacted for rescheduling options",
    "cancellation_type": "admin",
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

**Enhanced Features:**
- **Admin Tracking:** Records `cancelled_by: 'admin'` for audit purposes
- **Combined Notifications:** Cancellation reason includes admin notes in email
- **Duplicate Prevention:** Cannot cancel already cancelled appointments
- **Enhanced Logging:** Detailed logging for admin actions

---

## Email Notification System

### Email Templates Used
Both cancellation endpoints utilize the following email functions from the mailer service:

1. **`sendBookingCancellationToCustomer(customerEmail, cancellationDetails)`**
   - Sends formatted cancellation confirmation to the customer
   - Includes booking details, cancellation reason, and next steps

2. **`sendBookingCancellationEmail(providerEmail, cancellationDetails)`**
   - Notifies the service provider about the cancellation
   - Includes customer details and frees up the time slot

### Email Content Structure
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
  repairDescription: "Fix leaking pipe",
  cancellationReason: "Customer emergency - needs to reschedule",
  cancelledBy: "customer" // or "admin"
}
```

### Email Error Handling
- **Non-blocking:** Email failures don't prevent successful cancellation
- **Detailed Logging:** All email operations are logged with success/error messages
- **Graceful Degradation:** Users receive success response even if emails fail

---

## Error Responses

### Common Error Responses

**400 - Missing Cancellation Reason:**
```json
{
  "success": false,
  "message": "Cancellation reason is required"
}
```

**404 - Appointment Not Found:**
```json
{
  "success": false,
  "message": "Appointment not found"
}
```

**400 - Already Cancelled (Admin endpoint only):**
```json
{
  "success": false,
  "message": "Appointment is already cancelled"
}
```

**500 - Internal Server Error:**
```json
{
  "success": false,
  "message": "Error cancelling appointment",
  "error": "Detailed error message"
}
```

---

## Usage Examples

### User Cancellation
```bash
curl -X POST http://localhost:3000/api/appointments/1/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "cancellation_reason": "Family emergency - need to reschedule"
  }'
```

### Admin Cancellation
```bash
curl -X POST http://localhost:3000/api/appointments/1/admin-cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "cancellation_reason": "Provider equipment malfunction",
    "admin_notes": "Rescheduling options provided to customer via phone"
  }'
```

---

## Database Fields Added

### New Appointment Fields
- `cancelled_at` (DateTime) - Timestamp when appointment was cancelled
- `cancelled_by` (String) - Who cancelled: 'customer', 'provider', or 'admin'
- `admin_notes` (String) - Additional notes from admin cancellations

### Existing Fields Used
- `appointment_status` - Set to 'cancelled'
- `cancellation_reason` - Reason provided by cancelling party

---

## Integration Notes

### Route Configuration
Ensure these routes are added to your appointment routes file:

```javascript
// User cancellation
router.post('/appointments/:appointmentId/cancel', cancelAppointment);

// Admin cancellation  
router.post('/appointments/:appointmentId/admin-cancel', adminCancelAppointment);
```

### Permissions
- **User Cancellation:** Available to customers and providers
- **Admin Cancellation:** Restricted to admin users only
- **Authentication:** Both endpoints require valid JWT tokens

### Audit Trail
Both endpoints provide comprehensive logging for:
- Cancellation timestamps
- User identification  
- Reason tracking
- Email delivery status
- Error handling