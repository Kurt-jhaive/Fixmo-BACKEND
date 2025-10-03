# ✅ CORRECTED API Endpoints - OTP Verification System

## 🎯 Endpoint URLs (VERIFIED & TESTED)

### Customer Registration Endpoints

#### ✅ Step 1: Send OTP
```
POST http://localhost:3000/auth/send-otp
```
**Request Body:**
```json
{
  "email": "customer@example.com"
}
```

---

#### ✅ Step 2: Verify OTP
```
POST http://localhost:3000/auth/verify-otp
```
**Request Body:**
```json
{
  "email": "customer@example.com",
  "otp": "123456"
}
```

---

#### ✅ Step 3: Register Customer
```
POST http://localhost:3000/auth/register
```
**Content-Type:** `multipart/form-data`

**Form Fields:**
- first_name
- last_name
- userName
- email
- password
- phone_number
- birthday (optional)
- user_location (optional)
- exact_location (optional)
- profile_photo (file, optional)
- valid_id (file, optional)

---

### Service Provider Registration Endpoints

#### ✅ Step 1: Send OTP
```
POST http://localhost:3000/auth/provider/send-otp
```
**Request Body:**
```json
{
  "provider_email": "provider@example.com"
}
```

---

#### ✅ Step 2: Verify OTP
```
POST http://localhost:3000/auth/provider/verify-otp
```
**Request Body:**
```json
{
  "provider_email": "provider@example.com",
  "otp": "123456"
}
```

---

#### ✅ Step 3: Register Provider
```
POST http://localhost:3000/auth/provider/register
```
**Content-Type:** `multipart/form-data`

**Form Fields:**
- provider_first_name
- provider_last_name
- provider_userName
- provider_email
- provider_password
- provider_phone_number
- provider_uli
- provider_birthday (optional)
- provider_location (optional)
- provider_exact_location (optional)
- provider_profile_photo (file, optional)
- provider_valid_id (file, optional)
- certificateFile (file array, optional)
- certificateNames (JSON array string)
- certificateNumbers (JSON array string)
- expiryDates (JSON array string)
- professions (JSON array string)
- experiences (JSON array string)

---

## 🧪 Swagger UI Testing

**Swagger URL:**
```
http://localhost:3000/api-docs
```

### How to Test in Swagger:

1. **Open Swagger UI** in your browser
2. **Find the endpoints:**
   - Customer Authentication section
   - Service Provider Authentication section
3. **Test each step sequentially:**
   - Send OTP
   - Verify OTP (use code from email)
   - Register (with verified email)

---

## 📋 Curl Testing Commands

### Customer Registration Flow

```bash
# Step 1: Send OTP
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Step 2: Verify OTP (replace 123456 with actual OTP from email)
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
  -F "phone_number=+1234567890"
```

---

### Service Provider Registration Flow

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
  -F "provider_phone_number=+1234567891" \
  -F "provider_uli=ULI1234"
```

---

## 🔍 Endpoint Route Mapping

### Server Configuration (server.js)
```javascript
app.use('/auth', authCustomerRoutes);        // Customer routes
app.use('/auth', serviceProviderRoutes);     // Provider routes
```

### Customer Routes (authCustomer.js)
```javascript
router.post('/send-otp', ...)           → /auth/send-otp
router.post('/verify-otp', ...)         → /auth/verify-otp
router.post('/register', ...)           → /auth/register
```

### Provider Routes (serviceProvider.js)
```javascript
router.post('/provider/send-otp', ...)     → /auth/provider/send-otp
router.post('/provider/verify-otp', ...)   → /auth/provider/verify-otp
router.post('/provider/register', ...)     → /auth/provider/register
```

---

## ✅ Verification Checklist

### Before Testing:
- [x] Server running on port 3000
- [x] Routes correctly configured
- [x] Swagger documentation updated
- [x] Database connected
- [x] Email service configured
- [x] Cloudinary configured

### Customer Endpoints:
- [x] `/auth/send-otp` - Accessible
- [x] `/auth/verify-otp` - Accessible
- [x] `/auth/register` - Accessible

### Provider Endpoints:
- [x] `/auth/provider/send-otp` - Accessible
- [x] `/auth/provider/verify-otp` - Accessible
- [x] `/auth/provider/register` - Accessible

---

## 🎉 All Endpoints Are Now Correct!

### Customer URLs:
✅ `POST /auth/send-otp`  
✅ `POST /auth/verify-otp`  
✅ `POST /auth/register`  

### Provider URLs:
✅ `POST /auth/provider/send-otp`  
✅ `POST /auth/provider/verify-otp`  
✅ `POST /auth/provider/register`  

---

## 💡 Testing Tips

1. **Use Sequential Testing:**
   - Always complete Step 1 before Step 2
   - Always complete Step 2 before Step 3

2. **Check Email:**
   - OTP will be sent to the email provided
   - Check spam folder if not received

3. **Use Unique Data:**
   - Different email for each test
   - Different phone number for each test
   - Different username for each test

4. **File Uploads:**
   - Optional for testing
   - Max size: 5MB per file
   - Formats: JPG, PNG, GIF

5. **Verify Responses:**
   - Step 1: "OTP sent successfully"
   - Step 2: `verified: true`
   - Step 3: JWT token + user data

---

## 🆘 Troubleshooting

### "Route not found" Error
**Solution:** Endpoints are now correctly configured with `/provider/` prefix

### "Email not verified" Error  
**Solution:** Complete Step 2 (verify-otp) before Step 3 (register)

### "OTP expired" Error
**Solution:** OTPs expire in 5 minutes. Request a new one.

### "User already exists" Error
**Solution:** Use a different email address or delete existing user

---

## 📱 Frontend Integration

### React Native Example

```javascript
// Step 1: Send OTP
const sendOTP = async (email) => {
  const response = await fetch('http://localhost:3000/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// Step 2: Verify OTP
const verifyOTP = async (email, otp) => {
  const response = await fetch('http://localhost:3000/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  return response.json();
};

// Step 3: Register
const register = async (userData) => {
  const formData = new FormData();
  Object.keys(userData).forEach(key => {
    formData.append(key, userData[key]);
  });
  
  const response = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    body: formData
  });
  return response.json();
};
```

### Provider Registration Example

```javascript
// Step 1: Send OTP
const sendProviderOTP = async (provider_email) => {
  const response = await fetch('http://localhost:3000/auth/provider/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_email })
  });
  return response.json();
};

// Step 2: Verify OTP
const verifyProviderOTP = async (provider_email, otp) => {
  const response = await fetch('http://localhost:3000/auth/provider/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_email, otp })
  });
  return response.json();
};

// Step 3: Register Provider
const registerProvider = async (providerData) => {
  const formData = new FormData();
  Object.keys(providerData).forEach(key => {
    if (key === 'certificateFile' && Array.isArray(providerData[key])) {
      providerData[key].forEach(file => formData.append('certificateFile', file));
    } else {
      formData.append(key, providerData[key]);
    }
  });
  
  const response = await fetch('http://localhost:3000/auth/provider/register', {
    method: 'POST',
    body: formData
  });
  return response.json();
};
```

---

## 🎯 Ready to Test!

**All endpoints are now correctly configured and ready for testing!**

**Start here:** `http://localhost:3000/api-docs`

✅ Server Running  
✅ Routes Configured  
✅ Swagger Updated  
✅ Ready for Production  
