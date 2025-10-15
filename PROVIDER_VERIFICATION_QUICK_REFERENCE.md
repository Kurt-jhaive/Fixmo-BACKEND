# 🚀 Provider Verification & Profile Edit - Quick Reference

## 📋 Quick Links

- **Full Documentation:** [PROVIDER_VERIFICATION_RESUBMIT_DOCUMENTATION.md](./PROVIDER_VERIFICATION_RESUBMIT_DOCUMENTATION.md)
- **Testing Script:** See examples below

---

## ⚡ Quick Start

### 1️⃣ Resubmit Verification Documents (When Rejected)

```bash
# Endpoint
POST /api/verification/provider/resubmit

# Headers
Authorization: Bearer YOUR_JWT_TOKEN

# Body (multipart/form-data)
- provider_profile_photo: File (optional)
- provider_valid_id: File (optional)
- certificate_images: File[] (optional)
- certificateNames: JSON string (if uploading certificates)
- certificateNumbers: JSON string (if uploading certificates)
- expiryDates: JSON string (if uploading certificates)
```

**Quick Test (cURL):**
```bash
curl -X POST http://localhost:3000/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "provider_profile_photo=@profile.jpg" \
  -F "provider_valid_id=@id.jpg"
```

---

### 2️⃣ Update Profile (Email/Phone/Location)

**Step 1: Request OTP**
```bash
POST /api/provider/profile/request-otp
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "provider_email": "current@example.com"
}
```

**Step 2: Update with OTP**
```bash
PUT /api/provider/profile
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "otp": "123456",
  "provider_email": "new@example.com",
  "provider_phone_number": "09876543210",
  "provider_location": "Makati City",
  "provider_exact_location": "14.5547,121.0244"
}
```

---

## 📊 Status Reference

| Status | Can Resubmit? | Description |
|--------|---------------|-------------|
| `pending` | ✅ Yes | Under review or awaiting review |
| `rejected` | ✅ Yes | Admin rejected documents |
| `verified` | ❌ No | Already approved |

---

## 🔑 Important Fields

### Coordinates Format
```
provider_exact_location: "latitude,longitude"
Example: "14.5547,121.0244"
```

### Certificates Format
```json
{
  "certificateNames": ["Cert 1", "Cert 2"],
  "certificateNumbers": ["CERT001", "CERT002"],
  "expiryDates": ["2025-12-31", null]
}
```

---

## ✅ Testing Checklist

### Resubmit Documents
- [ ] Provider is in "rejected" or "pending" status
- [ ] JWT token is valid
- [ ] At least one file is uploaded
- [ ] Files are under size limits (5MB for photos, 10MB for certs)
- [ ] Response shows new Cloudinary URLs

### Profile Update
- [ ] Provider is authenticated
- [ ] OTP requested first
- [ ] OTP entered within 5 minutes
- [ ] New email/phone not already in use
- [ ] Profile updates successfully

---

## 🐛 Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| "Already approved" | Provider is verified | Can't resubmit unless rejected |
| "No files provided" | Empty form data | Upload at least one file |
| "OTP expired" | Waited > 5 mins | Request new OTP |
| "Phone in use" | Duplicate phone | Use different number |
| "Unauthorized" | Invalid token | Login again to get new token |

---

## 📱 Mobile App Flow

### When Provider Gets Rejected

1. **Show rejection reason** from `provider.rejection_reason`
2. **Display "Resubmit Documents" button**
3. **Pick new photos** using ImagePicker
4. **Upload via FormData** to `/api/verification/provider/resubmit`
5. **Show success** → Status changes to "pending"
6. **Wait for admin** to review again

### Profile Edit Flow

1. **Show "Edit Profile" screen**
2. **Request OTP** when user clicks "Update"
3. **Show OTP input field**
4. **User enters OTP** from email
5. **Submit OTP + new data** to `/api/provider/profile`
6. **Show success** and update local state

---

## 🔗 Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/verification/provider/resubmit` | POST | ✓ | Resubmit documents |
| `/api/provider/profile/request-otp` | POST | ✓ | Request OTP for edit |
| `/api/provider/profile` | PUT | ✓ | Update profile with OTP |
| `/api/provider/provider-profile` | GET | ✓ | Get current profile |

---

## 📦 Response Examples

### Successful Resubmission
```json
{
  "success": true,
  "message": "Verification documents resubmitted successfully",
  "data": {
    "provider_id": 4,
    "verification_status": "pending",
    "updated_fields": {
      "provider_profile_photo": "https://res.cloudinary.com/.../new.jpg",
      "certificates_added": 2
    }
  }
}
```

### Successful Profile Update
```json
{
  "message": "Profile updated successfully",
  "provider": {
    "provider_id": 4,
    "provider_email": "new@example.com",
    "provider_phone_number": "09876543210",
    "provider_location": "Makati City"
  }
}
```

---

## 🎯 Best Practices

1. **Always validate file types** before upload (JPEG, PNG only)
2. **Compress images** to stay under 5MB limit
3. **Show loading indicators** during upload
4. **Handle network errors** gracefully
5. **Clear form data** after successful submission
6. **Update local state** immediately after API success
7. **Show clear error messages** from API responses

---

## 🔍 Debugging Tips

**Check Backend Logs:**
```
Provider registration data: { ... }
Uploaded profile photo: https://...
Verification status: pending → verified
```

**Verify File Upload:**
```javascript
console.log('FormData entries:');
for (let [key, value] of formData.entries()) {
  console.log(key, value);
}
```

**Test Authentication:**
```javascript
const token = await AsyncStorage.getItem('token');
console.log('Token:', token ? 'Present' : 'Missing');
```

---

**Need More Details?** See [PROVIDER_VERIFICATION_RESUBMIT_DOCUMENTATION.md](./PROVIDER_VERIFICATION_RESUBMIT_DOCUMENTATION.md)

**Last Updated:** October 15, 2025
