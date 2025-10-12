# Backjob Completion Fix

## Issue Reported

**Problem:** 
When a provider reschedules an appointment (after a backjob) and finishes the service, the appointment correctly enters warranty. However, when the customer tries to create a new backjob (if warranty issues arise again), the system incorrectly blocks the request with:

```
"An active approved backjob already exists for this appointment"
```

Even though the previous backjob was completed when the provider finished the rescheduled work.

## Root Cause

The backjob lifecycle management was incomplete:

1. ✅ **Customer applies backjob** → Creates `BackjobApplication` with `status: 'approved'`
2. ✅ **Provider reschedules** → Appointment status changes to `scheduled`
3. ✅ **Provider finishes work** → Appointment status changes to `finished` → `in-warranty`
4. ❌ **Backjob status NOT updated** → Old backjob still has `status: 'approved'`
5. ❌ **Customer tries new backjob** → Blocked because old backjob is still "active"

**Missing Logic:**
- When appointment is finished/completed after a backjob, the system didn't mark the backjob as `completed`
- The `applyBackjob` validation only checked for `status: 'approved'`, treating all approved backjobs as "active"

---

## Solution Implemented

### 1. Added `resolved_at` Field to BackjobApplication Model

**File:** `prisma/schema.prisma`

```prisma
model BackjobApplication {
  backjob_id               Int                    @id @default(autoincrement())
  appointment_id           Int
  customer_id              Int
  provider_id              Int
  status                   String                 @default("pending") 
  // Status values: pending, approved, disputed, cancelled-by-admin, 
  //                cancelled-by-user, cancelled-by-customer, rescheduled, completed
  reason                   String
  evidence                 Json?
  provider_dispute_reason  String?
  provider_dispute_evidence Json?
  customer_cancellation_reason String?
  admin_notes              String?
  resolved_at              DateTime?              // NEW: Timestamp when backjob was resolved
  created_at               DateTime               @default(now())
  updated_at               DateTime               @updatedAt
  
  // Relations...
}
```

**Migration:** `20251012150327_add_resolved_at_to_backjob`

---

### 2. Updated `finishAppointment` to Mark Backjobs as Completed

**File:** `src/controller/authserviceProviderController.js` (Line ~3310)

**Changes:**
- Check for active approved backjobs before finishing appointment
- Use Prisma transaction to atomically update both appointment and backjob
- Mark backjob as `completed` with `resolved_at` timestamp

**Before:**
```javascript
const updatedAppointment = await prisma.appointment.update({
    where: { appointment_id: parseInt(appointmentId) },
    data: { 
        appointment_status: 'finished',
        final_price: parseFloat(final_price)
    }
});
```

**After:**
```javascript
// Check for active backjob
const activeBackjob = await prisma.backjobApplication.findFirst({
    where: {
        appointment_id: parseInt(appointmentId),
        status: 'approved'
    }
});

// Use transaction to update both
const result = await prisma.$transaction(async (tx) => {
    // Update appointment
    const updatedAppointment = await tx.appointment.update({
        where: { appointment_id: parseInt(appointmentId) },
        data: { 
            appointment_status: 'finished',
            final_price: parseFloat(final_price)
        }
    });

    // Mark backjob as completed if exists
    if (activeBackjob) {
        await tx.backjobApplication.update({
            where: { backjob_id: activeBackjob.backjob_id },
            data: { 
                status: 'completed',
                resolved_at: new Date()
            }
        });
        console.log(`✅ Marked backjob ${activeBackjob.backjob_id} as completed`);
    }

    return updatedAppointment;
});
```

---

### 3. Updated `updateAppointmentStatus` to Mark Backjobs as Completed

**File:** `src/controller/appointmentController.js` (Line ~748)

**Changes:**
- When appointment status changes to `finished` or `in-warranty`, mark all active backjobs as `completed`
- Use Prisma transaction for atomic updates
- Log completion for debugging

**Before:**
```javascript
const updatedAppointment = await prisma.appointment.update({
    where: { appointment_id: parseInt(appointmentId) },
    data: dataUpdate,
    include: { /* ... */ }
});
```

