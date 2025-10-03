# Verification System API Documentation

## Overview
The Verification System provides a comprehensive workflow for admin approval/rejection of customer and service provider verification requests, with rejection reasons and re-submission capabilities.

## Base URL
```
http://localhost:3000/api/verification
```

## Verification Status Flow

```
Initial State → pending (when user submits documents)
              ↓
Admin Review  → approved (verified = true)
              → rejected (with reason)
              ↓
If Rejected   → User can re-submit → back to pending
```

---

## Profile Edit Endpoints (OTP Authentication)

### Overview
Profile editing requires two-step OTP (One-Time Password) verification for security:
1. **Request OTP**: System sends 6-digit code to current email
2. **Verify & Update**: Submit OTP with profile changes

Both customer and provider profile edits follow this secure pattern.

---

### Customer Profile Edit

#### Step 1: Request Profile Update OTP
Request OTP to be sent to customer's current email address.

**Endpoint:** `POST /auth/customer-profile/request-otp`

**Authentication:** Customer token required

**Request Example:**
```http
POST /auth/customer-profile/request-otp
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email address: jo***@example.com",
  "data": {
    "maskedEmail": "jo***@example.com",
    "expiresIn": "10 minutes"
  }
}
```

**Notes:**
- OTP is 6 digits (e.g., 123456)
- Valid for 10 minutes
- Sent to customer's current email
- Email is masked in response for privacy

---

#### Step 2: Verify OTP and Update Profile
Submit OTP and new profile data to update.

**Endpoint:** `PUT /auth/customer-profile`

**Authentication:** Customer token required

**Query Parameters:**
- `otp` (required): 6-digit OTP received via email

**Request Body:** (all fields optional, provide only what needs updating)
```json
{
  "phone_number": "+1234567890",
  "email": "newemail@example.com",
  "user_location": "New York, NY",
  "exact_location": "123 Main St, Apt 4B, New York, NY 10001"
}
```

**Request Example:**
```http
PUT /auth/customer-profile?otp=123456
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "phone_number": "+1234567890",
  "email": "newemail@example.com",
  "user_location": "New York, NY",
  "exact_location": "123 Main St, Apt 4B"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "newemail@example.com",
    "phone_number": "+1234567890",
    "user_location": "New York, NY",
    "exact_location": "123 Main St, Apt 4B",
    "updated_at": "2025-10-03T14:30:00.000Z"
  }
}
```

**Validation Rules:**
- At least one field must be provided
- Email must be unique (not used by any customer or provider)
- Phone number must be unique (not used by any customer or provider)
- OTP must be valid and not expired
- OTP is automatically deleted after successful update

**Error Responses:**
```json
// Invalid OTP
{
  "success": false,
  "message": "Invalid or expired OTP"
}

// Email already exists
{
  "success": false,
  "message": "Email is already registered"
}

// Phone already exists
{
  "success": false,
  "message": "Phone number is already registered"
}

// No fields provided
{
  "success": false,
  "message": "At least one field must be provided for update"
}
```

---

### Provider Profile Edit

#### Step 1: Request Profile Update OTP
Request OTP to be sent to provider's current email address.

**Endpoint:** `POST /auth/profile/request-otp`

**Authentication:** Provider token required

**Request Example:**
```http
POST /auth/profile/request-otp
Authorization: Bearer <provider_token>
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email address: ja***@example.com",
  "data": {
    "maskedEmail": "ja***@example.com",
    "expiresIn": "10 minutes"
  }
}
```

---

#### Step 2: Verify OTP and Update Profile
Submit OTP and new profile data to update.

**Endpoint:** `PUT /auth/profile`

**Authentication:** Provider token required

**Query Parameters:**
- `otp` (required): 6-digit OTP received via email

**Request Body:** (all fields optional, provide only what needs updating)
```json
{
  "provider_phone_number": "+0987654321",
  "provider_email": "newprovider@example.com",
  "provider_location": "Los Angeles, CA",
  "exact_location": "456 Business Ave, Suite 200, Los Angeles, CA 90001"
}
```

