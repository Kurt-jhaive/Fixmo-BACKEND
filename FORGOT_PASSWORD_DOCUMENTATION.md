# 🔐 Forgot Password System Documentation

## Complete Guide for Password Reset with Rate Limiting

---

## 🎯 Overview

The forgot password system is a **secure 3-step process** with built-in rate limiting:

1. **Request OTP** - Send verification code to email
2. **Verify OTP** - Validate the code  
3. **Reset Password** - Set new password

### 🛡️ Security Features

- ✅ **Rate Limiting:** Max 3 attempts per 30 minutes
- ✅ **OTP Expiration:** Codes expire in 10 minutes
- ✅ **Email Verification:** OTP sent to registered email only
- ✅ **Password Hashing:** bcrypt with 10 salt rounds
- ✅ **Auto Cleanup:** OTP deleted after successful reset

---

## 👤 Customer Forgot Password

### Step 1: Request Password Reset OTP

#### Endpoint
```
POST /auth/forgot-password
```

#### Request Body
```json
{
  "email": "customer@example.com"
}
```

#### Success Response (200)
```json
{
  "message": "Password reset OTP sent to your email",
  "attemptsLeft": 2
}
```

#### Rate Limit Exceeded (429)
```json
{
  "message": "Maximum forgot password attempts (3) reached. Please try again in 25 minutes.",
  "remainingMinutes": 25
}
```

#### Error Responses
| Code | Message | Solution |
|------|---------|----------|
| 400 | `Email is required` | Include email in request |
| 400 | `No account found with this email` | Check email or create account |
| 429 | `Maximum forgot password attempts (3) reached` | Wait 30 minutes |
| 500 | `Error processing password reset request` | Try again or contact support |

---

### Step 2: Verify OTP

#### Endpoint
```
POST /auth/verify-forgot-password
```

#### Request Body
```json
{
  "email": "customer@example.com",
  "otp": "123456"
}
```

#### Success Response (200)
```json
{
  "message": "OTP verified. You can now reset your password.",
  "verified": true
}
```

#### Error Responses
| Code | Message | Solution |
|------|---------|----------|
| 400 | `Email and OTP are required` | Include both fields |
| 400 | `No OTP found. Please request a new one.` | Go back to Step 1 |
| 400 | `OTP has expired. Please request a new one.` | Request new OTP (Step 1) |
| 400 | `Invalid OTP. Please try again.` | Check your email for correct code |
| 500 | `Error verifying OTP` | Try again |

---

### Step 3: Reset Password

#### Endpoint
```
POST /auth/reset-password
```

#### Request Body
```json
{
  "email": "customer@example.com",
  "newPassword": "NewSecurePass123!"
}
```

#### Success Response (200)
```json
{
  "message": "Password reset successfully"
}
```

#### Error Responses
| Code | Message | Solution |
|------|---------|----------|
| 400 | `Email and new password are required` | Include both fields |
| 400 | `Please verify your OTP first` | Complete Step 2 first |
| 400 | `User not found` | Email doesn't exist |
| 500 | `Error resetting password` | Try again |

---

## 🔧 Service Provider Forgot Password

### Step 1: Request Password Reset OTP

#### Endpoint
```
POST /auth/provider/forgot-password
```

#### Request Body
```json
{
  "provider_email": "provider@example.com"
}
```

#### Success Response (200)
```json
{
  "message": "Password reset OTP sent to your email",
  "attemptsLeft": 2
}
```

#### Error Responses
| Code | Message | Solution |
|------|---------|----------|
| 400 | `Email is required` | Include provider_email in request |
| 400 | `No account found with this email` | Check email or create account |
| 429 | `Maximum forgot password attempts (3) reached` | Wait 30 minutes |
| 500 | `Error processing password reset request` | Try again |

---

### Step 2: Verify OTP

#### Endpoint
```
POST /auth/provider/verify-forgot-password
```

#### Request Body
```json
{
  "provider_email": "provider@example.com",
  "otp": "123456"
}
```

#### Success Response (200)
```json
{
  "message": "OTP verified. You can now reset your password.",
  "verified": true
}
```

---

### Step 3: Reset Password

#### Endpoint
```
POST /auth/provider/reset-password
```

#### Request Body
```json
{
  "provider_email": "provider@example.com",
  "newPassword": "NewSecurePass123!"
}
```