**After:**
```javascript
const updatedAppointment = await prisma.$transaction(async (tx) => {
    // Update appointment
    const updated = await tx.appointment.update({
        where: { appointment_id: parseInt(appointmentId) },
        data: dataUpdate,
        include: { /* ... */ }
    });

    // If appointment is now in-warranty or completed, mark backjobs as completed
    if (status === 'finished' || status === 'in-warranty') {
        const activeBackjobs = await tx.backjobApplication.findMany({
            where: {
                appointment_id: parseInt(appointmentId),
                status: 'approved'
            }
        });

        if (activeBackjobs.length > 0) {
            await tx.backjobApplication.updateMany({
                where: {
                    appointment_id: parseInt(appointmentId),
                    status: 'approved'
                },
                data: {
                    status: 'completed',
                    resolved_at: new Date()
                }
            });
            console.log(`✅ Marked ${activeBackjobs.length} backjob(s) as completed`);
        }
    }

    return updated;
});
```

---

### 4. Updated `applyBackjob` Validation Logic

**File:** `src/controller/appointmentController.js` (Line ~2067)

**Changes:**
- Clarified validation logic
- Updated error message for better UX

**Before:**
```javascript
const existingActive = await prisma.backjobApplication.findFirst({
    where: {
        appointment_id: appointment.appointment_id,
        status: { in: ['approved'] } // Only block if there's already an approved, non-disputed backjob
    }
});
if (existingActive) {
    return res.status(409).json({ 
        success: false, 
        message: 'An active approved backjob already exists for this appointment. Provider can reschedule or dispute it.' 
    });
}
```

**After:**
```javascript
const existingActive = await prisma.backjobApplication.findFirst({
    where: {
        appointment_id: appointment.appointment_id,
        status: { in: ['approved'] } // Only block if there's an active approved backjob
    }
});
if (existingActive) {
    return res.status(409).json({ 
        success: false, 
        message: 'An active approved backjob already exists for this appointment. The provider must reschedule or resolve it first before you can apply for another backjob.' 
    });
}
```

**Note:** The validation now works correctly because:
- Completed backjobs have `status: 'completed'` (not 'approved')
- Only truly active backjobs (status: 'approved') will block new applications

---

## Backjob Status Lifecycle

```
Customer applies backjob
    ↓
[status: 'approved', resolved_at: null]
    ↓
Provider reschedules → Appointment: 'scheduled'
    ↓
Provider marks in-progress → Appointment: 'in-progress'
    ↓
Provider finishes work → Appointment: 'finished' → 'in-warranty'
    ↓
[status: 'completed', resolved_at: NOW] ← Backjob marked as completed
    ↓
✅ Customer can now apply for NEW backjob if warranty issues arise again
```

---

## Complete Workflow Example

### Scenario: Customer has warranty issue, provider fixes it, then issue happens AGAIN

1. **Initial Appointment Completed**
   ```
   Appointment #123
   - Status: 'completed'
   - Warranty: 30 days
   ```

2. **Day 10: Customer discovers issue**
   ```
   POST /api/appointments/123/apply-backjob
   {
     "reason": "Leak came back",
     "evidence": { "description": "Water leaking again" }
   }
   
   Result:
   - BackjobApplication #1 created (status: 'approved')
   - Appointment status → 'backjob'
   - Warranty paused (20 days remaining)
   ```

3. **Provider reschedules**
   ```
   PATCH /api/appointments/123/reschedule-backjob
   {
     "new_scheduled_date": "2025-10-20",
     "availability_id": 456
   }
   
   Result:
   - Appointment status → 'scheduled'
   - BackjobApplication #1 still 'approved'
   ```

4. **Provider completes rescheduled work**
   ```
   PUT /api/providers/appointments/123/finish
   {
     "final_price": 150
   }
   
   Result:
   - Appointment status → 'finished' → 'in-warranty'
   - Warranty resumes (20 days remaining)
   - BackjobApplication #1 → status: 'completed', resolved_at: NOW ✅
   ```

5. **Day 15: Issue happens AGAIN**
   ```
   POST /api/appointments/123/apply-backjob
   {
     "reason": "Problem still not fixed",
     "evidence": { "description": "Same issue persists" }
   }
   
   Result: ✅ SUCCESS!
   - BackjobApplication #2 created (status: 'approved')
   - Appointment status → 'backjob'
   - Warranty paused again
   
   Previous behavior: ❌ "An active approved backjob already exists"
   ```

---

## Files Modified

1. **prisma/schema.prisma**
   - Added `resolved_at` field to `BackjobApplication`
   - Updated status comment to include 'completed'

