# Cloudinary Integration Guide

## Overview
This project now uses Cloudinary for cloud-based image storage instead of local file storage. All image uploads (profile photos, ID documents, certificates, service images, and rating photos) are now stored on Cloudinary.

## Configuration

### Environment Variables
Make sure these environment variables are set in your `.env` file:

```env
CLOUDINARY_URL="cloudinary://123879281443593:SSy_2EIulhzvVCKUmFkEtk_CPtY@dcx1glkit"
CLOUDINARY_CLOUD_NAME="dcx1glkit"
CLOUDINARY_API_KEY="123879281443593"
CLOUDINARY_API_SECRET="SSy_2EIulhzvVCKUmFkEtk_CPtY"
```

## Features

### Supported Upload Types
1. **Customer Profile Photos** - Stored in `fixmo/customer-profiles/`
2. **Customer ID Documents** - Stored in `fixmo/customer-ids/`
3. **Provider Profile Photos** - Stored in `fixmo/provider-profiles/`
4. **Provider ID Documents** - Stored in `fixmo/provider-ids/`
5. **Certificates** - Stored in `fixmo/certificates/`
6. **Service Images** - Stored in `fixmo/service-images/`
7. **Rating Photos** - Stored in `fixmo/rating-photos/`

### Updated Controllers
- `authCustomerController.js` - Customer registration with profile photos and ID uploads
- `authserviceProviderController.js` - Provider registration with profile photos, ID, and certificate uploads
- `serviceController.js` - Service listing creation with image uploads
- `ratingController.js` - Rating submissions with photo uploads

### Updated Routes
- All multer configurations now use memory storage instead of disk storage
- Image buffers are uploaded directly to Cloudinary
- No local file storage dependency

## Testing

### Cloudinary Status Check
```
GET /api/test/cloudinary-status
```
Returns the configuration status of Cloudinary environment variables.

### Test Image Upload
```
POST /api/test/cloudinary-upload
```
Upload a test image to verify Cloudinary integration is working.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `test_image` (file)

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully to Cloudinary",
  "imageUrl": "https://res.cloudinary.com/dcx1glkit/image/upload/v1234567890/fixmo/test-uploads/test_1234567890.jpg",
  "uploadInfo": {
    "originalName": "test.jpg",
    "size": 12345,
    "mimetype": "image/jpeg"
  }
}
```

## Benefits

1. **Scalability** - No local storage limitations
2. **Performance** - Cloudinary's global CDN for fast image delivery
3. **Automatic Optimization** - Images are automatically optimized for web and mobile
4. **Frontend Integration** - Direct URLs for React Native image components
5. **Backup & Reliability** - Cloud-based storage with built-in redundancy

## Frontend Integration

Images are now returned as complete Cloudinary URLs that can be used directly in React Native:

```javascript
// Example API response
{
  "profile_photo": "https://res.cloudinary.com/dcx1glkit/image/upload/v1234567890/fixmo/customer-profiles/customer_profile_user_email_com_1234567890.jpg"
}

// Use directly in React Native
<Image source={{ uri: user.profile_photo }} style={styles.profileImage} />
```

## Migration Notes

- Existing local file paths in the database will continue to work but won't be accessible via Cloudinary
- New uploads will generate Cloudinary URLs
- Consider running a migration script if you need to move existing local images to Cloudinary

## Error Handling

The integration includes comprehensive error handling:
- Upload failures return appropriate error messages
- File size and type validation
- Fallback behavior when uploads fail
- Detailed logging for debugging

## Security

- File type validation (images only for most uploads)
- File size limits enforced
- Secure Cloudinary URLs with proper access controls
- Environment variables keep API credentials secure
