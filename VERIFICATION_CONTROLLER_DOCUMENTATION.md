# Verification Controller Documentation

## Overview

The Verification Controller manages the verification workflow for customers and service providers in the Fixmo platform. It handles document submission, admin review (approval/rejection), status tracking, and re-submission processes. All document uploads are managed through **Cloudinary** for secure cloud storage.

## Table of Contents

1. [Architecture](#architecture)
2. [Cloudinary Integration](#cloudinary-integration)
3. [API Endpoints](#api-endpoints)
4. [Workflow Diagrams](#workflow-diagrams)
5. [Database Schema](#database-schema)
6. [Email Notifications](#email-notifications)
7. [Error Handling](#error-handling)
8. [Testing Guide](#testing-guide)
9. [Security Considerations](#security-considerations)

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Verification System Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend (React Native/Web)                                     │
│  ├── File Picker/Camera                                          │
│  ├── Image Preview                                               │
│  └── Upload Manager                                              │
│          │                                                        │
│          ▼                                                        │
│  API Routes (verificationRoutes.js)                              │
│  ├── /admin/pending                                              │
│  ├── /admin/customer/:id/approve                                 │
│  ├── /admin/customer/:id/reject                                  │
│  ├── /customer/status                                            │
│  └── /customer/resubmit                                          │
│          │                                                        │
│          ▼                                                        │
│  Middleware                                                       │
│  ├── adminAuthMiddleware (for admin routes)                      │
│  └── authMiddleware (for customer/provider routes)               │
│          │                                                        │
│          ▼                                                        │
│  Controller (verificationController.js)                          │
│  ├── getPendingVerifications()                                   │
│  ├── approveCustomerVerification()                               │
│  ├── rejectCustomerVerification()                                │
│  ├── getCustomerVerificationStatus()                             │
│  └── resubmitCustomerVerification()                              │
│          │                                                        │
│          ├──────────┬──────────────┬──────────────┐              │
│          ▼          ▼              ▼              ▼              │
│  Cloudinary    Database        Email          Prisma            │
│  Service      (PostgreSQL)     Service        Client            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── controller/
│   └── verificationController.js    # Main verification logic
├── services/
│   ├── cloudinaryService.js         # Cloudinary upload/delete
│   └── mailer.js                    # Email notifications
├── middleware/
│   ├── authMiddleware.js            # User/Provider auth
│   └── adminAuthMiddleware.js       # Admin auth
└── route/
    └── verificationRoutes.js        # API route definitions
```

---

## Cloudinary Integration

### Configuration

Cloudinary is configured in `src/services/cloudinaryService.js`:

```javascript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
```

### Environment Variables

Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Upload Function

```javascript
/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Cloudinary folder (e.g., 'fixmo/verification/customers')
 * @param {string} publicId - Optional custom ID for the image
 * @returns {Promise<string>} - Secure URL of uploaded image
 */
export const uploadToCloudinary = async (fileBuffer, folder, publicId = null) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: folder,
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto'
        };

        if (publicId) {
            uploadOptions.public_id = publicId;
            uploadOptions.overwrite = true;
        }

        cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.secure_url);
                }
            }
        ).end(fileBuffer);
    });
};
```

### Folder Structure in Cloudinary

```
fixmo/
├── verification/
│   ├── customers/
│   │   ├── user_123_profile_1234567890.jpg
│   │   └── user_123_validid_1234567890.jpg
│   └── providers/
│       ├── provider_456_profile_1234567890.jpg
│       ├── provider_456_validid_1234567890.jpg
│       └── certificates/
│           ├── provider_456_cert1_1234567890.jpg
│           └── provider_456_cert2_1234567890.jpg
```

### Upload Example (Frontend Integration)

#### React Native Example

```javascript
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

const uploadVerificationDocument = async (userId, token) => {
  try {
    // Step 1: Pick image
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920
    });

    if (result.didCancel) return;

    const image = result.assets[0];

    // Step 2: Create FormData
    const formData = new FormData();
    formData.append('file', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || `verification_${Date.now()}.jpg`
    });
    formData.append('folder', 'fixmo/verification/customers');

    // Step 3: Upload to your backend endpoint
    const uploadResponse = await axios.post(
      'https://api.yourbackend.com/upload/cloudinary',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const cloudinaryUrl = uploadResponse.data.url;

    // Step 4: Submit verification with Cloudinary URL
    const verificationResponse = await axios.post(
      'https://api.yourbackend.com/api/verification/customer/resubmit',
      {
        valid_id_url: cloudinaryUrl
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Verification submitted:', verificationResponse.data);
    return verificationResponse.data;

  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

#### Web (React) Example

```javascript
const VerificationUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Step 1: Upload to Cloudinary via your backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'fixmo/verification/customers');

      const uploadRes = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const { url } = await uploadRes.json();

      // Step 2: Submit verification
      const verifyRes = await fetch('/api/verification/customer/resubmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ valid_id_url: url })
      });

      const result = await verifyRes.json();
      alert('Verification submitted successfully!');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {previewUrl && <img src={previewUrl} alt="Preview" style={{ maxWidth: '300px' }} />}
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Submit Verification'}
      </button>
    </div>
  );
};
```

### Backend Upload Endpoint (Helper)

You'll need to create an upload endpoint that handles the Cloudinary upload:

```javascript
// src/controller/uploadController.js
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const uploadToCloudinaryEndpoint = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const folder = req.body.folder || 'fixmo/verification';
    const publicId = req.body.publicId || null;

    const url = await uploadToCloudinary(
      req.file.buffer,
      folder,
      publicId
    );

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      url: url
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};

// Route
router.post('/upload/cloudinary', authMiddleware, upload.single('file'), uploadToCloudinaryEndpoint);
```

---

## API Endpoints

### Admin Endpoints

#### 1. Get Pending Verifications

**Endpoint:** `GET /api/verification/admin/pending`

**Authentication:** Admin JWT Token

**Query Parameters:**
- `type` (optional): Filter by type - 'customer', 'provider', or 'all' (default: 'all')

**Request:**
```http
GET /api/verification/admin/pending?type=customer
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Pending verifications fetched successfully",
  "data": {
    "customers": [
      {
        "user_id": 123,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "+1234567890",
        "profile_photo": "https://res.cloudinary.com/.../profile.jpg",
        "valid_id": "https://res.cloudinary.com/.../valid_id.jpg",
        "user_location": "New York, NY",
        "verification_status": "pending",
        "verification_submitted_at": "2025-01-15T10:30:00Z",
        "created_at": "2025-01-01T08:00:00Z",
        "rejection_reason": null
      }
    ],
    "providers": [],
    "total": {
      "customers": 1,
      "providers": 0
    }
  }
}
```

#### 2. Approve Customer Verification

**Endpoint:** `POST /api/verification/admin/customer/:user_id/approve`

**Authentication:** Admin JWT Token

**Request:**
```http
POST /api/verification/admin/customer/123/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Customer verification approved successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "is_verified": true,
    "verification_status": "approved",
    "verification_reviewed_at": "2025-01-16T14:20:00Z",
    "rejection_reason": null
  }
}
```

**Email Sent to Customer:**
- Subject: "✅ Your Fixmo Account Has Been Verified!"
- Contains: Welcome message, next steps, support information

#### 3. Reject Customer Verification

**Endpoint:** `POST /api/verification/admin/customer/:user_id/reject`

**Authentication:** Admin JWT Token

**Request:**
```http
POST /api/verification/admin/customer/123/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "rejection_reason": "ID document is unclear. Please upload a higher quality image."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customer verification rejected successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "ID document is unclear. Please upload a higher quality image.",
    "verification_reviewed_at": "2025-01-16T14:25:00Z"
  }
}
```

**Email Sent to Customer:**
- Subject: "⚠️ Fixmo Account Verification Update Required"
- Contains: Rejection reason, re-submission instructions

#### 4. Approve Provider Verification

**Endpoint:** `POST /api/verification/admin/provider/:provider_id/approve`

**Authentication:** Admin JWT Token

**Request:**
```http
POST /api/verification/admin/provider/456/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Provider verification approved successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane@example.com",
    "provider_isVerified": true,
    "verification_status": "approved",
    "verification_reviewed_at": "2025-01-16T15:00:00Z",
    "rejection_reason": null
  }
}
```

#### 5. Reject Provider Verification

**Endpoint:** `POST /api/verification/admin/provider/:provider_id/reject`

**Authentication:** Admin JWT Token

**Request:**
```http
POST /api/verification/admin/provider/456/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "rejection_reason": "Business license has expired. Please provide a valid license."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider verification rejected successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane@example.com",
    "provider_isVerified": false,
    "verification_status": "rejected",
    "rejection_reason": "Business license has expired. Please provide a valid license.",
    "verification_reviewed_at": "2025-01-16T15:05:00Z"
  }
}
```

---

### Customer/Provider Endpoints

#### 6. Get Customer Verification Status

**Endpoint:** `GET /api/verification/customer/status`

**Authentication:** Customer JWT Token

**Request:**
```http
GET /api/verification/customer/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "ID document is unclear. Please upload a higher quality image.",
    "verification_submitted_at": "2025-01-15T10:30:00Z",
    "verification_reviewed_at": "2025-01-16T14:25:00Z",
    "valid_id": "https://res.cloudinary.com/.../valid_id.jpg",
    "profile_photo": "https://res.cloudinary.com/.../profile.jpg"
  }
}
```

#### 7. Re-submit Customer Verification

**Endpoint:** `POST /api/verification/customer/resubmit`

**Authentication:** Customer JWT Token

**Request:**
```http
POST /api/verification/customer/resubmit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "valid_id_url": "https://res.cloudinary.com/.../new_valid_id.jpg",
  "profile_photo_url": "https://res.cloudinary.com/.../new_profile_photo.jpg"
}
```

**Request Body:**
- `valid_id_url` (required): Cloudinary URL of the new valid ID document
- `profile_photo_url` (optional): Cloudinary URL of the new profile photo

**Response:**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "user_id": 123,
    "verification_status": "pending",
    "verification_submitted_at": "2025-01-17T09:15:00Z"
  }
}
```

#### 8. Get Provider Verification Status

**Endpoint:** `GET /api/verification/provider/status`

**Authentication:** Provider JWT Token

**Request:**
```http
GET /api/verification/provider/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane@example.com",
    "provider_isVerified": false,
    "verification_status": "pending",
    "rejection_reason": null,
    "verification_submitted_at": "2025-01-16T11:00:00Z",
    "verification_reviewed_at": null,
    "provider_valid_id": "https://res.cloudinary.com/.../provider_valid_id.jpg",
    "provider_profile_photo": "https://res.cloudinary.com/.../provider_profile.jpg",
    "provider_certificates": [
      {
        "certificate_id": 1,
        "certificate_image": "https://res.cloudinary.com/.../cert1.jpg",
        "created_at": "2025-01-16T11:00:00Z"
      }
    ]
  }
}
```

#### 9. Re-submit Provider Verification

**Endpoint:** `POST /api/verification/provider/resubmit`

**Authentication:** Provider JWT Token

**Request:**
```http
POST /api/verification/provider/resubmit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "valid_id_url": "https://res.cloudinary.com/.../new_provider_id.jpg",
  "profile_photo_url": "https://res.cloudinary.com/.../new_profile_photo.jpg",
  "certificate_urls": [
    "https://res.cloudinary.com/.../new_cert1.jpg",
    "https://res.cloudinary.com/.../new_cert2.jpg"
  ]
}
```

**Request Body:**
- `valid_id_url` (required): Cloudinary URL of the new valid ID/business license
- `profile_photo_url` (optional): Cloudinary URL of the new profile photo
- `certificate_urls` (optional): Array of Cloudinary URLs for new certificates

**Response:**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "provider_id": 456,
    "verification_status": "pending",
    "verification_submitted_at": "2025-01-17T10:30:00Z"
  }
}
```

