# 📱 Customer Authentication System - Complete Documentation

## 🎯 Overview

The customer authentication system implements a **3-step email verification process** to ensure secure account creation. This documentation covers the complete registration flow from OTP generation to account creation.

---

## 📊 Database Schema (Prisma)

### User Model
```prisma
model User {
  user_id           Int            @id @default(autoincrement())
  first_name        String         // Required
  last_name         String         // Required
  email             String         @unique // Required, must be unique
  phone_number      String         @unique // Required, must be unique
  profile_photo     String?        // Optional - Cloudinary URL
  valid_id          String?        // Optional - Cloudinary URL
  user_location     String?        // Optional
  created_at        DateTime       @default(now())
  is_verified       Boolean        @default(false)
  verification_status String       @default("pending") // pending, approved, rejected
  rejection_reason  String?
  verification_submitted_at DateTime?
  verification_reviewed_at  DateTime?
  password          String         // Required - Hashed with bcrypt
  userName          String         @unique // Required, must be unique
  is_activated      Boolean        @default(true)
  birthday          DateTime?      // Optional
  exact_location    String?        // Optional
  user_reason       String?        // Optional
  user_appointments Appointment[]
  user_rating       Rating[]
  conversations     Conversation[]
  backjob_applications BackjobApplication[] @relation("UserBackjobs")
}

model OTPVerification {
  otp_id      Int      @id @default(autoincrement())
  email       String   // Email for OTP verification
  otp         String   // 6-digit OTP code
  expires_at  DateTime // Expiration timestamp (5 minutes)
  created_at  DateTime @default(now())
  verified    Boolean  @default(false) // Verification status
}
```

---

## 🚀 Registration Flow

### Overview Diagram
```
┌─────────────────────────────────┐
│  Step 1: Send OTP               │
│  POST /auth/send-otp            │
│  ↓                              │
│  • Validate email               │
│  • Check if user exists         │
│  • Generate 6-digit OTP         │
│  • Store in database            │
│  • Send email                   │
│  • OTP expires in 5 minutes     │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  Step 2: Verify OTP             │
│  POST /auth/verify-otp          │
│  ↓                              │
│  • Validate OTP code            │
│  • Check expiration             │
│  • Mark as verified             │
│  • Ready for registration       │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  Step 3: Register               │
│  POST /auth/register            │
│  ↓                              │
│  • Check email is verified      │
│  • Validate all fields          │
│  • Upload files to Cloudinary   │
│  • Hash password                │
│  • Create user account          │
│  • Generate JWT token           │
│  • Delete OTP record            │
│  • Send success email           │
└─────────────────────────────────┘
```

---

## 📝 Step 1: Send OTP

### Endpoint
```
POST /auth/send-otp
```

### Request
```json
{
  "email": "customer@example.com"
}
```

### Headers
```
Content-Type: application/json
```

### Process Flow
1. **Validate Email:** Check email format is valid
2. **Check Existing User:** Verify email is not already registered
3. **Rate Limiting:** Max 3 OTP requests per 30 seconds per email
4. **Generate OTP:** Create random 6-digit code (100000-999999)
5. **Store OTP:** Save to database with 5-minute expiration
6. **Send Email:** Deliver OTP to customer's email
7. **Record Attempt:** Track rate limiting

### Success Response (200)
```json
{
  "message": "OTP sent to email successfully"
}
```

### Error Responses

#### User Already Exists (400)
```json
{
  "message": "User already exists with this email"
}
```

#### Email Required (400)
```json
{
  "message": "Email is required"
}
```

#### Rate Limit Exceeded (429)
```json
{
  "message": "Too many OTP requests. Please wait 30 seconds before trying again."
}
```

#### Server Error (500)
```json
{
  "message": "Error sending OTP"
}
```

