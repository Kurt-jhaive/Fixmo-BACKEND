# 📤 Verification Resubmission - Complete Upload Guide

## ✅ NOW SUPPORTS BOTH FILE UPLOADS AND URLS!

The verification resubmission endpoints have been **updated with multer middleware** and now support **two methods**:

1. **File Upload** (Recommended) - Upload files directly, backend handles Cloudinary
2. **URL Submission** - Send pre-uploaded Cloudinary URLs

---

## 🎯 Method 1: Direct File Upload (Recommended)

### Customer Resubmission

**Endpoint:** `POST /api/verification/customer/resubmit`

**Request Format:** `multipart/form-data`

**Fields:**
- `valid_id` (File, Required) - Valid ID image
- `profile_photo` (File, Optional) - Profile photo

**Example (React Native):**
```javascript
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

const resubmitCustomerVerification = async (token) => {
  try {
    // Step 1: Pick images
    const validIdResult = await launchImageLibrary({ mediaType: 'photo' });
    const profilePhotoResult = await launchImageLibrary({ mediaType: 'photo' });

    if (validIdResult.didCancel || profilePhotoResult.didCancel) return;

    // Step 2: Create FormData
    const formData = new FormData();
    formData.append('valid_id', {
      uri: validIdResult.assets[0].uri,
      type: validIdResult.assets[0].type || 'image/jpeg',
      name: validIdResult.assets[0].fileName || 'valid_id.jpg'
    });
    formData.append('profile_photo', {
      uri: profilePhotoResult.assets[0].uri,
      type: profilePhotoResult.assets[0].type || 'image/jpeg',
      name: profilePhotoResult.assets[0].fileName || 'profile.jpg'
    });

    // Step 3: Submit to backend (backend handles Cloudinary upload)
    const response = await axios.post(
      'https://api.yourbackend.com/api/verification/customer/resubmit',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Success:', response.data);
    // Response includes: uploaded_via: 'file_upload'
  } catch (error) {
    console.error('Error:', error.response?.data || error);
  }
};
```

**Example (cURL):**
```bash
curl -X POST https://api.yourbackend.com/api/verification/customer/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "valid_id=@/path/to/id.jpg" \
  -F "profile_photo=@/path/to/photo.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "user_id": 123,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-03T10:00:00.000Z",
    "uploaded_via": "file_upload"
  }
}
```

---

### Provider Resubmission

**Endpoint:** `POST /api/verification/provider/resubmit`

**Request Format:** `multipart/form-data`

**Fields:**
- `valid_id` (File, Required) - Valid ID image
- `profile_photo` (File, Optional) - Profile photo
- `certificates` (Files, Optional) - Up to 3 certificate images

**Example (React Native):**
```javascript
const resubmitProviderVerification = async (token) => {
  try {
    // Step 1: Pick images
    const validIdResult = await launchImageLibrary({ mediaType: 'photo' });
    const profilePhotoResult = await launchImageLibrary({ mediaType: 'photo' });
    const cert1Result = await launchImageLibrary({ mediaType: 'photo' });
    const cert2Result = await launchImageLibrary({ mediaType: 'photo' });

    // Step 2: Create FormData
    const formData = new FormData();
    
    formData.append('valid_id', {
      uri: validIdResult.assets[0].uri,
      type: 'image/jpeg',
      name: 'valid_id.jpg'
    });
    
    formData.append('profile_photo', {
      uri: profilePhotoResult.assets[0].uri,
      type: 'image/jpeg',
      name: 'profile.jpg'
    });

    // Add multiple certificates (same field name)
    formData.append('certificates', {
      uri: cert1Result.assets[0].uri,
      type: 'image/jpeg',
      name: 'cert1.jpg'
    });
    formData.append('certificates', {
      uri: cert2Result.assets[0].uri,
      type: 'image/jpeg',
      name: 'cert2.jpg'
    });

    // Step 3: Submit to backend
    const response = await axios.post(
      'https://api.yourbackend.com/api/verification/provider/resubmit',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error);
  }
};
```