---

## Workflow Diagrams

### Customer Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Customer Verification Workflow                │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRATION
   ├─> Customer creates account
   ├─> Uploads profile photo & valid ID to Cloudinary
   ├─> Documents stored in: fixmo/verification/customers/
   └─> Status: "pending"
        │
        ▼
2. ADMIN REVIEW
   ├─> Admin views pending verifications
   ├─> Reviews documents from Cloudinary
   └─> Decision:
        ├─> APPROVE
        │    ├─> Status: "approved"
        │    ├─> is_verified: true
        │    ├─> verification_reviewed_at: timestamp
        │    ├─> Send approval email
        │    └─> Customer gets full access
        │
        └─> REJECT
             ├─> Status: "rejected"
             ├─> is_verified: false
             ├─> rejection_reason: "..." (saved)
             ├─> verification_reviewed_at: timestamp
             └─> Send rejection email with reason
                  │
                  ▼
3. RE-SUBMISSION (if rejected)
   ├─> Customer sees rejection reason
   ├─> Uploads new documents to Cloudinary
   ├─> Status: "pending" (reset)
   ├─> verification_submitted_at: new timestamp
   ├─> rejection_reason: null (cleared)
   └─> Return to step 2
```

### Provider Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Verification Workflow                │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRATION
   ├─> Provider creates account
   ├─> Uploads:
   │    ├─> Profile photo → fixmo/verification/providers/
   │    ├─> Valid ID → fixmo/verification/providers/
   │    └─> Certificates → fixmo/verification/providers/certificates/
   ├─> All stored in Cloudinary
   └─> Status: "pending"
        │
        ▼
2. ADMIN REVIEW
   ├─> Admin views pending verifications
   ├─> Reviews all documents from Cloudinary
   │    ├─> Profile photo
   │    ├─> Valid ID/Business license
   │    └─> Certificates (if any)
   └─> Decision:
        ├─> APPROVE
        │    ├─> Status: "approved"
        │    ├─> provider_isVerified: true
        │    ├─> verification_reviewed_at: timestamp
        │    ├─> Send approval email
        │    └─> Provider can create service listings
        │
        └─> REJECT
             ├─> Status: "rejected"
             ├─> provider_isVerified: false
             ├─> rejection_reason: "..." (saved)
             ├─> verification_reviewed_at: timestamp
             └─> Send rejection email with reason
                  │
                  ▼
3. RE-SUBMISSION (if rejected)
   ├─> Provider sees rejection reason
   ├─> Uploads new documents to Cloudinary:
   │    ├─> New valid ID (required)
   │    └─> New certificates (optional)
   ├─> Old certificates deleted if new ones provided
   ├─> Status: "pending" (reset)
   ├─> verification_submitted_at: new timestamp
   ├─> rejection_reason: null (cleared)
   └─> Return to step 2
```

