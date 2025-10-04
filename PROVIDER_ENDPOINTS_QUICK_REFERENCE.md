# Provider Endpoints Quick Reference

## 🔑 Authentication Required
Both endpoints require JWT Bearer token in headers:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Endpoint 1: Get Detailed Provider Profile

### URL
```
GET /auth/profile-detailed
```

### Full URL (if your base URL is different)
```
https://your-backend-url.com/auth/profile-detailed
```

### Headers
```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

### Request Body
None - Provider ID is extracted from JWT token

### Response (Success - 200)
```javascript
{
  "message": "Provider profile retrieved successfully",
  "provider": {
    "provider_id": 1,
    "provider_first_name": "John",
    "provider_last_name": "Doe",
    "provider_userName": "johndoe_plumber",
    "provider_email": "john.doe@example.com",
    "provider_phone_number": "+63 912 345 6789",
    "provider_profile_photo": "https://cloudinary.com/...",
    "provider_rating": 4.8,
    "provider_location": "Manila, Philippines",
    "provider_isVerified": true,
    "ratings_count": 47,
    "certificates": [
      {
        "certificate_id": 1,
        "certificate_name": "Master Plumber License",
        "certificate_number": "PL-2020-12345",
        "certificate_file_path": "https://cloudinary.com/...",
        "expiry_date": "2026-12-31"
      }
    ],
    "professions": [
      {
        "id": 1,
        "profession": "Plumber",
        "experience": "10 years"
      }
    ],
    "recent_ratings": [
      {
        "rating_id": 101,
        "rating": 5,
        "comment": "Excellent service!",
        "created_at": "2025-10-01T15:30:00.000Z",
        "customer": {
          "user_id": 50,
          "first_name": "Maria",
          "last_name": "Santos",
          "profile_photo": "https://cloudinary.com/..."
        }
      }
    ]
  }
}
```

### TypeScript Interface (React Native)
```typescript
interface ProviderProfile {
  provider_id: number;
  provider_first_name: string;
  provider_last_name: string;
  provider_userName: string;
  provider_email: string;
  provider_phone_number: string;
  provider_profile_photo: string;
  provider_valid_id: string;
  provider_isVerified: boolean;
  verification_status: string;
  provider_rating: number;
  provider_location: string;
  provider_exact_location: string;
  provider_uli: string;
  provider_birthday: string;
  created_at: string;
  provider_isActivated: boolean;
  ratings_count: number;
  certificates: Certificate[];
  professions: Profession[];
  recent_ratings: Rating[];
}

interface Certificate {
  certificate_id: number;
  certificate_name: string;
  certificate_number: string;
  certificate_file_path: string;
  expiry_date: string;
}

interface Profession {
  id: number;
  profession: string;
  experience: string;
}

interface Rating {
  rating_id: number;
  rating: number;
  comment: string;
  created_at: string;
  customer: {
    user_id: number;
    first_name: string;
    last_name: string;
    profile_photo: string;
  };
}
```

### React Native Example
```typescript
// In your auth.api.ts file
export const getDetailedProviderProfile = async (token: string) => {
  try {
    const response = await fetch(
      'https://your-backend-url.com/auth/profile-detailed',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch profile');
    }
    
    return data.provider;
  } catch (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
};
```

---

## 📅 Endpoint 2: Update Availability by Date

### URL
```
PUT /auth/availability/date
```

### Full URL
```
https://your-backend-url.com/auth/availability/date
```

### Headers
```javascript
{
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

### Request Body
```javascript
{
  "date": "2025-10-15",        // Required: YYYY-MM-DD format
  "isActive": false             // Required: true = available, false = unavailable
}
```

### Response (Success - 200)
```javascript
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

### TypeScript Interface
```typescript
interface UpdateAvailabilityRequest {
  date: string;      // YYYY-MM-DD format
  isActive: boolean;
}

interface UpdateAvailabilityResponse {
  message: string;
  date: string;
  dayOfWeek: string;
  isActive: boolean;
  availability: {
    availability_id: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    availability_isActive: boolean;
  };
}
```

### React Native Example
```typescript
// In your auth.api.ts file
export const updateAvailabilityByDate = async (
  token: string,
  date: string,
  isActive: boolean
) => {
  try {
    const response = await fetch(
      'https://your-backend-url.com/auth/availability/date',
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
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update availability');
    }
    
    return data;
  } catch (error) {
    console.error('Availability update error:', error);
    throw error;
  }
};
```

---

## 🚨 Common Errors

### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```
**Solution**: Token is invalid or expired. User needs to login again.

### 404 Not Found (Profile)
```json
{
  "message": "Provider not found"
}
```
**Solution**: Provider doesn't exist in database.

### 404 Not Found (Availability)
```json
{
  "message": "No availability found for Monday. Please create availability first.",
  "dayOfWeek": "Monday"
}
```
**Solution**: Provider must create availability for that day first using `POST /auth/addAvailability`

### 400 Bad Request
```json
{
  "message": "Date is required (format: YYYY-MM-DD)"
}
```
**Solution**: Check request body format.

---

## 📱 Complete React Native Implementation

### auth.api.ts
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://your-backend-url.com';

// Get JWT token from storage
const getToken = async () => {
  return await AsyncStorage.getItem('provider_token');
};

// Get detailed provider profile
export const getDetailedProviderProfile = async () => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${BASE_URL}/auth/profile-detailed`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch profile');
  }
  
  return data.provider;
};

// Update availability by date
export const updateAvailabilityByDate = async (
  date: string,
  isActive: boolean
) => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${BASE_URL}/auth/availability/date`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, isActive })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update availability');
  }
  
  return data;
};
```

### Usage in Component
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { getDetailedProviderProfile, updateAvailabilityByDate } from './api/auth.api';

const ProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      const data = await getDetailedProviderProfile();
      setProfile(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleAvailability = async (date: string, status: boolean) => {
    try {
      const result = await updateAvailabilityByDate(date, status);
      Alert.alert('Success', result.message);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  if (loading) return <Text>Loading...</Text>;
  
  return (
    <View>
      <Text>{profile?.provider_first_name} {profile?.provider_last_name}</Text>
      <Text>Rating: {profile?.provider_rating} ⭐</Text>
      <Text>Reviews: {profile?.ratings_count}</Text>
      
      <Button
        title="Mark Unavailable Today"
        onPress={() => {
          const today = new Date().toISOString().split('T')[0];
          handleToggleAvailability(today, false);
        }}
      />
    </View>
  );
};

export default ProfileScreen;
```

---

## ✅ Checklist for Frontend Integration

- [ ] Update `BASE_URL` in your API file
- [ ] Ensure JWT token is stored after login
- [ ] Import the API functions in your components
- [ ] Handle 401 errors (redirect to login)
- [ ] Show loading states
- [ ] Display error messages to users
- [ ] Test with valid JWT token
- [ ] Test error scenarios (expired token, network error, etc.)

---

## 🔗 Related Endpoints

- `POST /auth/provider-login` - Login to get JWT token
- `GET /auth/profile` - Get basic provider profile (less detailed)
- `POST /auth/addAvailability` - Create new availability slots
- `GET /auth/provider/:provider_id/availability` - Get all availability

---

**Last Updated**: October 4, 2025  
**Backend Version**: Latest  
**Support**: Check main documentation or Swagger at `/api-docs`
