# OTP Verification System - Quick Reference

## Customer Registration

### New Endpoints (Recommended)
```
POST /auth/send-otp          → Send OTP to email
POST /auth/verify-otp        → Verify OTP code
POST /auth/register          → Register user (requires verified email)
```

### Flow
```
1. POST /auth/send-otp
   Body: { "email": "user@example.com" }
   
2. POST /auth/verify-otp
   Body: { "email": "user@example.com", "otp": "123456" }
   
3. POST /auth/register
   FormData: {
     email, password, first_name, last_name, userName, 
     phone_number, [optional fields], [files]
   }
```

---

## Service Provider Registration

### New Endpoints (Recommended)
```
POST /auth/provider/send-otp     → Send OTP to provider email
POST /auth/provider/verify-otp   → Verify OTP code
POST /auth/provider/register     → Register provider (requires verified email)
```

### Flow
```
1. POST /auth/provider/send-otp
   Body: { "provider_email": "provider@example.com" }
   
2. POST /auth/provider/verify-otp
   Body: { "provider_email": "provider@example.com", "otp": "123456" }
   
3. POST /auth/provider/register
   FormData: {
     provider_email, provider_password, provider_first_name, 
     provider_last_name, provider_userName, provider_phone_number,
     provider_uli, [optional fields], [files], [certificates]
   }
```

---

## Key Changes

### What's New
- ✅ 3-step registration process
- ✅ Email verification before registration
- ✅ `verified` field in OTPVerification table
- ✅ 5-minute OTP expiration
- ✅ Automatic OTP cleanup after registration

### What's Removed
- ❌ OTP is no longer sent during registration request
- ❌ OTP is no longer required in the registration payload

### Backward Compatibility
- ✅ Old endpoints still work (`/request-otp`, `/verify-register`)
- ✅ Legacy functions aliased to new implementations
- ✅ Existing integrations will continue functioning

---

## Database Migration

```bash
# Migration already applied
npx prisma migrate dev --name add_verified_to_otp
```

**Schema Change:**
```prisma
model OTPVerification {
  // ... existing fields ...
  verified   Boolean  @default(false)  // NEW FIELD
}
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Email already exists | `400: User already exists with this email` |
| Email not verified | `400: Email not verified. Please verify your email before registering` |
| Invalid OTP | `400: Invalid OTP. Please try again` |
| Expired OTP | `400: OTP has expired. Please request a new OTP` |
| Missing OTP record | `400: Email not found. Please verify your email first` |
| Rate limit exceeded | `429: Too many OTP requests. Please try again later` |

---

## Testing Checklist

### Customer Flow
- [ ] Send OTP to new email
- [ ] Verify OTP with correct code
- [ ] Register with verified email
- [ ] Try registering without verification (should fail)
- [ ] Try with expired OTP (should fail)
- [ ] Try with wrong OTP (should fail)

### Provider Flow
- [ ] Send OTP to new provider email
- [ ] Verify OTP with correct code
- [ ] Register provider with verified email
- [ ] Try registering without verification (should fail)
- [ ] Try with expired OTP (should fail)
- [ ] Try with wrong OTP (should fail)

### Edge Cases
- [ ] Duplicate email registration
- [ ] Duplicate phone number
- [ ] Missing required fields
- [ ] File upload validation
- [ ] OTP resend (updates existing record)

---

## Important Notes

1. **OTP Lifetime:** 5 minutes only
2. **Email Verification:** Required before registration
3. **OTP Cleanup:** Automatically deleted after successful registration
4. **Rate Limiting:** Applied on customer send-otp endpoint
5. **Backward Compatible:** Legacy endpoints still functional

---

## Quick Test Commands

### Customer
```bash
# Send OTP
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify OTP
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Register
curl -X POST http://localhost:3000/auth/register \
  -F "first_name=John" -F "last_name=Doe" \
  -F "userName=johndoe" -F "email=test@example.com" \
  -F "password=Pass123" -F "phone_number=+1234567890"
```

### Provider
```bash
# Send OTP
curl -X POST http://localhost:3000/auth/provider/send-otp \
  -H "Content-Type: application/json" \
  -d '{"provider_email":"provider@example.com"}'

# Verify OTP
curl -X POST http://localhost:3000/auth/provider/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"provider_email":"provider@example.com","otp":"123456"}'

# Register
curl -X POST http://localhost:3000/auth/provider/register \
  -F "provider_first_name=Jane" -F "provider_last_name=Smith" \
  -F "provider_userName=janesmith" -F "provider_email=provider@example.com" \
  -F "provider_password=Pass123" -F "provider_phone_number=+1234567890" \
  -F "provider_uli=ULI12345"
```

---

## Support

For detailed documentation, see: `OTP_VERIFICATION_SYSTEM_DOCUMENTATION.md`