#### Success Response (200)
```json
{
  "message": "Password reset successfully"
}
```

---

## 🔒 Rate Limiting Details

### How It Works

- **Maximum Attempts:** 3 per email address
- **Time Window:** 30 minutes (1800 seconds)
- **Counter:** Starts from first attempt
- **Reset:** Automatic after 30 minutes OR successful password reset

### Example Timeline

```
00:00 - Attempt 1: OTP sent (2 attempts left)
05:00 - Attempt 2: OTP sent (1 attempt left)
10:00 - Attempt 3: OTP sent (0 attempts left)
10:01 - Attempt 4: ❌ BLOCKED - "Please try again in 20 minutes"
30:01 - Counter resets - Can try again
```

### Rate Limit Response

```json
{
  "message": "Maximum forgot password attempts (3) reached. Please try again in 25 minutes.",
  "remainingMinutes": 25
}
```

---

## 📱 React Native / Mobile Integration

### Complete Forgot Password Flow

```javascript
import { useState } from 'react';

const ForgotPasswordFlow = () => {
  const [email, setEmail] = useState('');
  const [otp, setOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  
  // Step 1: Request OTP
  const requestOTP = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.status === 429) {
        // Rate limited
        alert(`Too many attempts. Try again in ${data.remainingMinutes} minutes.`);
        return;
      }
      
      if (response.ok) {
        setAttemptsLeft(data.attemptsLeft);
        setStep(2);
        alert('OTP sent to your email!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };
  
  // Step 2: Verify OTP
  const verifyOTP = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/verify-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      
      if (response.ok && data.verified) {
        setStep(3);
        alert('OTP verified! Enter your new password.');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };
  
  // Step 3: Reset Password
  const resetPassword = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Password reset successfully! You can now login.');
        // Navigate to login screen
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };
  
  return (
    <View>
      {step === 1 && (
        <View>
          <Text>Enter your email</Text>
          <TextInput 
            value={email} 
            onChangeText={setEmail}
            placeholder="email@example.com"
          />
          <Text>Attempts left: {attemptsLeft}</Text>
          <Button title="Request OTP" onPress={requestOTP} />
        </View>
      )}
      
      {step === 2 && (
        <View>
          <Text>Enter OTP sent to {email}</Text>
          <TextInput 
            value={otp} 
            onChangeText={setOTP}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button title="Verify OTP" onPress={verifyOTP} />
        </View>
      )}
      
      {step === 3 && (
        <View>
          <Text>Enter new password</Text>
          <TextInput 
            value={newPassword} 
            onChangeText={setNewPassword}
            placeholder="New password"
            secureTextEntry
          />
          <Button title="Reset Password" onPress={resetPassword} />
        </View>
      )}
    </View>
  );
};
```

### Provider Forgot Password (Same Flow)

```javascript
// Just change the endpoints and field names:
// '/auth/forgot-password' → '/auth/provider/forgot-password'
// 'email' → 'provider_email'
```

---

## 🎨 UI/UX Best Practices

### Step 1: Request OTP Screen

```
┌─────────────────────────┐
│  Forgot Password?       │
├─────────────────────────┤
│                         │
│  Email Address:         │
│  [________________]     │
│                         │
│  Attempts left: 3       │
│                         │
│  [Request Reset Code]   │
│                         │
│  ← Back to Login        │
└─────────────────────────┘
```

### Step 2: Verify OTP Screen

```
┌─────────────────────────┐
│  Enter Verification     │
│  Code                   │
├─────────────────────────┤
│                         │
│  Code sent to:          │
│  user@example.com       │
│                         │
│  [ ][ ][ ][ ][ ][ ]     │
│                         │
│  Code expires in: 9:45  │
│                         │
│  [Verify Code]          │
│                         │
│  Didn't receive code?   │
│  [Resend OTP] (2 left)  │
└─────────────────────────┘
```

### Step 3: New Password Screen

```
┌─────────────────────────┐
│  Create New Password    │
├─────────────────────────┤
│                         │
│  New Password:          │
│  [________________] 👁   │
│                         │
│  Confirm Password:      │
│  [________________] 👁   │
│                         │
│  Password must be:      │
│  ✓ At least 8 chars     │
│  ✓ Include uppercase    │
│  ✓ Include number       │
│                         │
│  [Reset Password]       │
└─────────────────────────┘
```

---

## ⚠️ Common Error Scenarios

