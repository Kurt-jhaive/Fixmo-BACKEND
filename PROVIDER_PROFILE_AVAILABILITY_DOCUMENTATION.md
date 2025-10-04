# Provider Profile & Availability Management API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Get Detailed Provider Profile](#get-detailed-provider-profile)
4. [Update Availability by Date](#update-availability-by-date)
5. [Error Handling](#error-handling)
6. [Integration Examples](#integration-examples)

---

## Overview

This documentation covers two new endpoints designed to enhance provider profile management and availability control:

1. **Get Detailed Provider Profile** - Retrieve comprehensive provider information including certificates, professions, and ratings
2. **Update Availability by Date** - Easily toggle availability on/off for specific dates without needing to know availability IDs

Both endpoints use **JWT token authentication** for secure access.

---

## Authentication

All endpoints in this documentation require JWT authentication via Bearer token.

### Headers Required
```http
Authorization: Bearer <JWT_TOKEN>
```

### How to Get JWT Token
Users receive a JWT token after successful login via:
- `POST /auth/provider-login` (Service Provider Login)

The token contains the provider's ID and is valid for 30 days.

---

## Get Detailed Provider Profile

### Endpoint
```http
GET /auth/profile-detailed
```

### Description
Retrieves comprehensive provider profile information including basic details, certificates, professions, and recent ratings. This endpoint decodes the JWT token to identify the provider, so no additional parameters are needed.

### Authentication
- **Required**: Yes (JWT Bearer Token)
- **User Type**: Service Provider only

### Request Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Request Parameters
None required - Provider ID is extracted from JWT token

### Response Format

#### Success Response (200 OK)
```json
{
  "message": "Provider profile retrieved successfully",
  "provider": {
    "provider_id": 1,
    "provider_first_name": "John",
    "provider_last_name": "Doe",
    "provider_userName": "johndoe_plumber",
    "provider_email": "john.doe@example.com",
    "provider_phone_number": "+63 912 345 6789",
    "provider_profile_photo": "https://res.cloudinary.com/xxx/profile.jpg",
    "provider_valid_id": "https://res.cloudinary.com/xxx/valid_id.jpg",
    "provider_isVerified": true,
    "verification_status": "approved",
    "rejection_reason": null,
    "verification_submitted_at": "2025-09-15T10:30:00.000Z",
    "verification_reviewed_at": "2025-09-16T14:20:00.000Z",
    "provider_rating": 4.8,
    "provider_location": "Manila, Philippines",
    "provider_exact_location": "Makati City",
    "provider_uli": "ULI-2025-001234",
    "provider_birthday": "1990-05-15",
    "created_at": "2025-09-01T08:00:00.000Z",
    "provider_isActivated": true,
    "ratings_count": 47,
    "certificates": [
      {
        "certificate_id": 1,
        "certificate_name": "Master Plumber License",
        "certificate_number": "PL-2020-12345",
        "certificate_file_path": "https://res.cloudinary.com/xxx/certificate1.pdf",
        "expiry_date": "2026-12-31"
      },
      {
        "certificate_id": 2,
        "certificate_name": "Safety Training Certificate",
        "certificate_number": "ST-2023-67890",
        "certificate_file_path": "https://res.cloudinary.com/xxx/certificate2.jpg",
        "expiry_date": "2025-12-31"
      }
    ],
    "professions": [
      {
        "id": 1,
        "profession": "Plumber",
        "experience": "10 years"
      },
      {
        "id": 2,
        "profession": "Electrician",
        "experience": "5 years"
      }
    ],
    "recent_ratings": [
      {
        "rating_id": 101,
        "rating": 5,
        "comment": "Excellent service! Very professional and quick.",
        "created_at": "2025-10-01T15:30:00.000Z",
        "customer": {
          "user_id": 50,
          "first_name": "Maria",
          "last_name": "Santos",
          "profile_photo": "https://res.cloudinary.com/xxx/customer50.jpg"
        }
      },
      {
        "rating_id": 98,
        "rating": 4,
        "comment": "Good work, arrived on time.",
        "created_at": "2025-09-28T10:15:00.000Z",
        "customer": {
          "user_id": 45,
          "first_name": "Carlos",
          "last_name": "Reyes",
          "profile_photo": "https://res.cloudinary.com/xxx/customer45.jpg"
        }
      }
    ]
  }
}
```

#### Error Responses

**401 Unauthorized** - Invalid or missing JWT token
```json
{
  "message": "Authentication required"
}
```

**404 Not Found** - Provider not found in database
```json
{
  "message": "Provider not found"
}
```

**500 Internal Server Error**
```json
{
  "message": "Server error retrieving provider profile"
}
```

### Response Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `provider_id` | Integer | Unique provider identifier |
| `provider_first_name` | String | Provider's first name |
| `provider_last_name` | String | Provider's last name |
| `provider_userName` | String | Unique username |
| `provider_email` | String | Provider's email address |
| `provider_phone_number` | String | Contact phone number |
| `provider_profile_photo` | String/URL | Cloudinary URL of profile photo |
| `provider_valid_id` | String/URL | Cloudinary URL of valid ID document |
| `provider_isVerified` | Boolean | Whether admin has verified the provider |
| `verification_status` | String | Status: "pending", "approved", or "rejected" |
| `rejection_reason` | String/Null | Admin's reason if rejected |
| `provider_rating` | Number | Average rating (0-5) |
| `provider_location` | String | General location (city/region) |
| `provider_exact_location` | String | More specific location |
| `provider_uli` | String | Unified License Identifier |
| `provider_birthday` | String/Date | Date of birth |
| `provider_isActivated` | Boolean | Whether provider account is active |
| `ratings_count` | Integer | Total number of ratings received |
| `certificates` | Array | List of all certificates with details |
| `professions` | Array | List of professions with experience |
| `recent_ratings` | Array | Latest 10 customer ratings with details |

### Use Cases

1. **Provider Dashboard**: Display comprehensive profile information
2. **Mobile App Profile Screen**: Show all provider credentials and ratings
3. **Profile Verification**: Review all uploaded documents and information
4. **Customer Decision Making**: View provider's qualifications before booking

### Example Request (JavaScript)
```javascript
const token = localStorage.getItem('provider_token');

fetch('https://api.yourapp.com/auth/profile-detailed', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Provider Profile:', data.provider);
  console.log('Total Ratings:', data.provider.ratings_count);
  console.log('Certificates:', data.provider.certificates);
})
.catch(error => console.error('Error:', error));
```

### Example Request (React Native)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const getDetailedProfile = async () => {
  try {
    const token = await AsyncStorage.getItem('provider_token');
    
    const response = await fetch(
      'https://api.yourapp.com/auth/profile-detailed',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Profile loaded:', data.provider);
      return data.provider;
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

---

## Update Availability by Date

### Endpoint
```http
PUT /auth/availability/date
```

### Description
Update provider availability status for a specific date. The system automatically calculates the day of the week from the provided date and updates the corresponding availability record. This is more user-friendly than the traditional approach of updating by `availability_id`.

### Authentication
- **Required**: Yes (JWT Bearer Token)
- **User Type**: Service Provider only

### Request Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Request Body
```json
{
  "date": "2025-10-15",
  "isActive": false
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | String | Yes | Date in YYYY-MM-DD format |
| `isActive` | Boolean | Yes | `true` = available, `false` = unavailable |
| `dayOfWeek` | String | No | Optional override (e.g., "Monday") |

### How It Works

1. **Provider provides a date** (e.g., "2025-10-15")
2. **System calculates day of week** (e.g., "Wednesday")
3. **System finds availability record** for that provider and day
4. **Updates `availability_isActive` flag** to enable/disable availability

### Response Format

#### Success Response (200 OK)
```json
{
  "message": "Availability for 2025-10-15 (Wednesday) updated successfully",
  "date": "2025-10-15",
  "dayOfWeek": "Wednesday",
  "isActive": false,
  "availability": {
    "availability_id": 7,
    "dayOfWeek": "Wednesday",
    "startTime": "09:00",
    "endTime": "17:00",
    "availability_isActive": false
  }
}
```

#### Error Responses

**400 Bad Request** - Missing or invalid parameters
```json
{
  "message": "Date is required (format: YYYY-MM-DD)"
}
```

```json
{
  "message": "isActive must be a boolean (true or false)"
}
```

```json
{
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

**401 Unauthorized** - Invalid or missing JWT token
```json
{
  "message": "Unauthorized"
}
```

**404 Not Found** - No availability record exists
```json
{
  "message": "No availability found for Wednesday. Please create availability first.",
  "dayOfWeek": "Wednesday"
}
```

```json
{
  "message": "Provider not found"
}
```

**500 Internal Server Error**
```json
{
  "message": "Internal server error"
}
```

### Use Cases

#### 1. Mark Unavailable for Specific Date
Provider wants to mark themselves unavailable for October 15, 2025 (maybe taking a day off).

**Request:**
```json
{
  "date": "2025-10-15",
  "isActive": false
}
```

**Response:**
```json
{
  "message": "Availability for 2025-10-15 (Wednesday) updated successfully",
  "date": "2025-10-15",
  "dayOfWeek": "Wednesday",
  "isActive": false,
  "availability": {
    "availability_id": 7,
    "dayOfWeek": "Wednesday",
    "startTime": "09:00",
    "endTime": "17:00",
    "availability_isActive": false
  }
}
```

#### 2. Re-enable Availability
Provider wants to become available again for Wednesdays.

**Request:**
```json
{
  "date": "2025-10-22",
  "isActive": true
}
```

**Response:**
```json
{
  "message": "Availability for 2025-10-22 (Wednesday) updated successfully",
  "date": "2025-10-22",
  "dayOfWeek": "Wednesday",
  "isActive": true,
  "availability": {
    "availability_id": 7,
    "dayOfWeek": "Wednesday",
    "startTime": "09:00",
    "endTime": "17:00",
    "availability_isActive": true
  }
}
```

### Example Request (JavaScript)
```javascript
const token = localStorage.getItem('provider_token');

const updateAvailability = async (date, isActive) => {
  const response = await fetch(
    'https://api.yourapp.com/auth/availability/date',
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: date,
        isActive: isActive
      })
    }
  );
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('Availability updated:', data.message);
  } else {
    console.error('Error:', data.message);
  }
};

// Mark unavailable for October 15
updateAvailability('2025-10-15', false);
```

### Example Request (React Native)
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const toggleAvailability = async (selectedDate, availabilityStatus) => {
  try {
    const token = await AsyncStorage.getItem('provider_token');
    
    const response = await fetch(
      'https://api.yourapp.com/auth/provider/availability/date',
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          isActive: availabilityStatus
        })
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      Alert.alert('Success', data.message);
      return data.availability;
    } else {
      Alert.alert('Error', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
    Alert.alert('Error', 'Failed to update availability');
  }
};

// Usage in component
<Button
  title="Mark Unavailable"
  onPress={() => toggleAvailability('2025-10-15', false)}
/>
```

### Important Notes

1. **Day-Based Updates**: This endpoint updates the entire day's availability (e.g., all Wednesdays), not just a single specific date
2. **Must Create Availability First**: Providers must have an availability record created for that day of the week before they can toggle it
3. **Time Slots Preserved**: Only the `availability_isActive` flag is changed; time slots (startTime/endTime) remain the same
4. **Automatic Day Calculation**: The system automatically determines the day of week from the date provided

### Workflow Integration

```
┌─────────────────────────────────────────┐
│  Provider Opens Calendar                │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Selects Date (e.g., Oct 15, 2025)     │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Toggles "Available" Switch to OFF      │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  App Sends: PUT /availability/date      │
│  Body: {                                │
│    "date": "2025-10-15",               │
│    "isActive": false                    │
│  }                                      │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Backend:                               │
│  1. Decodes JWT → provider_id           │
│  2. Calculates "Wednesday"              │
│  3. Finds Wednesday availability        │
│  4. Sets availability_isActive = false  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Success Response:                      │
│  "Availability for 2025-10-15          │
│   (Wednesday) updated successfully"     │
└─────────────────────────────────────────┘
```

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid JWT Token
```json
{
  "message": "Unauthorized"
}
```
**Solution**: User needs to login again to get a fresh token

#### 2. Token Expired
```json
{
  "message": "Token expired"
}
```
**Solution**: Redirect to login page

#### 3. Availability Not Found
```json
{
  "message": "No availability found for Monday. Please create availability first.",
  "dayOfWeek": "Monday"
}
```
**Solution**: Provider must first create availability for that day via `POST /addAvailability`

#### 4. Invalid Date Format
```json
{
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```
**Solution**: Ensure date is in correct format (e.g., "2025-10-15")

### Recommended Error Handling Pattern

```javascript
const handleApiCall = async (url, options) => {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    }
    
    // Handle specific error codes
    switch (response.status) {
      case 401:
        // Redirect to login
        await logout();
        navigation.navigate('Login');
        break;
      case 404:
        Alert.alert('Not Found', data.message);
        break;
      case 400:
        Alert.alert('Invalid Request', data.message);
        break;
      default:
        Alert.alert('Error', data.message || 'Something went wrong');
    }
    
    return { success: false, error: data.message };
  } catch (error) {
    console.error('Network error:', error);
    Alert.alert('Network Error', 'Please check your internet connection');
    return { success: false, error: 'Network error' };
  }
};
```

---

## Integration Examples

### Complete React Native Calendar Integration

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderAvailabilityScreen = () => {
  const [markedDates, setMarkedDates] = useState({});
  const [token, setToken] = useState(null);
  
  useEffect(() => {
    loadToken();
  }, []);
  
  const loadToken = async () => {
    const storedToken = await AsyncStorage.getItem('provider_token');
    setToken(storedToken);
  };
  
  const handleDayPress = (day) => {
    Alert.alert(
      'Update Availability',
      `Do you want to mark yourself unavailable on ${day.dateString}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Unavailable',
          onPress: () => updateAvailability(day.dateString, false)
        },
        {
          text: 'Mark Available',
          onPress: () => updateAvailability(day.dateString, true)
        }
      ]
    );
  };
  
  const updateAvailability = async (date, isActive) => {
    try {
      const response = await fetch(
        'https://api.yourapp.com/auth/availability/date',
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ date, isActive })
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', data.message);
        
        // Update marked dates
        setMarkedDates(prev => ({
          ...prev,
          [date]: {
            selected: true,
            selectedColor: isActive ? 'green' : 'red',
            marked: true
          }
        }));
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };
  
  return (
    <View>
      <Text style={{ fontSize: 20, padding: 10 }}>
        Manage Your Availability
      </Text>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        minDate={new Date().toISOString().split('T')[0]}
      />
    </View>
  );
};