---

## Database Schema

### User Table (Customers)

```sql
model User {
  user_id                  Int       @id @default(autoincrement())
  first_name               String
  last_name                String
  email                    String    @unique
  phone_number             String    @unique
  profile_photo            String?   -- Cloudinary URL
  valid_id                 String?   -- Cloudinary URL
  user_location            String?
  created_at               DateTime  @default(now())
  is_verified              Boolean   @default(false)
  verification_status      String    @default("pending") -- 'pending', 'approved', 'rejected'
  rejection_reason         String?
  verification_submitted_at DateTime?
  verification_reviewed_at  DateTime?
  password                 String
  userName                 String    @unique
  is_activated             Boolean   @default(true)
  birthday                 DateTime?
  exact_location           String?
  user_reason              String?
}
```

### ServiceProviderDetails Table (Providers)

```sql
model ServiceProviderDetails {
  provider_id              Int       @id @default(autoincrement())
  provider_first_name      String
  provider_last_name       String
  provider_email           String    @unique
  provider_phone_number    String    @unique
  provider_profile_photo   String?   -- Cloudinary URL
  provider_valid_id        String?   -- Cloudinary URL
  provider_isVerified      Boolean   @default(false)
  verification_status      String    @default("pending") -- 'pending', 'approved', 'rejected'
  rejection_reason         String?
  verification_submitted_at DateTime?
  verification_reviewed_at  DateTime?
  created_at               DateTime  @default(now())
  provider_rating          Float     @default(0.0)
  provider_location        String?
  provider_uli             String    @unique
  provider_password        String
  provider_userName        String    @unique
  provider_isActivated     Boolean   @default(true)
  provider_birthday        DateTime?
  provider_exact_location  String?
  provider_reason          String?
  provider_certificates    Certificate[]
}
```

