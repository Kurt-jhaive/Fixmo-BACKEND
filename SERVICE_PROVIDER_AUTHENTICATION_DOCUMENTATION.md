# Service Provider Authentication API Documentation

## Overview
Complete authentication system for service providers including registration with OTP verification, login, and password recovery. The system includes certificate uploads, profession selection, and comprehensive profile setup.

## Base URL
```
http://localhost:3000/auth
```

---

## Table of Contents
1. [Registration Flow](#registration-flow)
2. [Login](#login)
3. [Forgot Password Flow](#forgot-password-flow)
4. [Authentication Headers](#authentication-headers)
5. [Frontend Integration Examples](#frontend-integration-examples)
6. [Error Handling](#error-handling)

---

## Registration Flow

### Step 1: Request OTP
Send OTP to provider's email for verification before registration.

**Endpoint:** `POST /auth/provider-request-otp`

**Request Body:**
```json
{
  "provider_email": "provider@example.com"
}
```

**Request Example:**
```http
POST /auth/provider-request-otp
Content-Type: application/json

{
  "provider_email": "john.smith@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "OTP sent to provider email"
}
```

**Error Responses:**

```json
// 400 - Provider already exists
{
  "message": "Provider already exists"
}

// 500 - Server error
{
  "message": "Error sending OTP"
}
```

**Notes:**
- OTP is a 6-digit code (e.g., 123456)
- OTP expires in 10 minutes
- Any previous OTPs for the same email are automatically deleted
- Email is sent using the configured SMTP service

---

### Step 2: Verify OTP and Complete Registration
Verify the OTP and register the service provider with all required information.

**Endpoint:** `POST /auth/provider-verify-register`

**Content-Type:** `multipart/form-data` (for file uploads)

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `otp` | string | Yes | 6-digit OTP received via email |
| `provider_email` | string | Yes | Provider's email address |
| `provider_password` | string | Yes | Password (min 8 characters) |
| `provider_first_name` | string | Yes | First name |
| `provider_last_name` | string | Yes | Last name |
| `provider_userName` | string | Yes | Unique username |
| `provider_phone_number` | string | Yes | Contact number |
| `provider_location` | string | Yes | General location/city |
| `provider_exact_location` | string | No | Detailed address |
| `provider_birthday` | string | Yes | Date of birth (YYYY-MM-DD) |
| `provider_uli` | string | No | Unified Lending Identifier |
| `professions` | JSON string | Yes | Array of profession IDs |
| `experiences` | JSON string | Yes | Array of years of experience per profession |
| `certificateNames` | JSON string | Yes | Array of certificate names |
| `certificateNumbers` | JSON string | Yes | Array of certificate numbers |
| `expiryDates` | JSON string | Yes | Array of expiry dates (YYYY-MM-DD) |
| `provider_profile_photo` | file | Yes | Profile photo (image file) |
| `provider_valid_id` | file | Yes | Valid ID photo (image file) |
| `certificate_images` | file[] | Yes | Array of certificate images |

**Request Example (FormData):**
```javascript
const formData = new FormData();
formData.append('otp', '123456');
formData.append('provider_email', 'john.smith@example.com');
formData.append('provider_password', 'SecurePass123');
formData.append('provider_first_name', 'John');
formData.append('provider_last_name', 'Smith');
formData.append('provider_userName', 'johnsmith_plumber');
formData.append('provider_phone_number', '+1234567890');
formData.append('provider_location', 'New York, NY');
formData.append('provider_exact_location', '100,200');
formData.append('provider_birthday', '1985-05-15');
formData.append('provider_uli', 'ULI123456789');

// Professions and experiences (arrays as JSON strings)
formData.append('professions', JSON.stringify([1, 3, 5])); // Profession IDs
formData.append('experiences', JSON.stringify([10, 5, 3])); // Years of experience

// Certificate details
formData.append('certificateNames', JSON.stringify(['Master Plumber License', 'HVAC Certification']));
formData.append('certificateNumbers', JSON.stringify(['MPL-12345', 'HVAC-67890']));
formData.append('expiryDates', JSON.stringify(['2026-12-31', '2025-08-15']));

// File uploads
formData.append('provider_profile_photo', profilePhotoFile);
formData.append('provider_valid_id', validIdFile);
formData.append('certificate_images', certificateFile1);
formData.append('certificate_images', certificateFile2);
```

**Success Response (201):**
```json
{
  "message": "Provider registered successfully! Please wait for admin verification.",
  "provider": {
    "provider_id": 123,
    "provider_first_name": "John",
    "provider_last_name": "Smith",
    "provider_userName": "johnsmith_plumber",
    "provider_email": "john.smith@example.com",
    "provider_phone_number": "+1234567890",
    "provider_location": "New York, NY",
    "provider_exact_location": "123 Main St, Apt 4B, New York, NY 10001",
    "provider_birthday": "1985-05-15T00:00:00.000Z",
    "provider_profile_photo": "https://cloudinary.../profile.jpg",
    "provider_valid_id": "https://cloudinary.../id.jpg",
    "provider_isVerified": false,
    "provider_isActivated": false,
    "verification_status": "pending",
    "created_at": "2025-10-03T10:00:00.000Z"
  },
  "certificates": [
    {
      "certificate_id": 1,
      "certificate_name": "Plumbing NCII",
      "certificate_number": "14-digit number",
      "expiry_date": "2026-12-31T00:00:00.000Z",
      "certificate_image": "https://cloudinary.../cert1.jpg"
    },
    {
      "certificate_id": 2,
      "certificate_name": "HVAC Certification",
      "certificate_number": "HVAC-67890",
      "expiry_date": "2025-08-15T00:00:00.000Z",
      "certificate_image": "https://cloudinary.../cert2.jpg"
    }
  ],
  "providerProfessions": [
    {
      "profession_id": 1,
      "profession_name": "Plumber",
      "years_of_experience": 10
    },
    {
      "profession_id": 3,
      "profession_name": "HVAC Technician",
      "years_of_experience": 5
    }
  ]
}
```

**Error Responses:**

```json
// 400 - Invalid or expired OTP
{
  "message": "Invalid or expired OTP"
}

// 400 - Provider already exists
{
  "message": "Provider already exists"
}

// 400 - Duplicate phone number
{
  "message": "Phone number is already registered with another provider account"
}

// 400 - Duplicate username
{
  "message": "Username is already taken"
}

// 400 - Missing required fields
{
  "message": "All required fields must be provided"
}

// 500 - Server error
{
  "message": "Error registering provider"
}
```

**Verification Process:**
After successful registration:
1. Provider account is created with `provider_isVerified: false`
2. Verification status is set to `pending`
3. Admin will review submitted documents
4. Provider receives email notification upon admin approval/rejection
5. Provider can login but some features may be restricted until verified

---

## Login

### Provider Login
Authenticate service provider and receive JWT token.

**Endpoint:** `POST /auth/provider-login`

**Alternative Endpoint:** `POST /auth/loginProvider` (legacy)

**Request Body:**
```json
{
  "provider_email": "john.smith@example.com",
  "provider_password": "SecurePass123"
}
```

**Request Example:**
```http
POST /auth/provider-login
Content-Type: application/json

{
  "provider_email": "john.smith@example.com",
  "provider_password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerId": 123,
  "providerUserName": "johnsmith_plumber",
  "userType": "provider",
  "provider": {
    "id": 123,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@example.com",
    "userName": "johnsmith_plumber"
  }
}
```

**Error Responses:**

```json
// 400 - Invalid credentials
{
  "message": "Invalid email or password"
}

// 500 - Server error
{
  "message": "Server error during login"
}
```

**Token Information:**
- JWT token expires in 30 days (optimized for mobile apps)
- Token includes: `userId`, `providerId`, `userType`, `email`
- Use token in `Authorization` header as `Bearer <token>`
- Session is also created server-side for web applications

**After Login:**
- Store the token securely (localStorage for web, SecureStore for mobile)
- Include token in all authenticated requests
- Check `provider.provider_isVerified` status for feature access
- Redirect unverified providers to verification pending page

---

## Forgot Password Flow

### Step 1: Request Password Reset OTP
Send OTP to provider's registered email for password reset.

**Endpoint:** `POST /auth/provider-forgot-password-request-otp`

**Request Body:**
```json
{
  "provider_email": "john.smith@example.com"
}
```

**Request Example:**
```http
POST /auth/provider-forgot-password-request-otp
Content-Type: application/json

{
  "provider_email": "john.smith@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "OTP sent successfully"
}
```

**Error Responses:**

```json
// 404 - Provider not found
{
  "message": "Provider not found"
}

// 500 - Server error
{
  "message": "Error sending OTP"
}
```

**Notes:**
- OTP is valid for 10 minutes
- Previous OTPs are automatically invalidated
- Email must be registered in the system

---

### Step 2: Verify OTP and Reset Password
Verify OTP and set new password.

**Endpoint:** `POST /auth/provider-forgot-password-verify-otp`

**Request Body:**
```json
{
  "provider_email": "john.smith@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123"
}
```

**Request Example:**
```http
POST /auth/provider-forgot-password-verify-otp
Content-Type: application/json

{
  "provider_email": "john.smith@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**

```json
// 400 - Invalid or expired OTP
{
  "message": "Invalid or expired OTP"
}

// 404 - Provider not found
{
  "message": "Provider not found"
}

// 500 - Server error
{
  "message": "Error resetting password"
}
```

**Password Requirements:**
- Minimum 8 characters (recommended)
- Should include uppercase, lowercase, numbers, and special characters
- Password is hashed using bcrypt before storage

**After Password Reset:**
- User can immediately login with new password
- All existing sessions remain valid (tokens not invalidated)
- Previous password becomes invalid

---

## Authentication Headers

### For Protected Endpoints
Include JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload
The JWT token contains:
```json
{
  "userId": 123,
  "id": 123,
  "providerId": 123,
  "userType": "provider",
  "email": "john.smith@example.com",
  "iat": 1696320000,
  "exp": 1698912000
}
```

---

## Frontend Integration Examples

### React Native Registration Flow

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const ProviderRegistration = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    provider_first_name: '',
    provider_last_name: '',
    provider_userName: '',
    provider_password: '',
    provider_phone_number: '',
    provider_location: '',
    provider_exact_location: '',
    provider_birthday: '',
    provider_uli: '' (17 alphanumeric characters (first 3 letters then numbers))
  });
  const [professions, setProfessions] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [validId, setValidId] = useState(null);
  const [certificateImages, setCertificateImages] = useState([]);

  const API_URL = 'http://localhost:3000';

  // Step 1: Request OTP
  const requestOTP = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/provider-request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_email: email })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message);
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
    try {
      const formDataToSend = new FormData();
      
      // Basic information
      formDataToSend.append('otp', otp);
      formDataToSend.append('provider_email', email);
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Professions and experiences
      formDataToSend.append('professions', JSON.stringify(professions));
      formDataToSend.append('experiences', JSON.stringify(experiences));

      // Certificate details
      formDataToSend.append('certificateNames', JSON.stringify(
        certificates.map(cert => cert.name)
      ));
      formDataToSend.append('certificateNumbers', JSON.stringify(
        certificates.map(cert => cert.number)
      ));
      formDataToSend.append('expiryDates', JSON.stringify(
        certificates.map(cert => cert.expiryDate)
      ));

      // File uploads
      formDataToSend.append('provider_profile_photo', {
        uri: profilePhoto.uri,
        type: 'image/jpeg',
        name: 'profile.jpg'
      });

      formDataToSend.append('provider_valid_id', {
        uri: validId.uri,
        type: 'image/jpeg',
        name: 'id.jpg'
      });

      certificateImages.forEach((cert, index) => {
        formDataToSend.append('certificate_images', {
          uri: cert.uri,
          type: 'image/jpeg',
          name: `certificate_${index}.jpg`
        });
      });

      const response = await fetch(`${API_URL}/auth/provider-verify-register`, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.message);
        // Navigate to login or pending verification screen
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
      console.error(error);
    }
  };

  const pickImage = async (setter) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setter(result.assets[0]);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {step === 1 ? (
        // Step 1: Request OTP
        <View>
          <Text style={{ fontSize: 24, marginBottom: 20 }}>
            Service Provider Registration
          </Text>
          <TextInput
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
          />
          <Button title="Send OTP" onPress={requestOTP} />
        </View>
      ) : (
        // Step 2: Complete Registration
        <View>
          <Text style={{ fontSize: 24, marginBottom: 20 }}>
            Complete Registration
          </Text>
          
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
          />

          <TextInput
            placeholder="First Name"
            value={formData.provider_first_name}
            onChangeText={(text) => setFormData({...formData, provider_first_name: text})}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Last Name"
            value={formData.provider_last_name}
            onChangeText={(text) => setFormData({...formData, provider_last_name: text})}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Username"
            value={formData.provider_userName}
            onChangeText={(text) => setFormData({...formData, provider_userName: text})}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Password"
            value={formData.provider_password}
            onChangeText={(text) => setFormData({...formData, provider_password: text})}
            secureTextEntry
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Phone Number"
            value={formData.provider_phone_number}
            onChangeText={(text) => setFormData({...formData, provider_phone_number: text})}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Location (City, State)"
            value={formData.provider_location}
            onChangeText={(text) => setFormData({...formData, provider_location: text})}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Birthday (YYYY-MM-DD)"
            value={formData.provider_birthday}
            onChangeText={(text) => setFormData({...formData, provider_birthday: text})}
            style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
          />

          <Button title="Pick Profile Photo" onPress={() => pickImage(setProfilePhoto)} />
          {profilePhoto && <Text>✓ Profile photo selected</Text>}

          <Button title="Pick Valid ID" onPress={() => pickImage(setValidId)} />
          {validId && <Text>✓ Valid ID selected</Text>}

          {/* Add profession selection, certificate uploads, etc. */}

          <Button title="Complete Registration" onPress={completeRegistration} />
        </View>
      )}
    </View>
  );
};

export default ProviderRegistration;
```

### React Native Login Flow

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderLogin = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3000';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/provider-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_email: email,
          provider_password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token securely
        await AsyncStorage.setItem('providerToken', data.token);
        await AsyncStorage.setItem('providerId', data.providerId.toString());
        await AsyncStorage.setItem('userType', 'provider');

        Alert.alert('Success', data.message);
        
        // Navigate to provider dashboard
        navigation.replace('ProviderDashboard');
      } else {
        Alert.alert('Login Failed', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20, fontWeight: 'bold' }}>
        Provider Login
      </Text>

      <TextInput
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
      />

      <Button 
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />

      <Button 
        title="Forgot Password?"
        onPress={() => navigation.navigate('ForgotPassword')}
        color="gray"
      />

      <Button 
        title="Don't have an account? Register"
        onPress={() => navigation.navigate('ProviderRegistration')}
        color="blue"
      />
    </View>
  );
};

export default ProviderLogin;
```

### React Native Forgot Password Flow

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';

const ProviderForgotPassword = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'http://localhost:3000';

  // Step 1: Request OTP
  const requestOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/provider-forgot-password-request-otp`, {
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
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const resetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/provider-forgot-password-verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_email: email,
          otp: otp,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Password reset successfully. You can now login.');
        navigation.navigate('ProviderLogin');
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20, fontWeight: 'bold' }}>
        Forgot Password
      </Text>

      {step === 1 ? (
        // Step 1: Request OTP
        <View>
          <Text style={{ marginBottom: 15 }}>
            Enter your registered email address to receive a password reset OTP.
          </Text>

          <TextInput
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
          />

          <Button 
            title={loading ? "Sending..." : "Send OTP"}
            onPress={requestOTP}
            disabled={loading}
          />

          <Button 
            title="Back to Login"
            onPress={() => navigation.goBack()}
            color="gray"
          />
        </View>
      ) : (
        // Step 2: Verify OTP and Reset Password
        <View>
          <Text style={{ marginBottom: 15, color: 'green' }}>
            ✓ OTP sent to: {email}
          </Text>

          <TextInput
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
          />

          <TextInput
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={{ borderWidth: 1, padding: 10, marginBottom: 15 }}
          />

          <Button 
            title={loading ? "Resetting..." : "Reset Password"}
            onPress={resetPassword}
            disabled={loading}
          />

          <Button 
            title="Resend OTP"
            onPress={requestOTP}
            color="blue"
          />

          <Button 
            title="Back to Login"
            onPress={() => navigation.navigate('ProviderLogin')}
            color="gray"
          />
        </View>
      )}
    </View>
  );
};

