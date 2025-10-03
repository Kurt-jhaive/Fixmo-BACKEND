# 🚀 Quick Reference: Profile Edit & Verification Updates

## 📱 Customer Endpoints

### Edit Profile
```http
PUT /api/auth/customer/customer-profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone_number": "09123456789",
  "email": "new@email.com",
  "user_location": "Quezon City",
  "exact_location": "14.6510,121.0355"
}
```

### Resubmit Verification
```http
POST /api/verification/customer/resubmit
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
- valid_id (File)
- profile_photo (File) 
- first_name (Text)
- last_name (Text)
- birthday (Text)
- user_location (Text)
- exact_location (Text)
```

---

## 👨‍🔧 Provider Endpoints

### Edit Profile
```http
PUT /api/provider/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider_phone_number": "09123456789",
  "provider_email": "new@email.com",
  "provider_location": "Manila",
  "exact_location": "14.5995,120.9842"
}
```

### Resubmit Verification
```http
POST /api/verification/provider/resubmit
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
- valid_id (File)
- profile_photo (File)
- certificates (Files)
- provider_first_name (Text)
- provider_last_name (Text)
- provider_birthday (Text)
- provider_location (Text)
- exact_location (Text)
```

---

## 💻 React Native Examples

### Customer Profile Update
```javascript
const updateCustomerProfile = async (token, data) => {
  const res = await fetch('https://api.backend.com/api/auth/customer/customer-profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return res.json();
};

// Usage
await updateCustomerProfile(token, {
  phone_number: '09123456789',
  user_location: 'Quezon City',
  exact_location: '14.6510,121.0355'
});
```

### Provider Profile Update
```javascript
const updateProviderProfile = async (token, data) => {
  const res = await fetch('https://api.backend.com/api/provider/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return res.json();
};

// Usage
await updateProviderProfile(token, {
  provider_email: 'new@email.com',
  provider_location: 'Manila'
});
```

---

## ✅ Field Reference

| Customer Fields | Provider Fields |
|-----------------|-----------------|
| `phone_number` | `provider_phone_number` |
| `email` | `provider_email` |
| `user_location` | `provider_location` |
| `exact_location` | `exact_location` |
| `first_name` * | `provider_first_name` * |
| `last_name` * | `provider_last_name` * |
| `birthday` * | `provider_birthday` * |

\* Only available in resubmission endpoints

---

## 📋 Success Responses

### Profile Edit Success
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": 123,
    "email": "new@email.com",
    "phone_number": "09123456789",
    "user_location": "Quezon City",
    "exact_location": "14.6510,121.0355"
  }
}
```

### Verification Resubmit Success
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully...",
  "data": {
    "user_id": 123,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-03T10:00:00.000Z",
    "uploaded_via": "file_upload"
  }
}
```

---

## ⚠️ Common Errors

### 400 - No Fields Provided
```json
{
  "success": false,
  "message": "At least one field (...) is required"
}
```

### 400 - Duplicate Email
```json
{
  "success": false,
  "message": "Email is already registered to another account"
}
```

### 401 - Unauthorized
```json
{
  "message": "Unauthorized"
}
```

---

## 🔍 Validation Rules

✅ **Email**: Must be unique across customer AND provider tables  
✅ **Phone**: Must be unique across customer AND provider tables  
✅ **Location**: `exact_location` format must be "lat,lng"  
✅ **Auth**: Valid JWT token required  
✅ **Fields**: At least one field must be provided

---

## 📚 Full Documentation

- `PROFILE_EDIT_ENDPOINTS_DOCUMENTATION.md` - Complete API docs
- `VERIFICATION_AND_PROFILE_UPDATES_SUMMARY.md` - Implementation summary
- `BACKEND_FIX_REQUIRED_USER_LOCATION.md` - Technical details