### Certificate Table

```sql
model Certificate {
  certificate_id        Int       @id @default(autoincrement())
  certificate_name      String?
  certificate_image     String    -- Cloudinary URL
  provider_id           Int
  created_at            DateTime  @default(now())
  provider              ServiceProviderDetails @relation(fields: [provider_id], references: [provider_id])
}
```

---

## Email Notifications

### Approval Email Template

**Subject:** ✅ Your Fixmo Account Has Been Verified!

**Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4CAF50;">Account Verified Successfully!</h2>
  <p>Dear {first_name} {last_name},</p>
  <p>Great news! Your Fixmo account has been verified by our admin team.</p>
  <p>You now have full access to all features of the platform.</p>
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 0;"><strong>What's Next?</strong></p>
    <ul>
      <li>Browse and book services from verified providers</li>
      <li>Access warranty protection on completed services</li>
      <li>Message providers directly through the platform</li>
    </ul>
  </div>
  <p>Thank you for choosing Fixmo!</p>
</div>
```

### Rejection Email Template

**Subject:** ⚠️ Fixmo Account Verification Update Required

**Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #FF9800;">Verification Update Required</h2>
  <p>Dear {first_name} {last_name},</p>
  <p>Thank you for submitting your verification documents. Unfortunately, we need you to update your submission.</p>
  <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800;">
    <p style="margin: 0 0 10px 0;"><strong>Reason for rejection:</strong></p>
    <p style="margin: 0; color: #555;">{rejection_reason}</p>
  </div>
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p style="margin: 0;"><strong>What to do next:</strong></p>
    <ol style="margin: 10px 0 0 0;">
      <li>Log in to your Fixmo account</li>
      <li>Go to your profile settings</li>
      <li>Click on "Re-submit Verification"</li>
      <li>Upload updated documents addressing the issue mentioned above</li>
    </ol>
  </div>
  <p>Once you re-submit, our team will review your documents again within 24-48 hours.</p>
</div>
```

