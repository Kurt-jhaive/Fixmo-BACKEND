# Swagger Testing Guide - OTP Verification Endpoints

## 🎯 Accessing Swagger UI

**Swagger URL:** `http://localhost:3000/api-docs`

Open this URL in your browser to access the interactive Swagger documentation.

---

## 📋 New Endpoints Added to Swagger

### Customer Registration Flow

#### 1. POST /auth/send-otp
**Tag:** Customer Authentication  
**Description:** Step 1 - Send OTP to email for registration

**Test Request:**
```json
{
  "email": "test@example.com"
}
```

**Expected Response (200):**
```json
{
  "message": "OTP sent to email successfully"
}
```

---

#### 2. POST /auth/verify-otp
**Tag:** Customer Authentication  
**Description:** Step 2 - Verify OTP code

**Test Request:**
```json
{
  "email": "test@example.com",
  "otp": "123456"
}
```

**Expected Response (200):**
```json
{
  "message": "Email verified successfully. You can now proceed to registration.",
  "verified": true
}
```

---

#### 3. POST /auth/register
**Tag:** Customer Authentication  
**Description:** Step 3 - Register customer account

**Test Request (Form Data):**
- first_name: "John"
- last_name: "Doe"
- userName: "johndoe"
- email: "test@example.com"
- password: "SecurePass123"
- phone_number: "+1234567890"
- birthday: "1990-01-15" (optional)
- user_location: "New York" (optional)
- exact_location: "123 Main St" (optional)
- profile_photo: [File] (optional)
- valid_id: [File] (optional)

**Expected Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": 123,
  "userName": "johndoe",
  "profile_photo": "https://res.cloudinary.com/.../profile.jpg",
  "valid_id": "https://res.cloudinary.com/.../id.jpg"
}
```

---

### Service Provider Registration Flow

#### 1. POST /auth/provider/send-otp
**Tag:** Service Provider Authentication  
**Description:** Step 1 - Send OTP to provider email

**Test Request:**
```json
{
  "provider_email": "provider@example.com"
}
```

**Expected Response (200):**
```json
{
  "message": "OTP sent to provider email successfully"
}
```

---

#### 2. POST /auth/provider/verify-otp
**Tag:** Service Provider Authentication  
**Description:** Step 2 - Verify OTP code

**Test Request:**
```json
{
  "provider_email": "provider@example.com",
  "otp": "123456"
}
```

**Expected Response (200):**
```json
{
  "message": "Email verified successfully. You can now proceed to registration.",
  "verified": true
}
```

---

#### 3. POST /auth/provider/register
**Tag:** Service Provider Authentication  
**Description:** Step 3 - Register service provider account

**Test Request (Form Data):**
- provider_first_name: "Jane"
- provider_last_name: "Smith"
- provider_userName: "janesmith"
- provider_email: "provider@example.com"
- provider_password: "SecurePass123"
- provider_phone_number: "+1234567890"
- provider_uli: "ULI1234"
- provider_birthday: "1990-01-15" (optional)
- provider_location: "New York" (optional)
- provider_exact_location: "123 Main St" (optional)
- provider_profile_photo: [File] (optional)
- provider_valid_id: [File] (optional)
- certificateFile: [File Array] (optional, max 10)
- certificateNames: ["Certificate 1", "Certificate 2"]
- certificateNumbers: ["CERT001", "CERT002"]
- expiryDates: ["2025-12-31", "2026-06-30"]
- professions: ["Plumber", "Electrician"]
- experiences: ["5 years", "3 years"]

**Expected Response (201):**
```json
{
  "message": "Service provider registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "providerId": 123,
  "providerUserName": "janesmith",
  "provider_profile_photo": "https://res.cloudinary.com/.../profile.jpg",
  "provider_valid_id": "https://res.cloudinary.com/.../id.jpg",
  "certificates": [...],
  "professions": [...]
}
```

---

## 🧪 Testing Steps in Swagger UI

### Customer Registration Test

1. **Navigate to Swagger:**
   - Open `http://localhost:3000/api-docs`
   - Find "Customer Authentication" section

