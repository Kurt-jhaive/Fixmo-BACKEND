# 🔐 Forgot Password System - Quick Reference

## ✅ What's Been Added

### New Features
- **3-Step Password Reset Flow** for customers and service providers
- **Rate Limiting:** Max 3 attempts per 30 minutes per email
- **OTP Expiration:** 10 minutes validity
- **Automatic Cleanup:** OTPs deleted after successful reset
- **Security:** Rate limit resets automatically after 30 minutes or successful password change

---

## 📋 Customer Endpoints

### 1. Request OTP
```
POST /auth/forgot-password
Body: { "email": "customer@example.com" }
```

### 2. Verify OTP
```
POST /auth/verify-forgot-password
Body: { "email": "customer@example.com", "otp": "123456" }
```

### 3. Reset Password
```
POST /auth/reset-password
Body: { "email": "customer@example.com", "newPassword": "NewPass123!" }
```

---

## 📋 Service Provider Endpoints

### 1. Request OTP
```
POST /auth/provider/forgot-password
Body: { "provider_email": "provider@example.com" }
```

### 2. Verify OTP
```
POST /auth/provider/verify-forgot-password
Body: { "provider_email": "provider@example.com", "otp": "123456" }
```

### 3. Reset Password
```
POST /auth/provider/reset-password
Body: { "provider_email": "provider@example.com", "newPassword": "NewPass123!" }
```

---

## 🛡️ Rate Limiting

- **Maximum Attempts:** 3 per email
- **Time Window:** 30 minutes
- **Cooldown Message:** "Maximum forgot password attempts (3) reached. Please try again in X minutes."
- **Auto Reset:** After 30 minutes OR successful password reset

---

## 📄 Files Modified

### Core Files
1. `src/services/rateLimitUtils.js` - Added rate limiting functions
2. `src/controller/authCustomerController.js` - Added 3 new functions
3. `src/controller/authserviceProviderController.js` - Added 3 new functions
4. `src/route/authCustomer.js` - Added 3 new routes
5. `src/route/serviceProvider.js` - Added 3 new routes

### Documentation
1. `FORGOT_PASSWORD_DOCUMENTATION.md` - Complete guide
2. `FORGOT_PASSWORD_QUICK_REFERENCE.md` - This file

---

## 🧪 Testing in Swagger

1. Open: `http://localhost:3000/api-docs`
2. Find sections:
   - **Customer Authentication** → Forgot password endpoints
   - **Service Provider Authentication** → Forgot password endpoints
3. Test the 3-step flow

---

## ✨ New Functions Added

### Customer Controller (`authCustomerController.js`)
- `requestForgotPasswordOTP()` - Step 1: Send OTP with rate limiting
- `verifyForgotPasswordOTP()` - Step 2: Verify OTP code
- `resetPasswordCustomer()` - Step 3: Reset password after verification

### Provider Controller (`authserviceProviderController.js`)
- `requestProviderForgotPasswordOTP()` - Step 1: Send OTP with rate limiting
- `verifyProviderForgotPasswordOTP()` - Step 2: Verify OTP code
- `resetPasswordProvider()` - Step 3: Reset password after verification

### Rate Limit Utils (`rateLimitUtils.js`)
- `checkForgotPasswordRateLimit()` - Check if user can request OTP
- `recordForgotPasswordAttempt()` - Record an attempt
- `resetForgotPasswordAttempts()` - Clear attempts after successful reset
- `cleanupForgotPasswordEntries()` - Auto cleanup every 5 minutes

---

## 🎯 Key Features

### Security
✅ Email verification required  
✅ OTP expires in 10 minutes  
✅ Max 3 attempts per 30 minutes  
✅ Password hashed with bcrypt  
✅ OTP deleted after use  

### User Experience
✅ Clear error messages  
✅ Attempts counter  
✅ Remaining time shown  
✅ Separate steps for clarity  

### Developer Experience
✅ Full Swagger documentation  
✅ Type-safe responses  
✅ Comprehensive error handling  
✅ Mobile-friendly API  

---

## 📱 Mobile Integration Example

```javascript
// Step 1: Request OTP
const response = await fetch('/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});
// Response: { message: "OTP sent", attemptsLeft: 2 }

// Step 2: Verify OTP
const verifyResponse = await fetch('/auth/verify-forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', otp: '123456' })
});
// Response: { message: "OTP verified", verified: true }

// Step 3: Reset Password
const resetResponse = await fetch('/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'user@example.com', 
    newPassword: 'NewPass123!' 
  })
});
// Response: { message: "Password reset successfully" }
```

---

## ⚠️ Common Issues

### "Maximum attempts reached"
**Solution:** Wait 30 minutes before trying again

### "OTP has expired"
**Solution:** Request a new OTP (Step 1)

### "Please verify your OTP first"
**Solution:** Complete Step 2 before Step 3

### "No account found with this email"
**Solution:** Check email spelling or create account

---

## 🚀 Next Steps

1. **Start the server:** `npm start`
2. **Test in Swagger:** `http://localhost:3000/api-docs`
3. **Integrate in mobile app:** Use the endpoints above
4. **Test rate limiting:** Try 4 attempts to see the block

---

## 📞 Support

For detailed documentation, see:
- `FORGOT_PASSWORD_DOCUMENTATION.md` - Complete guide with examples

---

**Status:** ✅ Fully Implemented  
**Rate Limit:** 3 attempts / 30 minutes  
**OTP Expiry:** 10 minutes  
**Ready for:** Testing & Integration
