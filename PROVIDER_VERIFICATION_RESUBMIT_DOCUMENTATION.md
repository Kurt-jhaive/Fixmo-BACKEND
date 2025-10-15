# 📄 Service Provider Document Resubmission & Profile Edit Guide

## Table of Contents
1. [Document Resubmission (When Rejected)](#document-resubmission)
2. [Profile Editing (OTP-Protected)](#profile-editing)
3. [API Reference](#api-reference)
4. [Testing Examples](#testing-examples)

---

## 🔄 Document Resubmission

### Overview
When a service provider's verification documents are **rejected** by admin, they can resubmit updated documents for review.

### When Can Providers Resubmit?
- ✅ Verification status is **"rejected"**
- ✅ Verification status is **"pending"** (to update documents)
- ❌ Cannot resubmit if status is **"verified"** (already approved)

### What Can Be Updated?
1. **Profile Photo** (`provider_profile_photo`)
2. **Valid ID** (`provider_valid_id`)
3. **Certificates** (add new ones)

### Rejection Reasons
Providers might be rejected for:
- Blurry or unclear photos
- Invalid ID documents
- Expired certificates
- Incomplete information
- Photo doesn't match ID

---

## 📋 API Reference

### 1. Resubmit Provider Verification Documents

**Endpoint:** `POST /api/verification/provider/resubmit`

**Authentication:** Required (JWT Bearer Token)

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_profile_photo` | File | No | New profile photo (JPEG, PNG, max 5MB) |
| `provider_valid_id` | File | No | New valid ID photo (JPEG, PNG, max 5MB) |
| `certificate_images` | File[] | No | New certificate images (max 10 files, 10MB each) |
| `certificateNames` | String | No* | JSON array: `["Cert 1", "Cert 2"]` |
| `certificateNumbers` | String | No* | JSON array: `["CERT001", "CERT002"]` |
| `expiryDates` | String | No* | JSON array: `["2025-12-31", null]` |

*Required if uploading certificates

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification documents resubmitted successfully",
  "data": {
    "provider_id": 4,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-15T14:30:00.000Z",
    "rejection_reason": null,
    "updated_fields": {
      "provider_profile_photo": "https://res.cloudinary.com/.../profile_new.jpg",
      "provider_valid_id": "https://res.cloudinary.com/.../id_new.jpg",
      "certificates_added": 2
    }
  }
}
```

**Error Responses:**

**400 Bad Request** - Cannot resubmit (already verified):
```json
{
  "success": false,
  "message": "Cannot resubmit documents. Your verification is already approved.",
  "verification_status": "verified"
}
```

**400 Bad Request** - No files uploaded:
```json
{
  "success": false,
  "message": "At least one file must be provided for resubmission"
}
```

**404 Not Found** - Provider doesn't exist:
```json
{
  "success": false,
  "message": "Provider not found"
}
```

---

## ✏️ Profile Editing

### Overview
Service providers can edit their profile information (email, phone, location) with **OTP verification** for security.

### Profile Fields That Can Be Updated
- Email address (`provider_email`)
- Phone number (`provider_phone_number`)
- Location (`provider_location`)
- Exact location coordinates (`provider_exact_location`)

### Important Notes
- ⚠️ Changing email/phone requires OTP verification
- 🔒 Password changes use a separate forgot password flow
- 📸 Profile photo/ID updates use the resubmit endpoint above

---

## 📋 Profile Edit API Reference

### Step 1: Request OTP for Profile Update

**Endpoint:** `POST /api/provider/profile/request-otp`

**Authentication:** Required (JWT Bearer Token)

**Request Body:**
```json
{
  "provider_email": "provider@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP sent to provider email successfully",
  "email": "provider@example.com"
}
```

**Error (400):**
```json
{
  "message": "Provider not found"
}
```

---

### Step 2: Verify OTP and Update Profile

**Endpoint:** `PUT /api/provider/profile`

**Authentication:** Required (JWT Bearer Token)

**Request Body:**
```json
{
  "otp": "123456",
  "provider_email": "newemail@example.com",
  "provider_phone_number": "09123456789",
  "provider_location": "Quezon City",
  "provider_exact_location": "14.6760,121.0437"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `otp` | String | Yes | 6-digit OTP from email |
| `provider_email` | String | No | New email (if changing) |
| `provider_phone_number` | String | No | New phone number |
| `provider_location` | String | No | City/area name |
| `provider_exact_location` | String | No | Coordinates: "lat,lng" |

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "provider": {
    "provider_id": 4,
    "provider_email": "newemail@example.com",
    "provider_phone_number": "09123456789",
    "provider_location": "Quezon City",
    "provider_exact_location": "14.6760,121.0437"
  }
}
```

**Error Responses:**

**400 - OTP Not Verified:**
```json
{
  "message": "Please verify OTP first"
}
```

**400 - Invalid OTP:**
```json
{
  "message": "Invalid or expired OTP"
}
```

**400 - Duplicate Phone:**
```json
{
  "message": "Phone number already in use"
}
```

**400 - Duplicate Email:**
```json
{
  "message": "Email already registered"
}
```

---

## 🧪 Testing Examples

### Example 1: Resubmit Profile Photo and ID (Rejected Provider)

**JavaScript (Fetch API):**
```javascript
const formData = new FormData();
formData.append('provider_profile_photo', profilePhotoFile);
formData.append('provider_valid_id', validIdFile);

const response = await fetch('http://localhost:3000/api/verification/provider/resubmit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Resubmission result:', result);
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "provider_profile_photo=@/path/to/new_profile.jpg" \
  -F "provider_valid_id=@/path/to/new_id.jpg"
```

---

### Example 2: Resubmit with New Certificates

**JavaScript:**
```javascript
const formData = new FormData();
formData.append('certificate_images', cert1File);
formData.append('certificate_images', cert2File);
formData.append('certificateNames', JSON.stringify([
  "Plumbing License",
  "Electrical Safety Certificate"
]));
formData.append('certificateNumbers', JSON.stringify([
  "PL-2024-12345",
  "EC-2024-67890"
]));
formData.append('expiryDates', JSON.stringify([
  "2026-12-31",
  "2027-06-30"
]));

const response = await fetch('http://localhost:3000/api/verification/provider/resubmit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**cURL:**
```bash
curl -X POST http://localhost:3000/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "certificate_images=@cert1.jpg" \
  -F "certificate_images=@cert2.jpg" \
  -F 'certificateNames=["Plumbing License","Electrical Certificate"]' \
  -F 'certificateNumbers=["PL-12345","EC-67890"]' \
  -F 'expiryDates=["2026-12-31","2027-06-30"]'
```

---

### Example 3: Update Profile (Email and Location)

**Step 1: Request OTP**
```javascript
const response1 = await fetch('http://localhost:3000/api/provider/profile/request-otp', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider_email: 'currentemail@example.com'
  })
});

console.log('OTP sent to email');
```

**Step 2: Verify OTP and Update**
```javascript
const response2 = await fetch('http://localhost:3000/api/provider/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    otp: '123456',
    provider_email: 'newemail@example.com',
    provider_phone_number: '09876543210',
    provider_location: 'Makati City',
    provider_exact_location: '14.5547,121.0244'
  })
});