**Request Example:**
```http
PUT /auth/profile?otp=654321
Authorization: Bearer <provider_token>
Content-Type: application/json

{
  "provider_phone_number": "+0987654321",
  "provider_email": "newprovider@example.com",
  "provider_location": "Los Angeles, CA",
  "exact_location": "456 Business Ave, Suite 200"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider profile updated successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "newprovider@example.com",
    "provider_phone_number": "+0987654321",
    "provider_location": "Los Angeles, CA",
    "exact_location": "456 Business Ave, Suite 200",
    "updated_at": "2025-10-03T14:30:00.000Z"
  }
}
```

**Validation Rules:**
- At least one field must be provided
- Email must be unique (not used by any customer or provider)
- Phone number must be unique (not used by any customer or provider)
- OTP must be valid and not expired
- OTP is automatically deleted after successful update

---

### Frontend Integration Example (React Native)

```jsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';

const EditProfileWithOTP = ({ token, userType }) => {
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = verify and update
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [exactLocation, setExactLocation] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3000';
  const isCustomer = userType === 'customer';

  // Step 1: Request OTP
  const requestOTP = async () => {
    setLoading(true);
    try {
      const endpoint = isCustomer 
        ? '/auth/customer-profile/request-otp'
        : '/auth/profile/request-otp';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setMaskedEmail(data.data.maskedEmail);
        setStep(2);
        Alert.alert('Success', data.message);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Update Profile
  const updateProfile = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }

    if (!email && !phone && !location && !exactLocation) {
      Alert.alert('Error', 'Please provide at least one field to update');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isCustomer 
        ? `/auth/customer-profile?otp=${otp}`
        : `/auth/profile?otp=${otp}`;

      const body = isCustomer ? {
        ...(email && { email }),
        ...(phone && { phone_number: phone }),
        ...(location && { user_location: location }),
        ...(exactLocation && { exact_location: exactLocation })
      } : {
        ...(email && { provider_email: email }),
        ...(phone && { provider_phone_number: phone }),
        ...(location && { provider_location: location }),
        ...(exactLocation && { exact_location: exactLocation })
      };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', data.message);
        // Reset form
        setStep(1);
        setOtp('');
        setEmail('');
        setPhone('');
        setLocation('');
        setExactLocation('');
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Edit Profile
      </Text>

      {step === 1 ? (
        // Step 1: Request OTP
        <View>
          <Text style={{ marginBottom: 15 }}>
            Click the button below to receive a verification code via email.
          </Text>
          <Button 
            title={loading ? "Sending..." : "Request Verification Code"}
            onPress={requestOTP}
            disabled={loading}
          />
        </View>
      ) : (
        // Step 2: Enter OTP and Update Profile
        <View>
          <Text style={{ marginBottom: 15, color: 'green' }}>
            ✅ OTP sent to: {maskedEmail}
          </Text>
          <Text style={{ marginBottom: 15 }}>
            Check your email and enter the 6-digit code below:
          </Text>

          <TextInput
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
          />

          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Update Profile Information:
          </Text>

          <TextInput
            placeholder="New Email (optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="New Phone Number (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="New Location (optional)"
            value={location}
            onChangeText={setLocation}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="New Exact Address (optional)"
            value={exactLocation}
            onChangeText={setExactLocation}
            multiline
            style={{ borderWidth: 1, padding: 10, marginBottom: 15, height: 60 }}
          />

          <Button 
            title={loading ? "Updating..." : "Verify & Update Profile"}
            onPress={updateProfile}
            disabled={loading}
          />

          <Button 
            title="Cancel"
            onPress={() => {
              setStep(1);
              setOtp('');
              setEmail('');
              setPhone('');
              setLocation('');
              setExactLocation('');
            }}
            color="gray"
          />
        </View>
      )}
    </View>
  );
};

export default EditProfileWithOTP;
```

---

### Security Features

**OTP Protection:**
- 6-digit random code (100,000 - 999,999)
- 10-minute expiration window
- Single-use only (deleted after successful update)
- Stored securely in OTPVerification table

