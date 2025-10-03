# OTP-Based Email Verification System Documentation

## Overview
This document describes the new 3-step OTP-based email verification system implemented for both customer and service provider registration.

## System Architecture

### Database Schema
The `OTPVerification` table has been updated with a new field:
- `verified` (Boolean, default: false) - Tracks whether the OTP has been successfully verified

```prisma
model OTPVerification {
  id         Int      @id @default(autoincrement())
  email      String
  otp        String
  expires_at DateTime
  created_at DateTime @default(now())
  verified   Boolean  @default(false)
}
```

## Customer Registration Flow

### Step 1: Send OTP
**Endpoint:** `POST /auth/send-otp`

**Request Body:**
```json
{
  "email": "customer@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to email successfully"
}
```

**Functionality:**
- Generates a 6-digit OTP
- Sets expiration to 5 minutes from creation
- Updates existing OTP record or creates new one
- Sets `verified` to `false`
- Sends OTP via email
- Includes rate limiting protection

---

### Step 2: Verify OTP
**Endpoint:** `POST /auth/verify-otp`

**Request Body:**
```json
{
  "email": "customer@example.com",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "message": "Email verified successfully. You can now proceed to registration.",
  "verified": true
}
```

**Error Responses:**
- Invalid OTP: `{ "message": "Invalid OTP. Please try again." }`
- Expired OTP: `{ "message": "OTP has expired. Please request a new OTP." }`
- Already verified: `{ "message": "Email already verified. You can proceed to registration." }`

**Functionality:**
- Validates OTP matches the record
- Checks if OTP is expired
- Marks `verified` field as `true`
- Does not delete the OTP record

---

### Step 3: Register
**Endpoint:** `POST /auth/register`

**Request:** Multipart form-data with fields:
```
first_name: string
last_name: string
userName: string
email: string
birthday: date required
phone_number: string
user_location: string required
exact_location: string required
profile_photo: file required
valid_id: file required
```

**Success Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "userId": 123,
  "userName": "johndoe",
  "profile_photo": "cloudinary_url",
  "valid_id": "cloudinary_url"
}
```

**Error Response:**
```json
{
  "message": "Email not verified. Please verify your email before registering."
}
```

**Functionality:**
- Checks if email exists in OTPVerification table
- Verifies that `verified` field is `true`
- Validates all required fields
- Checks for duplicate email, username, and phone number
- Hashes password using bcrypt
- Uploads images to Cloudinary
- Creates user account
- Sends registration success email
- Deletes the used OTP record
- Returns JWT token for immediate login

---

## Service Provider Registration Flow

### Step 1: Send OTP
**Endpoint:** `POST /auth/provider/send-otp`

**Request Body:**
```json
{
  "provider_email": "provider@example.com"
}
```

**Response:**
```json
{
  "message": "OTP sent to provider email successfully"
}
```

**Functionality:**
- Same as customer flow but for service provider email
- Validates provider doesn't already exist

---

### Step 2: Verify OTP
**Endpoint:** `POST /auth/provider/verify-otp`

**Request Body:**
```json
{
  "provider_email": "provider@example.com",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "message": "Email verified successfully. You can now proceed to registration.",
  "verified": true
}
```

**Functionality:**
- Same validation as customer verify OTP endpoint

---

### Step 3: Register
**Endpoint:** `POST /auth/provider/register`

**Request:** Multipart form-data with fields:
```
provider_first_name: string
provider_last_name: string
provider_userName: string
provider_email: string
provider_password: string
provider_phone_number: string
provider_uli: string (unique learner identifier !4 digits)
provider_birthday: date  required
provider_location: string  required
provider_exact_location: string required    
provider_profile_photo: file required
provider_valid_id: file required
certificateFile: file[] required
certificateNames: JSON array required
certificateNumbers: JSON array required
expiryDates: JSON array required
professions: JSON array required
experiences: JSON array required
```

**Success Response:**
```json
{
  "message": "Service provider registered successfully",
  "token": "jwt_token_here",
  "providerId": 123,
  "providerUserName": "johndoe",
  "provider_profile_photo": "cloudinary_url",
  "provider_valid_id": "cloudinary_url",
  "certificates": [...],
  "professions": [...]
}
```

**Functionality:**
- Checks if email exists in OTPVerification table
- Verifies that `verified` field is `true`
- Validates all required fields
- Checks for duplicate email, username, and phone number
- Parses JSON arrays for certificates and professions
- Hashes password using bcrypt
- Uploads all images/documents to Cloudinary
- Creates provider account with certificates and professions
- Sends registration success email
- Deletes the used OTP record
- Returns JWT token for immediate login

---

## Key Features

### Security
1. **OTP Expiration:** OTPs expire after 5 minutes
2. **Verified Flag:** Ensures OTP is verified before registration
3. **Rate Limiting:** Prevents OTP spam (customer flow only)
4. **Password Hashing:** Uses bcrypt with 10 rounds
5. **Record Cleanup:** OTP records are deleted after successful registration

### Validation
1. **Email Uniqueness:** Checks against existing users/providers
2. **Phone Number Uniqueness:** Cross-checks both user and provider tables
3. **Required Fields:** Validates all mandatory registration fields
4. **OTP Validation:** Checks existence, expiration, and correctness
5. **Verification Check:** Ensures email is verified before registration

### Error Handling
- Clear error messages for each validation failure
- Separate error codes for different failure scenarios
- Proper HTTP status codes (400, 429, 500)

---

## Migration Information

**Migration Name:** `20251003122622_add_verified_to_otp`

**Applied:** Successfully applied to database

**Changes:**
- Added `verified` Boolean field to `OTPVerification` table
- Default value set to `false`

---

## Backward Compatibility

### Legacy Customer Endpoints (Still Active)
- `POST /auth/request-otp` - Alias for send-otp
- `POST /auth/verify-otp-only` - Legacy verify-only endpoint
- `POST /auth/verify-register` - Old combined endpoint (still checks verified status)

### Legacy Provider Endpoints (Still Active)
- `POST /auth/provider/provider-request-otp` - Alias for send-otp
- `POST /auth/provider/provider-verify-otp-only` - Legacy verify-only endpoint
- `POST /auth/provider/provider-verify-register` - Old combined endpoint (still checks verified status)

### Controller Functions
- `requestOTP` is now an alias for `sendOTP`
- `requestProviderOTP` is now an alias for `sendProviderOTP`
- `verifyOTPAndRegister` is now an alias for `registerCustomer`
- `verifyProviderOTPAndRegister` is now an alias for `registerServiceProvider`

---

## Testing the Flow

### Customer Registration Test

```bash
# Step 1: Send OTP
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Step 2: Verify OTP (check email for code)
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Step 3: Register
curl -X POST http://localhost:3000/auth/register \
  -F "first_name=John" \
  -F "last_name=Doe" \
  -F "userName=johndoe" \
  -F "email=test@example.com" \
  -F "password=SecurePass123" \
  -F "phone_number=+1234567890" \
  -F "profile_photo=@profile.jpg" \
  -F "valid_id=@id.jpg"