### Database Operations
```sql
-- Check if user exists
SELECT * FROM "User" WHERE email = 'customer@example.com';

-- Check/Update existing OTP
SELECT * FROM "OTPVerification" WHERE email = 'customer@example.com';

-- Create or update OTP record
INSERT INTO "OTPVerification" (email, otp, expires_at, verified)
VALUES ('customer@example.com', '123456', NOW() + INTERVAL '5 minutes', false)
ON CONFLICT (email) DO UPDATE
SET otp = EXCLUDED.otp, 
    expires_at = EXCLUDED.expires_at, 
    verified = false;
```

### Implementation Details
- **OTP Length:** 6 digits
- **Expiration:** 5 minutes
- **Rate Limit:** 3 attempts per 30 seconds
- **Email Service:** Uses configured SMTP service
- **Storage:** PostgreSQL via Prisma

### Testing Example (cURL)
```bash
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com"}'
```

### Testing Example (JavaScript)
```javascript
const response = await fetch('http://localhost:3000/auth/send-otp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'customer@example.com'
  })
});

const data = await response.json();
console.log(data); // { message: "OTP sent to email successfully" }
```

---

## ✅ Step 2: Verify OTP

### Endpoint
```
POST /auth/verify-otp
```

### Request
```json
{
  "email": "customer@example.com",
  "otp": "123456"
}
```

### Headers
```
Content-Type: application/json
```

### Process Flow
1. **Validate Input:** Check email and OTP are provided
2. **Find OTP Record:** Query database for matching email
3. **Check Expiration:** Verify OTP hasn't expired (5 minutes)
4. **Verify Code:** Compare provided OTP with stored OTP
5. **Mark Verified:** Set `verified = true` in database
6. **Return Success:** Confirm email is verified

### Success Response (200)
```json
{
  "message": "Email verified successfully. You can now proceed to registration.",
  "verified": true
}
```

### Error Responses

#### No OTP Found (400)
```json
{
  "message": "No OTP found for this email. Please request a new OTP."
}
```

#### OTP Expired (400)
```json
{
  "message": "OTP has expired. Please request a new OTP."
}
```

#### Invalid OTP (400)
```json
{
  "message": "Invalid OTP. Please try again."
}
```

#### Missing Fields (400)
```json
{
  "message": "Email and OTP are required"
}
```

#### Server Error (500)
```json
{
  "message": "Error verifying OTP"
}
```

### Database Operations
```sql
-- Find OTP record
SELECT * FROM "OTPVerification" 
WHERE email = 'customer@example.com';

-- Check expiration
SELECT * FROM "OTPVerification" 
WHERE email = 'customer@example.com' 
AND expires_at > NOW();

-- Mark as verified
UPDATE "OTPVerification" 
SET verified = true 
WHERE email = 'customer@example.com';
```

### Implementation Details
- **OTP Validity:** Must match exactly
- **Case Sensitive:** OTP is case-sensitive
- **One-Time Use:** Can be verified multiple times before registration
- **Expiration Check:** Server-side timestamp validation
- **Verification Flag:** `verified` column set to `true`

### Testing Example (cURL)
```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email":"customer@example.com",
    "otp":"123456"
  }'
```

### Testing Example (JavaScript)
```javascript
const response = await fetch('http://localhost:3000/auth/verify-otp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    otp: '123456' // From email
  })
});

const data = await response.json();
console.log(data); 
// { message: "Email verified successfully...", verified: true }
```

---

## 🎉 Step 3: Register

### Endpoint
```
POST /auth/register
```

### Content-Type
```
multipart/form-data
```

### Required Fields

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| `first_name` | string | Required | "John" |
| `last_name` | string | Required | "Doe" |
| `userName` | string | Required, Unique | "johndoe123" |
| `email` | string | Required, Unique, Verified | "john@example.com" |
| `password` | string | Required, Min 6 chars | "SecurePass123!" |
| `phone_number` | string | Required, Unique | "09171234567" |

### Optional Fields