2. **src/controller/authserviceProviderController.js**
   - `finishAppointment()` - Added backjob completion logic

3. **src/controller/appointmentController.js**
   - `updateAppointmentStatus()` - Added backjob completion logic
   - `applyBackjob()` - Updated validation and error message

4. **Database Migration**
   - `migrations/20251012150327_add_resolved_at_to_backjob/migration.sql`

---

## Testing Checklist

### Test Case 1: Basic Backjob Completion
- [ ] Create appointment with warranty
- [ ] Apply backjob
- [ ] Reschedule backjob
- [ ] Finish appointment
- [ ] Verify backjob status is 'completed' with resolved_at timestamp

### Test Case 2: Multiple Backjobs (The Fix)
- [ ] Complete appointment with warranty
- [ ] Apply first backjob
- [ ] Provider reschedules and finishes work
- [ ] Verify first backjob is marked 'completed'
- [ ] Apply second backjob (should succeed) ✅
- [ ] Verify new backjob has status 'approved'

### Test Case 3: Admin Status Change
- [ ] Create appointment with active backjob
- [ ] Admin changes status to 'in-warranty' via API
- [ ] Verify backjob is marked 'completed'

### Test Case 4: Warranty Resumption
- [ ] Apply backjob (warranty paused at 20 days remaining)
- [ ] Reschedule and finish
- [ ] Verify warranty resumes with correct remaining days
- [ ] Verify backjob marked as completed

---

## API Response Changes

### Before Fix

```json
// After provider finishes rescheduled work
GET /api/appointments/123/backjobs
{
  "data": [
    {
      "backjob_id": 1,
      "status": "approved",  // ❌ Still "active" even though work is done
      "resolved_at": null
    }
  ]
}

// Customer tries to apply new backjob
POST /api/appointments/123/apply-backjob
{
  "success": false,
  "message": "An active approved backjob already exists" // ❌ Blocked
}
```

### After Fix

```json
// After provider finishes rescheduled work
GET /api/appointments/123/backjobs
{
  "data": [
    {
      "backjob_id": 1,
      "status": "completed",  // ✅ Properly closed
      "resolved_at": "2025-10-12T15:30:00Z"
    }
  ]
}

// Customer tries to apply new backjob
POST /api/appointments/123/apply-backjob
{
  "success": true,
  "message": "Backjob application automatically approved",
  "data": {
    "backjob": {
      "backjob_id": 2,
      "status": "approved" // ✅ New backjob created successfully
    }
  }
}
```

---

## Database Query Examples

### Find Completed Backjobs
```sql
SELECT 
    b.backjob_id,
    b.appointment_id,
    b.status,
    b.resolved_at,
    b.created_at,
    a.appointment_status
FROM "BackjobApplication" b
JOIN "Appointment" a ON b.appointment_id = a.appointment_id
WHERE b.status = 'completed'
ORDER BY b.resolved_at DESC;
```

### Find Appointments with Multiple Backjobs
```sql
SELECT 
    appointment_id,
    COUNT(*) as backjob_count,
    array_agg(status ORDER BY created_at) as statuses,
    array_agg(backjob_id ORDER BY created_at) as backjob_ids
FROM "BackjobApplication"
GROUP BY appointment_id
HAVING COUNT(*) > 1
ORDER BY backjob_count DESC;
```

### Check Active vs Completed Backjobs
```sql
SELECT 
    status,
    COUNT(*) as count,
    COUNT(resolved_at) as resolved_count
FROM "BackjobApplication"
GROUP BY status;
```

---

## Summary

✅ **Fixed:** Backjob lifecycle management - backjobs now marked as 'completed' when provider finishes rescheduled work  
✅ **Fixed:** Customers can now apply for new backjobs after previous backjobs are resolved  
✅ **Added:** `resolved_at` timestamp to track when backjobs are completed  
✅ **Enhanced:** Transaction-based updates for data consistency  
✅ **Improved:** Error messages for better user experience  

---

**Status:** ✅ FIXED  
**Date:** October 12, 2025  
**Files Changed:** 3 (schema + 2 controllers)  
**Migration:** 20251012150327_add_resolved_at_to_backjob  
**Issue:** Customers blocked from applying new backjobs after previous backjob resolved  
**Solution:** Automatically mark backjobs as 'completed' when appointment is finished/in-warranty
