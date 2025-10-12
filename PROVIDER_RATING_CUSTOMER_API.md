# Provider Rating Customer API Documentation

## Overview

This endpoint allows **service providers** to rate **customers** after completing an appointment. Unlike customer ratings (which can include photos), provider ratings are limited to:
- ⭐ Rating value (1-5 stars) - **Required**
- 💬 Comment/description - **Optional**
- ❌ No photo upload support

## Endpoint Details

**POST** `/api/ratings/provider/rate-customer`

**Authentication:** Provider only (requires provider auth token)

**Content-Type:** `application/json`

---

## Request Body

```json
{
  "appointment_id": 123,
  "customer_id": 45,
  "rating_value": 5,
  "rating_comment": "Great customer! Very cooperative and easy to work with."
}
```

### Required Fields

- `appointment_id` (integer) - The appointment ID
- `customer_id` (integer) - The customer's user ID
- `rating_value` (integer) - Rating from 1 to 5 stars

### Optional Fields

- `rating_comment` (string) - Optional feedback about the customer

---

## Validation Rules

1. **Rating Value:**
   - Must be between 1 and 5
   - Required field

2. **Appointment Status:**
   - Appointment must have status `finished` (settled but not completed)
   - Provider must be the assigned provider for the appointment
   - Customer must be the assigned customer for the appointment

3. **Duplicate Prevention:**
   - Provider can only rate a customer once per appointment
   - Attempting to rate again will return an error

4. **No Photo Upload:**
   - Providers cannot upload photos when rating customers
   - `rating_photo` will always be null for provider ratings

---

## Success Response (201 Created)

```json
{
  "success": true,
  "message": "Customer rating created successfully",
  "data": {
    "id": 789,
    "rating_value": 5,
    "rating_comment": "Great customer! Very cooperative and easy to work with.",
    "rating_photo": null,
    "appointment_id": 123,
    "user_id": 45,
    "provider_id": 10,
    "rated_by": "provider",
    "created_at": "2025-10-13T10:30:00.000Z",
    "user": {
      "user_id": 45,
      "first_name": "John",
      "last_name": "Doe",
      "profile_photo": "https://example.com/profile.jpg"
    },
    "serviceProvider": {
      "provider_id": 10,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith"
    },
    "appointment": {
      "appointment_id": 123,
      "scheduled_date": "2025-10-10T14:00:00.000Z",
      "service": {
        "service_title": "Plumbing Repair"
      }
    }
  }
}
```

---

## Error Responses

### 400 Bad Request - Missing Fields

```json
{
  "success": false,
  "message": "Appointment ID, Customer ID, and rating value are required"
}
```

### 400 Bad Request - Invalid Rating Value

```json
{
  "success": false,
  "message": "Rating value must be between 1 and 5"
}
```

### 400 Bad Request - Already Rated

```json
{
  "success": false,
  "message": "You have already rated this customer for this appointment"
}
```

### 404 Not Found - Invalid Appointment

```json
{
  "success": false,
  "message": "Appointment not found or not finished, or you are not authorized to rate this appointment"
}
```