| Field | Type | Max Size | Format | Example |
|-------|------|----------|--------|---------|
| `birthday` | date | - | YYYY-MM-DD | "1990-01-15" |
| `user_location` | string | - | Text | "Manila, Philippines" |
| `exact_location` | string | - | Text | "123 Main St, Makati" |
| `profile_photo` | file | 5MB | JPG, PNG, GIF | image file |
| `valid_id` | file | 5MB | JPG, PNG, GIF | image file |

### Request Example (Form Data)
```javascript
const formData = new FormData();

// Required fields
formData.append('first_name', 'John');
formData.append('last_name', 'Doe');
formData.append('userName', 'johndoe123');
formData.append('email', 'john@example.com');
formData.append('password', 'SecurePass123!');
formData.append('phone_number', '09171234567');

// Optional fields
formData.append('birthday', '1990-01-15');
formData.append('user_location', 'Manila, Philippines');
formData.append('exact_location', '123 Main St, Makati');

// Optional file uploads
if (profilePhoto) {
  formData.append('profile_photo', profilePhoto);
}
if (validId) {
  formData.append('valid_id', validId);
}
```

### Process Flow
1. **Check Email Verification:** Verify OTP was completed (verified = true)
2. **Validate Required Fields:** Ensure all required data is present
3. **Check Duplicates:** Verify email, username, phone are unique
4. **Upload Files to Cloudinary:**
   - Profile photo → `fixmo/customer-profiles/`
   - Valid ID → `fixmo/customer-ids/`
5. **Hash Password:** bcrypt with 10 salt rounds
6. **Create User Account:** Insert into User table
7. **Generate JWT Token:** 30-day expiration for mobile
8. **Delete OTP Record:** Clean up verification data
9. **Send Success Email:** Welcome email to customer
10. **Return Response:** JWT token + user data

### Success Response (201)
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 123,
  "userName": "johndoe123",
  "profile_photo": "https://res.cloudinary.com/.../profile.jpg",
  "valid_id": "https://res.cloudinary.com/.../id.jpg"
}
```

### Error Responses

#### Email Not Verified (400)
```json
{
  "message": "Email not verified. Please verify your email before registering."
}
```

#### No OTP Record (400)
```json
{
  "message": "Email not found. Please verify your email first."
}
```

#### User Already Exists (400)
```json
{
  "message": "User already exists"
}
```

#### Duplicate Phone Number (400)
```json
{
  "message": "Phone number is already registered with another account"
}
```

#### Duplicate Username (400)
```json
{
  "message": "Username is already taken"
}
```

#### Missing Required Fields (400)
```json
{
  "message": "All required fields must be provided"
}
```

#### File Upload Error (500)
```json
{
  "message": "Error uploading images. Please try again."
}
```

#### Server Error (500)
```json
{
  "message": "Server error during registration"
}
```

### Database Operations
```sql
-- Check OTP verification
SELECT * FROM "OTPVerification" 
WHERE email = 'john@example.com' 
AND verified = true;

-- Check for existing user
SELECT * FROM "User" WHERE email = 'john@example.com';

-- Check for duplicate phone
SELECT * FROM "User" WHERE phone_number = '09171234567';

-- Check for duplicate username
SELECT * FROM "User" WHERE "userName" = 'johndoe123';

-- Create user account
INSERT INTO "User" (
  first_name, last_name, "userName", email, password,
  phone_number, birthday, user_location, exact_location,
  profile_photo, valid_id, created_at, is_verified,
  verification_status, is_activated
) VALUES (
  'John', 'Doe', 'johndoe123', 'john@example.com', '$2a$10$...',
  '09171234567', '1990-01-15', 'Manila', '123 Main St',
  'https://cloudinary.com/profile.jpg', 'https://cloudinary.com/id.jpg',
  NOW(), false, 'pending', true
) RETURNING user_id;