export default ProviderAvailabilityScreen;
```

### Profile Display Component

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('provider_token');
      
      const response = await fetch(
        'https://api.yourapp.com/auth/profile-detailed',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.provider);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <ActivityIndicator size="large" />;
  }
  
  return (
    <ScrollView style={{ padding: 20 }}>
      {/* Profile Photo */}
      <Image
        source={{ uri: profile.provider_profile_photo }}
        style={{ width: 100, height: 100, borderRadius: 50 }}
      />
      
      {/* Basic Info */}
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        {profile.provider_first_name} {profile.provider_last_name}
      </Text>
      <Text>@{profile.provider_userName}</Text>
      <Text>Rating: {profile.provider_rating} ⭐ ({profile.ratings_count} reviews)</Text>
      
      {/* Professions */}
      <Text style={{ fontSize: 18, marginTop: 20 }}>Professions</Text>
      {profile.professions.map(prof => (
        <Text key={prof.id}>
          • {prof.profession} - {prof.experience}
        </Text>
      ))}
      
      {/* Certificates */}
      <Text style={{ fontSize: 18, marginTop: 20 }}>Certificates</Text>
      {profile.certificates.map(cert => (
        <View key={cert.certificate_id}>
          <Text>• {cert.certificate_name}</Text>
          <Text>  License #: {cert.certificate_number}</Text>
          <Text>  Expires: {cert.expiry_date}</Text>
        </View>
      ))}
      
      {/* Recent Ratings */}
      <Text style={{ fontSize: 18, marginTop: 20 }}>Recent Reviews</Text>
      {profile.recent_ratings.map(rating => (
        <View key={rating.rating_id} style={{ marginBottom: 10 }}>
          <Text>⭐ {rating.rating}/5 - {rating.customer.first_name}</Text>
          <Text>{rating.comment}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

export default ProviderProfileScreen;
```

