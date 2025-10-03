# Verification Controller - Quick Reference Guide

## 📋 Quick Links

- **Full Documentation:** [VERIFICATION_CONTROLLER_DOCUMENTATION.md](./VERIFICATION_CONTROLLER_DOCUMENTATION.md)
- **Controller:** `src/controller/verificationController.js`
- **Routes:** `src/route/verificationRoutes.js`
- **Cloudinary Service:** `src/services/cloudinaryService.js`

---

## 🚀 Quick Start

### 1. Upload Image to Cloudinary (Frontend)

```javascript
// Step 1: Upload file to your backend
const formData = new FormData();
formData.append('file', imageFile);
formData.append('folder', 'fixmo/verification/customers');

const response = await fetch('/api/upload/cloudinary', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { url } = await response.json();

// Step 2: Submit verification
await fetch('/api/verification/customer/resubmit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    valid_id_url: url,
    profile_photo_url: profileUrl  // Optional
  })
});
```

### 2. Admin Review Verification

```javascript
// Get pending verifications
const pending = await fetch('/api/verification/admin/pending?type=all', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Approve
await fetch(`/api/verification/admin/customer/${userId}/approve`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Reject
await fetch(`/api/verification/admin/customer/${userId}/reject`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rejection_reason: 'ID document is unclear'
  })
});
```

### 3. Check Verification Status

```javascript
const status = await fetch('/api/verification/customer/status', {
  headers: { 'Authorization': `Bearer ${customerToken}` }
});

const data = await status.json();
console.log(data.data.verification_status); // 'pending', 'approved', 'rejected'
console.log(data.data.rejection_reason);    // Reason if rejected
```

---

## 🔑 API Endpoints Cheat Sheet

### Admin Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/api/verification/admin/pending` | Get all pending | Query: `type=customer/provider/all` |
| POST | `/api/verification/admin/customer/:user_id/approve` | Approve customer | - |
| POST | `/api/verification/admin/customer/:user_id/reject` | Reject customer | `{ rejection_reason }` |
| POST | `/api/verification/admin/provider/:provider_id/approve` | Approve provider | - |
| POST | `/api/verification/admin/provider/:provider_id/reject` | Reject provider | `{ rejection_reason }` |

### Customer/Provider Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/api/verification/customer/status` | Get customer status | - |
| GET | `/api/verification/provider/status` | Get provider status | - |
| POST | `/api/verification/customer/resubmit` | Re-submit customer docs | `{ valid_id_url, profile_photo_url? }` |
| POST | `/api/verification/provider/resubmit` | Re-submit provider docs | `{ valid_id_url, profile_photo_url?, certificate_urls? }` |

---

## 📸 Cloudinary Functions

### Upload Image

```javascript
import { uploadToCloudinary } from '../services/cloudinaryService.js';

// From buffer (multer upload)
const url = await uploadToCloudinary(
  fileBuffer,                          // File buffer
  'fixmo/verification/customers',      // Folder
  'user_123_validid_1234567890'       // Optional public ID
);
```

### Delete Image

```javascript
import { deleteFromCloudinary, extractPublicId } from '../services/cloudinaryService.js';

// Extract public ID from URL
const url = 'https://res.cloudinary.com/.../fixmo/verification/customers/user_123.jpg';
const publicId = extractPublicId(url); // 'fixmo/verification/customers/user_123'

// Delete
await deleteFromCloudinary(publicId);
```

---

## 🗂️ Cloudinary Folder Structure

```
fixmo/
├── verification/
│   ├── customers/
│   │   ├── user_{user_id}_profile_{timestamp}.jpg
│   │   └── user_{user_id}_validid_{timestamp}.jpg
│   └── providers/
│       ├── provider_{provider_id}_profile_{timestamp}.jpg
│       ├── provider_{provider_id}_validid_{timestamp}.jpg
│       └── certificates/
│           └── provider_{provider_id}_cert{n}_{timestamp}.jpg
```

---

## 📊 Verification Status Flow

```
┌─────────┐
│ pending │ ← Initial state after document submission
└────┬────┘
     │
     ├──── Admin Approves ────> ┌──────────┐
     │                           │ approved │ ← User has full access
     │                           └──────────┘
     │
     └──── Admin Rejects ─────> ┌──────────┐
                                 │ rejected │ ← User must resubmit
                                 └────┬─────┘
                                      │
                              User Resubmits
                                      │
                                      ▼
                                 ┌─────────┐
                                 │ pending │ ← Back to review
                                 └─────────┘
```

---

## 🎯 Common Use Cases

### Use Case 1: Customer Registration with Verification

```javascript
// 1. Customer uploads documents during registration
const profilePhotoUrl = await uploadToCloudinary(profilePhotoBuffer, 'fixmo/verification/customers');
const validIdUrl = await uploadToCloudinary(validIdBuffer, 'fixmo/verification/customers');

// 2. Create user with documents
const user = await prisma.user.create({
  data: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    profile_photo: profilePhotoUrl,
    valid_id: validIdUrl,
    verification_status: 'pending',
    verification_submitted_at: new Date()
  }
});

// 3. User waits for admin review
```