2. **Step 1 - Send OTP:**
   - Click on `POST /auth/send-otp`
   - Click "Try it out"
   - Enter email in request body:
     ```json
     {
       "email": "test@example.com"
     }
     ```
   - Click "Execute"
   - **Check your email for OTP code**

3. **Step 2 - Verify OTP:**
   - Click on `POST /auth/verify-otp`
   - Click "Try it out"
   - Enter email and OTP from email:
     ```json
     {
       "email": "test@example.com",
       "otp": "123456"
     }
     ```
   - Click "Execute"
   - Verify you get `verified: true` response

4. **Step 3 - Register:**
   - Click on `POST /auth/register`
   - Click "Try it out"
   - Fill in all required fields:
     - first_name: "John"
     - last_name: "Doe"
     - userName: "johndoe123"
     - email: "test@example.com" (same as verified)
     - password: "SecurePass123"
     - phone_number: "+1234567890"
   - Optionally upload files:
     - profile_photo: Select image file
     - valid_id: Select image file
   - Click "Execute"
   - Verify you receive token and user details

---

### Service Provider Registration Test

1. **Navigate to Swagger:**
   - Find "Service Provider Authentication" section

2. **Step 1 - Send OTP:**
   - Click on `POST /auth/provider/send-otp`
   - Click "Try it out"
   - Enter provider email:
     ```json
     {
       "provider_email": "provider@example.com"
     }
     ```
   - Click "Execute"
   - **Check email for OTP**

3. **Step 2 - Verify OTP:**
   - Click on `POST /auth/provider/verify-otp`
   - Click "Try it out"
   - Enter provider email and OTP:
     ```json
     {
       "provider_email": "provider@example.com",
       "otp": "123456"
     }
     ```
   - Click "Execute"
   - Verify `verified: true`

4. **Step 3 - Register:**
   - Click on `POST /auth/provider/register`
   - Click "Try it out"
   - Fill in all required fields:
     - provider_first_name: "Jane"
     - provider_last_name: "Smith"
     - provider_userName: "janesmith123"
     - provider_email: "provider@example.com"
     - provider_password: "SecurePass123"
     - provider_phone_number: "+1234567891"
     - provider_uli: "ULI1234"
   - Add certificate data (JSON arrays):
     - certificateNames: ["Plumbing License"]
     - certificateNumbers: ["PL123456"]
     - expiryDates: ["2025-12-31"]
     - professions: ["Plumber"]
     - experiences: ["5 years"]
   - Upload files:
     - provider_profile_photo: Select image
     - provider_valid_id: Select image
     - certificateFile: Select certificate images/PDFs
   - Click "Execute"
   - Verify you receive token, provider details, certificates, and professions

---

## ⚠️ Common Testing Issues

### Issue 1: OTP Not Received
**Solution:** 
- Check your email spam folder
- Verify email service is configured correctly
- Check server logs for email sending errors

### Issue 2: OTP Expired
**Error:** "OTP has expired. Please request a new OTP."  
**Solution:** 
- OTPs expire in 5 minutes
- Request a new OTP using Step 1

### Issue 3: Email Not Verified
**Error:** "Email not verified. Please verify your email before registering."  
**Solution:** 
- Complete Step 2 (verify-otp) before Step 3 (register)
- Ensure you're using the same email in all 3 steps

### Issue 4: User Already Exists
**Error:** "User already exists with this email"  
**Solution:** 
- Use a different email address
- Or delete the existing user from database

### Issue 5: Phone Number Already Registered
**Error:** "Phone number is already registered"  
**Solution:** 
- Use a different phone number
- Check both customer and provider tables

### Issue 6: File Upload Failed
**Error:** "Error uploading images. Please try again."  
**Solution:** 
- Ensure file size is under 5MB
- Use supported formats (JPG, PNG, GIF for images)
- Check Cloudinary configuration