**Email Privacy:**
- Email addresses are masked in responses
- Example: `john.doe@example.com` → `jo***@example.com`

**Uniqueness Validation:**
- Email and phone validated across BOTH customer and provider tables
- Prevents duplicate accounts
- Ensures data integrity

**Authentication:**
- JWT token required for all requests
- User can only edit their own profile
- Admin cannot edit user profiles through these endpoints

---

### Testing Workflow

**Customer Profile Edit:**
```bash
# 1. Request OTP
curl -X POST http://localhost:3000/auth/customer-profile/request-otp \
  -H "Authorization: Bearer <customer_token>"

# Check email for OTP (e.g., 123456)

# 2. Update profile with OTP
curl -X PUT "http://localhost:3000/auth/customer-profile?otp=123456" \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "phone_number": "+1234567890",
    "user_location": "New York, NY",
    "exact_location": "123 Main St, Apt 4B"
  }'
```

**Provider Profile Edit:**
```bash
# 1. Request OTP
curl -X POST http://localhost:3000/auth/profile/request-otp \
  -H "Authorization: Bearer <provider_token>"

# Check email for OTP (e.g., 654321)

# 2. Update profile with OTP
curl -X PUT "http://localhost:3000/auth/profile?otp=654321" \
  -H "Authorization: Bearer <provider_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_email": "newprovider@example.com",
    "provider_phone_number": "+0987654321",
    "provider_location": "Los Angeles, CA",
    "exact_location": "456 Business Ave, Suite 200"
  }'
```

---

## Admin Endpoints

### 1. Get Pending Verifications
Get all pending verification requests for review.

**Endpoint:** `GET /api/verification/admin/pending`

**Authentication:** Admin token required

**Query Parameters:**
- `type` (optional): Filter by type
  - `customer` - Only customer verifications
  - `provider` - Only provider verifications
  - `all` - Both types (default)

**Request Example:**
```http
GET /api/verification/admin/pending?type=all
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Pending verifications fetched successfully",
  "data": {
    "customers": [
      {
        "user_id": 123,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "+1234567890",
        "profile_photo": "https://cloudinary.../profile.jpg",
        "valid_id": "https://cloudinary.../id.jpg",
        "user_location": "New York, NY",
        "verification_status": "pending",
        "verification_submitted_at": "2025-10-01T10:00:00.000Z",
        "created_at": "2025-09-25T08:00:00.000Z",
        "rejection_reason": null
      }
    ],
    "providers": [
      {
        "provider_id": 456,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane@example.com",
        "provider_phone_number": "+0987654321",
        "provider_profile_photo": "https://cloudinary.../profile.jpg",
        "provider_valid_id": "https://cloudinary.../id.jpg",
        "provider_location": "Los Angeles, CA",
        "verification_status": "pending",
        "verification_submitted_at": "2025-10-01T09:30:00.000Z",
        "created_at": "2025-09-20T14:00:00.000Z",
        "rejection_reason": null,
        "provider_certificates": [
          {
            "certificate_id": 1,
            "certificate_image": "https://cloudinary.../cert1.jpg",
            "created_at": "2025-09-20T14:15:00.000Z"
          }
        ]
      }
    ],
    "total": {
      "customers": 1,
      "providers": 1
    }
  }
}
```

---

### 2. Approve Customer Verification
Approve a customer's verification request.

**Endpoint:** `POST /api/verification/admin/customer/:user_id/approve`

**Authentication:** Admin token required

**Request Example:**
```http
POST /api/verification/admin/customer/123/approve
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Customer verification approved successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "is_verified": true,
    "verification_status": "approved",
    "verification_reviewed_at": "2025-10-01T12:00:00.000Z",
    "rejection_reason": null
  }
}
```

**Email Sent to Customer:**
- Subject: "✅ Your Fixmo Account Has Been Verified!"
- Content: Welcome message with next steps

---

### 3. Approve Provider Verification
Approve a service provider's verification request.