---

## Summary

### Key Features

✅ **JWT-Based Authentication**: Both endpoints use secure JWT token authentication  
✅ **Automatic Provider Identification**: No need to pass provider ID in URL  
✅ **Comprehensive Profile Data**: Includes certificates, professions, and ratings  
✅ **User-Friendly Date Selection**: Update availability by date, not by internal IDs  
✅ **Automatic Day Calculation**: System calculates day of week from provided date  

### Best Practices

1. **Token Management**: Store JWT tokens securely using AsyncStorage (React Native) or localStorage (Web)
2. **Error Handling**: Always handle 401 errors by redirecting to login
3. **Loading States**: Show loading indicators while fetching data
4. **Data Refresh**: Refresh profile data after updates
5. **Date Validation**: Validate dates on the client-side before sending requests

### Related Endpoints

- `GET /auth/profile` - Get basic provider profile (less detailed)
- `POST /auth/addAvailability` - Create new availability slots
- `GET /auth/provider/:provider_id/availability` - Get all availability for a provider
- `PUT /auth/availability/:availability_id` - Update specific availability by ID

---

## Support

For additional help or questions:
- Check the main API documentation
- Review Swagger docs at `/api-docs`
- Contact backend development team

**Last Updated**: October 4, 2025  
**API Version**: 1.0  
**Author**: Fixmo Backend Team
