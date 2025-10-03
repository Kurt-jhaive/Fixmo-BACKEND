# 📋 Service Provider Registration Guide

## Complete Step-by-Step Guide to Register as a Service Provider

---

## 🎯 Overview

Service provider registration is a **3-step process** that ensures email verification before account creation:

1. **Send OTP** - Request verification code
2. **Verify OTP** - Validate the code
3. **Register** - Complete registration with all details

---

## 📝 Step 1: Send OTP

### Endpoint
```
POST /auth/provider/send-otp
```

### Request Body
```json
{
  "provider_email": "your.email@example.com"
}
```

### Success Response
```json
{
  "message": "OTP sent to email successfully"
}
```

### Common Errors
| Error | Cause | Solution |
|-------|-------|----------|
| `Provider already exists with this email` | Email is already registered | Use a different email or login |
| `Email is required` | Missing email field | Include provider_email in request |

---

## ✅ Step 2: Verify OTP

### Endpoint
```
POST /auth/provider/verify-otp
```

### Request Body
```json
{
  "provider_email": "your.email@example.com",
  "otp": "123456"
}
```

### Success Response
```json
{
  "message": "Email verified successfully. You can now proceed to registration.",
  "verified": true
}
```

### Common Errors
| Error | Cause | Solution |
|-------|-------|----------|
| `No OTP found for this email` | OTP not sent or expired | Request a new OTP (Step 1) |
| `OTP has expired` | More than 5 minutes passed | Request a new OTP (Step 1) |
| `Invalid OTP` | Wrong code entered | Check your email for correct code |

---

## 🚀 Step 3: Register Service Provider

### Endpoint
```
POST /auth/provider/register
```

### Content-Type
```
multipart/form-data
```

---

## 📄 Required Fields

### Basic Information (REQUIRED)
| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `provider_first_name` | string | "Jane" | Provider's first name |
| `provider_last_name` | string | "Smith" | Provider's last name |
| `provider_userName` | string | "janesmith123" | Unique username |
| `provider_email` | string | "jane@example.com" | Verified email |
| `provider_password` | string | "SecurePass123!" | Strong password |
| `provider_phone_number` | string | "09171234567" | Contact number |
| `provider_uli` | string | "123456789121" | Unique Learner ID (12 digits) |

---

## 📷 Optional File Uploads

### Profile & Identity Files
| Field | Type | Max Size | Format | Description |
|-------|------|----------|--------|-------------|
| `provider_profile_photo` | file | 10MB | JPG, PNG, GIF | Profile photo |
| `provider_valid_id` | file | 10MB | JPG, PNG, GIF | Government ID |

### Certificate Files
| Field | Type | Max Count | Max Size | Format | Description |
|-------|------|-----------|----------|--------|-------------|
| `certificate_images` | file[] | 10 | 10MB each | JPG, PNG, GIF, PDF | Certificate images |

---

## 📊 Certificate & Profession Data

### Certificate Information (JSON Arrays as Strings)
```json
{
  "certificateNames": "[\"Carpentry NC II\", \"Electrical Installation NC II\"]",
  "certificateNumbers": "[\"CERT-12345\", \"CERT-67890\"]",
  "expiryDates": "[\"2025-12-31\", \"2026-06-30\"]"
}
```

### Profession Information (JSON Arrays as Strings)
```json
{
  "professions": "[\"plumber\", \"electrician\"]",
  "experiences": "[\"5 years\", \"3 years\"]"
}
```

---

## 🌍 Location Information (Optional)
| Field | Type | Example |
|-------|------|---------|
| `provider_location` | string | "BARANGAY 652, PORT AREA, MANILA" |
| `provider_exact_location` | string | "Unit 123, Building A" |
| `provider_birthday` | date | "1990-01-15" |

---

## ✅ Success Response

```json
{
  "message": "Service provider registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerId": 123,
  "providerUserName": "janesmith123",
  "provider_profile_photo": "https://res.cloudinary.com/.../profile.jpg",
  "provider_valid_id": "https://res.cloudinary.com/.../id.jpg",
  "certificates": [
    {
      "certificate_id": 1,
      "certificate_name": "Carpentry NC II",
      "certificate_number": "CERT-12345",
      "certificate_file_path": "https://res.cloudinary.com/.../cert1.jpg",
      "expiry_date": "2025-12-31T00:00:00.000Z"
    }
  ],
  "professions": [
    {
      "id": 1,
      "provider_id": 123,
      "profession": "plumber",
      "experience": "5 years"
    },
    {
      "id": 2,
      "provider_id": 123,
      "profession": "electrician",
      "experience": "3 years"
    }
  ]
}
```