---

## Error Handling

### Common Errors

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| 400 | "Rejection reason is required" | Admin rejected without reason | Provide rejection_reason in request body |
| 400 | "Valid ID image is required" | Resubmission without document | Upload valid_id_url in request |
| 400 | "Your account is already verified" | Attempting to resubmit when approved | No action needed - account is verified |
| 404 | "Customer not found" | Invalid user_id | Verify user exists in database |
| 404 | "Provider not found" | Invalid provider_id | Verify provider exists in database |
| 500 | "Failed to upload to Cloudinary" | Cloudinary connection/auth error | Check CLOUDINARY credentials in .env |
| 500 | "Failed to send email" | Email service error | Check email service configuration |

### Error Response Format

```json
{
  "success": false,
  "message": "Failed to approve verification",
  "error": "Database connection error"
}
```

---

## Testing Guide

### Manual Testing Checklist

#### Customer Verification

- [ ] **Registration**
  - [ ] Upload profile photo to Cloudinary
  - [ ] Upload valid ID to Cloudinary
  - [ ] Verify URLs are stored in database
  - [ ] Verify status is "pending"

- [ ] **Admin Approval**
  - [ ] GET pending verifications
  - [ ] POST approve customer
  - [ ] Verify status is "approved"
  - [ ] Verify is_verified is true
  - [ ] Verify email sent

- [ ] **Admin Rejection**
  - [ ] POST reject customer with reason
  - [ ] Verify status is "rejected"
  - [ ] Verify rejection_reason is saved
  - [ ] Verify email sent with reason

- [ ] **Re-submission**
  - [ ] GET verification status (see rejection)
  - [ ] Upload new document to Cloudinary
  - [ ] POST resubmit with new URL
  - [ ] Verify status reset to "pending"
  - [ ] Verify rejection_reason cleared

#### Provider Verification

- [ ] **Registration**
  - [ ] Upload provider documents
  - [ ] Upload certificates
  - [ ] Verify Cloudinary URLs stored
  - [ ] Verify status is "pending"

- [ ] **Admin Review**
  - [ ] GET pending provider verifications
  - [ ] View all documents and certificates
  - [ ] POST approve or reject
  - [ ] Verify status and emails

