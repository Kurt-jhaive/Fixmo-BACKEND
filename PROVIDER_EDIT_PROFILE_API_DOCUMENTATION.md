# 📝 Provider Edit Profile & Verification Resubmission - Complete API Documentation

## 📋 Overview

This document provides complete API reference for **Service Provider Profile Editing** and **Verification Document Resubmission**, mirroring the customer implementation.

---

## 🎯 Two Systems in One

### 1. **Profile Editing (Approved Providers)** - OTP Required
- For providers with `verification_status: 'verified'` or `'approved'`
- Two-step process: Request OTP → Verify OTP & Update
- Can update: email, phone, location, coordinates

### 2. **Verification Resubmission (Rejected/Pending Providers)** - No OTP
- For providers with `verification_status: 'rejected'` or `'pending'`
- Single-step process: Submit documents directly
- Can update: documents, personal info, certifications

---

## 🔐 Profile Editing API (OTP-Protected)

### Step 1: Request OTP

**Endpoint:** `POST /api/provider/profile/request-otp`

**Authentication:** Required (JWT Bearer Token)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{}
```
*No body required - OTP sent to provider's registered email*

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent to your email. Please verify to proceed with profile update.",
  "email": "jo***@example.com",
  "data": {
    "maskedEmail": "jo***@example.com",
    "expiresIn": "10 minutes"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

**Response (500 Server Error):**
```json
{
  "success": false,
  "message": "Failed to send OTP",
  "error": "Error message"
}
```

---

### Step 2: Verify OTP and Update Profile

**Endpoint:** `PUT /api/provider/profile`

**Authentication:** Required (JWT Bearer Token)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "otp": "123456",
  "provider_email": "newemail@example.com",
  "provider_phone_number": "09123456789",
  "provider_location": "Quezon City",
  "exact_location": "14.6760,121.0437"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `otp` | String | **Yes** | 6-digit OTP from email |
| `provider_email` | String | No | New email address |
| `provider_phone_number` | String | No | New phone number |
| `provider_location` | String | No | City/area description |
| `exact_location` | String | No | GPS coordinates "lat,lng" |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "provider_id": 4,
    "provider_email": "newemail@example.com",
    "provider_phone_number": "09123456789",
    "provider_location": "Quezon City",
    "exact_location": "14.6760,121.0437",
    "updated_at": "2025-10-15T10:30:00.000Z"
  }
}
```

