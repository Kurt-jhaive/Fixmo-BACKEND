# Verification Resubmission Update - Profile Photo Support

## Overview
Updated the verification resubmission endpoints to include optional profile photo URL, allowing users to update both their valid ID and profile photo when resubmitting verification documents.

## Date
January 17, 2025

---

## Changes Made

### 1. Controller Updates (`src/controller/verificationController.js`)

#### Customer Resubmission
**Endpoint:** `POST /api/verification/customer/resubmit`

**Before:**
```javascript
const { valid_id_url } = req.body;

const updatedCustomer = await prisma.user.update({
  where: { user_id: userId },
  data: {
    valid_id: valid_id_url,
    verification_status: 'pending',
    verification_submitted_at: new Date(),
    rejection_reason: null
  }
});
```

**After:**
```javascript
const { valid_id_url, profile_photo_url } = req.body;

const updateData = {
  valid_id: valid_id_url,
  verification_status: 'pending',
  verification_submitted_at: new Date(),
  rejection_reason: null
};

// Update profile photo if provided
if (profile_photo_url) {
  updateData.profile_photo = profile_photo_url;
}

const updatedCustomer = await prisma.user.update({
  where: { user_id: userId },
  data: updateData
});
```

#### Provider Resubmission
**Endpoint:** `POST /api/verification/provider/resubmit`

**Before:**
```javascript
const { valid_id_url, certificate_urls } = req.body;

const updatedProvider = await prisma.serviceProviderDetails.update({
  where: { provider_id: providerId },
  data: {
    provider_valid_id: valid_id_url,
    verification_status: 'pending',
    verification_submitted_at: new Date(),
    rejection_reason: null
  }
});
```

**After:**
```javascript
const { valid_id_url, profile_photo_url, certificate_urls } = req.body;

const updateData = {
  provider_valid_id: valid_id_url,
  verification_status: 'pending',
  verification_submitted_at: new Date(),
  rejection_reason: null
};

// Update profile photo if provided
if (profile_photo_url) {
  updateData.provider_profile_photo = profile_photo_url;
}

const updatedProvider = await prisma.serviceProviderDetails.update({
  where: { provider_id: providerId },
  data: updateData
});
```

### 2. Route Documentation Updates (`src/route/verificationRoutes.js`)

**Customer Route:**
```javascript
/**
 * @route   POST /api/verification/customer/resubmit
 * @desc    Re-submit customer verification after rejection
 * @access  Authenticated Customer
 * @body    { valid_id_url: string, profile_photo_url?: string }
 */
```

**Provider Route:**
```javascript
/**
 * @route   POST /api/verification/provider/resubmit
 * @desc    Re-submit provider verification after rejection
 * @access  Authenticated Provider
 * @body    { valid_id_url: string, profile_photo_url?: string, certificate_urls?: string[] }
 */
```

### 3. Documentation Updates

#### Updated Files:
- `VERIFICATION_CONTROLLER_DOCUMENTATION.md`
- `VERIFICATION_QUICK_REFERENCE.md`

#### Changes:
- Added `profile_photo_url` parameter documentation
- Updated all request/response examples
- Updated code examples and use cases
- Updated cURL test commands

---

## API Usage Examples

### Customer Resubmission

#### Request
```http
POST /api/verification/customer/resubmit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "valid_id_url": "https://res.cloudinary.com/.../new_valid_id.jpg",
  "profile_photo_url": "https://res.cloudinary.com/.../new_profile.jpg"
}
```

#### JavaScript Example
```javascript
// Upload both documents
const validIdUrl = await uploadToCloudinary(validIdFile, 'fixmo/verification/customers');
const profileUrl = await uploadToCloudinary(profileFile, 'fixmo/verification/customers');

// Submit resubmission
const response = await fetch('/api/verification/customer/resubmit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    valid_id_url: validIdUrl,
    profile_photo_url: profileUrl  // Optional
  })
});
```

### Provider Resubmission

#### Request
```http
POST /api/verification/provider/resubmit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "valid_id_url": "https://res.cloudinary.com/.../new_provider_id.jpg",
  "profile_photo_url": "https://res.cloudinary.com/.../new_profile.jpg",
  "certificate_urls": [
    "https://res.cloudinary.com/.../new_cert1.jpg",
    "https://res.cloudinary.com/.../new_cert2.jpg"
  ]
}
```

#### JavaScript Example
```javascript
// Upload all documents
const validIdUrl = await uploadToCloudinary(validIdFile, 'fixmo/verification/providers');
const profileUrl = await uploadToCloudinary(profileFile, 'fixmo/verification/providers');
const cert1Url = await uploadToCloudinary(cert1File, 'fixmo/verification/providers/certificates');
const cert2Url = await uploadToCloudinary(cert2File, 'fixmo/verification/providers/certificates');

// Submit resubmission
const response = await fetch('/api/verification/provider/resubmit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${providerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    valid_id_url: validIdUrl,
    profile_photo_url: profileUrl,        // Optional
    certificate_urls: [cert1Url, cert2Url] // Optional
  })
});
```

---

## Frontend Implementation Guide

### React Native Example