---

## ❌ Common Registration Errors

### 1. Email Not Verified
```json
{
  "message": "Email not verified. Please verify your email before registering."
}
```
**Solution:** Complete Step 2 (Verify OTP) first

---

### 2. Missing Required Fields
```json
{
  "message": "All required fields must be provided"
}
```
**Solution:** Check that all required fields are included:
- provider_email
- provider_password
- provider_first_name
- provider_last_name
- provider_userName
- provider_phone_number
- provider_uli

---

### 3. Duplicate Phone Number
```json
{
  "message": "Phone number is already registered with another provider account"
}
```
**Solution:** Use a different phone number

---

### 4. Provider Already Exists
```json
{
  "message": "Provider already exists"
}
```
**Solution:** This email is already registered. Try logging in instead.

---

### 5. File Too Large
```json
{
  "success": false,
  "message": "File too large. Maximum size is 10MB per file."
}
```
**Solution:** Compress your images before uploading. Each file must be ≤ 10MB.

---

### 6. Invalid File Type
```json
{
  "success": false,
  "message": "Certificate files must be images (JPG, PNG, GIF) or documents (PDF, DOC, DOCX)"
}
```
**Solution:** Ensure files are in supported formats:
- Images: JPG, PNG, GIF, WEBP
- Documents: PDF, DOC, DOCX

---

### 7. Duplicate Certificate Number
```
Error uploading certificate to Cloudinary: PrismaClientKnownRequestError: 
Unique constraint failed on the fields: (certificate_number)
```
**Solution:** Each certificate number must be unique. If you've previously registered with the same certificate number, it will be skipped automatically.

---

### 8. Profession Data Type Error
```
TypeError: profession.trim is not a function
```
**Solution:** This has been fixed. Professions are now automatically converted to strings.

---

## 📱 React Native / Mobile Integration Example

```javascript
const registerProvider = async () => {
  // Step 1: Send OTP
  const otpResponse = await fetch('http://localhost:3000/auth/provider/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      provider_email: 'jane@example.com' 
    })
  });
  
  // Step 2: Verify OTP (after user enters code)
  const verifyResponse = await fetch('http://localhost:3000/auth/provider/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      provider_email: 'jane@example.com',
      otp: '123456' // From user input
    })
  });
  
  // Step 3: Register
  const formData = new FormData();
  
  // Required fields
  formData.append('provider_first_name', 'Jane');
  formData.append('provider_last_name', 'Smith');
  formData.append('provider_userName', 'janesmith123');
  formData.append('provider_email', 'jane@example.com');
  formData.append('provider_password', 'SecurePass123!');
  formData.append('provider_phone_number', '09171234567');
  formData.append('provider_uli', '123456789121');
  
  // Optional location
  formData.append('provider_location', 'Manila');
  formData.append('provider_birthday', '1990-01-15');
  
  // Optional files
  if (profilePhoto) {
    formData.append('provider_profile_photo', {
      uri: profilePhoto.uri,
      type: 'image/jpeg',
      name: 'profile.jpg'
    });
  }
  
  if (validId) {
    formData.append('provider_valid_id', {
      uri: validId.uri,
      type: 'image/jpeg',
      name: 'id.jpg'
    });
  }
  
  // Certificate files (multiple)
  certificateFiles.forEach((file, index) => {
    formData.append('certificate_images', {
      uri: file.uri,
      type: 'image/jpeg',
      name: `cert_${index}.jpg`
    });
  });
  
  // Certificate data (as JSON strings)
  formData.append('certificateNames', JSON.stringify(['Carpentry NC II']));
  formData.append('certificateNumbers', JSON.stringify(['CERT-12345']));
  formData.append('expiryDates', JSON.stringify(['2025-12-31']));
  
  // Profession data (as JSON strings)
  formData.append('professions', JSON.stringify(['plumber', 'electrician']));
  formData.append('experiences', JSON.stringify(['5 years', '3 years']));
  
  const registerResponse = await fetch('http://localhost:3000/auth/provider/register', {
    method: 'POST',
    body: formData
  });
  
  const result = await registerResponse.json();
  console.log('Registration result:', result);
  
  // Save the JWT token
  await AsyncStorage.setItem('authToken', result.token);
};
```