const result = await response2.json();
console.log('Profile updated:', result);
```

**cURL (Step 1):**
```bash
curl -X POST http://localhost:3000/api/provider/profile/request-otp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider_email":"current@example.com"}'
```

**cURL (Step 2):**
```bash
curl -X PUT http://localhost:3000/api/provider/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp":"123456",
    "provider_email":"new@example.com",
    "provider_phone_number":"09876543210",
    "provider_location":"Makati City",
    "provider_exact_location":"14.5547,121.0244"
  }'
```

---

## 📱 Mobile App Integration Guide

### React Native (Expo) Example

**1. Resubmit Documents:**
```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const resubmitDocuments = async () => {
  // Pick new profile photo
  const profileResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });

  // Pick new ID
  const idResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });

  const formData = new FormData();
  
  if (!profileResult.canceled) {
    formData.append('provider_profile_photo', {
      uri: profileResult.assets[0].uri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    });
  }

  if (!idResult.canceled) {
    formData.append('provider_valid_id', {
      uri: idResult.assets[0].uri,
      type: 'image/jpeg',
      name: 'valid_id.jpg',
    });
  }

  const token = await AsyncStorage.getItem('token');
  
  const response = await fetch(
    'http://YOUR_SERVER:3000/api/verification/provider/resubmit',
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
    Alert.alert('Success', 'Documents resubmitted for review');
  } else {
    Alert.alert('Error', result.message);
  }
};
```

**2. Update Profile with OTP:**
```typescript
const updateProfile = async () => {
  const token = await AsyncStorage.getItem('token');
  
  // Step 1: Request OTP
  await fetch('http://YOUR_SERVER:3000/api/provider/profile/request-otp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider_email: currentEmail,
    }),
  });

  Alert.alert('OTP Sent', 'Check your email for the verification code');

  // User enters OTP in a form...
  
  // Step 2: Submit with OTP
  const response = await fetch('http://YOUR_SERVER:3000/api/provider/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      otp: userEnteredOTP,
      provider_email: newEmail,
      provider_phone_number: newPhone,
      provider_location: newLocation,
      provider_exact_location: `${latitude},${longitude}`,
    }),
  });

  const result = await response.json();
  
  if (response.ok) {
    Alert.alert('Success', 'Profile updated successfully');
  } else {
    Alert.alert('Error', result.message);
  }
};
```

---

## 🔐 Security Notes

1. **JWT Token Required**: All endpoints require authentication
2. **File Size Limits**:
   - Profile photo/ID: 5MB max
   - Certificates: 10MB max each
3. **OTP Expiry**: OTP expires in 5 minutes
4. **Rate Limiting**: 3 OTP requests per 30 minutes
5. **Cloudinary Storage**: All files automatically uploaded to cloud

---

## 🐛 Common Errors & Solutions

### Error: "Cannot resubmit documents. Your verification is already approved."
**Solution:** Provider is already verified. They cannot resubmit unless rejected by admin.

### Error: "At least one file must be provided for resubmission"
**Solution:** Must upload at least one file (profile photo, ID, or certificate).

### Error: "Phone number already in use"
**Solution:** The new phone number is registered with another account. Use a different number.

### Error: "Please verify OTP first"
**Solution:** Must request OTP and verify it before updating profile.

### Error: "OTP has expired. Please request a new OTP."
**Solution:** OTP is only valid for 5 minutes. Request a new one.

---

## 📊 Status Flow Diagram

```
Provider Verification Status Flow:

pending → (admin reviews) → verified ✅
                          → rejected ❌
                                ↓
                          (provider resubmits)
                                ↓
                            pending
                                ↓
                          (admin reviews)
                                ↓
                            verified ✅
```

---

## 🔗 Related Endpoints

- `GET /api/provider/provider-profile` - Get current profile
- `POST /api/verification/provider/resubmit` - Resubmit documents
- `POST /api/provider/profile/request-otp` - Request OTP for edit
- `PUT /api/provider/profile` - Update profile with OTP
- `POST /api/provider/forgot-password` - Reset password flow

---

## 📞 Support

For issues or questions:
- Check backend logs for detailed error messages
- Ensure JWT token is valid and not expired
- Verify file formats and sizes meet requirements
- Contact admin if verification is stuck in "pending" for too long

---

**Last Updated:** October 15, 2025  
**API Version:** 1.0  
**Backend:** Node.js + Express + Prisma + Cloudinary
