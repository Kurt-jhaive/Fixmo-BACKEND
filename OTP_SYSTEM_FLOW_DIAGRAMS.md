# OTP Verification System - Visual Flow Diagrams

## Customer Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER REGISTRATION FLOW                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │
│   (Step 1)   │
└──────┬───────┘
       │
       │ POST /auth/send-otp
       │ { email: "user@example.com" }
       ▼
┌──────────────────────────────────────────────┐
│         Backend Controller (sendOTP)          │
├───────────────────────────────────────────────┤
│ 1. Validate email format                      │
│ 2. Check if user already exists ❌            │
│ 3. Generate 6-digit OTP                       │
│ 4. Set expires_at = now + 5 minutes          │
│ 5. Check if OTP record exists                │
│    ├─ Yes: Update with new OTP & verified=false │
│    └─ No: Create new record with verified=false │
│ 6. Send OTP via email 📧                      │
└──────┬───────────────────────────────────────┘
       │
       │ ✅ { message: "OTP sent successfully" }
       ▼
┌──────────────┐
│   Frontend   │
│   (Step 2)   │
│ User enters  │
│ OTP from     │
│ email        │
└──────┬───────┘
       │
       │ POST /auth/verify-otp
       │ { email: "user@example.com", otp: "123456" }
       ▼
┌──────────────────────────────────────────────┐
│   Backend Controller (verifyOTPForRegistration)│
├───────────────────────────────────────────────┤
│ 1. Find OTP record by email                  │
│ 2. Check if record exists ❌                  │
│ 3. Check if already verified ✅               │
│ 4. Check if OTP expired ⏰                    │
│ 5. Check if OTP matches ❌                    │
│ 6. Update: verified = true                   │
└──────┬───────────────────────────────────────┘
       │
       │ ✅ { message: "Email verified", verified: true }
       ▼
┌──────────────┐
│   Frontend   │
│   (Step 3)   │
│ Show full    │
│ registration │
│ form         │
└──────┬───────┘
       │
       │ POST /auth/register
       │ FormData: { email, password, first_name, ... }
       ▼
┌──────────────────────────────────────────────┐
│   Backend Controller (registerCustomer)      │
├───────────────────────────────────────────────┤
│ 1. Find OTP record by email                  │
│ 2. Check if record exists ❌                  │
│ 3. Check if verified = true ❌               │
│ 4. Validate all required fields              │
│ 5. Check email uniqueness ❌                  │
│ 6. Check phone uniqueness ❌                  │
│ 7. Check username uniqueness ❌               │
│ 8. Upload files to Cloudinary 📤             │
│ 9. Hash password with bcrypt 🔒              │
│ 10. Create user in database                  │
│ 11. Send registration success email 📧       │
│ 12. Delete OTP record 🗑️                     │
│ 13. Generate JWT token 🎫                    │
└──────┬───────────────────────────────────────┘
       │
       │ ✅ { message: "Registered", token, userId, userName }
       ▼
┌──────────────┐
│   Frontend   │
│   Success!   │
│   Auto-login │
└──────────────┘
```

---

## Service Provider Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│               SERVICE PROVIDER REGISTRATION FLOW                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │
│   (Step 1)   │
└──────┬───────┘
       │
       │ POST /auth/provider/send-otp
       │ { provider_email: "provider@example.com" }
       ▼
┌──────────────────────────────────────────────┐
│    Backend Controller (sendProviderOTP)       │
├───────────────────────────────────────────────┤
│ 1. Validate email format                      │
│ 2. Check if provider already exists ❌        │
│ 3. Generate 6-digit OTP                       │
│ 4. Set expires_at = now + 5 minutes          │
│ 5. Update/Create OTP record (verified=false) │
│ 6. Send OTP via email 📧                      │
└──────┬───────────────────────────────────────┘
       │
       │ ✅ { message: "OTP sent successfully" }
       ▼
┌──────────────┐
│   Frontend   │
│   (Step 2)   │
└──────┬───────┘
       │
       │ POST /auth/provider/verify-otp
       │ { provider_email: "...", otp: "123456" }
       ▼
┌──────────────────────────────────────────────┐
│   Backend Controller (verifyProviderOTP)      │
├───────────────────────────────────────────────┤
│ 1. Find OTP record                           │
│ 2. Validate existence, expiry, match         │
│ 3. Update: verified = true                   │
└──────┬───────────────────────────────────────┘
       │
       │ ✅ { message: "Email verified", verified: true }
       ▼
┌──────────────┐
│   Frontend   │
│   (Step 3)   │
└──────┬───────┘
       │
       │ POST /auth/provider/register
       │ FormData: { provider_email, provider_password, ... }
       ▼
┌──────────────────────────────────────────────┐
│ Backend Controller (registerServiceProvider)  │
├───────────────────────────────────────────────┤
│ 1. Check OTP verified = true ❌              │
│ 2. Validate all fields                       │
│ 3. Check uniqueness (email, phone, ULI)      │
│ 4. Upload files to Cloudinary 📤             │
│ 5. Hash password 🔒                          │
│ 6. Create provider account                   │
│ 7. Create certificates & professions         │
│ 8. Send success email 📧                     │
│ 9. Delete OTP record 🗑️                     │
│ 10. Generate JWT token 🎫                   │
└──────┬───────────────────────────────────────┘
       │
       │ ✅ { message: "Registered", token, providerId, ... }
       ▼
┌──────────────┐
│   Frontend   │
│   Success!   │
└──────────────┘
```

---