**Endpoint:** `POST /api/verification/admin/provider/:provider_id/approve`

**Authentication:** Admin token required

**Request Example:**
```http
POST /api/verification/admin/provider/456/approve
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Provider verification approved successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane@example.com",
    "provider_isVerified": true,
    "verification_status": "approved",
    "verification_reviewed_at": "2025-10-01T12:00:00.000Z",
    "rejection_reason": null
  }
}
```

**Email Sent to Provider:**
- Subject: "✅ Your Fixmo Provider Account Has Been Verified!"
- Content: Welcome message with provider features

---

### 4. Reject Customer Verification
Reject a customer's verification with a specific reason.

**Endpoint:** `POST /api/verification/admin/customer/:user_id/reject`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "rejection_reason": "The ID photo is blurry and the text is not readable. Please upload a clearer image."
}
```

**Request Example:**
```http
POST /api/verification/admin/customer/123/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "rejection_reason": "The ID photo is blurry and the text is not readable. Please upload a clearer image."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customer verification rejected successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "The ID photo is blurry and the text is not readable. Please upload a clearer image.",
    "verification_reviewed_at": "2025-10-01T12:00:00.000Z"
  }
}
```

**Email Sent to Customer:**
- Subject: "⚠️ Fixmo Account Verification Update Required"
- Content: Rejection reason and re-submission instructions

**Common Rejection Reasons:**
- "ID photo is blurry or unclear"
- "ID document has expired"
- "Name on ID doesn't match account name"
- "ID photo is incomplete or cropped"
- "Invalid or fake ID document detected"
- "Photo quality too low to verify"

---

### 5. Reject Provider Verification
Reject a service provider's verification with a specific reason.

**Endpoint:** `POST /api/verification/admin/provider/:provider_id/reject`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "rejection_reason": "Certificate images are not clear enough. Please provide higher resolution images of your professional certificates."
}
```

**Request Example:**
```http
POST /api/verification/admin/provider/456/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "rejection_reason": "Certificate images are not clear enough. Please provide higher resolution images of your professional certificates."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider verification rejected successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane@example.com",
    "provider_isVerified": false,
    "verification_status": "rejected",
    "rejection_reason": "Certificate images are not clear enough. Please provide higher resolution images of your professional certificates.",
    "verification_reviewed_at": "2025-10-01T12:00:00.000Z"
  }
}
```

**Email Sent to Provider:**
- Subject: "⚠️ Fixmo Provider Verification Update Required"
- Content: Rejection reason and re-submission instructions

**Common Rejection Reasons:**
- "Professional certificates are missing or incomplete"
- "Certificate images are blurry or unreadable"
- "Certificates have expired"
- "ID document quality is insufficient"
- "Missing required trade license or certification"
- "Cannot verify authenticity of provided certificates"

---

## Customer Endpoints

### 6. Get Verification Status
Get current verification status for the authenticated customer.

**Endpoint:** `GET /api/verification/customer/status`

**Authentication:** Customer token required

**Request Example:**
```http
GET /api/verification/customer/status
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "The ID photo is blurry and the text is not readable. Please upload a clearer image.",
    "verification_submitted_at": "2025-10-01T10:00:00.000Z",
    "verification_reviewed_at": "2025-10-01T12:00:00.000Z",
    "valid_id": "https://cloudinary.../id.jpg",
    "profile_photo": "https://cloudinary.../profile.jpg"
  }
}
```

**Status Values:**
- `pending` - Submitted and waiting for admin review
- `approved` - Verified by admin
- `rejected` - Rejected by admin (check rejection_reason)

---

### 7. Re-submit Customer Verification
Re-submit verification documents after rejection.

**Endpoint:** `POST /api/verification/customer/resubmit`

**Authentication:** Customer token required

**Request Body:**
```json
{
  "valid_id_url": "https://cloudinary.../new_id_photo.jpg"
}
```

**Request Example:**
```http
POST /api/verification/customer/resubmit
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "valid_id_url": "https://cloudinary.../new_id_photo.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "user_id": 123,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-01T14:00:00.000Z"
  }
}
```