### 401 Unauthorized - Not Authenticated

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error while creating customer rating"
}
```

---

## Usage Examples

### Example 1: Rate Customer with Comment

```javascript
// React Native / Frontend
const rateCustomer = async (appointmentId, customerId, rating, comment) => {
  try {
    const response = await fetch('http://localhost:3000/api/ratings/provider/rate-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerToken}`
      },
      body: JSON.stringify({
        appointment_id: appointmentId,
        customer_id: customerId,
        rating_value: rating,
        rating_comment: comment
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Customer rated successfully!');
      console.log('Rating ID:', data.data.id);
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Usage
await rateCustomer(123, 45, 5, "Great customer! Very cooperative.");
```

### Example 2: Rate Customer Without Comment

```javascript
const response = await fetch('http://localhost:3000/api/ratings/provider/rate-customer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${providerToken}`
  },
  body: JSON.stringify({
    appointment_id: 123,
    customer_id: 45,
    rating_value: 4
    // No comment provided
  })
});
```

### Example 3: cURL Request

```bash
curl -X POST http://localhost:3000/api/ratings/provider/rate-customer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PROVIDER_TOKEN" \
  -d '{
    "appointment_id": 123,
    "customer_id": 45,
    "rating_value": 5,
    "rating_comment": "Excellent customer!"
  }'
```

---

## Related Endpoints

### Get Rateable Appointments (Provider)

**GET** `/api/ratings/provider/rateable-appointments`

Get list of appointments that the provider can rate (finished appointments not yet rated).

**Authentication:** Provider only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 123,
      "customer_id": 45,
      "scheduled_date": "2025-10-10T14:00:00.000Z",
      "appointment_status": "finished",
      "customer": {
        "user_id": 45,
        "first_name": "John",
        "last_name": "Doe",
        "profile_photo": "https://example.com/profile.jpg"
      },
      "service": {
        "service_title": "Plumbing Repair"
      }
    }
  ]
}
```

### Get Provider's Given Ratings

**GET** `/api/ratings/provider/given-ratings`

Get all ratings the provider has given to customers.

**Authentication:** Provider only

---

## Business Logic

### When Provider Rates Customer:

1. **Validation:**
   - Verify appointment exists and is in `finished` status
   - Verify provider is assigned to appointment
   - Verify customer matches appointment
   - Check if provider already rated this customer for this appointment
   - Validate rating value is 1-5

2. **Rating Creation:**
   - Create rating record with `rated_by: 'provider'`
   - Set `rating_photo: null` (no photo support)
   - Store optional comment if provided

3. **Update Customer Average:**
   - Recalculate customer's average rating from all provider ratings
   - Update customer's rating score (if stored in User model)

---

## Differences: Provider vs Customer Ratings

| Feature | Customer Rating Provider | Provider Rating Customer |
|---------|-------------------------|--------------------------|
| **Photo Upload** | ✅ Supported | ❌ Not supported |
| **Rating Value** | ✅ Required (1-5) | ✅ Required (1-5) |
| **Comment** | ✅ Optional | ✅ Optional |
| **Appointment Status** | `completed` | `finished` |
| **Endpoint** | `/api/ratings/create` | `/api/ratings/provider/rate-customer` |
| **Auth Required** | Customer token | Provider token |

---

## Database Schema

```prisma
model Rating {
  id              Int       @id @default(autoincrement())
  rating_value    Int       // 1-5 stars
  rating_comment  String?   // Optional feedback
  rating_photo    String?   // Always null for provider ratings
  appointment_id  Int
  user_id         Int       // Customer being rated
  provider_id     Int       // Provider giving the rating
  rated_by        String    // 'provider' for this endpoint
  created_at      DateTime  @default(now())
  
  appointment     Appointment
  user            User
  serviceProvider ServiceProviderDetails
}
```

---

## Testing

### Test Scenario 1: Successful Rating

```bash
# 1. Provider finishes appointment
# 2. Appointment status becomes 'finished'
# 3. Provider rates customer

curl -X POST http://localhost:3000/api/ratings/provider/rate-customer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROVIDER_TOKEN" \
  -d '{
    "appointment_id": 1,
    "customer_id": 2,
    "rating_value": 5,
    "rating_comment": "Professional and friendly customer"
  }'

# Expected: 201 Created with rating data
```

### Test Scenario 2: Duplicate Rating Prevention

```bash
# Try to rate the same customer/appointment again
curl -X POST http://localhost:3000/api/ratings/provider/rate-customer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROVIDER_TOKEN" \
  -d '{
    "appointment_id": 1,
    "customer_id": 2,
    "rating_value": 4
  }'

# Expected: 400 Bad Request - "You have already rated this customer for this appointment"
```

### Test Scenario 3: Invalid Rating Value

```bash
curl -X POST http://localhost:3000/api/ratings/provider/rate-customer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROVIDER_TOKEN" \
  -d '{
    "appointment_id": 1,
    "customer_id": 2,
    "rating_value": 6
  }'

# Expected: 400 Bad Request - "Rating value must be between 1 and 5"
```

---

## Frontend Integration

### React Native Component Example

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Rating } from 'react-native-ratings';

const RateCustomerScreen = ({ route, navigation }) => {
  const { appointmentId, customerId, customerName } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submitRating = async () => {
    if (!rating) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/ratings/provider/rate-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourProviderToken}`
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          customer_id: customerId,
          rating_value: rating,
          rating_comment: comment || null
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Customer rated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
        Rate Customer: {customerName}
      </Text>
      
      <Rating
        startingValue={rating}
        onFinishRating={setRating}
        imageSize={40}
        style={{ marginVertical: 20 }}
      />
      
      <TextInput
        placeholder="Add a comment (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 8,
          padding: 10,
          marginVertical: 10
        }}
      />
      
      <TouchableOpacity
        onPress={submitRating}
        disabled={loading}
        style={{
          backgroundColor: '#007AFF',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {loading ? 'Submitting...' : 'Submit Rating'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default RateCustomerScreen;
```

---

## Common Issues & Solutions

### Issue 1: "Appointment not found"
**Cause:** Appointment status is not `finished`
**Solution:** Ensure appointment is in `finished` status before allowing provider to rate

### Issue 2: "Already rated"
**Cause:** Provider already rated this customer for this appointment
**Solution:** Check if rating exists before showing rating form

### Issue 3: Authentication errors
**Cause:** Invalid or expired provider token
**Solution:** Verify provider token is valid and user is authenticated as provider

---

## Best Practices

1. **Check Before Rating:**
   - First call `GET /api/ratings/provider/rateable-appointments` to get list of appointments that can be rated
   - Only show rating option for appointments in returned list

2. **Validate on Frontend:**
   - Validate rating value (1-5) before submitting
   - Show clear error messages for validation failures

3. **User Experience:**
   - Make comment optional but encourage providers to leave feedback
   - Show loading state while submitting
   - Navigate back or show success message after rating

4. **Error Handling:**
   - Handle network errors gracefully
   - Show user-friendly error messages
   - Allow retry on failure

---

## Summary

✅ **Endpoint:** `POST /api/ratings/provider/rate-customer`
✅ **Auth:** Provider token required
✅ **Required:** appointment_id, customer_id, rating_value (1-5)
✅ **Optional:** rating_comment (text description)
❌ **Not Supported:** Photo upload (rating_photo always null)
✅ **Status Required:** Appointment must be 'finished'
✅ **One Rating Per Appointment:** Duplicate prevention enforced

This endpoint allows providers to give feedback about customer behavior, cooperation, and overall experience after completing a service.