**Example (cURL):**
```bash
curl -X POST https://api.yourbackend.com/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "valid_id=@/path/to/id.jpg" \
  -F "profile_photo=@/path/to/photo.jpg" \
  -F "certificates=@/path/to/cert1.jpg" \
  -F "certificates=@/path/to/cert2.jpg" \
  -F "certificates=@/path/to/cert3.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "provider_id": 456,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-03T10:00:00.000Z",
    "uploaded_via": "file_upload",
    "certificates_count": 2
  }
}
```

---

## 🔗 Method 2: URL Submission (Alternative)

If you prefer to upload to Cloudinary first (or have pre-uploaded URLs), you can still submit URLs directly.

### Customer Resubmission with URLs

**Endpoint:** `POST /api/verification/customer/resubmit`

**Request Format:** `application/json`

**Body:**
```json
{
  "valid_id_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/verification/customers/id.jpg",
  "profile_photo_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/verification/customers/photo.jpg"
}
```

**Example (React Native):**
```javascript
const resubmitWithUrls = async (token) => {
  try {
    // Assuming you already have Cloudinary URLs
    const response = await fetch('https://api.yourbackend.com/api/verification/customer/resubmit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        valid_id_url: 'https://res.cloudinary.com/your-cloud/image/upload/...',
        profile_photo_url: 'https://res.cloudinary.com/your-cloud/image/upload/...'
      })
    });

    const result = await response.json();
    console.log('Success:', result);
    // Response includes: uploaded_via: 'url'
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Provider Resubmission with URLs

**Body:**
```json
{
  "valid_id_url": "https://res.cloudinary.com/your-cloud/image/upload/...",
  "profile_photo_url": "https://res.cloudinary.com/your-cloud/image/upload/...",
  "certificate_urls": [
    "https://res.cloudinary.com/your-cloud/image/upload/.../cert1.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/.../cert2.jpg"
  ]
}
```

---

## 🔄 How It Works (Backend Flow)

### When Files Are Uploaded:

```
Frontend → (FormData with files) → Backend → Multer Middleware → Controller
                                                                        ↓
                                                              Upload to Cloudinary
                                                                        ↓
                                                              Store URLs in Database
                                                                        ↓
                                                              Return Success Response
```

### When URLs Are Submitted:

```
Frontend → (JSON with URLs) → Backend → Controller
                                           ↓
                                 Store URLs in Database
                                           ↓
                                 Return Success Response
```

---

## 📋 Backend Implementation Details

### Routes Configuration (src/route/verificationRoutes.js)

```javascript
import multer from 'multer';

// Configure multer
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5 // Maximum 5 files
  }
});

// Customer resubmission route
router.post('/customer/resubmit', authMiddleware, upload.fields([
  { name: 'valid_id', maxCount: 1 },
  { name: 'profile_photo', maxCount: 1 }
]), resubmitCustomerVerification);

// Provider resubmission route
router.post('/provider/resubmit', authMiddleware, upload.fields([
  { name: 'valid_id', maxCount: 1 },
  { name: 'profile_photo', maxCount: 1 },
  { name: 'certificates', maxCount: 3 }
]), resubmitProviderVerification);
```

### Controller Logic (src/controller/verificationController.js)

```javascript
import { uploadToCloudinary } from '../services/cloudinaryService.js';