```javascript
import { launchImageLibrary } from 'react-native-image-picker';

const handleResubmit = async () => {
  try {
    // 1. Pick valid ID
    const idResult = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8
    });
    
    // 2. Pick profile photo (optional)
    const profileResult = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8
    });

    // 3. Upload to Cloudinary
    const validIdUrl = await uploadToCloudinary(idResult.assets[0]);
    const profilePhotoUrl = profileResult?.assets?.[0] 
      ? await uploadToCloudinary(profileResult.assets[0])
      : null;

    // 4. Submit resubmission
    const response = await axios.post(
      '/api/verification/customer/resubmit',
      {
        valid_id_url: validIdUrl,
        ...(profilePhotoUrl && { profile_photo_url: profilePhotoUrl })
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    Alert.alert('Success', 'Verification documents submitted for review!');
  } catch (error) {
    console.error('Resubmit error:', error);
    Alert.alert('Error', 'Failed to submit documents');
  }
};
```

### React Web Example

```javascript
const VerificationResubmit = () => {
  const [validId, setValidId] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Upload valid ID
      const validIdUrl = await uploadFile(validId, 'fixmo/verification/customers');
      
      // Upload profile photo if provided
      let profilePhotoUrl = null;
      if (profilePhoto) {
        profilePhotoUrl = await uploadFile(profilePhoto, 'fixmo/verification/customers');
      }

      // Submit resubmission
      const response = await fetch('/api/verification/customer/resubmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          valid_id_url: validIdUrl,
          ...(profilePhotoUrl && { profile_photo_url: profilePhotoUrl })
        })
      });

      if (response.ok) {
        alert('Documents submitted successfully!');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit documents');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Valid ID (Required)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setValidId(e.target.files[0])}
          required
        />
      </div>
      
      <div>
        <label>Profile Photo (Optional)</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setProfilePhoto(e.target.files[0])}
        />
      </div>

      <button type="submit" disabled={!validId || uploading}>
        {uploading ? 'Uploading...' : 'Submit Verification'}
      </button>
    </form>
  );
};
```

---

## Backward Compatibility

✅ **Fully Backward Compatible**

- `profile_photo_url` is optional
- Existing clients that only send `valid_id_url` will continue to work
- No breaking changes to the API contract
- Database fields remain unchanged

---

## Benefits

### 1. Improved User Experience
- Users can update their profile photo along with valid ID in one submission
- Reduces the need for separate profile photo update endpoints
- More flexible resubmission process

### 2. Admin Efficiency
- Admins can review updated profile photos during verification
- All verification documents updated in one review cycle
- Better quality profile photos can be requested

### 3. Consistency
- Both customer and provider resubmission endpoints now support profile photo updates
- Consistent API design across user types

---

## Testing Checklist

### Customer Resubmission

- [ ] **Valid ID Only**
  - [ ] Submit with only `valid_id_url`
  - [ ] Verify `valid_id` updated in database
  - [ ] Verify `profile_photo` unchanged
  - [ ] Verify status set to "pending"

- [ ] **Valid ID + Profile Photo**
  - [ ] Submit with both `valid_id_url` and `profile_photo_url`
  - [ ] Verify both `valid_id` and `profile_photo` updated
  - [ ] Verify status set to "pending"
  - [ ] Verify rejection_reason cleared

- [ ] **Validation**
  - [ ] Test without `valid_id_url` (should fail)
  - [ ] Test with invalid Cloudinary URLs
  - [ ] Test when already approved (should fail)

### Provider Resubmission

- [ ] **Valid ID Only**
  - [ ] Submit with only `valid_id_url`
  - [ ] Verify `provider_valid_id` updated
  - [ ] Verify `provider_profile_photo` unchanged

- [ ] **All Documents**
  - [ ] Submit with `valid_id_url`, `profile_photo_url`, and `certificate_urls`
  - [ ] Verify all fields updated correctly
  - [ ] Verify old certificates deleted, new ones created

- [ ] **Validation**
  - [ ] Test without `valid_id_url` (should fail)
  - [ ] Test when already approved (should fail)

---

## Migration Notes

### For Existing Mobile Apps

**No migration required** - The API is backward compatible.

**Optional Enhancement:**
```javascript
// Old code (still works)
await resubmitVerification({ valid_id_url });

// Enhanced code (new feature)
await resubmitVerification({ 
  valid_id_url, 
  profile_photo_url  // Add this for better UX
});
```

### For Web Applications

**No migration required** - Add profile photo upload as an enhancement.

**Suggested UI Update:**
```jsx
// Add optional profile photo field to resubmission form
<input 
  type="file" 
  name="profile_photo" 
  accept="image/*"
  onChange={handleProfilePhotoChange}
/>
```

---

## Performance Considerations

### Upload Optimization

```javascript
// Optimize images before upload
const optimizeImage = async (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;
      
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
};
```

---

## Security Notes

### File Validation

All uploaded files should be validated:

1. **File Type**: Only image files (jpeg, png, jpg, webp)
2. **File Size**: Maximum 10MB
3. **URL Validation**: Must be valid Cloudinary URLs
4. **Authentication**: JWT token required
5. **Authorization**: Users can only resubmit their own documents

### Example Validation

```javascript
// Frontend validation
const validateImage = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
  
  return true;
};
```

---

## Support

For questions or issues:
1. Check the updated documentation: `VERIFICATION_CONTROLLER_DOCUMENTATION.md`
2. Review the quick reference: `VERIFICATION_QUICK_REFERENCE.md`
3. Test with Postman using the updated collection
4. Contact the backend team

---

**Update Version:** 1.1.0  
**Updated By:** Backend Team  
**Date:** January 17, 2025
