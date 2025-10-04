# Availability API Integration Guide

## Overview
This guide explains how to integrate with the Provider Availability API endpoints for managing service provider work schedules.

## Base URL
```
POST /api/availability                      - Set/Update all provider availability (bulk)
GET /api/availability                       - Get all provider's availability
PUT /api/availability/:availabilityId       - Update specific availability slot
PUT /api/availability/date                  - Update availability for specific date
DELETE /api/availability/:availabilityId    - Delete specific availability
GET /api/availability/summary               - Get availability summary stats
```

## Authentication
All endpoints require JWT authentication with provider role:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 🎯 Quick Guide: Which Endpoint Should I Use?

| Scenario | Endpoint | Method |
|----------|----------|--------|
| **Set up weekly schedule** (all 7 days at once) | `/api/availability` | POST |
| **Block out a specific date** (vacation, sick day) | `/api/availability/date` | PUT |
| **Change hours for a specific day slot** | `/api/availability/:availabilityId` | PUT |
| **View all availability** | `/api/availability` | GET |
| **Delete a time slot** | `/api/availability/:availabilityId` | DELETE |
| **Get statistics** | `/api/availability/summary` | GET |

### Common Confusion: Update By Date vs Update Slot

**❓ "I want to take October 15th off"**  
✅ Use: `PUT /api/availability/date` with `{ date: "2025-10-15", isActive: false }`

**❓ "I want to change my Monday hours from 9-5 to 10-6"**  
✅ Use: `PUT /api/availability/:availabilityId` with `{ startTime: "10:00", endTime: "18:00" }`

**❓ "I want to set up my entire weekly schedule"**  
✅ Use: `POST /api/availability` with `{ availabilityData: [all 7 days] }`

---

## 1. Set/Update Provider Availability

### Endpoint
```
POST /api/availability
```

### Request Body Format
**IMPORTANT:** The request body must contain an `availabilityData` property with an array of day objects.

```typescript
{
  "availabilityData": [
    {
      "dayOfWeek": string,        // "Monday", "Tuesday", etc.
      "isAvailable": boolean,     // true or false
      "startTime": string,        // "09:00" (24-hour format)
      "endTime": string          // "17:00" (24-hour format)
    }
  ]
}
```

### Example Request
```javascript
const setAvailability = async () => {
  try {
    const response = await fetch('http://your-api.com/api/availability', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        availabilityData: [
          {
            dayOfWeek: "Monday",
            isAvailable: true,
            startTime: "09:00",
            endTime: "17:00"
          },
          {
            dayOfWeek: "Tuesday",
            isAvailable: true,
            startTime: "10:00",
            endTime: "18:00"
          },
          {
            dayOfWeek: "Wednesday",
            isAvailable: false,
            startTime: "09:00",
            endTime: "17:00"
          },
          {
            dayOfWeek: "Thursday",
            isAvailable: true,
            startTime: "09:00",
            endTime: "17:00"
          },
          {
            dayOfWeek: "Friday",
            isAvailable: true,
            startTime: "09:00",
            endTime: "16:00"
          },
          {
            dayOfWeek: "Saturday",
            isAvailable: false,
            startTime: "",
            endTime: ""
          },
          {
            dayOfWeek: "Sunday",
            isAvailable: false,
            startTime: "",
            endTime: ""
          }
        ]
      })
    });

    const data = await response.json();
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Validation Rules
1. **dayOfWeek**: Must be a valid day name (case-sensitive)
   - Valid values: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"

2. **isAvailable**: Boolean flag indicating if the provider is available on this day
   - `true`: Provider is available and accepts bookings
   - `false`: Provider is not available (day off)

3. **Time Format**: Must be in 24-hour format `HH:MM`
   - Valid examples: "09:00", "13:30", "17:00"
   - Invalid examples: "9:00", "1:30 PM", "25:00"
   - Pattern: `/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/`

4. **Time Range**: `endTime` must be after `startTime`
   - ✅ Valid: startTime: "09:00", endTime: "17:00"
   - ❌ Invalid: startTime: "17:00", endTime: "09:00"

5. **Required Fields**: When `isAvailable` is `true`, both `startTime` and `endTime` are required

### Success Response (200)
```json
{
  "success": true,
  "message": "Availability updated successfully",
  "data": [
    {
      "provider_id": 123,
      "dayOfWeek": "Monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "availability_isActive": true
    }
  ]
}
```

### Error Responses

**400 - Invalid Data Format**
```json
{
  "success": false,
  "message": "Invalid availability data format"
}
```
**Cause**: Request body doesn't contain `availabilityData` array

**400 - Invalid Time Format**
```json
{
  "success": false,
  "message": "Invalid time format for Monday"
}
```
**Cause**: Time doesn't match HH:MM format

**400 - Invalid Time Range**
```json
{
  "success": false,
  "message": "End time must be after start time for Monday"
}
```
**Cause**: endTime is not greater than startTime

**401 - Unauthorized**
```json
{
  "success": false,
  "message": "Authentication required"
}
```
**Cause**: Missing or invalid JWT token

---

## 2. Get Provider Availability

### Endpoint
```
GET /api/availability
```

### Example Request
```javascript
const getAvailability = async () => {
  try {
    const response = await fetch('http://your-api.com/api/availability', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Availability:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "availability_id": 1,
      "provider_id": 123,
      "dayOfWeek": "Monday",
      "startTime": "09:00",
      "endTime": "17:00",
      "availability_isActive": true,
      "availability_isBooked": false
    },
    {
      "availability_id": 2,
      "provider_id": 123,
      "dayOfWeek": "Tuesday",
      "startTime": "10:00",
      "endTime": "18:00",
      "availability_isActive": true,
      "availability_isBooked": false
    }
  ]
}
```

---

## 3. Update Availability By Date

### Endpoint
```
PUT /api/availability/date
```

**Use Case**: Update availability for a specific date (e.g., block out a specific day, mark yourself unavailable for a particular date)

### Request Body Format
```typescript
{
  "date": string,        // "2025-10-15" (YYYY-MM-DD format)
  "isActive": boolean,   // true = available, false = not available
  "dayOfWeek": string    // Optional: "Monday", "Tuesday", etc. (if not provided, calculated from date)
}
```

### Example Request - Block Out a Specific Date
```javascript
const updateAvailabilityByDate = async (date, isAvailable) => {
  try {
    const response = await fetch('http://your-api.com/api/availability/date', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: "2025-10-15",
        isActive: false  // Mark as unavailable for this date
      })
    });

    const data = await response.json();
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Real-World Examples