### 1. Too Many Attempts
**Error:** `Maximum forgot password attempts (3) reached`  
**Solution:** Wait 30 minutes or contact support

### 2. Expired OTP
**Error:** `OTP has expired`  
**Solution:** Request a new OTP (counts as new attempt)

### 3. Wrong OTP
**Error:** `Invalid OTP`  
**Solution:** Check email for correct 6-digit code

### 4. Email Not Found
**Error:** `No account found with this email`  
**Solution:** Check spelling or create a new account

### 5. OTP Not Verified
**Error:** `Please verify your OTP first`  
**Solution:** Complete Step 2 before Step 3

---

## 🔍 Testing Checklist

### Functional Tests

- [ ] Request OTP with valid email
- [ ] Request OTP with non-existent email (should fail)
- [ ] Request OTP 4 times (4th should be rate limited)
- [ ] Verify OTP with correct code
- [ ] Verify OTP with wrong code (should fail)
- [ ] Verify OTP after 10 minutes (should be expired)
- [ ] Reset password after OTP verification
- [ ] Reset password without OTP verification (should fail)
- [ ] Login with new password
- [ ] Verify rate limit resets after 30 minutes
- [ ] Verify rate limit resets after successful password reset

### Security Tests

- [ ] OTP is not exposed in response
- [ ] Password is hashed in database
- [ ] OTP is deleted after successful reset
- [ ] Cannot reuse same OTP
- [ ] Cannot bypass OTP verification
- [ ] Rate limiting works across app restarts

---

## 📊 Flow Diagrams

### Customer Flow

```
┌─────────────────────────┐
│  User Forgets Password  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  POST /forgot-password  │
│  { email }              │
└───────────┬─────────────┘
            │
       ┌────┴────┐
       │ Rate    │
       │ Limited?│
       └────┬────┘
            │ No
            ▼
┌─────────────────────────┐
│  Generate & Send OTP    │
│  (6 digits, 10min exp)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Check Email for OTP    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  POST /verify-forgot-   │
│  password               │
│  { email, otp }         │
└───────────┬─────────────┘
            │
       ┌────┴────┐
       │ OTP     │
       │ Valid?  │
       └────┬────┘
            │ Yes
            ▼
┌─────────────────────────┐
│  Mark OTP as verified   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  POST /reset-password   │
│  { email, newPassword } │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Hash & Update Password │
│  Delete OTP Record      │
│  Reset Rate Limit       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ✅ Password Reset      │
│     Complete!           │
│  Can now login          │
└─────────────────────────┘
```

---

## 🔐 Security Considerations

### What's Protected

1. **Brute Force Attacks:** Rate limiting prevents multiple attempts
2. **OTP Reuse:** OTPs are deleted after successful reset
3. **Expired Codes:** 10-minute expiration prevents old code usage
4. **Password Exposure:** Passwords are hashed before storage
5. **Email Verification:** OTP sent only to registered emails

### What to Implement in Production

1. **SMS Verification:** Alternative to email OTP
2. **2FA Reset:** Special flow for users with 2FA enabled
3. **Account Lockout:** Permanent lock after suspicious activity
4. **Email Notifications:** Alert user of password reset attempts
5. **Redis:** Replace in-memory storage for distributed systems
6. **IP Tracking:** Track attempts by IP address, not just email
7. **CAPTCHA:** Add after failed attempts

---

## 📝 API Reference Summary

### Customer Endpoints

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/auth/forgot-password` | POST | Request OTP | 3 per 30 min |
| `/auth/verify-forgot-password` | POST | Verify OTP | None |
| `/auth/reset-password` | POST | Reset password | None |

### Provider Endpoints

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/auth/provider/forgot-password` | POST | Request OTP | 3 per 30 min |
| `/auth/provider/verify-forgot-password` | POST | Verify OTP | None |
| `/auth/provider/reset-password` | POST | Reset password | None |

---

## 🎉 Success!

Your forgot password system is now fully functional with:
- ✅ Secure 3-step verification
- ✅ Rate limiting (3 attempts/30 minutes)
- ✅ OTP expiration (10 minutes)
- ✅ Automatic cleanup
- ✅ Swagger documentation
- ✅ Mobile-ready API

**Test it now at:** `http://localhost:3000/api-docs`

---

**Last Updated:** October 2025  
**API Version:** 1.0  
**Base URL:** `http://localhost:3000/auth`