- [ ] **Re-submission**
  - [ ] Upload new documents
  - [ ] Optionally upload new certificates
  - [ ] Verify old certificates deleted if new ones provided

### Postman Collection

```json
{
  "info": {
    "name": "Fixmo Verification API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Admin - Get Pending",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/verification/admin/pending?type=all",
          "host": ["{{base_url}}"],
          "path": ["api", "verification", "admin", "pending"],
          "query": [
            {
              "key": "type",
              "value": "all"
            }
          ]
        }
      }
    },
    {
      "name": "Admin - Approve Customer",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/verification/admin/customer/{{user_id}}/approve",
          "host": ["{{base_url}}"],
          "path": ["api", "verification", "admin", "customer", "{{user_id}}", "approve"]
        }
      }
    },
    {
      "name": "Admin - Reject Customer",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"rejection_reason\": \"ID document is unclear\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/verification/admin/customer/{{user_id}}/reject",
          "host": ["{{base_url}}"],
          "path": ["api", "verification", "admin", "customer", "{{user_id}}", "reject"]
        }
      }
    },
    {
      "name": "Customer - Get Status",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{customer_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/verification/customer/status",
          "host": ["{{base_url}}"],
          "path": ["api", "verification", "customer", "status"]
        }
      }
    },
    {
      "name": "Customer - Resubmit",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{customer_token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"valid_id_url\": \"https://res.cloudinary.com/.../new_id.jpg\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/verification/customer/resubmit",
          "host": ["{{base_url}}"],
          "path": ["api", "verification", "customer", "resubmit"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "admin_token",
      "value": "your_admin_token_here"
    },
    {
      "key": "customer_token",
      "value": "your_customer_token_here"
    },
    {
      "key": "user_id",
      "value": "123"
    }
  ]
}
```

---

## Security Considerations

### 1. Authentication

- **All endpoints require authentication** (JWT tokens)
- Admin endpoints use `adminAuthMiddleware`
- Customer/Provider endpoints use `authMiddleware`
- Tokens must be valid and not expired

### 2. Authorization

- **Customers can only access their own data**
  - `req.userId` from JWT must match the user being accessed
- **Providers can only access their own data**
  - `req.userId` from JWT must match the provider
- **Admins can access all verification data**

### 3. File Upload Security

#### Cloudinary Security
```javascript
// File type validation
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
if (!allowedTypes.includes(file.mimetype)) {
  return res.status(400).json({ message: 'Invalid file type' });
}

// File size limit (10MB)
if (file.size > 10 * 1024 * 1024) {
  return res.status(400).json({ message: 'File too large' });
}
```

#### Signed URLs (Recommended)
```javascript
// Generate signed upload URL for direct client upload
export const getSignedUploadUrl = (folder) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: folder
    },
    process.env.CLOUDINARY_API_SECRET
  );
  
  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder
  };
};
```

### 4. Data Validation

```javascript
// Validate rejection reason
if (!rejection_reason || rejection_reason.trim() === '') {
  return res.status(400).json({ message: 'Rejection reason is required' });
}

// Validate rejection reason length
if (rejection_reason.length > 500) {
  return res.status(400).json({ message: 'Rejection reason too long' });
}

// Validate URL format
if (!valid_id_url.startsWith('https://res.cloudinary.com/')) {
  return res.status(400).json({ message: 'Invalid Cloudinary URL' });
}
```

### 5. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const resubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: 'Too many resubmission attempts. Please try again later.'
});

router.post('/customer/resubmit', authMiddleware, resubmitLimiter, resubmitCustomerVerification);
```

### 6. Environment Variables

**Never commit these to Git:**

```.env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Secret
JWT_SECRET=your_secure_jwt_secret