**Frontend Workflow:**
1. User uploads new ID photo to Cloudinary
2. Get the Cloudinary URL
3. Call this endpoint with the URL
4. Status changes from "rejected" to "pending"
5. Admin can review again

---

## Provider Endpoints

### 8. Get Provider Verification Status
Get current verification status for the authenticated provider.

**Endpoint:** `GET /api/verification/provider/status`

**Authentication:** Provider token required

**Request Example:**
```http
GET /api/verification/provider/status
Authorization: Bearer <provider_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane@example.com",
    "provider_isVerified": false,
    "verification_status": "rejected",
    "rejection_reason": "Certificate images are not clear enough. Please provide higher resolution images of your professional certificates.",
    "verification_submitted_at": "2025-10-01T09:30:00.000Z",
    "verification_reviewed_at": "2025-10-01T11:30:00.000Z",
    "provider_valid_id": "https://cloudinary.../id.jpg",
    "provider_profile_photo": "https://cloudinary.../profile.jpg",
    "provider_certificates": [
      {
        "certificate_id": 1,
        "certificate_image": "https://cloudinary.../cert1.jpg",
        "created_at": "2025-09-20T14:15:00.000Z"
      }
    ]
  }
}
```

---

### 9. Re-submit Provider Verification
Re-submit verification documents after rejection.

**Endpoint:** `POST /api/verification/provider/resubmit`

**Authentication:** Provider token required

**Request Body:**
```json
{
  "valid_id_url": "https://cloudinary.../new_id_photo.jpg",
  "certificate_urls": [
    "https://cloudinary.../cert1_new.jpg",
    "https://cloudinary.../cert2_new.jpg"
  ]
}
```

**Request Example:**
```http
POST /api/verification/provider/resubmit
Authorization: Bearer <provider_token>
Content-Type: application/json

{
  "valid_id_url": "https://cloudinary.../new_id_photo.jpg",
  "certificate_urls": [
    "https://cloudinary.../cert1_new.jpg",
    "https://cloudinary.../cert2_new.jpg"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "provider_id": 456,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-01T14:00:00.000Z"
  }
}
```

**Frontend Workflow:**
1. User uploads new ID and certificate photos to Cloudinary
2. Get the Cloudinary URLs
3. Call this endpoint with the URLs
4. Old certificates are deleted and replaced with new ones
5. Status changes from "rejected" to "pending"
6. Admin can review again

---

## Frontend Integration Guide

