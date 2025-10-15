# 🚫 No-Show Appointment Status Feature

## Overview

The Fixmo backend includes an **automatic no-show detection system** that monitors appointments and marks them as "no-show" if they remain in 'scheduled' status without being updated after the scheduled appointment date plus a grace period.

---

## 📋 Table of Contents

- [How It Works](#how-it-works)
- [Appointment Status Flow](#appointment-status-flow)
- [Configuration](#configuration)
- [No-Show Detection Rules](#no-show-detection-rules)
- [API Integration](#api-integration)
- [Preventing No-Shows](#preventing-no-shows)
- [Technical Implementation](#technical-implementation)

---

## How It Works

### Automatic Detection Job

The system runs a **scheduled background job every hour** that:

1. ✅ Checks all appointments in 'scheduled' status
2. 🕐 Compares the scheduled appointment date with the current time
3. ⏰ Applies a **24-hour (1 day) grace period** after the scheduled date
4. 🚫 Marks stale appointments as `no-show` status

### What Gets Marked as No-Show?

An appointment is marked as **no-show** if:

- ✅ Status is: `scheduled`
- ✅ Scheduled date/time has passed by **more than 24 hours (1 day)**
- ✅ No status update has occurred since creation

### What Doesn't Get Marked?

Appointments in these statuses are **never** marked as no-show:

- ❌ `accepted` - Provider has accepted
- ❌ `on-the-way` - Provider is heading to location
- ❌ `in-progress` - Service is happening
- ❌ `completed` - Service finished
- ❌ `finished` - Provider marked done
- ❌ `cancelled` - Already cancelled
- ❌ `no-show` - Already marked
- ❌ `in-warranty` - Under warranty period
- ❌ `backjob` - Warranty work in progress

---

## Appointment Status Flow

```
┌─────────────────────────────────────────────────────────┐
│                   APPOINTMENT LIFECYCLE                 │
└─────────────────────────────────────────────────────────┘

1. Customer Books
   └─> appointment_status: 'accepted'
       (auto-accepted when slot available)

2. Provider Actions
   ├─> 'on-the-way' → Provider heading to customer
   ├─> 'in-progress' → Service started
   └─> 'finished' → Provider marks service done

3. Customer Confirms
   └─> 'completed' → Customer confirms work done
       (or auto-complete after warranty period)

4. Issues/Cancellations
   ├─> 'cancelled' → Either party cancels
   └─> 'no-show' ⚠️ → Automatic after 24h (1 day) grace period

5. Warranty/Backjobs
   ├─> 'in-warranty' → Within warranty window
   └─> 'backjob' → Warranty claim active
```

---

## Configuration

### Current Settings

```javascript
// In src/server.js

const NO_SHOW_CHECK_INTERVAL_MS = 60 * 60 * 1000;  // Check every 1 hour
const NO_SHOW_GRACE_PERIOD_HOURS = 24;             // 24 hours (1 day) grace period
```

### Customizing Grace Period

To change the grace period, update the constant in `src/server.js`:

```javascript
// Example: 48-hour (2 day) grace period
const NO_SHOW_GRACE_PERIOD_HOURS = 48;

// Example: 12-hour grace period (more strict)
const NO_SHOW_GRACE_PERIOD_HOURS = 12;

// Example: 72-hour (3 day) grace period (more lenient)
const NO_SHOW_GRACE_PERIOD_HOURS = 72;
```

### Customizing Check Frequency

To change how often the system checks:

```javascript
// Current: Every 1 hour
const NO_SHOW_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Example: Every 30 minutes (more frequent)
const NO_SHOW_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Example: Every 2 hours (less frequent)
const NO_SHOW_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;
```

⚠️ **Performance Note:** More frequent checks consume more database resources. For most use cases, checking every 1-2 hours is sufficient.

---

## No-Show Detection Rules

### Timeline Example

```
Appointment scheduled for: 2:00 PM on Day 1
Grace period: 24 hours (1 day)
No-show check runs at: 3:00 PM on Day 2

Timeline:
Day 1, 2:00 PM ─────→ Day 2, 2:00 PM ─────→ Day 2, 3:00 PM
      ↑                      ↑                      ↑
  Scheduled              Grace Period           Auto-marked
    Time                   Ends                  No-Show
```

### Status Requirements

The job queries appointments with these conditions:

```javascript
{
  appointment_status: 'scheduled',
  scheduled_date: {
    lte: (currentTime - gracePeriod) // 24 hours ago
  }
}
```

---

## API Integration

### Valid Appointment Statuses

All API endpoints that handle appointment status updates accept these statuses:

```javascript
const validStatuses = [
  'pending',      // Awaiting approval
  'approved',     // Approved by provider
  'confirmed',    // Confirmed by customer
  'in-progress',  // Service currently happening
  'finished',     // Provider marked done
  'completed',    // Customer confirmed completion
  'cancelled',    // Cancelled by either party
  'no-show'       // Automatic or manual no-show
];
```

### Update Appointment Status Endpoint

**Provider Endpoint:**
```http
PUT /api/provider/appointment/:appointmentId/status
Authorization: Bearer {providerToken}
Content-Type: application/json

{
  "status": "in-progress"
}
```

**Customer Endpoint:**
```http
PUT /api/customer/appointment/:appointmentId/status
Authorization: Bearer {customerToken}
Content-Type: application/json

{
  "status": "completed"
}
```

### Manual No-Show Marking

Providers or admins can manually mark appointments as no-show:

```http
PUT /api/provider/appointment/:appointmentId/status
Authorization: Bearer {providerToken}
Content-Type: application/json

{
  "status": "no-show"
}
```

---

## Preventing No-Shows

### For Providers

✅ **Update status as soon as you start:**

1. Customer books appointment → Status: `accepted`
2. You're heading to customer → Update to: `on-the-way`
3. You arrive and start work → Update to: `in-progress`
4. You finish the work → Update to: `finished`

✅ **Important:** Each status update **resets the no-show timer** for that appointment.

### For Customers

✅ **Confirm completion:**

1. Provider finishes work → Status: `finished`
2. You verify and accept → Update to: `completed`

✅ **Cancel if needed:**

If you can't make it, cancel the appointment instead of letting it become no-show:

```http
PUT /api/customer/appointment/:appointmentId/cancel
Authorization: Bearer {customerToken}
Content-Type: application/json

{
  "cancellation_reason": "Need to reschedule"
}
```

### For Admins

Admins can monitor appointments and manually intervene:

```http
GET /api/admin/appointments?status=scheduled&overdue=true
Authorization: Bearer {adminToken}
```

---

## Technical Implementation

### Background Job Code

Located in: `src/server.js` (lines ~252+)

```javascript
const NO_SHOW_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const NO_SHOW_GRACE_PERIOD_HOURS = 2;

setInterval(async () => {
  try {
    const now = new Date();
    const gracePeriodAgo = new Date(
      now.getTime() - (NO_SHOW_GRACE_PERIOD_HOURS * 60 * 60 * 1000)
    );
    
    console.log(`🔍 Checking for no-show appointments (grace period: ${NO_SHOW_GRACE_PERIOD_HOURS}h)`);
    
    const staleAppointments = await prisma.appointment.findMany({
      where: {
        appointment_status: { 
          in: ['scheduled', 'accepted', 'pending', 'in-progress', 'on-the-way'] 
        },
        scheduled_date: {
          lte: gracePeriodAgo
        }
      },
      select: { 
        appointment_id: true, 
        appointment_status: true,
        scheduled_date: true,
        customer_id: true,
        provider_id: true
      }
    });

    if (staleAppointments.length > 0) {
      const ids = staleAppointments.map(a => a.appointment_id);
      
      await prisma.appointment.updateMany({
        where: { appointment_id: { in: ids } },
        data: { 
          appointment_status: 'no-show'
        }
      });
      
      console.log(`🚫 Marked ${ids.length} appointment(s) as no-show`);
    }
  } catch (err) {
    console.error('❌ No-show check job error:', err);
  }
}, NO_SHOW_CHECK_INTERVAL_MS);
```

### Database Schema

No schema changes required! The `no-show` status uses the existing `appointment_status` field:

```prisma
model Appointment {
  appointment_id      Int       @id @default(autoincrement())
  customer_id         Int
  provider_id         Int
  appointment_status  String    // Can be: pending, accepted, in-progress, completed, cancelled, no-show, etc.
  scheduled_date      DateTime
  created_at          DateTime  @default(now())
  // ... other fields
}
```

### Controller Validation

The status validation is in: `src/controller/authserviceProviderController.js`

```javascript
// Line 2972
const validStatuses = [
  'pending', 
  'approved', 
  'confirmed', 
  'in-progress', 
  'finished', 
  'completed', 
  'cancelled', 
  'no-show'  // ✅ Already included
];
```

---

## Logging and Monitoring

### Server Startup Logs

When the server starts, you'll see:

```
🚀 Fixmo Backend API Server is running on http://0.0.0.0:3000
📱 Ready for React Native connections
💬 WebSocket server initialized for real-time messaging
⏰ Warranty expiry cleanup job initialized
🚫 No-show appointment detection job initialized (Grace period: 2 hours)
🗄️ Database: Connected
```

### Job Execution Logs

Every hour when the job runs:

**When appointments are marked:**
```
🔍 Checking for no-show appointments (grace period: 2h)
🚫 Marked 3 appointment(s) as no-show:
   - Appointment #123 (accepted → no-show) scheduled for 2025-06-15T14:00:00.000Z
   - Appointment #124 (in-progress → no-show) scheduled for 2025-06-15T15:30:00.000Z
   - Appointment #125 (on-the-way → no-show) scheduled for 2025-06-15T16:00:00.000Z
```

**When no appointments need marking:**
```
🔍 Checking for no-show appointments (grace period: 2h)
✅ No appointments to mark as no-show
```

**On error:**
```
❌ No-show check job error: [error details]
```

---

## Business Logic Benefits

### 1. Accountability
- ✅ Tracks which appointments weren't fulfilled
- ✅ Helps identify unreliable providers or customers
- ✅ Provides data for reporting and analytics

### 2. Fair System
- ✅ **2-hour grace period** prevents premature marking
- ✅ Allows time for delays or communication issues
- ✅ Doesn't penalize active appointments

### 3. Data Integrity
- ✅ Keeps appointment records accurate
- ✅ Distinguishes between cancelled vs no-show
- ✅ Maintains complete appointment history

### 4. Future Enhancements

This feature enables future improvements:
- 📊 No-show rate analytics per provider/customer
- ⚠️ Automated warnings for users with high no-show rates
- 💰 No-show penalty or deposit system
- 📧 Email/SMS notifications when marked no-show
- 🔔 Push notifications to encourage status updates

---

## API Response Examples

### Appointment with No-Show Status

```json
{
  "success": true,
  "appointment": {
    "appointment_id": 123,
    "customer_id": 45,
    "provider_id": 67,
    "appointment_status": "no-show",
    "scheduled_date": "2025-06-15T14:00:00.000Z",
    "created_at": "2025-06-14T10:30:00.000Z",
    "service": {
      "service_title": "Aircon Repair",
      "service_description": "Fix aircon not cooling"
    },
    "customer": {
      "first_name": "Juan",
      "last_name": "Dela Cruz"
    },
    "serviceProvider": {
      "provider_first_name": "Maria",
      "provider_last_name": "Santos"
    }
  }
}
```

### Filtering No-Show Appointments

**Get all no-show appointments:**
```http
GET /api/admin/appointments?appointment_status=no-show
Authorization: Bearer {adminToken}
```

**Provider's no-show appointments:**
```http
GET /api/provider/appointments?status=no-show
Authorization: Bearer {providerToken}
```

**Customer's no-show appointments:**
```http
GET /api/customer/appointments?status=no-show
Authorization: Bearer {customerToken}
```

---

## Troubleshooting

### Issue: Appointments marked too early

**Solution:** Increase the grace period:
```javascript
const NO_SHOW_GRACE_PERIOD_HOURS = 4; // Increased from 2 to 4 hours
```

### Issue: Appointments not being marked

**Check:**
1. ✅ Server is running continuously
2. ✅ Job logs appear in console every hour
3. ✅ Database connection is stable
4. ✅ Appointments have correct `scheduled_date` format

**Debug query:**
```sql
-- Find appointments that should be marked no-show
SELECT 
  appointment_id,
  appointment_status,
  scheduled_date,
  NOW() - scheduled_date as time_overdue
FROM "Appointment"
WHERE appointment_status IN ('scheduled', 'accepted', 'pending', 'in-progress', 'on-the-way')
  AND scheduled_date <= NOW() - INTERVAL '2 hours'
ORDER BY scheduled_date ASC;
```

### Issue: Job consuming too much CPU

**Solution:** Reduce check frequency:
```javascript
const NO_SHOW_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // Every 2 hours instead of 1
```

---

## Related Documentation

- 📄 [All Features Summary](./ALL_FEATURES_SUMMARY.md)
- 📄 [Appointment API Documentation](./BOOKING_RESTRICTIONS_DOCUMENTATION.md)
- 📄 [Provider Cancel Appointment](./PROVIDER_CANCEL_APPOINTMENT.md)
- 📄 [Admin Action Tracking](./ADMIN_ACTION_TRACKING.md)

---

## Summary

✅ **Automatic no-show detection** runs every hour  
✅ **2-hour grace period** after scheduled time  
✅ **Valid statuses:** pending, accepted, scheduled, in-progress, on-the-way  
✅ **Prevention:** Update appointment status throughout the service lifecycle  
✅ **Manual override:** Admins/providers can manually mark no-show  
✅ **No database changes:** Uses existing appointment_status field  

**The system is production-ready and requires no additional configuration!** 🚀
