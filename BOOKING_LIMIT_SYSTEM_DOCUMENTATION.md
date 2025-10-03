# Booking Limit System Documentation

## Overview
The booking limit system restricts customers to a maximum of **3 scheduled appointments** at any given time. This prevents appointment hoarding and ensures fair access to service providers for all customers.

## Base URL
```
http://localhost:3000/auth
```

---

## How It Works

### Appointment Status Flow

```
Scheduled Status (Counts toward limit):
└── scheduled      ← Counts toward 3-appointment limit

Non-Scheduled Statuses (Don't count toward limit):
├── on the way     ← Provider is traveling to location
├── in-progress    ← Service has started
├── finished       ← Service work completed
├── completed      ← Final completion status
└── cancelled      ← Appointment was cancelled
```

### Booking Limit Logic

1. **Customer has 0-2 "scheduled" appointments** → ✅ Can book more
2. **Customer has 3 "scheduled" appointments** → ❌ Cannot book until one changes status
3. **When an appointment status changes from "scheduled" to:**
   - `on the way`, `in-progress`, `finished`, `completed`, or `cancelled` 
   - → The slot becomes available again (counter decrements)
   - → Customer can book a new appointment

### Example Scenario

```
Initial State:
├── Appointment 1: scheduled (counts)
├── Appointment 2: scheduled (counts)  
├── Appointment 3: scheduled (counts)
└── Available slots: 0/3 ❌ Cannot book

Provider marks Appointment 2 as "on the way":
├── Appointment 1: scheduled (counts)
├── Appointment 2: on the way (doesn't count)
├── Appointment 3: scheduled (counts)
└── Available slots: 1/3 ✅ Can book 1 more

Customer books Appointment 4:
├── Appointment 1: scheduled (counts)
├── Appointment 2: on the way (doesn't count)
├── Appointment 3: scheduled (counts)
├── Appointment 4: scheduled (counts)
└── Available slots: 0/3 ❌ Cannot book

Provider marks Appointment 1 as "in-progress":
├── Appointment 1: in-progress (doesn't count)
├── Appointment 2: on the way (doesn't count)
├── Appointment 3: scheduled (counts)
├── Appointment 4: scheduled (counts)
└── Available slots: 1/3 ✅ Can book 1 more
```

---

## API Endpoints

### 1. Create Appointment (With Limit Check)

Creates a new appointment if the customer hasn't reached the booking limit.

**Endpoint:** `POST /auth/appointments`

**Authentication:** Required (Customer token)

**Request Body:**
```json
{
  "provider_id": 123,
  "service_id": 456,
  "scheduled_date": "2025-10-15",
  "scheduled_time": "09:00",
  "repairDescription": "AC not cooling properly"
}
```

**Request Example:**
```http
POST /auth/appointments
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "provider_id": 123,
  "service_id": 456,
  "scheduled_date": "2025-10-15",
  "scheduled_time": "09:00",
  "repairDescription": "AC repair needed"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "appointment_id": 789,
    "customer_id": 1,
    "provider_id": 123,
    "service_id": 456,
    "appointment_status": "Pending",
    "scheduled_date": "2025-10-15T09:00:00.000Z",
    "repairDescription": "AC repair needed",
    "created_at": "2025-10-03T10:30:00.000Z",
    "customer": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "serviceProvider": {
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "+0987654321"
    },
    "service": {
      "service_id": 456,
      "service_title": "Air Conditioning Repair",
      "service_description": "Professional AC repair services",
      "service_startingprice": 50.00
    }
  }
}
```

**Error Response - Booking Limit Reached (400):**
```json
{
  "success": false,
  "message": "Booking limit reached. You can only have 3 scheduled appointments at a time. Please wait for one of your appointments to change status (on the way, in-progress, completed, or cancelled) before booking again.",
  "currentScheduledCount": 3,
  "maxAllowed": 3
}
```

**Other Error Responses:**