**Response (400 Bad Request - Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**Response (400 Bad Request - Email Exists):**
```json
{
  "success": false,
  "message": "Email is already registered to another provider"
}
```

**Response (400 Bad Request - Phone Exists):**
```json
{
  "success": false,
  "message": "Phone number is already registered to another provider"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

---

## 🔄 Verification Resubmission API (No OTP)

### Resubmit Verification Documents

**Endpoint:** `POST /api/verification/provider/resubmit`

**Authentication:** Required (JWT Bearer Token)

**Content-Type:** `multipart/form-data`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body (FormData):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_first_name` | String | No | First name |
| `provider_last_name` | String | No | Last name |
| `provider_birthday` | String | No | Birthday (YYYY-MM-DD) |
| `provider_location` | String | No | City/area |
| `exact_location` | String | No | Coordinates "lat,lng" |
| `provider_profile_photo` | File | No | New profile photo (JPEG/PNG, max 5MB) |
| `provider_valid_id` | File | No | New valid ID (JPEG/PNG, max 5MB) |
| `certificate_images` | File[] | No | Certificates (max 10 files, 10MB each) |
| `certificateNames` | String | No* | JSON array: `["Cert 1", "Cert 2"]` |
| `certificateNumbers` | String | No* | JSON array: `["NUM001", "NUM002"]` |
| `expiryDates` | String | No* | JSON array: `["2025-12-31", null]` |
| `profile_photo_url` | String | No | Existing Cloudinary URL (if not uploading new) |
| `valid_id_url` | String | No | Existing Cloudinary URL (if not uploading new) |

*Required if uploading certificates

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification documents resubmitted successfully",
  "data": {
    "provider_id": 4,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-15T10:30:00.000Z",
    "rejection_reason": null,
    "updated_fields": {
      "provider_profile_photo": "https://res.cloudinary.com/.../new_profile.jpg",
      "provider_valid_id": "https://res.cloudinary.com/.../new_id.jpg",
      "certificates_added": 2
    }
  }
}
```

**Response (400 Bad Request - Already Verified):**
```json
{
  "success": false,
  "message": "Cannot resubmit documents. Your verification is already approved.",
  "verification_status": "verified"
}
```

**Response (400 Bad Request - No Files):**
```json
{
  "success": false,
  "message": "At least one file must be provided for resubmission"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

---

## 📊 Comparison: Customer vs Provider

### Field Name Differences

| Feature | Customer | Provider |
|---------|----------|----------|
| **Email** | `email` | `provider_email` |
| **Phone** | `phone_number` | `provider_phone_number` |
| **First Name** | `first_name` | `provider_first_name` |
| **Last Name** | `last_name` | `provider_last_name` |
| **Location** | `user_location` | `provider_location` |
| **Coordinates** | `exact_location` | `exact_location` ✅ Same |
| **Profile Photo** | `profile_photo` | `provider_profile_photo` |
| **Valid ID** | `valid_id` | `provider_valid_id` |
| **Birthday** | `birthday` | `provider_birthday` |
| **Table** | `User` | `ServiceProviderDetails` |
| **ID Field** | `user_id` | `provider_id` |

### Endpoint Comparison

| Purpose | Customer Endpoint | Provider Endpoint |
|---------|-------------------|-------------------|
| **Request OTP** | `POST /auth/customer-profile/request-otp` | `POST /api/provider/profile/request-otp` |
| **Update Profile** | `PUT /auth/customer-profile` | `PUT /api/provider/profile` |
| **Resubmit Docs** | `POST /api/verification/customer/resubmit` | `POST /api/verification/provider/resubmit` |

---

## 🧪 Testing Examples

### Example 1: Provider Profile Edit (Complete Flow)

**Step 1: Request OTP**

```bash
curl -X POST http://localhost:3000/api/provider/profile/request-otp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Step 2: Verify OTP and Update**

```bash
curl -X PUT http://localhost:3000/api/provider/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456",
    "provider_email": "newemail@example.com",
    "provider_phone_number": "09876543210",
    "provider_location": "Makati City",
    "exact_location": "14.5547,121.0244"
  }'
```

**JavaScript/TypeScript:**

```typescript
// Step 1: Request OTP
const requestOtp = async () => {
  const token = await AsyncStorage.getItem('token');
  
  const response = await fetch(`${BACKEND_URL}/api/provider/profile/request-otp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  if (result.success) {
    Alert.alert('Success', `OTP sent to ${result.email}`);
    setMaskedEmail(result.email);
    setOtpRequested(true);
  }
};

// Step 2: Update Profile
const updateProfile = async (otp: string) => {
  const token = await AsyncStorage.getItem('token');
  
  const response = await fetch(`${BACKEND_URL}/api/provider/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      otp,
      provider_phone_number: newPhone,
      provider_location: newLocation,
      exact_location: `${lat},${lng}`,
    }),
  });

  const result = await response.json();
  if (result.success) {
    Alert.alert('Success', 'Profile updated!');
  }
};
```

---

### Example 2: Resubmit Verification Documents

**With New Photos:**

```bash
curl -X POST http://localhost:3000/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "provider_profile_photo=@new_profile.jpg" \
  -F "provider_valid_id=@new_id.jpg" \
  -F "provider_first_name=John" \
  -F "provider_last_name=Doe" \
  -F "provider_birthday=1990-05-15" \
  -F "provider_location=Quezon City" \
  -F "exact_location=14.6760,121.0437"
