# Provider Cancel Appointment Endpoint

## Overview
This endpoint allows service providers to cancel scheduled appointments with customers. When a provider cancels an appointment, the customer is notified via email and push notifications.

## Endpoint
```
POST /api/appointments/:appointmentId/provider-cancel
```

## Authentication
- **Required**: Yes
- **Type**: Provider Authentication (JWT Token)
- **Middleware**: `providerAuthMiddleware`

## Request Parameters

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | Integer | Yes | The ID of the appointment to cancel |

### Body Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cancellation_reason | String | Yes | Reason why the provider is cancelling the appointment |

### Headers
```
Authorization: Bearer <provider_jwt_token>
Content-Type: application/json
```

## Request Example

### cURL
```bash
curl -X POST "http://localhost:3000/api/appointments/123/provider-cancel" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "cancellation_reason": "Emergency came up, unable to attend the scheduled appointment"
  }'
```

### JavaScript (Fetch)
```javascript
const appointmentId = 123;
const providerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

fetch(`http://localhost:3000/api/appointments/${appointmentId}/provider-cancel`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${providerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cancellation_reason: 'Emergency came up, unable to attend the scheduled appointment'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### React Native (Axios)
```javascript
import axios from 'axios';

const cancelAppointment = async (appointmentId, reason, providerToken) => {
  try {
    const response = await axios.post(
      `http://your-api-url/api/appointments/${appointmentId}/provider-cancel`,
      {
        cancellation_reason: reason
      },
      {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Appointment cancelled:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error cancelling appointment:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
cancelAppointment(
  123, 
  'Emergency came up, unable to attend the scheduled appointment',
  providerToken
);
```

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Appointment cancelled successfully by provider and notifications sent",
  "data": {
    "appointment_id": 123,
    "customer_id": 45,
    "provider_id": 67,
    "service_id": 12,
    "scheduled_date": "2024-10-20T10:00:00.000Z",
    "appointment_status": "cancelled",
    "cancellation_reason": "Emergency came up, unable to attend the scheduled appointment",
    "repairDescription": "Fix broken pipe",
    "final_price": null,
    "created_at": "2024-10-13T08:30:00.000Z",
    "updated_at": "2024-10-13T09:15:00.000Z",
    "customer": {
      "user_id": 45,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone_number": "09123456789"
    },
    "serviceProvider": {
      "provider_id": 67,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane.smith@fixmo.com",
      "provider_phone_number": "09987654321"
    },
    "service": {
      "service_id": 12,
      "service_title": "Plumbing Repair",
      "service_startingprice": 500
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Cancellation Reason
```json
{
  "success": false,
  "message": "Cancellation reason is required"
}
```

#### 400 Bad Request - Already Cancelled
```json
{
  "success": false,
  "message": "Appointment is already cancelled"
}
```

#### 400 Bad Request - Already Completed
```json
{
  "success": false,
  "message": "Cannot cancel a completed appointment"
}
```

#### 401 Unauthorized - Missing Provider Authentication
```json
{
  "success": false,
  "message": "Unauthorized: Provider ID not found"
}
```

#### 403 Forbidden - Not Provider's Appointment
```json
{
  "success": false,
  "message": "Forbidden: You can only cancel your own appointments"
}
```

#### 404 Not Found - Appointment Not Found
```json
{
  "success": false,
  "message": "Appointment not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error cancelling appointment by provider",
  "error": "Detailed error message"
}
```

## Business Logic

### Validation Rules
1. **Provider Authentication**: Only authenticated providers can cancel appointments
2. **Ownership Check**: Provider can only cancel their own appointments
3. **Status Check**: Can only cancel appointments with status:
   - `scheduled` ✅
   - `pending` ✅
   - `confirmed` ✅
4. **Cannot Cancel**:
   - Already cancelled appointments ❌
   - Completed appointments ❌

### What Happens When Provider Cancels
1. ✅ Appointment status updated to `cancelled`
2. ✅ Provider's cancellation reason stored in database
3. ✅ Email sent to customer notifying them of cancellation
4. ✅ Confirmation email sent to provider
5. ✅ Push notification sent to customer
6. ✅ Push notification sent to provider (confirmation)

## Email Notifications

### Customer Email (Notification)
- **Subject**: "Appointment Cancelled by Provider - Fixmo"
- **Content**: Includes:
  - Provider name and contact
  - Service details
  - Scheduled date/time
  - Provider's cancellation reason
  - Apology message
  - Instructions to rebook

### Provider Email (Confirmation)
- **Subject**: "Appointment Cancellation Confirmed - Fixmo"
- **Content**: Includes:
  - Confirmation of cancellation
  - Customer details
  - Service details
  - Original scheduled date/time
  - Cancellation reason provided

## Push Notifications

### Customer Notification
```json
{
  "title": "Appointment Cancelled",
  "body": "Your appointment with Jane Smith has been cancelled. Reason: Emergency came up",
  "data": {
    "type": "appointment_cancelled",
    "appointment_id": 123,
    "status": "cancelled"
  }
}
```

### Provider Notification (Confirmation)
```json
{
  "title": "Cancellation Confirmed",
  "body": "You have successfully cancelled the appointment with John Doe",
  "data": {
    "type": "appointment_cancelled",
    "appointment_id": 123,
    "status": "cancelled"
  }
}
```

## Use Cases

### Scenario 1: Provider Has Emergency
```javascript
// Provider needs to cancel due to emergency
const response = await cancelAppointment(
  appointmentId,
  "Family emergency, need to cancel all appointments for today",
  providerToken
);
```

### Scenario 2: Provider Double-Booked
```javascript
// Provider accidentally double-booked
const response = await cancelAppointment(
  appointmentId,
  "Scheduling conflict, I have another appointment at the same time",
  providerToken
);
```

### Scenario 3: Provider Equipment Issue
```javascript
// Provider's equipment broke
const response = await cancelAppointment(
  appointmentId,
  "Equipment malfunction, unable to complete the service today",
  providerToken
);
```

## Testing

### Test Scenarios

1. **Valid Cancellation**
   - ✅ Authenticated provider
   - ✅ Valid appointment ID
   - ✅ Appointment belongs to provider
   - ✅ Appointment is scheduled
   - ✅ Valid cancellation reason provided
   - **Expected**: 200 OK, appointment cancelled

2. **Missing Cancellation Reason**
   - ✅ Authenticated provider
   - ❌ No cancellation_reason in body
   - **Expected**: 400 Bad Request

3. **Not Provider's Appointment**
   - ✅ Authenticated provider
   - ❌ Appointment belongs to different provider
   - **Expected**: 403 Forbidden

4. **Already Cancelled**
   - ✅ Authenticated provider
   - ❌ Appointment status is already 'cancelled'
   - **Expected**: 400 Bad Request

5. **Completed Appointment**
   - ✅ Authenticated provider
   - ❌ Appointment status is 'completed'
   - **Expected**: 400 Bad Request

## Differences from Other Cancellation Endpoints

| Endpoint | Who Can Use | Authentication | Use Case |
|----------|------------|----------------|----------|
| `PUT /:id/cancel` | Customer | User Auth | Customer cancels their booking |
| `POST /:id/provider-cancel` | **Provider** | **Provider Auth** | **Provider cancels scheduled appointment** |
| `POST /:id/admin-cancel` | Admin | Admin Auth | Admin cancels any appointment |

## Database Changes
```prisma
model Appointment {
  appointment_id      Int      @id @default(autoincrement())
  appointment_status  String   // Updated to 'cancelled'
  cancellation_reason String?  // Provider's reason stored here
  // ... other fields
}
```

## Notes
- Cancellation is permanent - cannot be undone
- Customer receives immediate notification
- Provider should provide clear cancellation reason
- Customer can rebook with same or different provider
- No penalty system implemented (can be added in future)

## Related Endpoints
- `GET /api/appointments/provider/:providerId` - View all provider appointments
- `GET /api/appointments/:appointmentId` - View specific appointment details
- `PUT /api/appointments/:appointmentId/cancel` - Customer cancellation
- `POST /api/appointments/:appointmentId/admin-cancel` - Admin cancellation
- `PATCH /api/appointments/:appointmentId/reschedule` - Reschedule appointment

---

**Version**: 1.0  
**Last Updated**: October 13, 2024  
**Author**: Fixmo Backend Team