export default ProviderForgotPassword;
```

### Making Authenticated Requests

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to make authenticated API calls
const authenticatedFetch = async (endpoint, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('providerToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`http://localhost:3000${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    // Handle token expiration
    if (response.status === 401) {
      await AsyncStorage.removeItem('providerToken');
      // Navigate to login
      throw new Error('Session expired. Please login again.');
    }

    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
};

// Example: Get provider profile
const getProviderProfile = async () => {
  try {
    const response = await authenticatedFetch('/auth/profile', {
      method: 'GET'
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get profile:', error);
  }
};

// Example: Update provider profile with OTP
const updateProfile = async (otp, updates) => {
  try {
    const response = await authenticatedFetch(`/auth/profile?otp=${otp}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to update profile:', error);
  }
};
```

---

## Error Handling

### Common Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid input, duplicate data, validation errors |
| 401 | Unauthorized | Invalid or expired token |
| 404 | Not Found | Provider/resource doesn't exist |
| 500 | Internal Server Error | Database errors, server issues |

### Error Response Format

All error responses follow this structure:
```json
{
  "message": "Description of the error"
}
```

### Handling Errors in Frontend

```javascript
const handleAPIError = (response, data) => {
  switch(response.status) {
    case 400:
      Alert.alert('Invalid Input', data.message);
      break;
    case 401:
      Alert.alert('Session Expired', 'Please login again');
      // Navigate to login
      break;
    case 404:
      Alert.alert('Not Found', data.message);
      break;
    case 500:
      Alert.alert('Server Error', 'Something went wrong. Please try again later.');
      break;
    default:
      Alert.alert('Error', data.message || 'An unexpected error occurred');
  }
};

// Usage
try {
  const response = await fetch(endpoint, options);
  const data = await response.json();
  
  if (!response.ok) {
    handleAPIError(response, data);
    return;
  }
  
  // Process successful response
} catch (error) {
  Alert.alert('Network Error', 'Please check your internet connection');
}
```

---

## Testing the API

### Using cURL

**1. Register Provider (Request OTP):**
```bash
curl -X POST http://localhost:3000/auth/provider-request-otp \
  -H "Content-Type: application/json" \
  -d '{"provider_email": "test@example.com"}'
```

**2. Complete Registration:**
```bash
curl -X POST http://localhost:3000/auth/provider-verify-register \
  -F "otp=123456" \
  -F "provider_email=test@example.com" \
  -F "provider_password=SecurePass123" \
  -F "provider_first_name=John" \
  -F "provider_last_name=Smith" \
  -F "provider_userName=johnsmith" \
  -F "provider_phone_number=+1234567890" \
  -F "provider_location=New York" \
  -F "provider_birthday=1985-05-15" \
  -F "professions=[1,2]" \
  -F "experiences=[10,5]" \
  -F "certificateNames=[\"License\"]" \
  -F "certificateNumbers=[\"LIC123\"]" \
  -F "expiryDates=[\"2026-12-31\"]" \
  -F "provider_profile_photo=@/path/to/profile.jpg" \
  -F "provider_valid_id=@/path/to/id.jpg" \
  -F "certificate_images=@/path/to/cert.jpg"
```

**3. Login:**
```bash
curl -X POST http://localhost:3000/auth/provider-login \
  -H "Content-Type: application/json" \
  -d '{
    "provider_email": "test@example.com",
    "provider_password": "SecurePass123"
  }'
```

**4. Forgot Password (Request OTP):**
```bash
curl -X POST http://localhost:3000/auth/provider-forgot-password-request-otp \
  -H "Content-Type: application/json" \
  -d '{"provider_email": "test@example.com"}'
```

**5. Reset Password:**
```bash
curl -X POST http://localhost:3000/auth/provider-forgot-password-verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "provider_email": "test@example.com",
    "otp": "123456",
    "newPassword": "NewSecurePass123"
  }'
```

**6. Authenticated Request Example:**
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Security Best Practices

### For Frontend Developers

1. **Token Storage:**
   - Mobile: Use SecureStore or encrypted storage
   - Web: Use httpOnly cookies or secure localStorage
   - Never store tokens in plain text

2. **Password Handling:**
   - Never log passwords
   - Use secure text input fields
   - Validate password strength on client-side
   - Minimum 8 characters recommended

3. **OTP Security:**
   - Implement rate limiting on frontend
   - Clear OTP input after submission
   - Show OTP expiration timer (10 minutes)
   - Don't pre-fill OTP (security risk)

4. **Network Security:**
   - Always use HTTPS in production
   - Implement certificate pinning for mobile apps
   - Handle network timeouts gracefully

5. **Session Management:**
   - Clear tokens on logout
   - Implement token refresh if needed
   - Handle 401 errors by redirecting to login
   - Clear sensitive data from memory

### For Backend Developers

1. **Already Implemented:**
   - Password hashing with bcrypt
   - JWT token authentication
   - OTP expiration (10 minutes)
   - Email verification
   - File upload validation

2. **Recommendations:**
   - Implement rate limiting (e.g., 5 OTP requests per hour)
   - Add CAPTCHA for registration
   - Log authentication attempts
   - Implement account lockout after failed attempts
   - Use environment variables for secrets

---

## Common Integration Scenarios

### Scenario 1: Complete Provider Onboarding

```
1. User fills registration form
   ↓
2. Request OTP → POST /auth/provider-request-otp
   ↓
3. User receives email with OTP
   ↓
4. User uploads documents (ID, certificates, photos)
   ↓
5. Submit complete registration → POST /auth/provider-verify-register
   ↓
6. Show "Pending Verification" screen
   ↓
7. Admin reviews and approves
   ↓
8. User receives approval email
   ↓
9. User can now login → POST /auth/provider-login
   ↓
10. Redirect to provider dashboard
```

### Scenario 2: Returning User Login

```
1. User enters email and password
   ↓
2. Submit login → POST /auth/provider-login
   ↓
3. Receive token and user data
   ↓
4. Store token securely
   ↓
5. Navigate to dashboard
   ↓
6. Use token for all authenticated requests
```

### Scenario 3: Password Recovery

```
1. User clicks "Forgot Password"
   ↓
2. Enter email → POST /auth/provider-forgot-password-request-otp
   ↓
3. User receives OTP via email
   ↓
4. User enters OTP and new password
   ↓
5. Submit reset → POST /auth/provider-forgot-password-verify-otp
   ↓
6. Show success message
   ↓
7. Redirect to login
   ↓
8. User logs in with new password
```

---

## Troubleshooting

### Common Issues and Solutions

**Issue: "Provider already exists" error during registration**
- **Cause:** Email is already registered
- **Solution:** Use forgot password flow or login with existing account

**Issue: "Invalid or expired OTP"**
- **Cause:** OTP expired (>10 minutes) or incorrect
- **Solution:** Request new OTP and submit within 10 minutes

**Issue: "Phone number is already registered"**
- **Cause:** Phone number used by another account
- **Solution:** Use different phone number or contact support

**Issue: File uploads failing**
- **Cause:** File size too large or wrong format
- **Solution:** Compress images, ensure JPG/PNG format, max 5MB per file

**Issue: Token expired/invalid**
- **Cause:** Token expired or corrupted
- **Solution:** Logout and login again to get new token

**Issue: Session expired after login**
- **Cause:** Server session configuration issue
- **Solution:** Token-based auth works independently, use JWT token

---

## API Changelog

### Version 1.0 (Current)
- ✅ Provider registration with OTP verification
- ✅ Multi-file upload support (profile, ID, certificates)
- ✅ Profession and experience tracking
- ✅ Certificate management with expiry dates
- ✅ JWT token authentication (30-day expiry)
- ✅ Session management
- ✅ Forgot password with OTP
- ✅ Email notifications
- ✅ Admin verification workflow

### Future Enhancements (Planned)
- 🔄 Token refresh endpoint
- 🔄 Social authentication (Google, Facebook)
- 🔄 Two-factor authentication (2FA)
- 🔄 Biometric authentication support
- 🔄 Account deactivation/deletion
- 🔄 Email change with verification
- 🔄 Phone number verification with SMS

---

## Support and Contact

For technical issues or questions:
- Check this documentation first
- Review error messages carefully
- Test with cURL to isolate frontend issues
- Check server logs for detailed error information

---

**Last Updated:** October 3, 2025  
**API Version:** 1.0  
**Documentation Version:** 1.0
