# 📅 Availability By Date - Quick Reference

## What Is This?

This endpoint lets providers **block or unblock specific dates** on their calendar (like taking October 15th off for vacation).

## Endpoint

```
PUT /api/availability/date
```

## When To Use This

✅ **Use this when:**
- Taking a specific day off (vacation, sick day, personal day)
- Blocking out a holiday
- Marking yourself unavailable for a specific date
- Re-enabling a previously blocked date

❌ **Don't use this for:**
- Setting up your weekly schedule (use `POST /api/availability` instead)
- Changing your regular Monday hours (use `PUT /api/availability/:availabilityId` instead)

---

## Request Format

```typescript
{
  "date": "2025-10-15",    // Required: YYYY-MM-DD format
  "isActive": false        // Required: false = blocked, true = available
}
```

---

## Examples

### Block a Specific Date (Take a Day Off)

```javascript
const blockDate = async (date) => {
  const token = await AsyncStorage.getItem('token');
  
  const response = await fetch('http://your-api.com/api/availability/date', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      date: date,           // e.g., "2025-10-15"
      isActive: false       // false = NOT available (blocked)
    })
  });

  return await response.json();
};

// Usage:
await blockDate("2025-10-15");  // Block October 15, 2025
```

### Unblock a Previously Blocked Date

```javascript
const unblockDate = async (date) => {
  const token = await AsyncStorage.getItem('token');
  
  const response = await fetch('http://your-api.com/api/availability/date', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      date: date,
      isActive: true        // true = available again
    })
  });

  return await response.json();
};

// Usage:
await unblockDate("2025-10-20");  // Make October 20 available again
```

### Block Multiple Dates (Vacation Week)

```javascript
const blockVacationDates = async (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  for (const date of dates) {
    await blockDate(date);
  }
};

// Usage: Block December 20-27 (vacation week)
await blockVacationDates("2025-12-20", "2025-12-27");
```

---

## Success Response

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

---

## Error Responses

### Missing Date
```json
{
  "message": "Date is required (format: YYYY-MM-DD)"
}
```
**Fix**: Add `date` field to request body.

### Invalid Date Format
```json
{
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```
**Fix**: Use format `"2025-10-15"`, not `"10/15/2025"` or `"15-10-2025"`.

### Missing isActive
```json
{
  "message": "isActive must be a boolean (true or false)"
}
```
**Fix**: Add `isActive: true` or `isActive: false` to request body.

### No Availability Found
```json
{
  "message": "No availability found for Sunday. Please create availability first.",
  "dayOfWeek": "Sunday"
}
```
**Fix**: You need to set up your weekly availability schedule first using `POST /api/availability`.

---

## React Native Calendar Integration

```typescript
import React, { useState } from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BlockDatesScreen = () => {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const API_BASE_URL = 'http://your-api.com';

  const updateDateAvailability = async (date, isAvailable) => {
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
        Alert.alert(
          'Success',
          `${date} marked as ${isAvailable ? 'available' : 'unavailable'}`
        );
        
        // Update calendar UI
        setMarkedDates(prev => ({
          ...prev,
          [date]: {
            marked: true,
            dotColor: isAvailable ? 'green' : 'red',
            selected: true,
            selectedColor: isAvailable ? '#4CAF50' : '#F44336'
          }
        }));
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        minDate={new Date().toISOString().split('T')[0]}
        theme={{
          selectedDayBackgroundColor: '#2196F3',
          todayTextColor: '#2196F3',
          arrowColor: '#2196F3',
        }}
      />

      {selectedDate && (
        <View style={styles.buttonContainer}>
          <Button
            title={`Block ${selectedDate}`}
            onPress={() => updateDateAvailability(selectedDate, false)}
            color="#F44336"
          />
          <View style={{ height: 10 }} />
          <Button
            title={`Unblock ${selectedDate}`}
            onPress={() => updateDateAvailability(selectedDate, true)}
            color="#4CAF50"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10
  },
  buttonContainer: {
    marginTop: 20,
    padding: 10
  }
});

export default BlockDatesScreen;
```

---

## Testing

### Test with curl:

**Block a date:**
```bash
curl -X PUT http://localhost:3000/api/availability/date \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-10-15","isActive":false}'
```

**Unblock a date:**
```bash
curl -X PUT http://localhost:3000/api/availability/date \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-10-15","isActive":true}'
```

---

## Important Notes

1. **You must set up weekly availability first** before using this endpoint. If you haven't created your weekly schedule (Monday-Sunday), this endpoint will return an error.

2. **Date format must be YYYY-MM-DD**. Other formats like `MM/DD/YYYY` or `DD-MM-YYYY` will be rejected.

3. **isActive is required** and must be a boolean (`true` or `false`), not a string `"true"` or `"false"`.

4. **The system automatically calculates the day of week** from the date you provide.

5. **This updates the availability for the day of the week**, so if you block "2025-10-15" (a Sunday), it affects your Sunday availability slot.

---

## Common Mistakes

### ❌ Wrong: Sending without isActive
```javascript
body: JSON.stringify({
  date: "2025-10-15"
  // Missing isActive!
})
```

### ✅ Correct:
```javascript
body: JSON.stringify({
  date: "2025-10-15",
  isActive: false
})
```

### ❌ Wrong: String boolean
```javascript
body: JSON.stringify({
  date: "2025-10-15",
  isActive: "false"  // ❌ String, not boolean
})
```

### ✅ Correct:
```javascript
body: JSON.stringify({
  date: "2025-10-15",
  isActive: false  // ✅ Boolean
})
```

### ❌ Wrong: Date format
```javascript
body: JSON.stringify({
  date: "10/15/2025",  // ❌ Wrong format
  isActive: false
})
```

### ✅ Correct:
```javascript
body: JSON.stringify({
  date: "2025-10-15",  // ✅ YYYY-MM-DD
  isActive: false
})
```

---

## Related Endpoints

- **Set up weekly schedule**: `POST /api/availability` (do this first!)
- **View all availability**: `GET /api/availability`
- **Change regular hours**: `PUT /api/availability/:availabilityId`

See full documentation: `AVAILABILITY_API_INTEGRATION_GUIDE.md`
