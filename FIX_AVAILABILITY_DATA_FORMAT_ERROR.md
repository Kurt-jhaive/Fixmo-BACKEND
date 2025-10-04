# 🔧 FIX: "Invalid availability data format" Error

## ❌ The Problem
You're getting this error:
```
# 🔧 FIX: Availability API Errors

## Error 1: "Invalid availability data format"

### ❌ The Problem
```
ERROR Set Availability Error: [Error: Invalid availability data format]
```

### ✅ The Solution

Your Request Body is Missing the `availabilityData` Wrapper

**❌ WRONG:**
```javascript
body: JSON.stringify([
  { dayOfWeek: "Monday", isAvailable: true, startTime: "09:00", endTime: "17:00" }
])
```

**✅ CORRECT:**
```javascript
body: JSON.stringify({
  availabilityData: [  // ⚠️ ADD THIS WRAPPER!
    { dayOfWeek: "Monday", isAvailable: true, startTime: "09:00", endTime: "17:00" }
  ]
})
```

---

## Error 2: "At least one field (dayOfWeek, startTime, endTime) is required to update"

### ❌ The Problem
```
ERROR Update Availability By Date Error: [Error: At least one field (dayOfWeek, startTime, endTime) is required to update]
```

### 🤔 You're Using the WRONG Endpoint!

This error means you're calling **`PUT /api/availability/:availabilityId`** (update slot) when you should be calling **`PUT /api/availability/date`** (update by date).

### ✅ The Solution

**If you want to block/unblock a SPECIFIC DATE:**
```javascript
// ✅ CORRECT - Use this endpoint
await fetch('http://your-api.com/api/availability/date', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: "2025-10-15",      // ✅ Specific date (YYYY-MM-DD)
    isActive: false          // ✅ false = blocked, true = available
  })
});
```

**If you want to change a time slot's hours:**
```javascript
// For changing Monday 9-5 to Monday 10-6
await fetch(`http://your-api.com/api/availability/${availabilityId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    startTime: "10:00",
    endTime: "18:00"
  })
});
```

---

## 📋 Quick Decision Tree

```
Do you want to block a SPECIFIC DATE (e.g., October 15, 2025)?
├─ YES → Use PUT /api/availability/date
│         Body: { date: "2025-10-15", isActive: false }
│
└─ NO → Do you want to change HOURS for a recurring day?
         └─ YES → Use PUT /api/availability/:availabilityId
                   Body: { startTime: "10:00", endTime: "18:00" }
```

---
```

## ✅ The Solution

### Your Request Body is Missing the `availabilityData` Wrapper

**❌ WRONG - What you're probably doing:**
```javascript
const response = await fetch('/api/availability', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([
    { dayOfWeek: "Monday", isAvailable: true, startTime: "09:00", endTime: "17:00" },
    { dayOfWeek: "Tuesday", isAvailable: true, startTime: "09:00", endTime: "17:00" }
  ])
});
```

**✅ CORRECT - What you need to do:**
```javascript
const response = await fetch('/api/availability', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    availabilityData: [  // ⚠️ ADD THIS WRAPPER!
      { dayOfWeek: "Monday", isAvailable: true, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: "Tuesday", isAvailable: true, startTime: "09:00", endTime: "17:00" }
    ]
  })
});
```

---

## 📱 React Native Fix

### Find your `setAvailability` function and update it:

**Before:**
```javascript
const setAvailability = async (scheduleData) => {
  try {
    const response = await apiClient.post('/api/availability', scheduleData);
    // ...
  } catch (error) {
    console.error('Set Availability Error:', error);
  }
};
```

**After:**
```javascript
const setAvailability = async (scheduleData) => {
  try {
    const response = await apiClient.post('/api/availability', {
      availabilityData: scheduleData  // ⚠️ WRAP IT HERE!
    });
    // ...
  } catch (error) {
    console.error('Set Availability Error:', error);
  }
};
```

---

## 🎯 Quick Test

Test with this exact payload:
```json
{
  "availabilityData": [
    {
      "dayOfWeek": "Monday",
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

Using curl:
```bash
curl -X POST http://localhost:3000/api/availability \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"availabilityData":[{"dayOfWeek":"Monday","isAvailable":true,"startTime":"09:00","endTime":"17:00"}]}'
```

---

## 📋 Backend Validation Checklist

The backend checks for:
1. ✅ Request body has `availabilityData` property
2. ✅ `availabilityData` is an array
3. ✅ Each item has required fields: `dayOfWeek`, `isAvailable`, `startTime`, `endTime`
4. ✅ Time format is HH:MM (24-hour format)
5. ✅ End time is after start time

---

## 🔍 Where to Look in Your Code

Check these files in your React Native project:
- `src/api/availability.api.ts` (or `.js`)
- `src/services/availability.service.ts`
- Any component that calls availability endpoints

Look for:
```typescript
// FIND THIS:
apiClient.post('/api/availability', scheduleData)

// CHANGE TO THIS:
apiClient.post('/api/availability', { availabilityData: scheduleData })
```

---

## 📖 Full Documentation

See `AVAILABILITY_API_INTEGRATION_GUIDE.md` for complete API documentation with examples.
