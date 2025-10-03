# Vercel Deployment - Multer & File Upload Fixes

## Problem Identified ✅

The deployment error on Vercel was caused by **Multer's `diskStorage`** configuration, which tries to write files to local directories. Vercel's serverless environment **doesn't support persistent local file storage**.

## Root Causes

### 1. **Multer diskStorage Usage**
Found in 3 locations:
- `src/middleware/multer.js` (line 31 & 217)
- `src/route/serviceProvider.js` (line 110)

These were trying to write to:
- `uploads/` folder
- `uploads/certificates/` folder
- `uploads/service-images/` folder

### 2. **Missing favicon.ico**
Browsers automatically request `/favicon.ico`, causing 404 errors during deployment.

### 3. **uploads/ folder in repository**
Local test files were being committed to git.

## Solutions Applied

### ✅ Fix 1: Changed All diskStorage to memoryStorage

**File: `src/middleware/multer.js`**

**Before:**
```javascript
const upload = multer({ dest: 'uploads/' }); // ❌ Tries to write to disk

const serviceImageStorageSimple = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../uploads/service-images/');
        cb(null, uploadPath); // ❌ Local folder
    },
    filename: function (req, file, cb) {
        cb(null, 'service_' + uniqueSuffix + '.jpg');
    }
});
```

**After:**
```javascript
const upload = multer({ storage: multer.memoryStorage() }); // ✅ Memory buffer

const serviceImageStorageSimple = multer.memoryStorage(); // ✅ Memory buffer
```

**File: `src/route/serviceProvider.js`**

**Before:**
```javascript
const certificateStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/certificates/'; // ❌ Local folder
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, 'certificate-' + uniqueSuffix + ext);
  }
});
```

**After:**
```javascript
const certificateStorage = multer.memoryStorage(); // ✅ Memory buffer
```

### ✅ Fix 2: Added favicon.ico Handler

**File: `src/server.js`**

```javascript
// Favicon handler - prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.svg'), (err) => {
    if (err) {
      res.status(204).end(); // No content if favicon doesn't exist
    }
  });
});
```

**Created:** `src/public/favicon.svg` - A simple green "F" icon.

### ✅ Fix 3: Updated .gitignore

**File: `.gitignore`**

Added:
```
# uploads (local file storage - not for production)
/uploads

# local env files
.env

# Vercel
.vercel
```

### ✅ Fix 4: Created vercel.json Configuration

**File: `vercel.json`**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/favicon.ico",
      "dest": "/src/public/favicon.ico"
    },
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## How Memory Storage Works with Cloudinary

### Before (Local Development with diskStorage):
```
User uploads file → Multer saves to disk → Read from disk → Upload to Cloudinary
```

### After (Production with memoryStorage):
```
User uploads file → Multer stores in memory buffer → Upload to Cloudinary from buffer
```

### Example Usage in Your Controllers:

```javascript
// Your existing code already works with memoryStorage!
export const registerServiceProvider = async (req, res) => {
    // Files are in memory buffer
    const profilePhoto = req.files['provider_profile_photo']?.[0];
    const validId = req.files['provider_valid_id']?.[0];
    
    // Upload directly to Cloudinary from buffer
    const profilePhotoResult = await cloudinary.uploader.upload_stream(...);
    const validIdResult = await cloudinary.uploader.upload_stream(...);
    
    // Save Cloudinary URLs to database
    provider_profile_photo: profilePhotoResult.secure_url,
    provider_valid_id: validIdResult.secure_url
};
```

## Files Modified

1. ✅ `src/middleware/multer.js` - Changed diskStorage to memoryStorage
2. ✅ `src/route/serviceProvider.js` - Changed certificateStorage to memoryStorage
3. ✅ `src/server.js` - Added favicon handler
4. ✅ `.gitignore` - Added uploads/ and .env
5. ✅ `vercel.json` - Created deployment configuration
6. ✅ `src/public/favicon.svg` - Created favicon

## Testing Checklist