### Use Case 2: Admin Reviews and Rejects

```javascript
// Admin reviews and rejects
await fetch(`/api/verification/admin/customer/${userId}/reject`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rejection_reason: 'ID document is expired. Please provide a valid ID.'
  })
});

// User receives email with rejection reason
// Database updated:
// - verification_status: 'rejected'
// - rejection_reason: '...'
// - verification_reviewed_at: timestamp
```

### Use Case 3: Customer Resubmits After Rejection

```javascript
// 1. Customer checks status
const response = await fetch('/api/verification/customer/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();

if (data.verification_status === 'rejected') {
  console.log('Rejection reason:', data.rejection_reason);
  
  // 2. Customer uploads new document
  const newIdUrl = await uploadNewDocument();
  
  // 3. Customer resubmits
  await fetch('/api/verification/customer/resubmit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      valid_id_url: newIdUrl,
      profile_photo_url: newProfileUrl  // Optional
    })
  });
  
  // Status now: 'pending', rejection_reason: null
}
```

### Use Case 4: Provider with Multiple Certificates

```javascript
// Provider resubmits with new certificates
const validIdUrl = await uploadToCloudinary(idBuffer, 'fixmo/verification/providers');
const profilePhotoUrl = await uploadToCloudinary(profileBuffer, 'fixmo/verification/providers');
const cert1Url = await uploadToCloudinary(cert1Buffer, 'fixmo/verification/providers/certificates');
const cert2Url = await uploadToCloudinary(cert2Buffer, 'fixmo/verification/providers/certificates');

await fetch('/api/verification/provider/resubmit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${providerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    valid_id_url: validIdUrl,
    profile_photo_url: profilePhotoUrl,  // Optional
    certificate_urls: [cert1Url, cert2Url]  // Optional
  })
});

// Old certificates are automatically deleted
// New certificates are created
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Rejection reason is required" | Admin rejected without reason | Always provide `rejection_reason` |
| "Valid ID image is required" | Resubmission without document | Upload and provide `valid_id_url` |
| "Your account is already verified" | Attempting to resubmit when approved | No action needed |
| "Customer not found" | Invalid user_id | Check user exists |
| "Upload failed" | Cloudinary error | Check credentials, file size, file type |

### Error Response Format

```json
{
  "success": false,
  "message": "Failed to approve verification",
  "error": "Database connection error"
}
```

---

## 🔒 Security Checklist

- [ ] All endpoints use authentication middleware
- [ ] Admin endpoints use `adminAuthMiddleware`
- [ ] Customer/Provider endpoints use `authMiddleware`
- [ ] File uploads limited to 10MB
- [ ] Only image files allowed (jpeg, png, jpg, webp)
- [ ] Cloudinary URLs validated before saving
- [ ] Rejection reason length validated (max 500 chars)
- [ ] Rate limiting on resubmission endpoints
- [ ] Environment variables never committed to Git

---

## 🧪 Testing Commands

### Test with cURL

```bash
# Get pending verifications
curl -X GET http://localhost:3000/api/verification/admin/pending?type=all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Approve customer
curl -X POST http://localhost:3000/api/verification/admin/customer/123/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Reject customer
curl -X POST http://localhost:3000/api/verification/admin/customer/123/reject \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rejection_reason": "ID document is unclear"}'

# Get customer status
curl -X GET http://localhost:3000/api/verification/customer/status \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN"

# Resubmit verification
curl -X POST http://localhost:3000/api/verification/customer/resubmit \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"valid_id_url": "https://res.cloudinary.com/.../new_id.jpg", "profile_photo_url": "https://res.cloudinary.com/.../new_profile.jpg"}'
```

---

## 📧 Email Templates

### Approval Email
- **Subject:** ✅ Your Fixmo Account Has Been Verified!
- **Content:** Welcome message, next steps, support info

### Rejection Email
- **Subject:** ⚠️ Fixmo Account Verification Update Required
- **Content:** Rejection reason, re-submission instructions

---

## 🔧 Environment Variables

```env
# Required for Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Required for JWT authentication
JWT_SECRET=your_jwt_secret

# Required for database
DATABASE_URL=postgresql://...

# Optional: Debug mode
DEBUG_VERIFICATION=true
```

---

## 📚 Related Documentation

- [VERIFICATION_CONTROLLER_DOCUMENTATION.md](./VERIFICATION_CONTROLLER_DOCUMENTATION.md) - Full documentation
- [VERIFICATION_FIELDS_UPDATE_SUMMARY.md](./VERIFICATION_FIELDS_UPDATE_SUMMARY.md) - Schema changes
- [VERIFICATION_FIELDS_DEVELOPER_GUIDE.md](./VERIFICATION_FIELDS_DEVELOPER_GUIDE.md) - Frontend integration

---

## 🆘 Need Help?

1. Check the [Full Documentation](./VERIFICATION_CONTROLLER_DOCUMENTATION.md)
2. Review error logs in console
3. Test with Postman collection
4. Contact backend team

---

**Quick Reference Version:** 1.0.0  
**Last Updated:** January 17, 2025
