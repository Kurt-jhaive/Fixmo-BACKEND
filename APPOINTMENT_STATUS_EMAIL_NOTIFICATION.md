# Appointment Status Update Email Notification

## Feature Overview

When a service provider updates an appointment status to **"on the way"** or **"in-progress"**, the system automatically sends a beautifully formatted email notification to the customer. This keeps customers informed in real-time about their service appointment progress.

---

## Endpoint

### Update Appointment Status (Provider)

**HTTP Method:** `PUT`  
**URL:** `/auth/appointments/:appointmentId/status`  
**Authentication:** Required (Provider JWT token)

---

## Trigger Conditions

Email notifications are **automatically sent** when the appointment status is changed to:

| Status | Email Trigger | Customer Message |
|--------|---------------|------------------|
| `on the way` | ✅ Yes | "Your service provider is heading to your location. Please be ready!" |
| `in-progress` | ✅ Yes | "Your service provider has started working on your request." |
| Other statuses | ❌ No | N/A |

---

## Request Example

```http
PUT /auth/appointments/42/status HTTP/1.1
Host: <api-base-url>
Authorization: Bearer <provider-jwt-token>
Content-Type: application/json

{
  "status": "on the way"
}
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | Yes | New appointment status. Valid values: `pending`, `approved`, `confirmed`, `on the way`, `in-progress`, `finished`, `completed`, `cancelled`, `no-show` |

---

## Response Example

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Appointment status updated to on the way",
  "emailSent": true,
  "data": {
    "appointment_id": 42,
    "customer_id": 15,
    "provider_id": 8,
    "appointment_status": "on the way",
    "scheduled_date": "2025-10-10T14:00:00.000Z",
    "service_id": 23,
    "customer": {
      "user_id": 15,
      "first_name": "Maria",
      "last_name": "Santos",
      "email": "maria.santos@example.com",
      "phone_number": "+63 912 345 6789"
    },
    "service": {
      "service_title": "Aircon Cleaning",
      "service_description": "Complete aircon unit cleaning and maintenance"
    },
    "serviceProvider": {
      "provider_first_name": "Juan",
      "provider_last_name": "Cruz",
      "provider_phone_number": "+63 917 123 4567"
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `message` | string | Human-readable status message |
| `emailSent` | boolean | `true` if email was sent, `false` otherwise |
| `data` | object | Updated appointment details with customer, service, and provider info |

---

## Email Template Features

### Visual Design
- **Color-coded status badges**
  - 🚗 Orange for "on the way"
  - 🔧 Blue for "in-progress"
- **Professional HTML layout** with responsive design
- **Clear information hierarchy** for easy scanning

### Email Content Includes
1. **Status Icon & Title** - Visual indicator of the update
2. **Personalized Greeting** - Customer's name
3. **Status Message** - Context-appropriate description
4. **Appointment Details**
   - Appointment ID
   - Service title
   - Scheduled date and time
   - Current status badge
5. **Provider Contact Information**
   - Provider name
   - Phone number
   - Helpful tips based on status
6. **Professional Footer** - Branding and legal info

---

## Error Handling

### Email Delivery Failures

The system uses **graceful error handling** for email delivery:
- ✅ **Status update always succeeds** even if email fails
- 📝 **Email errors are logged** to the console
- 🔄 **No transaction rollback** - appointment status remains updated
- 💡 **Silent failure** - provider doesn't see email errors

```javascript
// Email error is logged but doesn't affect the response
console.error('❌ Failed to send status update email:', emailError);
```

### Common Error Responses

#### 400 Bad Request - Invalid Status
```json
{
  "success": false,
  "message": "Invalid status. Valid statuses are: pending, approved, confirmed, on the way, in-progress, finished, completed, cancelled, no-show"
}
```

#### 403 Forbidden - Wrong Provider
```json
{
  "success": false,
  "message": "You can only manage your own appointments"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Appointment not found"
}
```

---

## Implementation Details

### Code Location
- **Controller:** `src/controller/authserviceProviderController.js` → `updateAppointmentStatusProvider()`
- **Email Service:** `src/services/mailer.js` → `sendAppointmentStatusUpdateEmail()`

### Dependencies
```javascript
import { sendAppointmentStatusUpdateEmail } from '../services/mailer.js';
```

### Email Trigger Logic
```javascript
if (status === 'on the way' || status === 'in-progress') {
    await sendAppointmentStatusUpdateEmail(customerEmail, {
        customerName, providerName, providerPhone,
        serviceTitle, scheduledDate, appointmentId,
        newStatus: status, statusMessage
    });
}
```

---

## Testing Guide

### Manual Testing Steps

1. **Login as Provider**
   ```http
   POST /auth/provider-login
   {
     "provider_email": "provider@test.com",
     "provider_password": "password"
   }
   ```

2. **Update Appointment Status**
   ```http
   PUT /auth/appointments/42/status
   Authorization: Bearer <provider-token>
   {
     "status": "on the way"
   }
   ```

3. **Check Customer Email**
   - Verify email received at customer's inbox
   - Confirm correct status and appointment details
   - Test email rendering on mobile and desktop

4. **Test Different Statuses**
   - ✅ Test `"on the way"` → Should send email
   - ✅ Test `"in-progress"` → Should send email
   - ❌ Test `"completed"` → Should NOT send email

### Console Logging

Successful email delivery logs:
```
✅ Status update email sent to maria.santos@example.com for status: on the way
```

Failed email delivery logs:
```
❌ Failed to send status update email: <error details>
```

---

## Frontend Integration Tips

### React Native Example

```javascript
const updateAppointmentStatus = async (appointmentId, newStatus) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/appointments/${appointmentId}/status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      }
    );

    const data = await response.json();

    if (data.success) {
      // Show success message
      Alert.alert(
        'Status Updated',
        data.emailSent 
          ? 'Customer has been notified via email'
          : 'Status updated successfully'
      );
    }
  } catch (error) {
    console.error('Status update failed:', error);
  }
};
```

### UI/UX Recommendations

1. **Status Buttons** - Provide quick-action buttons for common transitions:
   - "I'm On The Way" → Sets status to `on the way`
   - "Start Service" → Sets status to `in-progress`

2. **Confirmation Dialogs** - Ask provider to confirm before status change:
   ```
   "Send 'On The Way' notification to customer?"
   [Cancel] [Confirm & Notify]
   ```

3. **Visual Feedback** - Show email sent indicator:
   ```
   ✅ Status updated & customer notified
   ```

---

## Environment Variables

Ensure these are configured in your `.env` file:

```env
MAILER_HOST=smtp.gmail.com
MAILER_PORT=587
MAILER_SECURE=false
MAILER_USER=your-email@gmail.com
MAILER_PASS=your-app-password
```

---

## Future Enhancements

### Potential Improvements
- 🔔 **Push Notifications** - Add mobile push notifications alongside email
- 📱 **SMS Notifications** - Send SMS for critical status updates
- 🌍 **Multi-language Support** - Translate emails based on customer preferences
- 📊 **Email Analytics** - Track open rates and delivery success
- ⏰ **Smart Timing** - Avoid sending emails during customer's quiet hours

---

## Troubleshooting

### Email Not Received

1. **Check Email Logs**
   ```
   Look for: ✅ Status update email sent to <email>
   ```

2. **Verify SMTP Configuration**
   ```javascript
   // Test email service independently
   await sendAppointmentStatusUpdateEmail(testEmail, testData);
   ```

3. **Check Spam Folder** - Email may be filtered

4. **Verify Customer Email** - Ensure valid email in database

### Status Update Succeeds But No Email

This is **expected behavior** if:
- Status is NOT `on the way` or `in-progress`
- Email service fails (logged, but status update continues)

---

_Last updated: 2025-10-04_