-- Delete OTP record
DELETE FROM "OTPVerification" WHERE email = 'john@example.com';
```

### Security Features

#### Password Hashing
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
// Result: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

#### JWT Token Generation
```javascript
const token = jwt.sign(
  { 
    userId: user.user_id,
    id: user.user_id,
    userType: 'customer',
    email: user.email
  }, 
  process.env.JWT_SECRET, 
  { expiresIn: '30d' }
);
```

### File Upload Specifications

#### Profile Photo
- **Accepted Formats:** JPG, JPEG, PNG, GIF
- **Max Size:** 5MB
- **Storage:** Cloudinary
- **Folder:** `fixmo/customer-profiles/`
- **Naming:** `customer_profile_{email}_{timestamp}`
- **Optional:** Can register without photo

#### Valid ID
- **Accepted Formats:** JPG, JPEG, PNG, GIF
- **Max Size:** 5MB
- **Storage:** Cloudinary
- **Folder:** `fixmo/customer-ids/`
- **Naming:** `customer_id_{email}_{timestamp}`
- **Optional:** Can register without ID

### Testing Example (cURL)
```bash
curl -X POST http://localhost:3000/auth/register \
  -F "first_name=John" \
  -F "last_name=Doe" \
  -F "userName=johndoe123" \
  -F "email=john@example.com" \
  -F "password=SecurePass123!" \
  -F "phone_number=09171234567" \
  -F "birthday=1990-01-15" \
  -F "user_location=Manila" \
  -F "profile_photo=@/path/to/photo.jpg" \
  -F "valid_id=@/path/to/id.jpg"
```

### Testing Example (JavaScript/React Native)
```javascript
const formData = new FormData();
formData.append('first_name', 'John');
formData.append('last_name', 'Doe');
formData.append('userName', 'johndoe123');
formData.append('email', 'john@example.com');
formData.append('password', 'SecurePass123!');
formData.append('phone_number', '09171234567');

// Add optional files
if (profilePhoto) {
  formData.append('profile_photo', {
    uri: profilePhoto.uri,
    type: 'image/jpeg',
    name: 'profile.jpg'
  });
}

const response = await fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Registration success:', data);