---

## 📊 Testing Checklist

### Customer Flow
- [ ] Send OTP to new email
- [ ] Receive OTP in email
- [ ] Verify OTP successfully
- [ ] Register with verified email
- [ ] Receive JWT token
- [ ] Profile photo uploaded to Cloudinary
- [ ] Valid ID uploaded to Cloudinary

### Service Provider Flow
- [ ] Send OTP to new provider email
- [ ] Receive OTP in email
- [ ] Verify OTP successfully
- [ ] Register with all required fields
- [ ] Upload profile photo and valid ID
- [ ] Upload certificate files
- [ ] Receive JWT token
- [ ] All files uploaded to Cloudinary
- [ ] Certificates and professions created

### Error Scenarios
- [ ] Try registering without verifying OTP (should fail)
- [ ] Try with expired OTP (should fail)
- [ ] Try with wrong OTP (should fail)
- [ ] Try with duplicate email (should fail)
- [ ] Try with duplicate phone number (should fail)
- [ ] Try with missing required fields (should fail)

---

## 🔍 Swagger Features

### Interactive Testing
- ✅ Try out endpoints directly in browser
- ✅ See request/response schemas
- ✅ View example payloads
- ✅ Test with different parameters
- ✅ Upload files for testing

### Response Codes
- **200** - Success (OTP sent, OTP verified)
- **201** - Created (User/Provider registered)
- **400** - Bad Request (Validation failed)
- **429** - Too Many Requests (Rate limit)
- **500** - Server Error

### Documentation
- Complete endpoint descriptions
- Request body schemas
- Response schemas with examples
- Error response examples
- Field descriptions and formats

---

## 💡 Tips for Testing

1. **Use Real Email:**
   - Use a real email address to receive OTP codes
   - Or configure a test SMTP server

2. **Test in Sequence:**
   - Always follow Step 1 → Step 2 → Step 3
   - Don't skip the verification step

3. **Unique Data:**
   - Use unique emails for each test
   - Use unique phone numbers
   - Use unique usernames

4. **File Uploads:**
   - Test with and without files
   - Test with different file types
   - Test file size limits

5. **Error Testing:**
   - Intentionally trigger errors
   - Verify error messages are clear
   - Check HTTP status codes

6. **Token Usage:**
   - Save the token from registration response
   - Use it to test authenticated endpoints
   - Verify token expiration (30 days)

---

## 🎉 Success Indicators

### You'll know testing is successful when:
1. ✅ OTP emails are received within seconds
2. ✅ OTP verification returns `verified: true`
3. ✅ Registration returns JWT token
4. ✅ Files are uploaded to Cloudinary
5. ✅ User/Provider record created in database
6. ✅ OTP record deleted after registration
7. ✅ You can login with the registered account

---

## 📝 Next Steps After Testing

1. **Update Frontend:**
   - Implement 3-step registration UI
   - Add OTP input screen
   - Handle file uploads

2. **Monitor:**
   - Check email delivery rates
   - Monitor OTP expiration issues
   - Track registration success rates

3. **Optimize:**
   - Add resend OTP functionality
   - Implement OTP rate limiting
   - Add progress indicators

---

## 🆘 Support

If you encounter any issues:
1. Check server console logs
2. Verify database connection
3. Check Cloudinary configuration
4. Review email service settings
5. Check the detailed documentation files

**Documentation Files:**
- `OTP_VERIFICATION_SYSTEM_DOCUMENTATION.md`
- `OTP_VERIFICATION_QUICK_REFERENCE.md`
- `OTP_SYSTEM_FLOW_DIAGRAMS.md`

---

**Server Status:** ✅ Running on http://localhost:3000  
**Swagger UI:** ✅ Available at http://localhost:3000/api-docs  
**All Endpoints:** ✅ Documented and ready for testing