---

## 🔍 Validation Rules

### Email
- Must be valid email format
- Must not already exist in database
- Must be verified before registration

### Username
- Must be unique
- No special validation beyond uniqueness

### Password
- No specific requirements enforced (but should be strong)
- Will be hashed with bcrypt (10 rounds)

### Phone Number
- Must be unique
- Format: Any valid phone number format

### ULI (Unique Learner Identifier)
- Must be unique
- Should be 12 digits
- Example: "123456789121"

### Certificate Numbers
- Must be unique across all providers
- Duplicates will be automatically skipped

### Professions
- Must be non-empty strings
- Experience field defaults to "0 years" if not provided

---

## 📸 File Upload Best Practices

### Image Optimization
1. **Compress images** before upload to stay under 10MB
2. **Recommended dimensions:**
   - Profile photo: 512x512px or smaller
   - Valid ID: Max 1920x1080px
   - Certificates: Max 1920x1080px

### File Formats
- **Images:** JPG, PNG, GIF, WEBP
- **Documents:** PDF, DOC, DOCX

### Storage
- All files are automatically uploaded to **Cloudinary**
- You'll receive public URLs in the response
- Files are organized by folder:
  - `fixmo/provider-profiles/`
  - `fixmo/provider-ids/`
  - `fixmo/certificates/`

---

## 🔐 Security Features

1. **OTP Verification** - Email must be verified before registration
2. **Password Hashing** - bcrypt with 10 salt rounds
3. **JWT Tokens** - 30-day expiry for mobile apps
4. **Unique Constraints** - Prevents duplicate emails, usernames, phone numbers, ULIs
5. **File Validation** - Only allowed file types and sizes accepted

---

## 🎯 Testing Checklist

Before going to production, test these scenarios:

- [ ] Send OTP to valid email
- [ ] Send OTP to already registered email (should fail)
- [ ] Verify OTP with correct code
- [ ] Verify OTP with expired code (wait 5+ minutes)
- [ ] Verify OTP with wrong code
- [ ] Register with all required fields only
- [ ] Register with all fields including optional ones
- [ ] Register with profile photo (< 10MB)
- [ ] Register with oversized file (> 10MB) - should fail
- [ ] Register with invalid file type - should fail
- [ ] Register with multiple certificates
- [ ] Register with duplicate phone number - should fail
- [ ] Register with duplicate username - should fail
- [ ] Register without verifying OTP first - should fail

---

## 📞 Support & Troubleshooting

### Still Having Issues?

1. **Check the server logs** for detailed error messages
2. **Verify all required fields** are included in your request
3. **Ensure files are within size limits** (10MB per file)
4. **Use proper JSON array format** for certificates and professions
5. **Complete all 3 steps in order** (Send OTP → Verify OTP → Register)

### Debug Mode

Enable detailed logging by checking server console output:
- File upload status
- OTP verification status
- Database operations
- Certificate and profession creation

---

## 🎉 Success!

Once registered successfully, you'll receive:
- ✅ JWT authentication token (save this!)
- ✅ Provider ID
- ✅ Profile and ID image URLs (from Cloudinary)
- ✅ Certificate records with URLs
- ✅ Profession records

Use the JWT token for all subsequent authenticated requests.

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────┐
│   1. Send OTP Request   │
│   POST /provider/send   │
│   -otp                  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Check Email (5 min)    │
│  Get 6-digit OTP        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Verify OTP           │
│ POST /provider/verify   │
│ -otp                    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ OTP Verified ✓          │
│ Email marked as         │
│ verified in DB          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Complete             │
│ Registration            │
│ POST /provider/register │
│ (with all data +files)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Upload files to         │
│ Cloudinary              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Create provider         │
│ account in database     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Create certificates &   │
│ professions             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Return JWT token +      │
│ provider data           │
│ ✅ REGISTRATION         │
│    COMPLETE!            │
└─────────────────────────┘
```

---

**Last Updated:** October 2025  
**API Version:** 1.0  
**Base URL:** `http://localhost:3000/auth`