```

**JavaScript/TypeScript:**

```typescript
const resubmitDocuments = async () => {
  const token = await AsyncStorage.getItem('token');
  const formData = new FormData();
  
  // Personal info
  formData.append('provider_first_name', firstName);
  formData.append('provider_last_name', lastName);
  if (birthday) {
    formData.append('provider_birthday', birthday.toISOString().split('T')[0]);
  }
  formData.append('provider_location', location);
  if (coordinates) {
    formData.append('exact_location', `${coordinates.lat},${coordinates.lng}`);
  }
  
  // Photos (new or existing)
  if (profilePhotoUri) {
    if (profilePhotoUri.startsWith('http')) {
      // Existing Cloudinary URL
      formData.append('profile_photo_url', profilePhotoUri);
    } else {
      // New photo
      const ext = profilePhotoUri.split('.').pop();
      formData.append('provider_profile_photo', {
        uri: profilePhotoUri,
        type: `image/${ext}`,
        name: `profile.${ext}`,
      } as any);
    }
  }
  
  if (validIdUri) {
    if (validIdUri.startsWith('http')) {
      formData.append('valid_id_url', validIdUri);
    } else {
      const ext = validIdUri.split('.').pop();
      formData.append('provider_valid_id', {
        uri: validIdUri,
        type: `image/${ext}`,
        name: `id.${ext}`,
      } as any);
    }
  }
  
  const response = await fetch(
    `${BACKEND_URL}/api/verification/provider/resubmit`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );
  
  const result = await response.json();
  if (result.success) {
    Alert.alert('Success', 'Documents resubmitted for review!');
  }
};
```

---

### Example 3: With Certificates

```typescript
const resubmitWithCertificates = async () => {
  const token = await AsyncStorage.getItem('token');
  const formData = new FormData();
  
  // Add certificates
  certificates.forEach((cert, index) => {
    const ext = cert.uri.split('.').pop();
    formData.append('certificate_images', {
      uri: cert.uri,
      type: `image/${ext}`,
      name: `cert_${index}.${ext}`,
    } as any);
  });
  
  // Certificate metadata
  const certNames = certificates.map(c => c.name);
  const certNumbers = certificates.map(c => c.number);
  const certExpiry = certificates.map(c => c.expiryDate);
  
  formData.append('certificateNames', JSON.stringify(certNames));
  formData.append('certificateNumbers', JSON.stringify(certNumbers));
  formData.append('expiryDates', JSON.stringify(certExpiry));
  
  // Submit...
};
```

---

## 🔒 Security Features

### 1. OTP Security
- ✅ 6-digit random OTP
- ✅ 10-minute expiration
- ✅ One-time use (deleted after successful verification)
- ✅ Email masked in responses (`jo***@example.com`)

### 2. Uniqueness Validation
- ✅ Email uniqueness across `ServiceProviderDetails` table
- ✅ Phone number uniqueness across `ServiceProviderDetails` table
- ✅ Prevents duplicate accounts

### 3. File Upload Security
- ✅ Cloudinary secure storage
- ✅ File size limits (5MB photos, 10MB certificates)
- ✅ File type validation (images only)
- ✅ Memory storage for processing

### 4. Authorization
- ✅ JWT authentication required
- ✅ Provider can only edit their own profile
- ✅ Provider ID extracted from JWT token

---

## 🚦 Verification Status Flow

```
Provider Registration
         ↓
    pending
         ↓
  (admin reviews)
         ↓
    ┌────┴────┐
    ↓         ↓
verified   rejected
  ✅         ❌
    |         |
    |    (resubmit)
    |         ↓
    |     pending
    |         ↓
    |   (admin reviews)
    |         ↓
    └────→ verified ✅