export const resubmitCustomerVerification = async (req, res) => {
    try {
        const userId = req.userId;
        let { valid_id_url, profile_photo_url } = req.body;

        // Check if files are uploaded via multer
        const files = req.files;
        const validIdFile = files?.valid_id?.[0];
        const profilePhotoFile = files?.profile_photo?.[0];

        // Upload files to Cloudinary if provided
        if (validIdFile) {
            valid_id_url = await uploadToCloudinary(
                validIdFile.buffer,
                'fixmo/verification/customers',
                `customer_id_resubmit_${userId}_${Date.now()}`
            );
        }

        if (profilePhotoFile) {
            profile_photo_url = await uploadToCloudinary(
                profilePhotoFile.buffer,
                'fixmo/verification/customers',
                `customer_profile_resubmit_${userId}_${Date.now()}`
            );
        }

        // Validate that at least valid_id is provided
        if (!valid_id_url) {
            return res.status(400).json({
                success: false,
                message: 'Valid ID image is required (either file or URL)'
            });
        }

        // Update database...
        const updatedCustomer = await prisma.user.update({
            where: { user_id: userId },
            data: {
                valid_id: valid_id_url,
                profile_photo: profile_photo_url,
                verification_status: 'pending',
                verification_submitted_at: new Date(),
                rejection_reason: null
            }
        });

        res.status(200).json({
            success: true,
            message: 'Verification documents re-submitted successfully.',
            data: {
                user_id: updatedCustomer.user_id,
                verification_status: updatedCustomer.verification_status,
                uploaded_via: validIdFile || profilePhotoFile ? 'file_upload' : 'url'
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to resubmit verification' });
    }
};
```

---

## 🧪 Testing Examples

### Test File Upload

```bash
# Customer resubmission
curl -X POST http://localhost:3000/api/verification/customer/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "valid_id=@./test-id.jpg" \
  -F "profile_photo=@./test-photo.jpg"

# Provider resubmission
curl -X POST http://localhost:3000/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "valid_id=@./test-id.jpg" \
  -F "profile_photo=@./test-photo.jpg" \
  -F "certificates=@./cert1.jpg" \
  -F "certificates=@./cert2.jpg"
```

### Test URL Submission

```bash
# Customer resubmission
curl -X POST http://localhost:3000/api/verification/customer/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valid_id_url": "https://res.cloudinary.com/.../id.jpg",
    "profile_photo_url": "https://res.cloudinary.com/.../photo.jpg"
  }'

# Provider resubmission
curl -X POST http://localhost:3000/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valid_id_url": "https://res.cloudinary.com/.../id.jpg",
    "profile_photo_url": "https://res.cloudinary.com/.../photo.jpg",
    "certificate_urls": [
      "https://res.cloudinary.com/.../cert1.jpg",
      "https://res.cloudinary.com/.../cert2.jpg"
    ]
  }'
```

---

## 📝 Summary Table

| Feature | Method 1: File Upload | Method 2: URL Submission |
|---------|----------------------|-------------------------|
| **Content-Type** | `multipart/form-data` | `application/json` |
| **Backend Processing** | ✅ Uploads to Cloudinary | ❌ No upload (expects URLs) |
| **Multer Middleware** | ✅ Active | ✅ Active (but not used) |
| **Complexity** | 🟢 Simple (frontend) | 🟡 Medium (need Cloudinary SDK) |
| **Recommended** | ✅ Yes (easier) | ⚠️ Advanced use cases |
| **Response Field** | `uploaded_via: 'file_upload'` | `uploaded_via: 'url'` |

---

## ✅ Key Benefits

1. **Consistent with Registration** - Uses same approach as registration endpoints
2. **Easier Frontend** - No need for Cloudinary SDK or direct uploads
3. **Backend Control** - Cloudinary config centralized in backend
4. **Flexible** - Still supports URL submission for advanced use cases
5. **Secure** - File validation and size limits enforced by multer
6. **Error Handling** - Better error messages for upload failures

---

## 🎯 Which Method Should You Use?

### Use **File Upload** (Method 1) if:
- ✅ You want the simplest frontend implementation
- ✅ You're building a new feature
- ✅ You want backend to handle Cloudinary configuration
- ✅ You want consistent behavior with registration

### Use **URL Submission** (Method 2) if:
- ✅ You already have Cloudinary URLs
- ✅ You're using direct Cloudinary SDK uploads
- ✅ You have special upload requirements (transformations, etc.)
- ✅ You're migrating existing code

---

## 🔗 Related Files

- ✅ `src/route/verificationRoutes.js` - Updated with multer middleware
- ✅ `src/controller/verificationController.js` - Updated to handle files & URLs
- ✅ `src/services/cloudinaryService.js` - Cloudinary upload utility
- ✅ `src/route/authCustomer.js` - Registration endpoints (similar pattern)

---

## 🚀 Next Steps

1. **Frontend**: Use Method 1 (File Upload) for simplest implementation
2. **Testing**: Test both methods with curl or Postman
3. **Deployment**: Ensure Cloudinary credentials are set in environment variables
4. **Documentation**: Share this guide with frontend team

Enjoy the simplified file upload experience! 🎉
