# 🔐 Fixmo Authentication API - Documentation Index

## 📚 Available Documentation

| Document | Type | Purpose | Best For |
|----------|------|---------|----------|
| **[AUTHENTICATION_API_DOCUMENTATION.md](./AUTHENTICATION_API_DOCUMENTATION.md)** | 📖 Complete Guide | Full API reference with examples | Developers implementing auth |
| **[AUTHENTICATION_QUICK_REFERENCE.md](./AUTHENTICATION_QUICK_REFERENCE.md)** | ⚡ Cheat Sheet | Quick endpoint lookup | Fast reference during coding |
| **[AUTHENTICATION_DOCUMENTATION_SUMMARY.md](./AUTHENTICATION_DOCUMENTATION_SUMMARY.md)** | 📋 Overview | System overview & best practices | Understanding the system |
| **[Fixmo_Authentication_API.postman_collection.json](./Fixmo_Authentication_API.postman_collection.json)** | 🧪 Postman Collection | Pre-configured API requests | Testing & debugging |

---

## 🚀 Quick Start

### 1. **For Frontend Developers:**
```javascript
// Start here: AUTHENTICATION_QUICK_REFERENCE.md
// Then refer to: AUTHENTICATION_API_DOCUMENTATION.md for detailed examples
```

### 2. **For API Testing:**
```bash
# Import Fixmo_Authentication_API.postman_collection.json into Postman
# Set baseUrl variable to: http://localhost:3000
# Test all endpoints with pre-filled examples
```

### 3. **For System Overview:**
```bash
# Read: AUTHENTICATION_DOCUMENTATION_SUMMARY.md
# Understand flows, security features, and best practices
```

---

## 🎯 Authentication Flows

### 👤 Customer Flow
```
Request OTP → Verify OTP → Register → Login → Use Protected Routes
                 ↓
            Forgot Password? → Reset with OTP
```

### 🛠️ Provider Flow
```
Request OTP → Verify OTP → Register with Certificates → Login → Use Protected Routes
                 ↓
            Forgot Password? → Reset with OTP
```

---

## 📍 Base Endpoints

### Customer & Provider Authentication
```
Base URL: /auth
```

**Customer:**
- `POST /login` - Customer login
- `POST /request-otp` - Request registration OTP
- `POST /verify-register` - Complete registration
- `POST /forgot-password-request-otp` - Request password reset OTP
- `POST /forgot-password-verify-otp` - Complete password reset

**Provider:**
- `POST /provider-login` - Provider login
- `POST /provider-request-otp` - Request registration OTP
- `POST /provider-verify-register` - Complete registration
- `POST /provider-forgot-password-request-otp` - Request password reset OTP
- `POST /provider-forgot-password-verify-otp` - Complete password reset

---

## 🔑 Key Features

✅ **Two-Factor Authentication** via OTP
✅ **Secure Password Hashing** with bcrypt
✅ **JWT Token-Based** authentication
✅ **File Upload Support** via Cloudinary
✅ **Rate Limiting** for OTP requests
✅ **Comprehensive Validation** for all inputs
✅ **Separate Flows** for customers and providers

---

## 📊 Response Format

### Success Response
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 123,
  "userName": "johndoe"
}
```

### Error Response
```json
{
  "message": "Invalid email or password"
}
```

---

## 🧪 Testing Quick Start

### Using cURL:
```bash
# Customer Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"password123"}'

# Provider Login
curl -X POST http://localhost:3000/auth/provider-login \
  -H "Content-Type: application/json" \
  -d '{"provider_email":"provider@example.com","provider_password":"password123"}'
```

### Using Postman:
1. Import `Fixmo_Authentication_API.postman_collection.json`
2. Set environment variable `baseUrl` to your server URL
3. Run requests in order (Request OTP → Register → Login)

---

## 🔒 Security Notes

- **OTP Validity:** 10 minutes
- **Token Expiry:** 1 hour (customer), 24 hours (provider)
- **Password Requirements:** Minimum 6 characters
- **Rate Limiting:** Active on OTP endpoints
- **File Storage:** Secure Cloudinary integration

---

## 📱 Frontend Integration

Complete React Native examples available in:
- **AUTHENTICATION_API_DOCUMENTATION.md** (Section 8)

Includes:
- Customer registration component
- Customer login component
- Provider registration with certificates
- Forgot password flow
- Token management
- File upload handling

---

## 🆘 Need Help?

1. **Can't find an endpoint?** → Check AUTHENTICATION_QUICK_REFERENCE.md
2. **Need code examples?** → See AUTHENTICATION_API_DOCUMENTATION.md
3. **Want to test manually?** → Import Postman collection
4. **Understanding the flow?** → Read AUTHENTICATION_DOCUMENTATION_SUMMARY.md

---

## 📝 Common Tasks

### Task 1: Implement Customer Login
```
1. Read: AUTHENTICATION_QUICK_REFERENCE.md → Customer Login
2. Code: Use example from AUTHENTICATION_API_DOCUMENTATION.md
3. Test: Use Postman collection → "Customer - Login"
```

### Task 2: Implement Provider Registration
```
1. Read: AUTHENTICATION_API_DOCUMENTATION.md → Provider Registration
2. Understand: 3-step process with certificate upload
3. Code: Use React Native example provided
4. Test: Use Postman collection → Provider endpoints
```

### Task 3: Add Forgot Password
```
1. Read: AUTHENTICATION_QUICK_REFERENCE.md → Forgot Password
2. Code: Implement 2-step OTP flow
3. Test: Use Postman collection → Forgot Password endpoints
```

---

## 🔄 Recent Updates

**October 1, 2025:**
- ✅ Complete authentication documentation created
- ✅ Postman collection with all endpoints
- ✅ React Native integration examples
- ✅ Security features documented
- ✅ Testing guides included

---

## 📞 Support

For issues or questions:
1. Check documentation first
2. Test with Postman collection
3. Review error responses
4. Contact development team

---

**Start Here:** [AUTHENTICATION_QUICK_REFERENCE.md](./AUTHENTICATION_QUICK_REFERENCE.md) for a quick overview, then dive into [AUTHENTICATION_API_DOCUMENTATION.md](./AUTHENTICATION_API_DOCUMENTATION.md) for detailed implementation.

---

*Documentation maintained by Fixmo Development Team*
*Last Updated: October 1, 2025*