# Database
DATABASE_URL=postgresql://...
```

---

## Best Practices

### 1. Image Optimization

```javascript
const uploadOptions = {
  folder: folder,
  resource_type: 'auto',
  quality: 'auto',              // Auto quality
  fetch_format: 'auto',         // Auto format (WebP if supported)
  transformation: [
    { width: 1920, height: 1920, crop: 'limit' },  // Max dimensions
    { quality: 'auto:good' }    // Good quality with compression
  ]
};
```

### 2. Error Logging

```javascript
try {
  // ... code
} catch (error) {
  console.error('Verification error:', {
    user_id: userId,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Send to error tracking service (e.g., Sentry)
  // Sentry.captureException(error);
  
  res.status(500).json({
    success: false,
    message: 'Failed to process verification',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
}
```

### 3. Async/Await Pattern

```javascript
// Always use try-catch with async/await
export const approveVerification = async (req, res) => {
  try {
    // Database operation
    const user = await prisma.user.update({ ... });
    
    // Email operation (non-blocking)
    sendEmail({ ... }).catch(err => {
      console.error('Email failed:', err);
      // Don't fail the request if email fails
    });
    
    res.status(200).json({ ... });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ... });
  }
};
```

### 4. Database Transactions

```javascript
// Use transactions for multiple operations
export const resubmitProviderVerification = async (req, res) => {
  const { providerId, valid_id_url, certificate_urls } = req.body;
  
  try {
    await prisma.$transaction(async (tx) => {
      // Update provider
      await tx.serviceProviderDetails.update({
        where: { provider_id: providerId },
        data: { provider_valid_id: valid_id_url, verification_status: 'pending' }
      });
      
      // Delete old certificates
      await tx.certificate.deleteMany({
        where: { provider_id: providerId }
      });
      
      // Create new certificates
      await tx.certificate.createMany({
        data: certificate_urls.map(url => ({
          provider_id: providerId,
          certificate_image: url
        }))
      });
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Verification Processing Time**
   - Time from submission to admin review
   - Average: 24-48 hours

2. **Approval Rate**
   - Percentage of verifications approved
   - Target: > 80%

3. **Rejection Reasons**
   - Most common rejection reasons
   - Used to improve documentation guidance

4. **Re-submission Rate**
   - How many users resubmit after rejection
   - Target: > 70%

5. **Cloudinary Usage**
   - Storage used
   - Bandwidth consumed
   - Request count

### Logging Example

```javascript
// Log verification action
console.log({
  action: 'verification_approved',
  admin_id: req.adminId,
  user_id: user_id,
  timestamp: new Date().toISOString(),
  previous_status: customer.verification_status
});
```

---

## Support & Troubleshooting

### Common Issues

#### 1. Cloudinary Upload Fails

**Problem:** Images not uploading to Cloudinary

**Solutions:**
- Check environment variables (CLOUDINARY_* vars)
- Verify API credentials are correct
- Check file size (max 10MB)
- Verify file type is allowed
- Check internet connection

#### 2. Email Not Sent

**Problem:** Approval/rejection emails not received

**Solutions:**
- Check email service configuration
- Verify email address is valid
- Check spam folder
- Review email service logs

#### 3. Status Not Updating

**Problem:** Verification status remains "pending"

**Solutions:**
- Check database connection
- Verify admin has proper permissions
- Check for transaction errors
- Review server logs

#### 4. Cannot Resubmit

**Problem:** "Your account is already verified" error

**Solutions:**
- User is already approved - no action needed
- Check verification_status in database
- User may need to contact support

### Debug Mode

Enable detailed logging:

```javascript
// Add to verificationController.js
const DEBUG = process.env.DEBUG_VERIFICATION === 'true';

if (DEBUG) {
  console.log('Verification Request:', {
    user_id,
    rejection_reason,
    admin_id: req.adminId,
    timestamp: new Date()
  });
}
```

---

## Changelog

### Version 1.0.0 (2025-01-01)
- Initial release
- Customer and provider verification
- Cloudinary integration
- Email notifications
- Re-submission workflow

### Version 1.1.0 (2025-01-15)
- Added verification_status field
- Added rejection_reason field
- Added verification_submitted_at timestamp
- Added verification_reviewed_at timestamp
- Enhanced email templates

---

## Contributing

When adding new features to the verification system:

1. Update this documentation
2. Add tests for new endpoints
3. Update Postman collection
4. Add migration if schema changes
5. Update environment variables documentation

---

## License

This documentation is part of the Fixmo Backend system.

---

**Last Updated:** January 17, 2025  
**Maintained By:** Fixmo Backend Team  
**Version:** 1.1.0