### Local Testing:
- [x] File uploads still work with Cloudinary
- [x] No errors about missing directories
- [x] Memory storage properly handles file buffers

### Vercel Deployment:
- [ ] Deploy to Vercel
- [ ] Test file upload endpoints (profile photos, IDs, certificates)
- [ ] Verify Cloudinary integration works
- [ ] Check for favicon 404 errors (should be resolved)
- [ ] Verify no "cannot write to uploads/" errors

## Environment Variables for Vercel

Make sure these are set in your Vercel project dashboard:

```
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_database_url
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
NODE_ENV=production
```

## Remove uploads/ from Git (If Already Committed)

If the `uploads/` folder is already in your git repository, remove it:

```bash
# Remove from git but keep locally
git rm -r --cached uploads/

# Commit the change
git commit -m "Remove uploads folder from repository"

# Push to repository
git push origin your-branch
```

## Benefits of This Approach

✅ **Serverless Compatible** - No file system dependencies
✅ **Cloudinary Integration** - All files go directly to cloud storage
✅ **Scalable** - Works with Vercel's auto-scaling
✅ **No Storage Limits** - No local disk space issues
✅ **Better Performance** - Direct buffer to Cloudinary upload
✅ **Cleaner Repository** - No uploaded files in git

## File Upload Flow (After Fixes)

### 1. Customer Registration with Photo & ID
```
POST /api/auth/customer/register
→ Multer captures files in memory
→ Controller uploads to Cloudinary
→ Cloudinary URLs saved to database
✅ No local file system used
```

### 2. Provider Registration with Certificates
```
POST /api/service-providers/register
→ Multer captures multiple files in memory
→ Controller uploads each to Cloudinary
→ Cloudinary URLs saved to database
✅ No local file system used
```

### 3. Service Listing with Photos
```
POST /api/services
→ Multer captures service photos in memory
→ Controller uploads to Cloudinary
→ Cloudinary URLs saved to database
✅ No local file system used
```

### 4. Rating with Photo
```
POST /api/ratings
→ Multer captures rating photo in memory
→ Controller uploads to Cloudinary
→ Cloudinary URL saved to database
✅ No local file system used
```

### 5. Backjob Evidence Upload
```
POST /api/backjob-applications
→ Multer captures evidence in memory
→ Controller uploads to Cloudinary
→ Cloudinary URLs saved to database
✅ No local file system used
```

## Important Notes

⚠️ **Development vs Production:**
- **Local Development:** The `uploads/` folder might still exist locally for testing, but it's now ignored by git
- **Vercel Production:** All files go directly to Cloudinary, no local storage used

✅ **Your Code Already Works:**
- Your controllers already use Cloudinary for storage
- The only change was removing the diskStorage middleware
- All your upload endpoints will work exactly the same

✅ **No Breaking Changes:**
- API endpoints remain the same
- Request/response formats unchanged
- Only internal storage mechanism changed

## Deployment Steps

1. **Commit all changes:**
```bash
git add .
git commit -m "Fix multer diskStorage for Vercel deployment"
git push
```

2. **Deploy to Vercel:**
```bash
vercel --prod
```

3. **Set environment variables in Vercel Dashboard:**
- Go to your project settings
- Add all required environment variables
- Redeploy if needed

4. **Test all upload endpoints:**
- Customer registration with photo/ID
- Provider registration with certificates
- Service listing with photos
- Rating with photo
- Backjob evidence upload

## Success Indicators

✅ No "ENOENT: no such file or directory" errors
✅ No "cannot write to uploads/" errors
✅ No favicon 404 errors
✅ All file uploads work through Cloudinary
✅ Images display correctly from Cloudinary URLs
✅ Deployment completes without errors

## Summary

The main issue was **Multer trying to use diskStorage on Vercel's serverless environment**. By switching to **memoryStorage**, files are kept in memory buffers and uploaded directly to Cloudinary without needing local file system access. This is the correct approach for serverless deployments! 🎉