### Customer Re-Verification Modal (React Native Example)

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const CustomerVerificationModal = ({ userId, token }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/verification/customer/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStatus(data.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch verification status');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      uploadAndResubmit(result.assets[0].uri);
    }
  };

  const uploadAndResubmit = async (imageUri) => {
    setLoading(true);
    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'id_photo.jpg'
      });
      formData.append('upload_preset', 'your_preset');

      const cloudinaryResponse = await fetch(
        'https://api.cloudinary.com/v1_1/your_cloud_name/image/upload',
        { method: 'POST', body: formData }
      );
      const cloudinaryData = await cloudinaryResponse.json();

      // 2. Resubmit verification
      const response = await fetch(`${API_URL}/api/verification/customer/resubmit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          valid_id_url: cloudinaryData.secure_url
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', data.message);
        fetchVerificationStatus(); // Refresh status
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resubmit verification');
    } finally {
      setLoading(false);
    }
  };

  if (!status) return <Text>Loading...</Text>;

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
        Verification Status
      </Text>
      
      {status.verification_status === 'pending' && (
        <View>
          <Text>⏳ Your verification is being reviewed</Text>
          <Text>Submitted: {new Date(status.verification_submitted_at).toLocaleDateString()}</Text>
        </View>
      )}

      {status.verification_status === 'approved' && (
        <View>
          <Text style={{ color: 'green' }}>✅ Verified</Text>
        </View>
      )}

      {status.verification_status === 'rejected' && (
        <View>
          <Text style={{ color: 'red' }}>❌ Verification Rejected</Text>
          <View style={{ backgroundColor: '#fff3e0', padding: 10, marginVertical: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>Reason:</Text>
            <Text>{status.rejection_reason}</Text>
          </View>
          <Button 
            title={loading ? "Uploading..." : "Re-submit Verification"}
            onPress={pickImage}
            disabled={loading}
          />
        </View>
      )}
    </View>
  );
};

export default CustomerVerificationModal;
```

### Admin Verification Panel (React Example)

```jsx
import React, { useState, useEffect } from 'react';

const AdminVerificationPanel = ({ adminToken }) => {
  const [pending, setPending] = useState({ customers: [], providers: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      const response = await fetch(`${API_URL}/api/verification/admin/pending?type=all`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await response.json();
      setPending(data.data);
    } catch (error) {
      alert('Failed to fetch verifications');
    }
  };

  const approveCustomer = async (userId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/verification/admin/customer/${userId}/approve`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        alert('Customer approved!');
        fetchPendingVerifications();
      }
    } catch (error) {
      alert('Failed to approve customer');
    } finally {
      setLoading(false);
    }
  };

  const rejectCustomer = async (userId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/verification/admin/customer/${userId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ rejection_reason: reason })
        }
      );
      const data = await response.json();
      if (data.success) {
        alert('Customer rejected with reason sent');
        fetchPendingVerifications();
      }
    } catch (error) {
      alert('Failed to reject customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Pending Customer Verifications ({pending.customers.length})</h2>
      {pending.customers.map(customer => (
        <div key={customer.user_id} style={{ border: '1px solid #ccc', padding: 10, margin: 10 }}>
          <h3>{customer.first_name} {customer.last_name}</h3>
          <p>Email: {customer.email}</p>
          <p>Phone: {customer.phone_number}</p>
          <img src={customer.valid_id} alt="ID" style={{ maxWidth: 300 }} />
          <div>
            <button onClick={() => approveCustomer(customer.user_id)} disabled={loading}>
              ✅ Approve
            </button>
            <button onClick={() => rejectCustomer(customer.user_id)} disabled={loading}>
              ❌ Reject
            </button>
          </div>
        </div>
      ))}

      {/* Similar for providers */}
    </div>
  );
};
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Rejection reason is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Customer not found"
}
```

### 401 Unauthorized
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
  "message": "Failed to approve verification",
  "error": "Error details"
}
```

---

## Database Schema Changes

The following fields were added to support this system:

### User Table (Customers)
```sql
verification_status VARCHAR DEFAULT 'pending'  -- pending, approved, rejected
rejection_reason TEXT                          -- Null if approved or pending
verification_submitted_at TIMESTAMP            -- When user submitted
verification_reviewed_at TIMESTAMP             -- When admin reviewed
```

### ServiceProviderDetails Table (Providers)
```sql
verification_status VARCHAR DEFAULT 'pending'
rejection_reason TEXT
verification_submitted_at TIMESTAMP
verification_reviewed_at TIMESTAMP
```

---

## Migration Command

After updating the schema, run:

```bash
npx prisma migrate dev --name add_verification_system
npx prisma generate
```

---

## Testing Checklist

- [ ] Admin can view pending verifications
- [ ] Admin can approve customer verification
- [ ] Admin can approve provider verification
- [ ] Admin can reject with reason (customer)
- [ ] Admin can reject with reason (provider)
- [ ] Customer receives approval email
- [ ] Customer receives rejection email with reason
- [ ] Provider receives approval email
- [ ] Provider receives rejection email with reason
- [ ] Customer can check verification status
- [ ] Provider can check verification status
- [ ] Customer can re-submit after rejection
- [ ] Provider can re-submit after rejection
- [ ] Status changes correctly (rejected → pending after resubmit)
- [ ] Rejection reason is cleared after resubmit
- [ ] Cannot approve already verified users
- [ ] Cannot resubmit if already approved

---

This comprehensive system provides a complete verification workflow with admin control, user notifications, and re-submission capabilities!
