# 🔐 Authentication API Documentation

## Overview
Complete authentication system documentation for Fixmo Backend API including customer and service provider registration, login, and password recovery flows.

---

## 📋 Table of Contents
1. [Customer Authentication](#customer-authentication)
   - [Customer Registration](#customer-registration)
   - [Customer Login](#customer-login)
   - [Customer Forgot Password](#customer-forgot-password)
2. [Service Provider Authentication](#service-provider-authentication)
   - [Provider Registration](#provider-registration)
   - [Provider Login](#provider-login)
   - [Provider Forgot Password](#provider-forgot-password)
3. [Authentication Headers](#authentication-headers)
4. [Error Responses](#error-responses)
5. [Security Features](#security-features)
6. [Frontend Integration Examples](#frontend-integration-examples)

---

## 🧑 Customer Authentication

### Base URL
```
/auth
```

### Customer Registration

Customer registration is a **two-step process** using OTP (One-Time Password) verification.

#### Step 1: Request OTP

**Endpoint:** `POST /auth/request-otp`

**Description:** Sends a 6-digit OTP to the customer's email for verification.

**Request Body:**
```json
{
  "email": "customer@example.com"
}
```

**Request with Files (Optional - for immediate registration):**
```http
POST /auth/request-otp
Content-Type: multipart/form-data

email: customer@example.com
profile_photo: [file]
valid_id: [file]
```

**Response (Success - 200):**
```json
{
  "message": "OTP sent to email"
}
```

**Response (Error - 400):**
```json
{
  "message": "User already exists"
}
```

**Response (Rate Limit - 429):**
```json
{
  "message": "Too many OTP requests. Please try again later."
}
```

**OTP Details:**
- **Format:** 6-digit number
- **Validity:** 10 minutes
- **Delivery:** Email
- **Rate Limit:** Limited requests per email per time period

---

#### Step 1.5: Verify OTP Only (Optional)

**Endpoint:** `POST /auth/verify-otp`

**Description:** Verifies the OTP without completing registration. Useful for checking OTP validity before submitting full registration form.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "otp": "123456"
}
```

**Response (Success - 200):**
```json
{
  "message": "OTP verified successfully"
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid or expired OTP"
}
```

---

#### Step 2: Verify OTP and Complete Registration

**Endpoint:** `POST /auth/verify-register`

**Description:** Verifies OTP and completes customer registration with all required information.

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Customer email address |
| `otp` | string | Yes | 6-digit OTP received via email |
| `password` | string | Yes | Account password (min 6 characters) |
| `userName` | string | Yes | Unique username |
| `first_name` | string | Yes | First name |
| `last_name` | string | Yes | Last name |
| `birthday` | string | Yes | Date of birth (YYYY-MM-DD) |
| `phone_number` | string | Yes | Contact phone number |
| `user_location` | string | Yes | General location/city |
| `user_exact_location` | string | No | Detailed address |
| `user_uli` | string | No | Universal Location Identifier |
| `profile_photo` | file | No | Profile image file |
| `valid_id` | file | No | Government ID photo |

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('email', 'customer@example.com');
formData.append('otp', '123456');
formData.append('password', 'securePassword123');
formData.append('userName', 'johndoe');
formData.append('first_name', 'John');
formData.append('last_name', 'Doe');
formData.append('birthday', '1990-01-15');
formData.append('phone_number', '+1234567890');
formData.append('user_location', 'New York, NY');
formData.append('user_exact_location', '123 Main St, Apt 4B');
formData.append('profile_photo', profilePhotoFile);
formData.append('valid_id', validIdFile);

const response = await fetch('/auth/verify-register', {
  method: 'POST',
  body: formData
});
```

**Response (Success - 201):**
```json
{
  "message": "User registered successfully",
  "userId": 123,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 123,
    "email": "customer@example.com",
    "userName": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "user_location": "New York, NY",
    "profile_photo": "https://cloudinary.../profile.jpg",
    "valid_id": "https://cloudinary.../id.jpg",
    "verification_status": "pending",
    "created_at": "2025-10-01T10:30:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid or expired OTP"
}
```

```json
{
  "message": "Phone number is already registered with another account"
}
```

---

### Customer Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticates customer credentials and returns JWT token.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "securePassword123"
}
```

**Response (Success - 200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 123,
  "userName": "johndoe"
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid email or password"
}
```

**Response (Error - 400 - Missing Fields):**
```json
{
  "message": "Email and password are required"
}
```

**Token Details:**
- **Type:** JWT (JSON Web Token)
- **Expiration:** 30 days (mobile-friendly)
- **Payload:** 
  ```json
  {
    "userId": 123,
    "userType": "customer",
    "email": "customer@example.com"
  }
  ```

---

### Customer Forgot Password

Password reset is a **two-step process** using OTP verification.

#### Step 1: Request Password Reset OTP

**Endpoint:** `POST /auth/forgot-password-request-otp`

**Description:** Sends OTP to customer's email for password reset verification.

**Request Body:**
```json
{
  "email": "customer@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "OTP sent to your email"
}
```

**Response (Error - 404):**
```json
{
  "message": "User not found"
}
```

---

#### Step 2: Verify OTP and Reset Password

**Endpoint:** `POST /auth/forgot-password-verify-otp`

**Description:** Verifies OTP and sets new password for the customer account.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword456"
}
```

**Response (Success - 200):**
```json
{
  "message": "Password reset successful"
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid or expired OTP"
}
```

**Response (Error - 404):**
```json
{
  "message": "User not found"
}
```

---

## 🛠️ Service Provider Authentication

### Base URL
```
/auth
```

### Provider Registration

Service provider registration is a **three-step process** with OTP verification and file uploads.

#### Step 1: Request Provider OTP

**Endpoint:** `POST /auth/provider-request-otp`

**Description:** Sends 6-digit OTP to provider's email for verification.

**Request Body:**
```json
{
  "provider_email": "provider@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "OTP sent to provider email"
}
```

**Response (Error - 400):**
```json
{
  "message": "Provider already exists"
}
```

**OTP Details:**
- **Format:** 6-digit number
- **Validity:** 10 minutes
- **Delivery:** Email

---

#### Step 2: Verify Provider OTP Only (Optional)

**Endpoint:** `POST /auth/provider-verify-otp`

**Description:** Verifies the OTP without completing registration.

**Request Body:**
```json
{
  "provider_email": "provider@example.com",
  "otp": "123456"
}
```

**Response (Success - 200):**
```json
{
  "message": "OTP verified successfully"
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid or expired OTP"
}
```

---

#### Step 3: Verify OTP and Complete Provider Registration

**Endpoint:** `POST /auth/provider-verify-register`

**Description:** Verifies OTP and completes service provider registration with all required information including certificates.

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_email` | string | Yes | Provider email address |
| `otp` | string | Yes | 6-digit OTP received via email |
| `provider_password` | string | Yes | Account password |
| `provider_userName` | string | Yes | Unique username |
| `provider_first_name` | string | Yes | First name |
| `provider_last_name` | string | Yes | Last name |
| `provider_birthday` | string | Yes | Date of birth (YYYY-MM-DD) |
| `provider_phone_number` | string | Yes | Contact phone number |
| `provider_location` | string | Yes | Service area/city |
| `provider_exact_location` | string | No | Detailed address |
| `provider_uli` | string | No | Universal Location Identifier |
| `professions` | string | Yes | JSON array of profession IDs: `["1", "2"]` |
| `experiences` | string | Yes | JSON array of experience years: `["5", "3"]` |
| `certificateNames` | string | Yes | JSON array of certificate names |
| `certificateNumbers` | string | Yes | JSON array of certificate numbers |
| `expiryDates` | string | Yes | JSON array of expiry dates (YYYY-MM-DD) |
| `provider_profile_photo` | file | No | Profile image file |
| `provider_valid_id` | file | No | Government ID photo |
| `certificates` | file[] | Yes | Certificate images (multiple files) |

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('provider_email', 'provider@example.com');
formData.append('otp', '123456');
formData.append('provider_password', 'securePassword123');
formData.append('provider_userName', 'johnplumber');
formData.append('provider_first_name', 'John');
formData.append('provider_last_name', 'Smith');
formData.append('provider_birthday', '1985-05-20');
formData.append('provider_phone_number', '+1234567890');
formData.append('provider_location', 'Los Angeles, CA');
formData.append('provider_exact_location', '456 Oak Ave');

// Professions and experiences (must be JSON arrays as strings)
formData.append('professions', JSON.stringify([1, 3])); // Profession IDs
formData.append('experiences', JSON.stringify([5, 3])); // Years of experience

// Certificate details (must be JSON arrays as strings)
formData.append('certificateNames', JSON.stringify([
  'Plumbing License',
  'HVAC Certification'
]));
formData.append('certificateNumbers', JSON.stringify([
  'PL-12345',
  'HVAC-67890'
]));
formData.append('expiryDates', JSON.stringify([
  '2026-12-31',
  '2027-06-30'
]));

// Files
formData.append('provider_profile_photo', profilePhotoFile);
formData.append('provider_valid_id', validIdFile);
formData.append('certificates', certificateFile1);
formData.append('certificates', certificateFile2);

const response = await fetch('/auth/provider-verify-register', {
  method: 'POST',
  body: formData
});
```

**Response (Success - 201):**
```json
{
  "message": "Provider registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerId": 456,
  "provider": {
    "provider_id": 456,
    "provider_email": "provider@example.com",
    "provider_userName": "johnplumber",
    "provider_first_name": "John",
    "provider_last_name": "Smith",
    "provider_phone_number": "+1234567890",
    "provider_location": "Los Angeles, CA",
    "provider_profile_photo": "https://cloudinary.../profile.jpg",
    "provider_valid_id": "https://cloudinary.../id.jpg",
    "verification_status": "pending",
    "created_at": "2025-10-01T11:00:00.000Z"
  },
  "certificates": [
    {
      "certificate_id": 1,
      "certificate_name": "Plumbing License",
      "certificate_number": "PL-12345",
      "expiry_date": "2026-12-31",
      "certificate_image": "https://cloudinary.../cert1.jpg",
      "approval_status": "pending"
    },
    {
      "certificate_id": 2,
      "certificate_name": "HVAC Certification",
      "certificate_number": "HVAC-67890",
      "expiry_date": "2027-06-30",
      "certificate_image": "https://cloudinary.../cert2.jpg",
      "approval_status": "pending"
    }
  ],
  "professions": [
    {
      "profession_id": 1,
      "profession_name": "Plumber",
      "experience_years": 5
    },
    {
      "profession_id": 3,
      "profession_name": "HVAC Technician",
      "experience_years": 3
    }
  ]
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid or expired OTP"
}
```

```json
{
  "message": "Phone number is already registered with a service provider account"
}
```

---

### Provider Login

**Endpoint:** `POST /auth/provider-login` or `POST /auth/loginProvider`

**Description:** Authenticates service provider credentials and returns JWT token with session creation.

**Request Body:**
```json
{
  "provider_email": "provider@example.com",
  "provider_password": "securePassword123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerId": 456,
  "providerUserName": "johnplumber",
  "userType": "provider",
  "provider": {
    "id": 456,
    "firstName": "John",
    "lastName": "Smith",
    "email": "provider@example.com",
    "userName": "johnplumber"
  }
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid email or password"
}
```

**Token Details:**
- **Type:** JWT (JSON Web Token)
- **Expiration:** 30 days (mobile-friendly)
- **Payload:**
  ```json
  {
    "userId": 456,
    "id": 456,
    "providerId": 456,
    "userType": "provider",
    "email": "provider@example.com"
  }
  ```

**Session Details:**
- Session cookie created with provider information
- Stored in Express session
- Includes login timestamp

---

### Provider Forgot Password

Password reset is a **two-step process** using OTP verification.

#### Step 1: Request Provider Password Reset OTP

**Endpoint:** `POST /auth/provider-forgot-password-request-otp`

**Description:** Sends OTP to provider's email for password reset verification.

**Request Body:**
```json
{
  "provider_email": "provider@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "OTP sent to your email"
}
```

**Response (Error - 404):**
```json
{
  "message": "Provider not found"
}
```

---

#### Step 2: Verify OTP and Reset Provider Password

**Endpoint:** `POST /auth/provider-forgot-password-verify-otp`

**Description:** Verifies OTP and sets new password for the provider account.

**Request Body:**
```json
{
  "provider_email": "provider@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword456"
}
```

**Response (Success - 200):**
```json
{
  "message": "Password reset successful"
}
```

**Response (Error - 400):**
```json
{
  "message": "Invalid or expired OTP"
}
```

**Response (Error - 404):**
```json
{
  "message": "Provider not found"
}
```

---

## 🔑 Authentication Headers

### Using JWT Tokens

After successful login or registration, include the JWT token in subsequent API requests:

**Header Format:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request:**
```javascript
const response = await fetch('/api/protected-endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## ❌ Error Responses

### Common Error Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| `400` | Bad Request | Invalid input, missing required fields, invalid credentials |
| `401` | Unauthorized | Invalid or expired token, missing authorization header |
| `404` | Not Found | User/Provider not found |
| `429` | Too Many Requests | Rate limit exceeded for OTP requests |
| `500` | Internal Server Error | Server-side error, database connection issues |

### Error Response Format

```json
{
  "message": "Descriptive error message"
}
```

**Examples:**

**Missing Required Fields:**
```json
{
  "message": "Email and password are required"
}
```

**Invalid Credentials:**
```json
{
  "message": "Invalid email or password"
}
```

**Expired OTP:**
```json
{
  "message": "Invalid or expired OTP"
}
```

**Duplicate Registration:**
```json
{
  "message": "User already exists"
}
```

**Rate Limit:**
```json
{
  "message": "Too many OTP requests. Please try again later."
}
```

---

## 🔒 Security Features

### Password Security
- ✅ **Hashing:** All passwords are hashed using bcrypt before storage
- ✅ **Salt Rounds:** Configured salt rounds for bcrypt hashing
- ✅ **No Plain Text:** Passwords are never stored in plain text

### OTP Security
- ✅ **Time-Limited:** OTPs expire after 10 minutes
- ✅ **One-Time Use:** OTPs are deleted after successful verification
- ✅ **Rate Limiting:** Limited OTP requests per email to prevent abuse
- ✅ **Random Generation:** Cryptographically secure random 6-digit generation

### JWT Security
- ✅ **Secret Key:** Tokens signed with secret key from environment variables
- ✅ **Expiration:** Tokens have defined expiration times (1h for customers, 24h for providers)
- ✅ **Payload Verification:** Token payload includes user type for role-based access

### File Upload Security
- ✅ **Cloudinary Integration:** Files uploaded to secure cloud storage
- ✅ **File Type Validation:** Only allowed file types accepted
- ✅ **Size Limits:** File size restrictions enforced

### Account Protection
- ✅ **Email Uniqueness:** Prevents duplicate accounts with same email
- ✅ **Phone Uniqueness:** Prevents duplicate accounts with same phone number
- ✅ **Username Uniqueness:** Ensures unique usernames across system

---

## 💻 Frontend Integration Examples

### React Native - Customer Registration Flow

```jsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const CustomerRegistration = () => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Complete Registration
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    userName: '',
    first_name: '',
    last_name: '',
    birthday: '',
    phone_number: '',
    user_location: '',
    user_exact_location: '',
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [validId, setValidId] = useState(null);

  // Step 1: Request OTP
  const requestOTP = async () => {
    try {
      const response = await fetch('http://your-api.com/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'OTP sent to your email');
        setStep(2);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  // Step 2: Complete Registration
  const completeRegistration = async () => {
    const formDataObj = new FormData();
    formDataObj.append('email', email);
    formDataObj.append('otp', otp);
    formDataObj.append('password', formData.password);
    formDataObj.append('userName', formData.userName);
    formDataObj.append('first_name', formData.first_name);
    formDataObj.append('last_name', formData.last_name);
    formDataObj.append('birthday', formData.birthday);
    formDataObj.append('phone_number', formData.phone_number);
    formDataObj.append('user_location', formData.user_location);
    formDataObj.append('user_exact_location', formData.user_exact_location);

    if (profilePhoto) {
      formDataObj.append('profile_photo', {
        uri: profilePhoto.uri,
        type: profilePhoto.type || 'image/jpeg',
        name: profilePhoto.fileName || 'profile.jpg'
      });
    }

    if (validId) {
      formDataObj.append('valid_id', {
        uri: validId.uri,
        type: validId.type || 'image/jpeg',
        name: validId.fileName || 'id.jpg'
      });
    }

    try {
      const response = await fetch('http://your-api.com/auth/verify-register', {
        method: 'POST',
        body: formDataObj
      });

      const data = await response.json();

      if (response.ok) {
        // Store token
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userId', data.userId.toString());
        Alert.alert('Success', 'Registration completed!');
        // Navigate to home screen
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    }
  };

  const pickImage = async (setImage) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  if (step === 1) {
    return (
      <View>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button title="Send OTP" onPress={requestOTP} />
      </View>
    );
  }

  return (
    <View>
      <TextInput placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
      <TextInput placeholder="Password" value={formData.password} onChangeText={(v) => setFormData({...formData, password: v})} secureTextEntry />
      <TextInput placeholder="Username" value={formData.userName} onChangeText={(v) => setFormData({...formData, userName: v})} />
      <TextInput placeholder="First Name" value={formData.first_name} onChangeText={(v) => setFormData({...formData, first_name: v})} />
      <TextInput placeholder="Last Name" value={formData.last_name} onChangeText={(v) => setFormData({...formData, last_name: v})} />
      <TextInput placeholder="Birthday (YYYY-MM-DD)" value={formData.birthday} onChangeText={(v) => setFormData({...formData, birthday: v})} />
      <TextInput placeholder="Phone Number" value={formData.phone_number} onChangeText={(v) => setFormData({...formData, phone_number: v})} keyboardType="phone-pad" />
      <TextInput placeholder="Location" value={formData.user_location} onChangeText={(v) => setFormData({...formData, user_location: v})} />
      
      <Button title="Pick Profile Photo" onPress={() => pickImage(setProfilePhoto)} />
      <Button title="Pick Valid ID" onPress={() => pickImage(setValidId)} />
      <Button title="Complete Registration" onPress={completeRegistration} />
    </View>
  );
};

export default CustomerRegistration;
```

---

### React Native - Customer Login

```jsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerLogin = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://your-api.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store authentication data
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userId', data.userId.toString());
        await AsyncStorage.setItem('userName', data.userName);
        await AsyncStorage.setItem('userType', 'customer');

        Alert.alert('Success', 'Login successful!');
        navigation.navigate('Home');
      } else {
        Alert.alert('Login Failed', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button 
        title={loading ? "Logging in..." : "Login"} 
        onPress={handleLogin}
        disabled={loading}
      />
      <Button 
        title="Forgot Password?" 
        onPress={() => navigation.navigate('ForgotPassword')}
      />
    </View>
  );
};

export default CustomerLogin;
```

---

### React Native - Forgot Password Flow

```jsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';

const ForgotPassword = ({ userType = 'customer' }) => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const emailField = userType === 'customer' ? 'email' : 'provider_email';
  const requestEndpoint = userType === 'customer' 
    ? '/auth/forgot-password-request-otp'
    : '/auth/provider-forgot-password-request-otp';
  const verifyEndpoint = userType === 'customer'
    ? '/auth/forgot-password-verify-otp'
    : '/auth/provider-forgot-password-verify-otp';

  // Step 1: Request OTP
  const requestOTP = async () => {
    try {
      const response = await fetch(`http://your-api.com${requestEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [emailField]: email })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'OTP sent to your email');
        setStep(2);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  // Step 2: Verify OTP and Reset Password
  const resetPassword = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Error', 'Please enter OTP and new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(`http://your-api.com${verifyEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [emailField]: email,
          otp,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Password reset successful! Please login with your new password.');
        // Navigate to login screen
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password');
    }
  };

  if (step === 1) {
    return (
      <View>
        <TextInput
          placeholder={userType === 'customer' ? "Email" : "Provider Email"}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button title="Send Reset OTP" onPress={requestOTP} />
      </View>
    );
  }

  return (
    <View>
      <TextInput
        placeholder="Enter OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TextInput
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <Button title="Reset Password" onPress={resetPassword} />
    </View>
  );
};

export default ForgotPassword;
```

---

### React Native - Provider Registration with Certificates

```jsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const ProviderRegistration = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    provider_password: '',
    provider_userName: '',
    provider_first_name: '',
    provider_last_name: '',
    provider_birthday: '',
    provider_phone_number: '',
    provider_location: '',
  });
  
  const [certificates, setCertificates] = useState([]);
  const [certificateDetails, setCertificateDetails] = useState([
    { name: '', number: '', expiryDate: '' }
  ]);
  
  const [professions, setProfessions] = useState([1]); // Profession IDs
  const [experiences, setExperiences] = useState([0]); // Years of experience

  // Step 1: Request OTP
  const requestOTP = async () => {
    try {
      const response = await fetch('http://your-api.com/auth/provider-request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_email: email })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'OTP sent to your email');
        setStep(2);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
    }
  };

  // Pick certificate files
  const pickCertificates = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: true,
      });

      if (result.type === 'success') {
        setCertificates([...certificates, result]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick certificate');
    }
  };

  // Add certificate details
  const addCertificate = () => {
    setCertificateDetails([...certificateDetails, { name: '', number: '', expiryDate: '' }]);
  };

  // Step 2: Complete Registration
  const completeRegistration = async () => {
    const formDataObj = new FormData();
    formDataObj.append('provider_email', email);
    formDataObj.append('otp', otp);
    formDataObj.append('provider_password', formData.provider_password);
    formDataObj.append('provider_userName', formData.provider_userName);
    formDataObj.append('provider_first_name', formData.provider_first_name);
    formDataObj.append('provider_last_name', formData.provider_last_name);
    formDataObj.append('provider_birthday', formData.provider_birthday);
    formDataObj.append('provider_phone_number', formData.provider_phone_number);
    formDataObj.append('provider_location', formData.provider_location);

    // Add professions and experiences as JSON strings
    formDataObj.append('professions', JSON.stringify(professions));
    formDataObj.append('experiences', JSON.stringify(experiences));

    // Add certificate details as JSON strings
    formDataObj.append('certificateNames', JSON.stringify(certificateDetails.map(c => c.name)));
    formDataObj.append('certificateNumbers', JSON.stringify(certificateDetails.map(c => c.number)));
    formDataObj.append('expiryDates', JSON.stringify(certificateDetails.map(c => c.expiryDate)));

    // Add certificate files
    certificates.forEach((cert, index) => {
      formDataObj.append('certificates', {
        uri: cert.uri,
        type: cert.mimeType || 'image/jpeg',
        name: cert.name || `certificate_${index}.jpg`
      });
    });

    try {
      const response = await fetch('http://your-api.com/auth/provider-verify-register', {
        method: 'POST',
        body: formDataObj
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('providerId', data.providerId.toString());
        Alert.alert('Success', 'Provider registration completed!');
        // Navigate to provider dashboard
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    }
  };

  if (step === 1) {
    return (
      <View>
        <TextInput
          placeholder="Provider Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button title="Send OTP" onPress={requestOTP} />
      </View>
    );
  }

  return (
    <ScrollView>
      <TextInput placeholder="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
      <TextInput placeholder="Password" value={formData.provider_password} onChangeText={(v) => setFormData({...formData, provider_password: v})} secureTextEntry />
      <TextInput placeholder="Username" value={formData.provider_userName} onChangeText={(v) => setFormData({...formData, provider_userName: v})} />
      <TextInput placeholder="First Name" value={formData.provider_first_name} onChangeText={(v) => setFormData({...formData, provider_first_name: v})} />
      <TextInput placeholder="Last Name" value={formData.provider_last_name} onChangeText={(v) => setFormData({...formData, provider_last_name: v})} />
      <TextInput placeholder="Birthday (YYYY-MM-DD)" value={formData.provider_birthday} onChangeText={(v) => setFormData({...formData, provider_birthday: v})} />
      <TextInput placeholder="Phone Number" value={formData.provider_phone_number} onChangeText={(v) => setFormData({...formData, provider_phone_number: v})} keyboardType="phone-pad" />
      <TextInput placeholder="Service Location" value={formData.provider_location} onChangeText={(v) => setFormData({...formData, provider_location: v})} />

      {certificateDetails.map((cert, index) => (
        <View key={index}>
          <TextInput 
            placeholder={`Certificate ${index + 1} Name`}
            value={cert.name}
            onChangeText={(v) => {
              const newDetails = [...certificateDetails];
              newDetails[index].name = v;
              setCertificateDetails(newDetails);
            }}
          />
          <TextInput 
            placeholder={`Certificate ${index + 1} Number`}
            value={cert.number}
            onChangeText={(v) => {
              const newDetails = [...certificateDetails];
              newDetails[index].number = v;
              setCertificateDetails(newDetails);
            }}
          />
          <TextInput 
            placeholder={`Expiry Date (YYYY-MM-DD)`}
            value={cert.expiryDate}
            onChangeText={(v) => {
              const newDetails = [...certificateDetails];
              newDetails[index].expiryDate = v;
              setCertificateDetails(newDetails);
            }}
          />
        </View>
      ))}

      <Button title="Add Another Certificate" onPress={addCertificate} />
      <Button title="Pick Certificate Files" onPress={pickCertificates} />
      <Button title="Complete Registration" onPress={completeRegistration} />
    </ScrollView>
  );
};

export default ProviderRegistration;
```

---

## 📊 Flow Diagrams

### Customer Registration Flow
```
1. User enters email
   ↓
2. System sends OTP to email
   ↓
3. User receives OTP (valid 10 minutes)
   ↓
4. User enters OTP + registration details + files
   ↓
5. System validates OTP
   ↓
6. System creates account + uploads files to Cloudinary
   ↓
7. System returns JWT token
   ↓
8. User is logged in (verification status: pending)
```

### Service Provider Registration Flow
```
1. Provider enters email
   ↓
2. System sends OTP to email
   ↓
3. Provider receives OTP (valid 10 minutes)
   ↓
4. Provider enters OTP + details + certificates
   ↓
5. System validates OTP
   ↓
6. System creates provider account
   ↓
7. System uploads files (ID, profile, certificates)
   ↓
8. System creates certificate records
   ↓
9. System creates profession associations
   ↓
10. System returns JWT token
    ↓
11. Provider is logged in (verification + cert approval pending)
```

### Login Flow
```
1. User enters email/password
   ↓
2. System validates credentials
   ↓
3. System generates JWT token
   ↓
4. System returns token + user info
   ↓
5. Client stores token
   ↓
6. Client includes token in subsequent requests
```

### Forgot Password Flow
```
1. User enters email
   ↓
2. System sends OTP to email
   ↓
3. User receives OTP (valid 10 minutes)
   ↓
4. User enters OTP + new password
   ↓
5. System validates OTP
   ↓
6. System hashes new password
   ↓
7. System updates password in database
   ↓
8. User can login with new password
```

---

## 🧪 Testing

### Test Credentials (Development Only)

**Customer:**
```
Email: test@customer.com
Password: test123
```

**Service Provider:**
```
Email: test@provider.com
Password: test123
```

### cURL Examples

**Customer Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'
```

**Provider Login:**
```bash
curl -X POST http://localhost:3000/auth/provider-login \
  -H "Content-Type: application/json" \
  -d '{
    "provider_email": "provider@example.com",
    "provider_password": "password123"
  }'
```

**Request OTP:**
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com"
  }'
```

**Request Forgot Password OTP:**
```bash
curl -X POST http://localhost:3000/auth/forgot-password-request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com"
  }'
```

---

## 📝 Notes

### Important Considerations

1. **OTP Expiration:** OTPs expire after 10 minutes. Request a new one if expired.

2. **File Uploads:** 
   - Use `multipart/form-data` for endpoints requiring file uploads
   - Supported file types: images (JPEG, PNG, etc.)
   - Files are uploaded to Cloudinary

3. **Verification Status:**
   - New registrations have `verification_status: "pending"`
   - Admin approval required for full access
   - Check verification endpoints for status updates

4. **Token Storage:**
   - Store tokens securely (AsyncStorage, SecureStore)
   - Include in Authorization header for protected routes
   - Refresh tokens before expiration

5. **Password Requirements:**
   - Minimum 6 characters
   - Hashed with bcrypt before storage

6. **Phone Number Format:**
   - Include country code (e.g., +1234567890)
   - Must be unique across all users and providers

7. **Provider Professions:**
   - Professions must be valid IDs from Profession table
   - Experience years can be 0 or positive integers

8. **Certificate Management:**
   - Providers must submit at least one certificate
   - Certificates require approval from admin
   - Expiry dates should be in the future

---

*Last Updated: October 1, 2025*
*API Version: 2.0.0*
*Base URL: http://localhost:3000 (Development)*