```json
// Missing required fields
{
  "success": false,
  "message": "All required fields must be provided"
}

// Time slot not available
{
  "success": false,
  "message": "Selected time slot is not available"
}

// Time slot already booked
{
  "success": false,
  "message": "This time slot is already booked"
}
```

---

### 2. Get Customer Booking Availability

Check how many appointment slots are available for the customer.

**Endpoint:** `GET /auth/customer-booking-availability`

**Authentication:** Required (Customer token)

**Request Example:**
```http
GET /auth/customer-booking-availability
Authorization: Bearer <customer_token>
```

**Success Response (200):**

**Case 1: Customer has available slots**
```json
{
  "success": true,
  "message": "Booking availability retrieved successfully",
  "data": {
    "canBook": true,
    "scheduledCount": 1,
    "maxAllowed": 3,
    "availableSlots": 2,
    "message": "You can book 2 more appointments",
    "scheduledAppointments": [
      {
        "appointment_id": 123,
        "status": "Pending",
        "scheduled_date": "2025-10-10T14:00:00.000Z",
        "service_title": "Plumbing Repair",
        "provider_name": "Mike Johnson"
      }
    ]
  }
}
```

**Case 2: Customer has reached the limit**
```json
{
  "success": true,
  "message": "Booking availability retrieved successfully",
  "data": {
    "canBook": false,
    "scheduledCount": 3,
    "maxAllowed": 3,
    "availableSlots": 0,
    "message": "Booking limit reached. Please wait for an appointment to be completed or cancelled.",
    "scheduledAppointments": [
      {
        "appointment_id": 123,
        "status": "Pending",
        "scheduled_date": "2025-10-10T14:00:00.000Z",
        "service_title": "Plumbing Repair",
        "provider_name": "Mike Johnson"
      },
      {
        "appointment_id": 124,
        "status": "Confirmed",
        "scheduled_date": "2025-10-12T10:00:00.000Z",
        "service_title": "Electrical Work",
        "provider_name": "Sarah Lee"
      },
      {
        "appointment_id": 125,
        "status": "Accepted",
        "scheduled_date": "2025-10-15T16:00:00.000Z",
        "service_title": "AC Repair",
        "provider_name": "Tom Brown"
      }
    ]
  }
}
```

**Case 3: Customer has no scheduled appointments**
```json
{
  "success": true,
  "message": "Booking availability retrieved successfully",
  "data": {
    "canBook": true,
    "scheduledCount": 0,
    "maxAllowed": 3,
    "availableSlots": 3,
    "message": "You can book 3 more appointments",
    "scheduledAppointments": []
  }
}
```

**Response Fields Explanation:**

| Field | Type | Description |
|-------|------|-------------|
| `canBook` | boolean | Whether customer can book new appointments |
| `scheduledCount` | number | Current number of scheduled appointments |
| `maxAllowed` | number | Maximum allowed scheduled appointments (always 3) |
| `availableSlots` | number | Number of available booking slots remaining |
| `message` | string | User-friendly message about booking status |
| `scheduledAppointments` | array | List of current scheduled appointments |

---

## Frontend Integration