```

### Service Provider Registration Test

```bash
# Step 1: Send OTP
curl -X POST http://localhost:3000/auth/provider/send-otp \
  -H "Content-Type: application/json" \
  -d '{"provider_email":"provider@example.com"}'

# Step 2: Verify OTP
curl -X POST http://localhost:3000/auth/provider/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"provider_email":"provider@example.com","otp":"123456"}'

# Step 3: Register
curl -X POST http://localhost:3000/auth/provider/register \
  -F "provider_first_name=Jane" \
  -F "provider_last_name=Smith" \
  -F "provider_userName=janesmith" \
  -F "provider_email=provider@example.com" \
  -F "provider_password=SecurePass123" \
  -F "provider_phone_number=+1234567890" \
  -F "provider_uli=ULI12345" \
  -F "provider_profile_photo=@profile.jpg" \
  -F "provider_valid_id=@id.jpg"
```

---

## Implementation Details

### Files Modified

1. **prisma/schema.prisma**
   - Added `verified` field to `OTPVerification` model

2. **src/controller/authCustomerController.js**
   - Added `sendOTP()` function
   - Added `verifyOTPForRegistration()` function
   - Added `registerCustomer()` function
   - Updated legacy functions to use new flow

3. **src/controller/authserviceProviderController.js**
   - Added `sendProviderOTP()` function
   - Added `verifyProviderOTP()` function
   - Added `registerServiceProvider()` function
   - Updated legacy functions to use new flow

4. **src/route/authCustomer.js**
   - Added route `POST /send-otp`
   - Added route `POST /verify-otp`
   - Added route `POST /register`
   - Renamed legacy route to `/verify-otp-only`

5. **src/route/serviceProvider.js**
   - Added route `POST /send-otp`
   - Added route `POST /verify-otp`
   - Added route `POST /register`
   - Renamed legacy route to `/provider-verify-otp-only`

---

## Benefits of New System

1. **Clear Separation:** Each step has a distinct purpose
2. **Better UX:** Users can verify their email before filling out the full registration form
3. **Improved Security:** Verified flag prevents bypassing email verification
4. **Flexibility:** Frontend can implement step-by-step UI
5. **Debugging:** Easier to identify which step is failing
6. **Reusability:** OTP verification logic can be reused for other features

---

## Important Notes

1. **OTP Expiration:** OTPs expire after 5 minutes - ensure users complete the flow promptly
2. **Email Uniqueness:** Each email can only be registered once
3. **Phone Uniqueness:** Phone numbers are checked across both customer and provider tables
4. **File Uploads:** Profile photos and IDs are optional but recommended
5. **Token Generation:** Successful registration automatically logs in the user
6. **Record Cleanup:** OTP records are deleted after successful registration to maintain database cleanliness

---

## Future Enhancements

1. Add SMS OTP option alongside email
2. Implement resend OTP functionality with countdown timer
3. Add OTP verification for password reset
4. Track failed OTP attempts per email
5. Implement CAPTCHA for rate limit protection
6. Add webhook notifications for successful registrations
