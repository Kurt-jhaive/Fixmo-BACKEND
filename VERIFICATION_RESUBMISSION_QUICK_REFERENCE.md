# 📱 Quick Reference: Verification Resubmission with File Upload

## React Native - Customer Resubmission

```javascript
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

const resubmitVerification = async (userToken) => {
  try {
    // 1. Pick images
    const validId = await launchImageLibrary({ mediaType: 'photo' });
    const profilePhoto = await launchImageLibrary({ mediaType: 'photo' });

    // 2. Create FormData
    const formData = new FormData();
    formData.append('valid_id', {
      uri: validId.assets[0].uri,
      type: 'image/jpeg',
      name: 'id.jpg'
    });
    formData.append('profile_photo', {
      uri: profilePhoto.assets[0].uri,
      type: 'image/jpeg',
      name: 'photo.jpg'
    });

    // 3. Submit
    const response = await axios.post(
      'https://your-api.com/api/verification/customer/resubmit',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${userToken}`
        }
      }
    );

    console.log('✅ Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
};
```

---

## React Native - Provider Resubmission

```javascript
const resubmitProviderVerification = async (providerToken) => {
  try {
    // 1. Pick images
    const validId = await launchImageLibrary({ mediaType: 'photo' });
    const profilePhoto = await launchImageLibrary({ mediaType: 'photo' });
    const cert1 = await launchImageLibrary({ mediaType: 'photo' });
    const cert2 = await launchImageLibrary({ mediaType: 'photo' });

    // 2. Create FormData
    const formData = new FormData();
    formData.append('valid_id', {
      uri: validId.assets[0].uri,
      type: 'image/jpeg',
      name: 'id.jpg'
    });
    formData.append('profile_photo', {
      uri: profilePhoto.assets[0].uri,
      type: 'image/jpeg',
      name: 'photo.jpg'
    });
    formData.append('certificates', {
      uri: cert1.assets[0].uri,
      type: 'image/jpeg',
      name: 'cert1.jpg'
    });
    formData.append('certificates', {
      uri: cert2.assets[0].uri,
      type: 'image/jpeg',
      name: 'cert2.jpg'
    });

    // 3. Submit
    const response = await axios.post(
      'https://your-api.com/api/verification/provider/resubmit',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${providerToken}`
        }
      }
    );

    console.log('✅ Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
};
```

---

## cURL Testing

```bash
# Customer
curl -X POST http://localhost:3000/api/verification/customer/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "valid_id=@./id.jpg" \
  -F "profile_photo=@./photo.jpg"

# Provider
curl -X POST http://localhost:3000/api/verification/provider/resubmit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "valid_id=@./id.jpg" \
  -F "profile_photo=@./photo.jpg" \
  -F "certificates=@./cert1.jpg" \
  -F "certificates=@./cert2.jpg"
```

---

## Endpoints

| Endpoint | Method | Auth | Content-Type |
|----------|--------|------|--------------|
| `/api/verification/customer/resubmit` | POST | Required | `multipart/form-data` |
| `/api/verification/provider/resubmit` | POST | Required | `multipart/form-data` |

---

## Request Fields

### Customer:
- `valid_id` (File, Required) - Valid ID image
- `profile_photo` (File, Optional) - Profile photo

### Provider:
- `valid_id` (File, Required) - Valid ID image
- `profile_photo` (File, Optional) - Profile photo
- `certificates` (Files, Optional, max 3) - Certificate images

---

## Success Response

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

## Error Responses

### 400 - Missing Required File
```json
{
  "success": false,
  "message": "Valid ID image is required (either file or URL)"
}
```

### 400 - Already Verified
```json
{
  "success": false,
  "message": "Your account is already verified"
}
```

### 401 - Unauthorized
```json
{
  "message": "Unauthorized"
}
```

### 500 - Upload Failed
```json
{
  "success": false,
  "message": "Failed to upload valid ID image"
}
```

---

## File Constraints

- **Max File Size:** 5MB per file
- **Max Files:** 5 total
- **Allowed Types:** Images only (jpg, png, gif, etc.)
- **Storage:** Cloudinary (automatic upload)

---

## 💡 Tips

1. **Always check response** - Handle both success and error cases
2. **Show progress** - Use loading indicators during upload
3. **Validate before upload** - Check file size and type on frontend
4. **Handle errors gracefully** - Show user-friendly error messages
5. **Test with real images** - Use actual photos for testing

---

## 🔗 Related Docs

- **Complete Guide:** `VERIFICATION_RESUBMISSION_COMPLETE_GUIDE.md`
- **Implementation Summary:** `VERIFICATION_MULTER_IMPLEMENTATION_SUMMARY.md`
- **Test Script:** `test-verification-resubmit-upload.js`