```

---

## 📱 Mobile App Integration

### React Native Example Component

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderEditProfile = () => {
  const [provider, setProvider] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number; lng: number} | null>(null);
  
  // OTP states
  const [otpRequested, setOtpRequested] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [saving, setSaving] = useState(false);
  
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_LINK;

  // Load provider profile
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/provider/provider-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        const data = result.provider || result.data;
        setProvider(data);
        setPhone(data.provider_phone_number || '');
        setEmail(data.provider_email || '');
        setLocation(data.provider_location || '');
        
        if (data.exact_location) {
          const [lat, lng] = data.exact_location.split(',').map(Number);
          setCoordinates({ lat, lng });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const requestOtp = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BACKEND_URL}/api/provider/profile/request-otp`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setMaskedEmail(result.email || result.data?.maskedEmail);
        setOtpRequested(true);
        Alert.alert('OTP Sent', `Verification code sent to ${result.email}`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while requesting OTP');
    }
  };

  const handleSave = () => {
    if (provider?.verification_status === 'rejected' || 
        provider?.verification_status === 'pending') {
      // Rejected/Pending → Resubmit flow (no OTP)
      resubmitDocuments();
      return;
    }

    // Approved/Verified → OTP required
    if (!otpRequested) {
      Alert.alert(
        'Verification Required',
        'Please request a verification code first',
        [
          { text: 'Cancel' },
          { text: 'Request Code', onPress: requestOtp }
        ]
      );
      return;
    }

    setShowOtpModal(true);
  };

  const verifyAndSave = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const updateData: any = {};

      if (phone !== provider.provider_phone_number) {
        updateData.provider_phone_number = phone;
      }
      if (email !== provider.provider_email) {
        updateData.provider_email = email;
      }
      if (location !== provider.provider_location) {
        updateData.provider_location = location;
      }
      if (coordinates) {
        updateData.exact_location = `${coordinates.lat},${coordinates.lng}`;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/provider/profile`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            otp,
            ...updateData,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setShowOtpModal(false);
        loadProfile();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during update');
    } finally {
      setSaving(false);
    }
  };

  const resubmitDocuments = async () => {
    // Implementation for resubmission (no OTP)
    // Similar to verification modal...
  };

  return (
    <View>
      {/* OTP Request Section (only for verified providers) */}
      {provider?.verification_status === 'verified' && (
        <View>
          {otpRequested ? (
            <Text>Code sent to {maskedEmail}</Text>
          ) : (
            <TouchableOpacity onPress={requestOtp}>
              <Text>Request Verification Code</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Form Fields */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone"
      />
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Location"
      />

      {/* Save Button */}
      <TouchableOpacity onPress={handleSave}>
        <Text>Save Changes</Text>
      </TouchableOpacity>

      {/* OTP Modal */}
      <Modal visible={showOtpModal}>
        <View>
          <Text>Enter Verification Code</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity onPress={verifyAndSave} disabled={saving}>
            {saving ? <ActivityIndicator /> : <Text>Verify</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowOtpModal(false)}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default ProviderEditProfile;
```

---

## ⚠️ Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `"Provider not found"` | Invalid token or provider deleted | Login again with valid credentials |
| `"OTP is required"` | Missing OTP parameter | Include `otp` field in request body |
| `"Invalid or expired OTP"` | Wrong OTP or expired (>10 mins) | Request new OTP |
| `"Email is already registered"` | Duplicate email | Use different email address |
| `"Phone number is already registered"` | Duplicate phone | Use different phone number |
| `"At least one field is required"` | Empty update request | Include at least one field to update |
| `"Cannot resubmit documents"` | Provider already verified | Use profile edit endpoint instead |

---

## ✅ Testing Checklist

### Profile Edit Flow (Verified Providers)
- [ ] Provider is verified
- [ ] Request OTP successfully
- [ ] OTP sent to email
- [ ] OTP received in email
- [ ] Email is masked in response
- [ ] Update phone number successfully
- [ ] Update location successfully
- [ ] Update coordinates successfully
- [ ] Update email successfully
- [ ] Duplicate email validation works
- [ ] Duplicate phone validation works
- [ ] Invalid OTP shows error
- [ ] Expired OTP shows error

### Resubmission Flow (Rejected/Pending Providers)
- [ ] Provider is rejected or pending
- [ ] Upload new profile photo
- [ ] Upload new valid ID
- [ ] Upload new certificates
- [ ] Personal info updates
- [ ] Status changes to pending
- [ ] Rejection reason cleared
- [ ] No OTP required

---

## 📚 Related Documentation

- [PROVIDER_VERIFICATION_RESUBMIT_DOCUMENTATION.md](./PROVIDER_VERIFICATION_RESUBMIT_DOCUMENTATION.md) - Full documentation
- [PROVIDER_VERIFICATION_QUICK_REFERENCE.md](./PROVIDER_VERIFICATION_QUICK_REFERENCE.md) - Quick reference guide
- [EDIT_PROFILE_AND_VERIFICATION_RESUBMISSION_GUIDE.md](./EDIT_PROFILE_AND_VERIFICATION_RESUBMISSION_GUIDE.md) - Customer implementation (reference)

---

**API Version:** 1.0  
**Last Updated:** October 15, 2025  
**Status:** ✅ Fully Implemented  
**Backend:** Node.js + Express + Prisma + Cloudinary
