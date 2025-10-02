# 🔐 Authentication API - Quick Reference

## Customer Endpoints

### Registration (2-Step Process)
```http
# Step 1: Request OTP
POST /auth/request-otp
Body: { "email": "customer@example.com" }

# Step 2: Complete Registration
POST /auth/verify-register
Content-Type: multipart/form-data
Body: {
  email, otp, password, userName, first_name, last_name, 
  birthday, phone_number, user_location,
  [profile_photo], [valid_id]
}
```

### Login
```http
POST /auth/login
Body: {
  "email": "customer@example.com",
  "password": "password123"
}
Response: { token, userId, userName }
```

### Forgot Password (2-Step Process)
```http
# Step 1: Request OTP
POST /auth/forgot-password-request-otp
Body: { "email": "customer@example.com" }

# Step 2: Reset Password
POST /auth/forgot-password-verify-otp
Body: {
  "email": "customer@example.com",
  "otp": "123456",
  "newPassword": "newPassword123"
}
```

---

## Service Provider Endpoints

### Registration (3-Step Process)
```http
# Step 1: Request OTP
POST /auth/provider-request-otp
Body: { "provider_email": "provider@example.com" }

# Step 2 (Optional): Verify OTP
POST /auth/provider-verify-otp
Body: {
  "provider_email": "provider@example.com",
  "otp": "123456"
}

# Step 3: Complete Registration
POST /auth/provider-verify-register
Content-Type: multipart/form-data
Body: {
  provider_email, otp, provider_password, provider_userName,
  provider_first_name, provider_last_name, provider_birthday,
  provider_phone_number, provider_location,
  professions: JSON.stringify([1, 2]),
  experiences: JSON.stringify([5, 3]),
  certificateNames: JSON.stringify(["License", "Cert"]),
  certificateNumbers: JSON.stringify(["L123", "C456"]),
  expiryDates: JSON.stringify(["2026-12-31", "2027-06-30"]),
  certificates: [file1, file2],
  [provider_profile_photo], [provider_valid_id]
}
```

### Login
```http
POST /auth/provider-login
Body: {
  "provider_email": "provider@example.com",
  "provider_password": "password123"
}
Response: { token, providerId, provider: {...} }
```

### Forgot Password (2-Step Process)
```http
# Step 1: Request OTP
POST /auth/provider-forgot-password-request-otp
Body: { "provider_email": "provider@example.com" }

# Step 2: Reset Password
POST /auth/provider-forgot-password-verify-otp
Body: {
  "provider_email": "provider@example.com",
  "otp": "123456",
  "newPassword": "newPassword123"
}
```

---

## Authentication Header

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (Registration) |
| 400 | Bad Request (Invalid input) |
| 401 | Unauthorized (Invalid credentials) |
| 404 | Not Found |
| 429 | Too Many Requests (Rate limit) |
| 500 | Server Error |

---

## Quick Notes

- **OTP Validity:** 10 minutes
- **Customer Token Expiry:** 30 days (mobile-friendly)
- **Provider Token Expiry:** 30 days (mobile-friendly)
- **Password Min Length:** 6 characters
- **File Upload:** Use multipart/form-data
- **Files:** Stored in Cloudinary
- **New Accounts:** verification_status = "pending"

---

For full documentation, see: `AUTHENTICATION_API_DOCUMENTATION.md`
