# 🔧 Verification Resubmission - Cloudinary Upload Guide

## ⚠️ IMPORTANT: Correct Upload Flow

The verification resubmission endpoints **DO NOT accept file uploads**. They only accept **Cloudinary URLs** that have been uploaded separately.

---

## 📊 Two Different Workflows

### 1️⃣ **Registration Flow** (Backend handles upload)
```
Frontend → (FormData with files) → Backend → Cloudinary → Database
```

During registration (`/api/auth/customer/verify-register`), the backend:
- ✅ Uses multer middleware to accept files
- ✅ Uploads files to Cloudinary internally
- ✅ Stores the URLs in the database

### 2️⃣ **Resubmission Flow** (Frontend handles upload)
```
Frontend → Cloudinary (direct) → Frontend → (URLs only) → Backend → Database
```

During resubmission (`/api/verification/customer/resubmit`), the backend:
- ❌ Does NOT accept files
- ❌ Does NOT use multer middleware
- ✅ Only accepts pre-uploaded Cloudinary URLs

---

## 🎯 Correct Implementation

### Backend Code (Actual Implementation)

```javascript
// src/controller/verificationController.js
export const resubmitCustomerVerification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { valid_id_url, profile_photo_url } = req.body; // URLs from Cloudinary upload
        
        // Validation
        if (!valid_id_url || !profile_photo_url) {
            return res.status(400).json({ 
                message: 'Both valid_id_url and profile_photo_url are required' 
            });
        }

        // Update user with new URLs
        const updatedUser = await prisma.user.update({
            where: { user_id: userId },
            data: {
                valid_id: valid_id_url,
                profile_photo: profile_photo_url,
                verification_status: 'pending'
            }
        });

        return res.status(200).json({
            message: 'Verification documents resubmitted successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error resubmitting customer verification:', error);
        return res.status(500).json({ message: 'Failed to resubmit verification documents' });
    }
};
```

**Key Points:**
- No `req.files` - endpoint expects `req.body.valid_id_url` and `req.body.profile_photo_url`
- No multer middleware on the route
- No `uploadToCloudinary()` call in controller

---

## 🔄 Frontend Implementation Options

### Option 1: Direct Upload to Cloudinary (Recommended)

Use Cloudinary's unsigned upload preset (most common for mobile apps):

```javascript
// React Native Example
import { launchImageLibrary } from 'react-native-image-picker';

const uploadToCloudinaryDirect = async (imageUri) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'verification.jpg'
  });
  formData.append('upload_preset', 'your_unsigned_preset'); // Get from Cloudinary dashboard
  formData.append('folder', 'fixmo/verification/customers');

  const response = await fetch(
    'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload',
    {
      method: 'POST',
      body: formData
    }
  );

  const data = await response.json();
  return data.secure_url; // This is the URL you send to backend
};

const resubmitVerification = async () => {
  try {
    // Step 1: Pick images
    const validIdResult = await launchImageLibrary({ mediaType: 'photo' });
    const profilePhotoResult = await launchImageLibrary({ mediaType: 'photo' });

    // Step 2: Upload both images to Cloudinary FIRST
    const validIdUrl = await uploadToCloudinaryDirect(validIdResult.assets[0].uri);
    const profilePhotoUrl = await uploadToCloudinaryDirect(profilePhotoResult.assets[0].uri);

    // Step 3: Send URLs to backend
    const response = await fetch('https://api.yourbackend.com/api/verification/customer/resubmit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        valid_id_url: validIdUrl,
        profile_photo_url: profilePhotoUrl
      })
    });

    const result = await response.json();
    console.log('Resubmission successful:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Option 2: Use Cloudinary SDK

```javascript
// Install: npm install cloudinary-react-native
import { Cloudinary } from '@cloudinary/url-gen';

const cld = new Cloudinary({
  cloud: {
    cloudName: 'YOUR_CLOUD_NAME'
  }
});

// Upload using SDK (requires signed uploads or unsigned preset)
```

### Option 3: Backend Helper Endpoint (If needed)

If you want to create a separate upload endpoint for convenience:

```javascript
// src/controller/uploadController.js
export const uploadToCloudinaryEndpoint = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const folder = req.body.folder || 'fixmo/uploads';
        const url = await uploadToCloudinary(req.file.buffer, folder);

        return res.status(200).json({ 
            message: 'File uploaded successfully',
            url: url 
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ message: 'Upload failed' });
    }
};

// src/route/uploadRoutes.js
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authMiddleware, upload.single('file'), uploadToCloudinaryEndpoint);
```

Then use it:

```javascript
// Frontend
const uploadFile = async (fileUri, token) => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: 'file.jpg'
  });
  formData.append('folder', 'fixmo/verification/customers');

  const response = await fetch('https://api.yourbackend.com/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  return data.url;
};
```

---

## 🧪 Testing Examples

### ✅ Correct Request (with pre-uploaded URLs)

```bash
curl -X POST https://api.yourbackend.com/api/verification/customer/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valid_id_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/verification/customers/id.jpg",
    "profile_photo_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/verification/customers/photo.jpg"
  }'
```

### ❌ Incorrect Request (trying to upload files)

```bash
# This will NOT work - endpoint doesn't accept files
curl -X POST https://api.yourbackend.com/api/verification/customer/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "valid_id=@/path/to/id.jpg" \
  -F "profile_photo=@/path/to/photo.jpg"
```

---

## 📝 Summary

| Feature | Registration Endpoint | Resubmission Endpoint |
|---------|----------------------|----------------------|
| **Endpoint** | `/api/auth/customer/verify-register` | `/api/verification/customer/resubmit` |
| **Accepts Files?** | ✅ Yes (multipart/form-data) | ❌ No (JSON only) |
| **Multer Middleware?** | ✅ Yes | ❌ No |
| **Upload Handler** | Backend (uploadToCloudinary) | Frontend (direct to Cloudinary) |
| **Request Format** | FormData with files | JSON with URLs |
| **Content-Type** | `multipart/form-data` | `application/json` |

---

## 🎯 Key Takeaways

1. **Resubmission endpoints DO NOT handle file uploads**
2. **Frontend must upload to Cloudinary first**, then send URLs
3. **Registration endpoints DO handle file uploads** (different workflow)
4. **Use direct Cloudinary upload** or create a separate upload endpoint if needed
5. **Never try to send files** to resubmission endpoints - they expect URLs only

---

## 🔗 Related Files

- `src/controller/verificationController.js` - Resubmission logic (URL-based)
- `src/controller/authCustomerController.js` - Registration logic (file upload)
- `src/services/cloudinaryService.js` - Cloudinary upload utility
- `src/route/verificationRoutes.js` - Verification routes (no multer)
- `src/route/authCustomer.js` - Auth routes (with multer)