// Save JWT token
await AsyncStorage.setItem('authToken', data.token);
```

---

## 🔐 Security Considerations

### Password Requirements
- **Minimum Length:** 6 characters (recommended: 8+)
- **Hashing:** bcrypt with 10 salt rounds
- **Storage:** Never stored in plain text
- **Transmission:** Sent via HTTPS only

### JWT Token
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiration:** 30 days
- **Payload:** userId, userType, email
- **Secret:** Stored in environment variable
- **Usage:** Include in Authorization header for protected routes

### Email Verification
- **Purpose:** Prevent fake accounts
- **OTP Validity:** 5 minutes
- **Rate Limiting:** 3 attempts per 30 seconds
- **Cleanup:** OTP deleted after successful registration

### File Upload Security
- **Validation:** File type checking
- **Size Limit:** 5MB per file
- **Storage:** Cloudinary (not local filesystem)
- **Malware:** Cloudinary handles security scanning
- **Access:** Public URLs (for profile display)

---

## 📊 Complete Flow Example

### 1. Send OTP Request
```javascript
const sendOTP = async (email) => {
  const response = await fetch('http://localhost:3000/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// Usage
const result = await sendOTP('john@example.com');
console.log(result); // { message: "OTP sent to email successfully" }
```

### 2. Verify OTP
```javascript
const verifyOTP = async (email, otp) => {
  const response = await fetch('http://localhost:3000/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  return response.json();
};

// Usage (after receiving OTP via email)
const result = await verifyOTP('john@example.com', '123456');
console.log(result); // { message: "Email verified...", verified: true }
```

### 3. Register Account
```javascript
const register = async (userData) => {
  const formData = new FormData();
  
  Object.keys(userData).forEach(key => {
    if (userData[key]) {
      formData.append(key, userData[key]);
    }
  });
  
  const response = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};

// Usage
const userData = {
  first_name: 'John',
  last_name: 'Doe',
  userName: 'johndoe123',
  email: 'john@example.com',
  password: 'SecurePass123!',
  phone_number: '09171234567',
  birthday: '1990-01-15',
  user_location: 'Manila'
};

const result = await register(userData);
console.log(result.token); // Save this JWT token!
```

### Complete Registration Flow
```javascript
const completeRegistration = async () => {
  try {
    // Step 1: Send OTP
    console.log('Step 1: Sending OTP...');
    await sendOTP('john@example.com');
    
    // Step 2: User receives email and enters OTP
    console.log('Step 2: Check your email for OTP');
    const userOTP = prompt('Enter OTP from email:');
    const verified = await verifyOTP('john@example.com', userOTP);
    
    if (!verified.verified) {
      throw new Error('OTP verification failed');
    }
    
    // Step 3: Register
    console.log('Step 3: Registering account...');
    const userData = {
      first_name: 'John',
      last_name: 'Doe',
      userName: 'johndoe123',
      email: 'john@example.com',
      password: 'SecurePass123!',
      phone_number: '09171234567'
    };
    
    const result = await register(userData);
    
    // Save token
    localStorage.setItem('authToken', result.token);
    
    console.log('Registration complete!', result);
    
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

---

## 🧪 Testing Checklist

### Step 1: Send OTP
- [ ] Send OTP to valid email
- [ ] Attempt to send OTP to existing user email (should fail)
- [ ] Try without email field (should fail)
- [ ] Test rate limiting (4th request within 30 seconds should fail)
- [ ] Verify email is received
- [ ] Check OTP is 6 digits

### Step 2: Verify OTP
- [ ] Verify with correct OTP
- [ ] Try with wrong OTP (should fail)
- [ ] Wait 5+ minutes and try (should fail - expired)
- [ ] Verify without email or OTP (should fail)
- [ ] Verify the `verified` flag is set to true

### Step 3: Register
- [ ] Register with all required fields
- [ ] Register without verifying OTP first (should fail)
- [ ] Try with duplicate email (should fail)
- [ ] Try with duplicate phone number (should fail)
- [ ] Try with duplicate username (should fail)
- [ ] Register with profile photo upload
- [ ] Register with valid ID upload
- [ ] Register with oversized file (>5MB) - should fail
- [ ] Verify JWT token is returned
- [ ] Verify user is created in database
- [ ] Verify OTP record is deleted
- [ ] Check profile photo URL in response
- [ ] Check valid ID URL in response

---

## 🔧 Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fixmo_db"
DIRECT_URL="postgresql://user:password@localhost:5432/fixmo_db"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email Service (for OTP)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="noreply@fixmo.com"
```

---

## 📱 Mobile App Integration

### React Native Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const CustomerRegistration = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOTP] = useState('');
  const [formData, setFormData] = useState({});
  const [profilePhoto, setProfilePhoto] = useState(null);
  
  // Step 1: Send OTP
  const handleSendOTP = async () => {
    try {
      const response = await fetch('http://api.fixmo.com/auth/send-otp', {
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
      Alert.alert('Error', 'Network error');
    }
  };
  
  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    try {
      const response = await fetch('http://api.fixmo.com/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      
      if (response.ok && data.verified) {
        Alert.alert('Success', 'Email verified');
        setStep(3);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };
  
  // Step 3: Register
  const handleRegister = async () => {
    try {
      const form = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        form.append(key, formData[key]);
      });
      
      form.append('email', email);
      
      // Add profile photo if selected
      if (profilePhoto) {
        form.append('profile_photo', {
          uri: profilePhoto.uri,
          type: 'image/jpeg',
          name: 'profile.jpg'
        });
      }
      
      const response = await fetch('http://api.fixmo.com/auth/register', {
        method: 'POST',
        body: form
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Save JWT token
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userId', data.userId.toString());
        
        Alert.alert('Success', 'Registration complete!');
        navigation.navigate('Home');
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    }
  };
  
  // Pick profile photo
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setProfilePhoto(result.assets[0]);
    }
  };
  
  return (
    <View>
      {step === 1 && (
        <SendOTPForm 
          email={email} 
          setEmail={setEmail}
          onSubmit={handleSendOTP}
        />
      )}
      
      {step === 2 && (
        <VerifyOTPForm 
          otp={otp}
          setOTP={setOTP}
          onSubmit={handleVerifyOTP}
        />
      )}
      
      {step === 3 && (
        <RegistrationForm 
          formData={formData}
          setFormData={setFormData}
          profilePhoto={profilePhoto}
          onPickImage={pickImage}
          onSubmit={handleRegister}
        />
      )}
    </View>
  );
};
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "User already exists"
**Cause:** Email is already registered  
**Solution:** User should login instead or use forgot password

### Issue 2: "OTP has expired"
**Cause:** More than 5 minutes passed since OTP was sent  
**Solution:** Request a new OTP (Step 1)

### Issue 3: "Email not verified"
**Cause:** Trying to register without completing Step 2  
**Solution:** Complete OTP verification first

### Issue 4: "Phone number is already registered"
**Cause:** Phone number is used by another account  
**Solution:** Use a different phone number or contact support

### Issue 5: "Username is already taken"
**Cause:** Username is not unique  
**Solution:** Choose a different username

### Issue 6: File upload fails
**Cause:** File too large or wrong format  
**Solution:** 
- Compress image to under 5MB
- Use JPG, PNG, or GIF format only
- Check internet connection

### Issue 7: Rate limit exceeded
**Cause:** Too many OTP requests  
**Solution:** Wait 30 seconds before requesting again

---

## 📈 API Response Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | OK | Successful OTP send/verify |
| 201 | Created | User successfully registered |
| 400 | Bad Request | Missing fields, validation error, duplicate data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Database error, email service down, file upload failed |

---

## 🎯 Best Practices

### For Frontend Developers
1. **Clear UI/UX:** Show which step user is on (1/3, 2/3, 3/3)
2. **Error Handling:** Display clear error messages to users
3. **Loading States:** Show spinners during API calls
4. **Validation:** Validate fields before submission
5. **Token Storage:** Store JWT securely (AsyncStorage, SecureStore)
6. **Image Compression:** Compress images before upload
7. **Network Errors:** Handle offline scenarios gracefully

### For Backend Developers
1. **Rate Limiting:** Monitor and adjust as needed
2. **Email Delivery:** Ensure OTP emails aren't marked as spam
3. **Database Indexes:** Ensure email, phone, username are indexed
4. **Log Monitoring:** Track failed registration attempts
5. **Cloudinary Quota:** Monitor upload limits
6. **Security:** Regular JWT secret rotation
7. **Backups:** Regular database backups

---

## 📞 Support & Resources

### Documentation Files
- `CUSTOMER_AUTHENTICATION_GUIDE.md` - This file
- `FORGOT_PASSWORD_DOCUMENTATION.md` - Password reset guide
- `PROVIDER_REGISTRATION_GUIDE.md` - Service provider guide
- `OTP_VERIFICATION_SYSTEM_DOCUMENTATION.md` - OTP system details

### Swagger API Documentation
- URL: `http://localhost:3000/api-docs`
- Section: "Customer Authentication"
- Interactive testing available

### Database Schema
- File: `prisma/schema.prisma`
- Models: User, OTPVerification
- View with: `npx prisma studio`

---

## ✅ Implementation Checklist

- [x] Step 1: Send OTP endpoint implemented
- [x] Step 2: Verify OTP endpoint implemented
- [x] Step 3: Register endpoint implemented
- [x] Rate limiting configured
- [x] File upload to Cloudinary working
- [x] Password hashing with bcrypt
- [x] JWT token generation
- [x] Email service configured
- [x] Database schema created
- [x] Swagger documentation complete
- [x] Error handling implemented
- [x] Security measures in place

---

**Last Updated:** October 2025  
**API Version:** 1.0  
**Base URL:** `http://localhost:3000/auth`  
**Status:** ✅ Production Ready