**Example 1: Block out a specific day (vacation)**
```javascript
// Provider wants to take October 15, 2025 off
await fetch('http://your-api.com/api/availability/date', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: "2025-10-15",
    isActive: false
  })
});
```

**Example 2: Re-enable a previously blocked date**
```javascript
// Provider wants to work on October 22, 2025 (previously blocked)
await fetch('http://your-api.com/api/availability/date', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: "2025-10-22",
    isActive: true
  })
});
```

### Validation Rules
1. **date**: Required, must be in `YYYY-MM-DD` format
   - ✅ Valid: "2025-10-15", "2025-12-25"
   - ❌ Invalid: "10/15/2025", "15-10-2025", "2025-10-15T00:00:00"

2. **isActive**: Required, must be boolean
   - `true`: Provider is available on this date
   - `false`: Provider is NOT available on this date (blocked/unavailable)

3. **dayOfWeek**: Optional (automatically calculated from date if not provided)
   - If provided, must match actual day of week

### Success Response (200)
```json
{
  "message": "Availability for 2025-10-15 (Sunday) updated successfully",
  "date": "2025-10-15",
  "dayOfWeek": "Sunday",
  "isActive": false,
  "availability": {
    "availability_id": 5,
    "dayOfWeek": "Sunday",
    "startTime": "09:00",
    "endTime": "17:00",
    "availability_isActive": false
  }
}
```

### Error Responses

**400 - Missing Date**
```json
{
  "message": "Date is required (format: YYYY-MM-DD)"
}
```