### React Native Example - Check Before Booking

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BookingScreen = ({ navigation }) => {
  const [bookingStatus, setBookingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:3000';

  useEffect(() => {
    checkBookingAvailability();
  }, []);

  const checkBookingAvailability = async () => {
    try {
      const token = await AsyncStorage.getItem('customerToken');

      const response = await fetch(`${API_URL}/auth/customer-booking-availability`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setBookingStatus(data.data);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      Alert.alert('Error', 'Failed to check booking availability');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = () => {
    if (!bookingStatus?.canBook) {
      Alert.alert(
        'Booking Limit Reached',
        bookingStatus?.message || 'You have reached the maximum number of scheduled appointments.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to booking form
    navigation.navigate('BookingForm');
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Book Appointment
      </Text>

      {/* Booking Status Card */}
      <View style={{ 
        backgroundColor: bookingStatus?.canBook ? '#e8f5e9' : '#ffebee',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>
          Booking Status
        </Text>
        <Text>
          {bookingStatus?.message}
        </Text>
        <Text style={{ marginTop: 10 }}>
          Available Slots: {bookingStatus?.availableSlots} / {bookingStatus?.maxAllowed}
        </Text>
      </View>

      {/* Current Scheduled Appointments */}
      {bookingStatus?.scheduledAppointments?.length > 0 && (
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Your Scheduled Appointments ({bookingStatus.scheduledCount})
          </Text>
          <FlatList
            data={bookingStatus.scheduledAppointments}
            keyExtractor={(item) => item.appointment_id.toString()}
            renderItem={({ item }) => (
              <View style={{ 
                backgroundColor: '#f5f5f5',
                padding: 10,
                marginBottom: 10,
                borderRadius: 5
              }}>
                <Text style={{ fontWeight: 'bold' }}>
                  {item.service_title}
                </Text>
                <Text>Provider: {item.provider_name}</Text>
                <Text>Status: {item.status}</Text>
                <Text>Date: {new Date(item.scheduled_date).toLocaleString()}</Text>
              </View>
            )}
          />
        </View>
      )}

      {/* Book Button */}
      <Button
        title={bookingStatus?.canBook ? "Book New Appointment" : "Limit Reached"}
        onPress={handleBookAppointment}
        disabled={!bookingStatus?.canBook}
        color={bookingStatus?.canBook ? 'blue' : 'gray'}
      />

      {/* Refresh Button */}
      <Button
        title="Refresh Status"
        onPress={checkBookingAvailability}
        color="green"
      />
    </View>
  );
};

export default BookingScreen;
```

### React Native Example - Create Appointment with Error Handling

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BookingFormScreen = ({ route, navigation }) => {
  const { providerId, serviceId } = route.params;
  
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3000';

  const createAppointment = async () => {
    if (!scheduledDate || !scheduledTime) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('customerToken');

      const response = await fetch(`${API_URL}/auth/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider_id: providerId,
          service_id: serviceId,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          repairDescription: repairDescription
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Success',
          'Appointment booked successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('MyAppointments')
            }
          ]
        );
      } else {
        // Handle booking limit error
        if (data.currentScheduledCount >= 3) {
          Alert.alert(
            'Booking Limit Reached',
            data.message,
            [
              { text: 'View My Appointments', onPress: () => navigation.navigate('MyAppointments') },
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert('Error', data.message);
        }
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert('Error', 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Book Appointment
      </Text>

      <TextInput
        placeholder="Date (YYYY-MM-DD)"
        value={scheduledDate}
        onChangeText={setScheduledDate}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Time (HH:MM)"
        value={scheduledTime}
        onChangeText={setScheduledTime}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Repair Description (optional)"
        value={repairDescription}
        onChangeText={setRepairDescription}
        multiline
        numberOfLines={4}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, height: 100 }}
      />

      <Button
        title={loading ? "Booking..." : "Confirm Booking"}
        onPress={createAppointment}
        disabled={loading}
      />
    </View>
  );
};

export default BookingFormScreen;
```

### Display Booking Limit Warning

```javascript
import React from 'react';
import { View, Text } from 'react-native';

const BookingLimitWarning = ({ scheduledCount, maxAllowed }) => {
  const availableSlots = maxAllowed - scheduledCount;
  
  // Show warning when 2 or 3 slots are filled
  if (scheduledCount >= 2) {
    return (
      <View style={{
        backgroundColor: scheduledCount >= 3 ? '#ffebee' : '#fff3e0',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: scheduledCount >= 3 ? '#f44336' : '#ff9800'
      }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
          {scheduledCount >= 3 ? '⚠️ Booking Limit Reached' : '⚠️ Booking Limit Warning'}
        </Text>
        <Text>
          {scheduledCount >= 3
            ? 'You have reached the maximum of 3 scheduled appointments. Please wait for one to be completed or cancelled before booking again.'
            : `You have ${availableSlots} appointment slot${availableSlots !== 1 ? 's' : ''} remaining.`
          }
        </Text>
      </View>
    );
  }

  return null;
};

export default BookingLimitWarning;
```

---

## Testing the System

### Using cURL

**1. Check Booking Availability:**
```bash
curl -X GET http://localhost:3000/auth/customer-booking-availability \
  -H "Authorization: Bearer <customer_token>"
```

**2. Create Appointment (When Under Limit):**
```bash
curl -X POST http://localhost:3000/auth/appointments \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": 123,
    "service_id": 456,
    "scheduled_date": "2025-10-15",
    "scheduled_time": "09:00",
    "repairDescription": "AC repair needed"
  }'
```

**3. Try Creating Appointment (When At Limit):**
```bash
# This should return an error when you have 3 scheduled appointments
curl -X POST http://localhost:3000/auth/appointments \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": 123,
    "service_id": 456,
    "scheduled_date": "2025-10-15",
    "scheduled_time": "10:00",
    "repairDescription": "Another service"
  }'
```

### Testing Scenarios

**Scenario 1: Fresh Customer (No Appointments)**
```
1. Call GET /customer-booking-availability
   → scheduledCount: 0, availableSlots: 3, canBook: true
2. Book 1st appointment → Success
3. Call GET /customer-booking-availability
   → scheduledCount: 1, availableSlots: 2, canBook: true
```

**Scenario 2: Approaching Limit**
```
1. Customer has 2 scheduled appointments
2. Call GET /customer-booking-availability
   → scheduledCount: 2, availableSlots: 1, canBook: true
3. Book 3rd appointment → Success
4. Call GET /customer-booking-availability
   → scheduledCount: 3, availableSlots: 0, canBook: false
```

**Scenario 3: At Limit - Try to Book**
```
1. Customer has 3 scheduled appointments
2. Try to book 4th appointment → Error 400
   {
     "message": "Booking limit reached...",
     "currentScheduledCount": 3,
     "maxAllowed": 3
   }
```

**Scenario 4: Freeing Up a Slot**
```
1. Customer has 3 "scheduled" appointments (Limit reached)
2. Provider marks one appointment as "on the way"
3. Call GET /customer-booking-availability
   → scheduledCount: 2, availableSlots: 1, canBook: true
4. Book new appointment → Success
```

**Scenario 5: Cancellation Frees Slot**
```
1. Customer has 3 "scheduled" appointments
2. Customer cancels one appointment
3. Status changes from "scheduled" to "cancelled"
4. Call GET /customer-booking-availability
   → scheduledCount: 2, availableSlots: 1, canBook: true
```

---

## UX/UI Recommendations

### 1. Booking Button States

```javascript
// Disable booking button when limit reached
<Button
  title={canBook ? "Book Appointment" : "Booking Limit Reached (3/3)"}
  disabled={!canBook}
  style={{
    backgroundColor: canBook ? '#4CAF50' : '#9E9E9E',
    opacity: canBook ? 1 : 0.6
  }}
/>
```

### 2. Progress Indicator

```javascript
// Visual progress bar
<View style={{ marginVertical: 15 }}>
  <Text>Appointment Slots: {scheduledCount}/3</Text>
  <View style={{
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 5
  }}>
    <View style={{
      height: '100%',
      width: `${(scheduledCount / 3) * 100}%`,
      backgroundColor: scheduledCount >= 3 ? '#f44336' : '#4CAF50'
    }} />
  </View>
</View>
```

### 3. Alert Messages

```javascript
// Color-coded alerts
const getAlertColor = (count) => {
  if (count >= 3) return '#ffebee'; // Red - Limit reached
  if (count === 2) return '#fff3e0'; // Orange - Warning
  return '#e8f5e9'; // Green - Available
};

const getAlertMessage = (count, available) => {
  if (count >= 3) {
    return '🔴 You have reached your booking limit (3/3). Complete or cancel an appointment to book more.';
  }
  if (count === 2) {
    return '🟡 You have 1 slot remaining. Book wisely!';
  }
  return `🟢 You can book ${available} more appointment${available !== 1 ? 's' : ''}.`;
};
```

### 4. Scheduled Appointments List

```javascript
// Show which appointments are counting toward limit
const AppointmentItem = ({ appointment }) => {
  const isScheduled = appointment.status === 'scheduled';

  return (
    <View style={{
      padding: 10,
      backgroundColor: isScheduled ? '#fff3e0' : '#f5f5f5',
      borderRadius: 5,
      marginBottom: 10
    }}>
      <Text style={{ fontWeight: 'bold' }}>
        {appointment.service_title}
        {isScheduled && ' ⚠️ (Counts toward limit)'}
      </Text>
      <Text>Status: {appointment.status}</Text>
      <Text>Date: {formatDate(appointment.scheduled_date)}</Text>
    </View>
  );
};
```

---

## Business Logic Summary

### Counting Rules
- ✅ **Counts toward limit:** `scheduled` (only this status)
- ❌ **Doesn't count:** `on the way`, `in-progress`, `finished`, `completed`, `cancelled`

### Automatic Slot Release
- When appointment status changes from `scheduled` → any other status
- Counter automatically decrements
- Customer can immediately book again

### Benefits
1. **Fair Access:** Prevents customers from hoarding appointment slots
2. **Provider Efficiency:** Ensures providers' schedules aren't blocked unnecessarily
3. **Better Planning:** Customers are encouraged to manage their appointments
4. **System Stability:** Prevents database overload with excessive bookings

---

## Troubleshooting

### Issue: Customer says they can't book but they should be able to

**Solution:**
1. Check their current scheduled appointments:
   ```sql
   SELECT * FROM Appointment 
   WHERE customer_id = <customer_id>
   AND appointment_status = 'scheduled';
   ```
2. Verify appointment statuses are being updated correctly
3. Call the availability endpoint to see the system's current count

### Issue: Slot doesn't free up after status change

**Solution:**
1. Verify the status changed to a non-scheduled status
2. Check database directly for status value
3. Ensure status is exactly one of the recognized values (case-sensitive in some queries)

### Issue: Frontend shows different count than backend

**Solution:**
1. Ensure frontend is calling `/customer-booking-availability` endpoint
2. Don't cache the booking status - always fetch fresh data before booking
3. Refresh status after any appointment action (book, cancel, status change)

---

## Future Enhancements

### Potential Improvements

1. **Configurable Limit**
   - Allow admins to change limit per customer or globally
   - Different limits for verified vs. unverified customers

2. **Priority Booking**
   - Premium customers get higher limits
   - Loyal customers earn extra slots

3. **Time-Based Rules**
   - Different limits for peak vs. off-peak hours
   - Weekend vs. weekday limits

4. **Notification System**
   - Email when slot becomes available
   - Push notification when limit is reached

5. **Analytics**
   - Track how often customers hit the limit
   - Optimize limit based on completion rates

---

## API Testing Checklist

- [ ] Customer with 0 appointments can book
- [ ] Customer with 1 appointment can book
- [ ] Customer with 2 appointments can book
- [ ] Customer with 3 appointments **cannot** book
- [ ] Error message is clear when limit reached
- [ ] Booking availability endpoint returns correct count
- [ ] Status change from "Pending" to "In Progress" frees slot
- [ ] Cancellation frees up a slot
- [ ] Completion frees up a slot
- [ ] Multiple customers can each have 3 appointments
- [ ] Concurrent booking attempts handle limit correctly

---

**Last Updated:** October 3, 2025  
**Feature Version:** 1.0  
**Documentation Version:** 1.0