## Database State Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                 OTPVerification TABLE STATES                     │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Send OTP
┌──────────────────────────────────────────────┐
│ OTPVerification Table                         │
├───────────────────────────────────────────────┤
│ email:      user@example.com                  │
│ otp:        "123456"                          │
│ expires_at: 2024-10-03 12:35:00              │
│ verified:   false          ⬅️ NEW FIELD       │
│ created_at: 2024-10-03 12:30:00              │
└──────────────────────────────────────────────┘

STEP 2: Verify OTP
┌──────────────────────────────────────────────┐
│ OTPVerification Table                         │
├───────────────────────────────────────────────┤
│ email:      user@example.com                  │
│ otp:        "123456"                          │
│ expires_at: 2024-10-03 12:35:00              │
│ verified:   true           ⬅️ UPDATED         │
│ created_at: 2024-10-03 12:30:00              │
└──────────────────────────────────────────────┘

STEP 3: Register
┌──────────────────────────────────────────────┐
│ OTPVerification Table                         │
├───────────────────────────────────────────────┤
│ Record DELETED after registration ✅          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ User/ServiceProviderDetails Table             │
├───────────────────────────────────────────────┤
│ New user created ✅                           │
│ JWT token generated ✅                        │
└──────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERROR SCENARIOS                             │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Send OTP
├─ User exists
│  └─ 400: "User already exists with this email"
│
├─ Rate limit exceeded
│  └─ 429: "Too many OTP requests. Please try again later"
│
└─ Server error
   └─ 500: "Error sending OTP"

STEP 2: Verify OTP
├─ No OTP record
│  └─ 400: "No OTP found. Please request a new OTP"
│
├─ OTP expired (> 5 minutes)
│  └─ 400: "OTP has expired. Please request a new OTP"
│
├─ OTP doesn't match
│  └─ 400: "Invalid OTP. Please try again"
│
├─ Already verified
│  └─ 200: "Email already verified. Proceed to registration"
│
└─ Server error
   └─ 500: "Error verifying OTP"

STEP 3: Register
├─ Email not verified
│  └─ 400: "Email not verified. Please verify your email first"
│
├─ No OTP record
│  └─ 400: "Email not found. Please verify your email first"
│
├─ User already exists
│  └─ 400: "User already exists"
│
├─ Phone already registered
│  └─ 400: "Phone number already registered"
│
├─ Missing required fields
│  └─ 400: "All required fields must be provided"
│
├─ File upload error
│  └─ 500: "Error uploading images. Please try again"
│
└─ Server error
   └─ 500: "Server error during registration"
```

---

## Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Rate Limiting
┌────────────────────────────┐
│ Prevents OTP spam          │
│ Max 5 requests per hour    │
└────────────────────────────┘

Layer 2: OTP Expiration
┌────────────────────────────┐
│ 5-minute expiry window     │
│ Forces timely verification │
└────────────────────────────┘

Layer 3: Verified Flag
┌────────────────────────────┐
│ Prevents unauthorized      │
│ registration               │
└────────────────────────────┘

Layer 4: Uniqueness Checks
┌────────────────────────────┐
│ Email, Phone, Username     │
│ Cross-table validation     │
└────────────────────────────┘

Layer 5: Password Hashing
┌────────────────────────────┐
│ bcrypt with 10 rounds      │
│ Secure password storage    │
└────────────────────────────┘

Layer 6: JWT Token
┌────────────────────────────┐
│ 30-day expiry              │
│ Signed with secret         │
└────────────────────────────┘
```

---

## Comparison: Old vs New Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    OLD FLOW (2 Steps)                            │
└─────────────────────────────────────────────────────────────────┘

Step 1: POST /auth/request-otp + upload files
        ↓
        Send OTP + Store files temporarily
        
Step 2: POST /auth/verify-register + all data
        ↓
        Verify OTP + Create user
        
❌ Issues:
   - OTP sent with file uploads
   - No persistent verification
   - Combined verification + registration
   - Difficult to implement step-by-step UI

┌─────────────────────────────────────────────────────────────────┐
│                    NEW FLOW (3 Steps)                            │
└─────────────────────────────────────────────────────────────────┘

Step 1: POST /auth/send-otp
        ↓
        Send OTP only (verified = false)
        
Step 2: POST /auth/verify-otp
        ↓
        Verify OTP (verified = true)
        
Step 3: POST /auth/register + upload files
        ↓
        Check verified flag + Create user
        
✅ Benefits:
   - Clear separation of concerns
   - Persistent verification state
   - Better UX with step-by-step flow
   - Easier error handling
   - Files uploaded only when needed
```

---

## API Response Examples

```javascript
// STEP 1: Send OTP - Success
{
  "message": "OTP sent to email successfully"
}

// STEP 1: Send OTP - Error (User exists)
{
  "message": "User already exists with this email"
}

// STEP 2: Verify OTP - Success
{
  "message": "Email verified successfully. You can now proceed to registration.",
  "verified": true
}

// STEP 2: Verify OTP - Error (Invalid)
{
  "message": "Invalid OTP. Please try again."
}

// STEP 2: Verify OTP - Error (Expired)
{
  "message": "OTP has expired. Please request a new OTP."
}

// STEP 3: Register - Success
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 123,
  "userName": "johndoe",
  "profile_photo": "https://cloudinary.com/...",
  "valid_id": "https://cloudinary.com/..."
}

// STEP 3: Register - Error (Not Verified)
{
  "message": "Email not verified. Please verify your email before registering."
}

// STEP 3: Register - Error (Missing Fields)
{
  "message": "All required fields must be provided"
}
```

---

## Legend

```
✅ Success
❌ Error/Validation Check
📧 Email Sent
📤 File Upload
🔒 Password Hashing
🗑️ Record Deletion
🎫 Token Generation
⏰ Time-based Check
```