**400 - Invalid Date Format**
```json
{
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

**400 - Missing isActive**
```json
{
  "message": "isActive must be a boolean (true or false)"
}
```

**404 - No Availability Found**
```json
{
  "message": "No availability found for Sunday. Please create availability first.",
  "dayOfWeek": "Sunday"
}
```
**Note**: You must first create a weekly availability schedule before you can update specific dates.

### React Native Integration Example

```typescript
import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DateAvailabilityScreen = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const API_BASE_URL = 'http://your-api.com';

  const toggleDateAvailability = async (date, isAvailable) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/availability/date`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: date,
          isActive: isAvailable
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`${date} marked as ${isAvailable ? 'available' : 'unavailable'}`);
        
        // Update UI
        setMarkedDates(prev => ({
          ...prev,
          [date]: {
            marked: true,
            dotColor: isAvailable ? 'green' : 'red',
            selected: true,
            selectedColor: isAvailable ? 'green' : 'red'
          }
        }));
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update availability');
    }
  };

  const blockDate = () => {
    if (selectedDate) {
      toggleDateAvailability(selectedDate, false);
    } else {
      alert('Please select a date first');
    }
  };

  const unblockDate = () => {
    if (selectedDate) {
      toggleDateAvailability(selectedDate, true);
    } else {
      alert('Please select a date first');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Select dates to block or unblock
      </Text>
      
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        minDate={new Date().toISOString().split('T')[0]} // Don't allow past dates
      />

      {selectedDate && (
        <View style={{ marginTop: 20 }}>
          <Text>Selected: {selectedDate}</Text>
          <Button 
            title="Block This Date" 
            onPress={blockDate}
            color="red"
          />
          <View style={{ height: 10 }} />
          <Button 
            title="Unblock This Date" 
            onPress={unblockDate}
            color="green"
          />
        </View>
      )}
    </View>
  );
};

export default DateAvailabilityScreen;
```

### Common Use Cases

1. **Vacation Days**: Block out multiple days when provider is on vacation
```javascript
const vacationDates = ['2025-12-24', '2025-12-25', '2025-12-26'];

for (const date of vacationDates) {
  await updateAvailabilityByDate(date, false);
}
```

2. **Emergency Day Off**: Quickly block out today
```javascript
const today = new Date().toISOString().split('T')[0];
await updateAvailabilityByDate(today, false);
```

3. **Re-open a Previously Blocked Date**: Provider changes their mind
```javascript
await updateAvailabilityByDate('2025-10-20', true);
```

---

## 4. Update Specific Availability Slot

### Endpoint
```
PUT /api/availability/:availabilityId
```

**Use Case**: Update a specific availability slot's time or day (e.g., change Monday hours from 9-5 to 10-6)

### Request Body Format
```typescript
{
  "dayOfWeek": string,   // Optional: "Monday", "Tuesday", etc.
  "startTime": string,   // Optional: "09:00" (24-hour format)
  "endTime": string      // Optional: "17:00" (24-hour format)
}
```

**Note**: At least ONE field (dayOfWeek, startTime, or endTime) is required.

### Example Request
```javascript
const updateAvailabilitySlot = async (availabilityId, updates) => {
  try {
    const response = await fetch(`http://your-api.com/api/availability/${availabilityId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();
    console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Example: Change Monday hours
await updateAvailabilitySlot(5, {
  startTime: "10:00",
  endTime: "18:00"
});

// Example: Move a time slot to different day
await updateAvailabilitySlot(5, {
  dayOfWeek: "Tuesday"
});

// Example: Update multiple fields
await updateAvailabilitySlot(5, {
  dayOfWeek: "Wednesday",
  startTime: "08:00",
  endTime: "16:00"
});
```

### Success Response (200)
```json
{
  "message": "Availability updated successfully",
  "availability": {
    "availability_id": 5,
    "provider_id": 123,
    "dayOfWeek": "Monday",
    "startTime": "10:00",
    "endTime": "18:00",
    "availability_isActive": true,
    "availability_isBooked": false
  }
}
```

### Error Responses

**400 - No Fields Provided**
```json
{
  "message": "At least one field (dayOfWeek, startTime, endTime) is required to update"
}
```

**400 - Invalid Day**
```json
{
  "message": "Invalid day of week. Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday"
}
```

**400 - Invalid Time Format**
```json
{
  "message": "Invalid start time format. Use HH:MM format (e.g., 09:00, 17:30)"
}
```

**404 - Not Found**
```json
{
  "message": "Availability not found"
}
```

---

## 5. Delete Specific Availability

### Endpoint
```
DELETE /api/availability/:availabilityId
```

### Example Request
```javascript
const deleteAvailability = async (availabilityId) => {
  try {
    const response = await fetch(`http://your-api.com/api/availability/${availabilityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Deleted:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Availability deleted successfully"
}
```

### Error Responses

**404 - Not Found**
```json
{
  "success": false,
  "message": "Availability record not found"
}
```

**400 - Cannot Delete Booked**
```json
{
  "success": false,
  "message": "Cannot delete booked availability"
}
```
**Note**: You cannot delete availability slots that have appointments scheduled.

---

## 6. Get Availability Summary

### Endpoint
```
GET /api/availability/summary
```

### Example Request
```javascript
const getSummary = async () => {
  try {
    const response = await fetch('http://your-api.com/api/availability/summary', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Summary:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "totalSlots": 35,
    "activeSlots": 28,
    "bookedSlots": 5,
    "availableSlots": 23,
    "configuredSlots": 7,
    "activeDays": 5,
    "availabilityByDay": [
      {
        "dayOfWeek": "Monday",
        "_count": {
          "availability_id": 5
        }
      }
    ]
  }
}
```

---

## React Native Example

### Complete Integration Component

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Switch, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AvailabilityScreen = () => {
  const [availability, setAvailability] = useState([
    { dayOfWeek: 'Monday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Tuesday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Wednesday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Thursday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Friday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Saturday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 'Sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' }
  ]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://your-api.com';

  // Fetch existing availability on mount
  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        // Map backend data to state format
        const mappedData = availability.map(day => {
          const existingDay = result.data.find(d => d.dayOfWeek === day.dayOfWeek);
          return existingDay ? {
            dayOfWeek: day.dayOfWeek,
            isAvailable: existingDay.availability_isActive,
            startTime: existingDay.startTime,
            endTime: existingDay.endTime
          } : day;
        });
        setAvailability(mappedData);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const saveAvailability = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          availabilityData: availability // ⚠️ IMPORTANT: Wrap in availabilityData
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Availability saved successfully!');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Error saving availability');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (index) => {
    const updated = [...availability];
    updated[index].isAvailable = !updated[index].isAvailable;
    setAvailability(updated);
  };

  const updateTime = (index, field, value) => {
    const updated = [...availability];
    updated[index][field] = value;
    setAvailability(updated);
  };

  return (
    <View>
      {availability.map((day, index) => (
        <View key={day.dayOfWeek} style={{ marginBottom: 20 }}>
          <Text>{day.dayOfWeek}</Text>
          <Switch
            value={day.isAvailable}
            onValueChange={() => toggleDay(index)}
          />
          {day.isAvailable && (
            <View>
              <TextInput
                placeholder="Start Time (HH:MM)"
                value={day.startTime}
                onChangeText={(text) => updateTime(index, 'startTime', text)}
              />
              <TextInput
                placeholder="End Time (HH:MM)"
                value={day.endTime}
                onChangeText={(text) => updateTime(index, 'endTime', text)}
              />
            </View>
          )}
        </View>
      ))}
      <Button 
        title={loading ? "Saving..." : "Save Availability"} 
        onPress={saveAvailability}
        disabled={loading}
      />
    </View>
  );
};

export default AvailabilityScreen;
```

---

## Common Issues and Solutions

### Issue 1: "Invalid availability data format"
**Problem**: Frontend is not wrapping the data in `availabilityData` property.

**Wrong**:
```javascript
body: JSON.stringify([
  { dayOfWeek: "Monday", isAvailable: true, ... }
])
```

**Correct**:
```javascript
body: JSON.stringify({
  availabilityData: [
    { dayOfWeek: "Monday", isAvailable: true, ... }
  ]
})
```

### Issue 2: Time validation errors
**Problem**: Time format is not in 24-hour HH:MM format.

**Wrong**: `"9:00"`, `"1:30 PM"`, `"25:00"`  
**Correct**: `"09:00"`, `"13:30"`, `"23:00"`

### Issue 3: Cannot delete availability
**Problem**: Trying to delete a slot that has appointments scheduled.

**Solution**: The backend protects availability slots with appointments. You can only mark them as inactive by setting `availability_isActive: false`.

---

## Backend Behavior Notes

1. **Smart Updates**: The backend intelligently handles existing availability slots:
   - Slots **with appointments**: Updated in place (keeps appointment references)
   - Slots **without appointments**: Deleted and recreated
   
2. **Partial Updates**: You can send availability for specific days only; other days won't be affected.

3. **Inactive Days**: If `isAvailable: false`, the slot is stored as `availability_isActive: false` (disabled but not deleted).

4. **Appointment Safety**: The system prevents deletion of availability slots that have scheduled appointments to maintain data integrity.

---

## Testing Checklist

- [ ] Test with valid availability data (all 7 days)
- [ ] Test with partial availability data (some days)
- [ ] Test with invalid time format
- [ ] Test with end time before start time
- [ ] Test with missing `availabilityData` wrapper
- [ ] Test fetching existing availability
- [ ] Test updating existing availability
- [ ] Test with invalid/expired token
- [ ] Test deleting availability without appointments
- [ ] Test deleting availability with appointments (should fail)

---

## Support
If you encounter issues, check:
1. Request body has `availabilityData` property
2. Time format is HH:MM (24-hour)
3. JWT token is valid and includes provider role
4. All required fields are present
5. Backend logs for detailed error messages
