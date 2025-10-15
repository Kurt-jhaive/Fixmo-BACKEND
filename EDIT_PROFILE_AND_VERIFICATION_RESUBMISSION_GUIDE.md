# 📝 Edit Profile & Verification Resubmission System Guide

## Overview
This comprehensive guide documents the complete **Edit Profile** and **Verification Document Resubmission** system implemented for customers. Use this as a reference to implement the same features for service providers.

---

## 🎯 System Features

### 1. **Two-Step OTP Profile Editing** (Approved Users)
- Users with `verification_status: 'approved'` can edit their profile
- Requires OTP verification for security
- Two-step process: Request OTP → Verify OTP & Update

### 2. **Verification Document Resubmission** (Rejected/Pending Users)
- Users with `verification_status: 'rejected'` or `'pending'` can resubmit documents
- Updates personal information AND verification documents
- Does NOT require OTP (different workflow)

---

## 📊 System Architecture

### Flow Diagram

```
User Opens Edit Profile
        ↓
Check verification_status
        ↓
        ├─→ approved? → OTP Required Flow
        │                ↓
        │           Request OTP Button
        │                ↓
        │           User Clicks Request OTP
        │                ↓
        │           OTP Sent to Email
        │                ↓
        │           User Makes Changes
        │                ↓
        │           User Clicks Save
        │                ↓
        │           OTP Modal Opens
        │                ↓
        │           User Enters OTP
        │                ↓
        │           Profile Updated ✅
        │
        └─→ rejected/pending? → Direct Save Flow
                     ↓
                User Makes Changes
                     ↓
                User Clicks Save
                     ↓
                Verification Resubmission
                     ↓
                Documents + Data Sent
                     ↓
                Status → pending ✅
```

---

## 🔑 Key Files

### Frontend Files:
1. **`app/editprofile.tsx`** - Main edit profile screen
2. **`app/components/VerificationModal.tsx`** - Resubmission modal for rejected users
3. **`app/(tabs)/profile.tsx`** - Profile screen with verification status banner

### Backend Files (to be created/modified):
1. **Controller**: `authCustomerController.js` or `authserviceProviderController.js`
   - `requestProfileUpdateOtp()` - Send OTP for profile edit
   - `editCustomerProfile()` or `editProviderProfile()` - Update profile with OTP
   
2. **Controller**: `verificationController.js`
   - `resubmitCustomerVerification()` or `resubmitProviderVerification()` - Handle document resubmission

3. **Routes**: `authCustomer.js` or `serviceProvider.js`
   - POST `/auth/customer-profile/request-otp` - Request OTP endpoint
   - PUT `/auth/customer-profile` - Update profile endpoint
   - POST `/api/verification/customer/resubmit` - Resubmit verification endpoint

---

## 📱 Frontend Implementation

### 1. Edit Profile Screen Structure

#### State Management

```typescript
// User data
const [userData, setUserData] = useState<UserData | null>(null);
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

// Form fields
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [homeAddress, setHomeAddress] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [profileUri, setProfileUri] = useState<string | null>(null);
const [birthday, setBirthday] = useState<Date | null>(null);
const [locationCoordinates, setLocationCoordinates] = useState<{ lat: number; lng: number } | undefined>();

// OTP states (for approved users)
const [otpRequested, setOtpRequested] = useState(false);
const [maskedEmail, setMaskedEmail] = useState('');
const [showOtpModal, setShowOtpModal] = useState(false);
const [otp, setOtp] = useState('');
const [otpTimer, setOtpTimer] = useState(0);
const [requestingOtp, setRequestingOtp] = useState(false);
const [originalEmail, setOriginalEmail] = useState('');

// Email change OTP states (for changing email)
const [showSecondOtpModal, setShowSecondOtpModal] = useState(false);
const [secondOtp, setSecondOtp] = useState('');
const [newEmailForVerification, setNewEmailForVerification] = useState('');

// Location cascading states
const [selectedProvince, setSelectedProvince] = useState('');
const [selectedMunicipality, setSelectedMunicipality] = useState('');
const [selectedBarangay, setSelectedBarangay] = useState('');
```

---

### 2. Load User Profile

```typescript
const loadUserProfile = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'Please login first');
      router.back();
      return;
    }

    const response = await fetch(`${BACKEND_URL}/auth/customer-profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      const data = result.data;
      
      setUserData(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setEmail(data.email || '');
      setOriginalEmail(data.email || '');
      setPhone(data.phone_number || '');
      setHomeAddress(data.user_location || '');
      setProfileUri(data.profile_photo || null);
      
      // Parse birthday
      if (data.birthday) {
        setBirthday(new Date(data.birthday));
      }
      
      // Parse location coordinates
      if (data.exact_location) {
        const [lat, lng] = data.exact_location.split(',').map(Number);
        setLocationCoordinates({ lat, lng });
      }
      
      // Parse cascading location from user_location string
      parseLocationString(data.user_location || '');
    } else {
      Alert.alert('Error', 'Failed to load profile');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    Alert.alert('Error', 'Network error');
  } finally {
    setLoading(false);
  }
};
```

---

### 3. Request OTP (For Approved Users Only)

```typescript
const requestOtp = async () => {
  // Only approved users need OTP
  if (userData?.verification_status !== 'approved') {
    return;
  }

  setRequestingOtp(true);

  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(
      `${BACKEND_URL}/auth/customer-profile/request-otp`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (response.ok) {
      setOtpRequested(true);
      setMaskedEmail(result.data?.maskedEmail || '');
      setOtpTimer(600); // 10 minutes = 600 seconds
      Alert.alert(
        'Verification Code Sent',
        `A 6-digit code has been sent to ${result.data?.maskedEmail || 'your email'}`
      );
    } else {
      Alert.alert('Error', result.message || 'Failed to send verification code');
    }
  } catch (error) {
    console.error('Error requesting OTP:', error);
    Alert.alert('Error', 'Network error while requesting verification code');
  } finally {
    setRequestingOtp(false);
  }
};
```

---

### 4. Save Changes - Main Handler

```typescript
const handleSave = async () => {
  // Check verification status
  if (userData?.verification_status !== 'approved') {
    // For rejected/pending users → Direct resubmission (no OTP)
    await handleVerificationResubmission();
    return;
  }

  // For approved users → OTP required
  if (!otpRequested) {
    Alert.alert(
      'Verification Required',
      'Please request a verification code first before saving changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request Code', 
          onPress: () => requestOtp() 
        }
      ]
    );
    return;
  }

  // Validation
  if (!firstName.trim() || !lastName.trim()) {
    Alert.alert('Validation Error', 'First name and last name are required');
    return;
  }

  if (!phone.trim()) {
    Alert.alert('Validation Error', 'Phone number is required');
    return;
  }

  if (!homeAddress.trim()) {
    Alert.alert('Validation Error', 'Home address is required');
    return;
  }

  // Show OTP modal for verification before saving
  setShowOtpModal(true);
};
```

---

### 5. Verify OTP and Update Profile

```typescript
const verifyOtpAndSave = async () => {
  if (!otp || otp.length !== 6) {
    Alert.alert('Error', 'Please enter a valid 6-digit verification code');
    return;
  }

  setSaving(true);

  try {
    const token = await AsyncStorage.getItem('token');

    // Prepare update data
    const updateData: any = {
      phone_number: phone,
      user_location: homeAddress,
    };

    // Add coordinates if available
    if (locationCoordinates) {
      updateData.exact_location = `${locationCoordinates.lat},${locationCoordinates.lng}`;
    }

    // Add email if changed
    if (email !== originalEmail) {
      updateData.email = email;
    }

    const response = await fetch(
      `${BACKEND_URL}/auth/customer-profile?otp=${otp}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    const result = await response.json();

    if (response.ok) {
      // If email was changed, verify new email
      if (email !== originalEmail) {
        setNewEmailForVerification(email);
        setShowOtpModal(false);
        Alert.alert(
          'Email Verification Required',
          `A verification code has been sent to your new email: ${email}. Please enter it to complete the change.`,
          [{ text: 'OK', onPress: () => setShowSecondOtpModal(true) }]
        );
      } else {
        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setShowOtpModal(false);
              loadUserProfile(); // Reload profile
              router.back();
            },
          },
        ]);
      }
    } else {
      Alert.alert('Error', result.message || 'Failed to update profile');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    Alert.alert('Error', 'Network error during update');
  } finally {
    setSaving(false);
  }
};
```

---

### 6. Handle Verification Resubmission (Rejected/Pending Users)

```typescript
const handleVerificationResubmission = async () => {
  setSaving(true);

  try {
    const token = await AsyncStorage.getItem('token');

    const formData = new FormData();
    
    // Personal information
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    
    if (birthday) {
      formData.append('birthday', birthday.toISOString().split('T')[0]);
    }
    
    formData.append('user_location', homeAddress);
    
    if (locationCoordinates) {
      formData.append('exact_location', `${locationCoordinates.lat},${locationCoordinates.lng}`);
    }

    // Profile photo (if new image selected)
    if (profileUri && !profileUri.startsWith('http')) {
      const photoExt = profileUri.split('.').pop();
      formData.append('profile_photo', {
        uri: profileUri,
        type: `image/${photoExt}`,
        name: `profile.${photoExt}`,
      } as any);
    } else if (profileUri) {
      // Existing Cloudinary URL
      formData.append('profile_photo_url', profileUri);
    }

    // Note: Valid ID resubmission handled separately or in VerificationModal

    const response = await fetch(
      `${BACKEND_URL}/api/verification/customer/resubmit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (response.ok) {
      Alert.alert(
        'Success',
        'Your information has been updated and submitted for review.',
        [
          {
            text: 'OK',
            onPress: () => {
              loadUserProfile();
              router.back();
            },
          },
        ]
      );
    } else {
      const errorData = await response.json();
      Alert.alert('Error', errorData.message || 'Failed to update information');
    }
  } catch (error) {
    console.error('Error during resubmission:', error);
    Alert.alert('Error', 'Network error during resubmission');
  } finally {
    setSaving(false);
  }
};
```

---

### 7. UI Rendering - Conditional Based on Verification Status

```tsx
<ScrollView style={styles.container}>
  {/* Show different UI based on verification status */}
  {userData?.verification_status === 'approved' && (
    <View style={styles.otpSection}>
      <Text style={styles.sectionTitle}>
        Security Verification Required
      </Text>
      <Text style={styles.helperText}>
        To protect your account, we need to verify your identity before making changes.
      </Text>
      
      {otpRequested ? (
        <View style={styles.otpRequestedBox}>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          <Text style={styles.otpRequestedText}>
            Code sent to {maskedEmail}
          </Text>
          <Text style={styles.timerText}>
            Expires in: {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.requestOtpButton}
          onPress={requestOtp}
          disabled={requestingOtp}
        >
          {requestingOtp ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.requestOtpButtonText}>
                Request Verification Code
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  )}

  {/* Form fields */}
  <View style={styles.form}>
    {/* First Name */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>First Name *</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Enter first name"
        editable={userData?.verification_status !== 'approved'}
      />
    </View>

    {/* Last Name */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Last Name *</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Enter last name"
        editable={userData?.verification_status !== 'approved'}
      />
    </View>

    {/* Email - Always editable for approved users */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>

    {/* Phone */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
      />
    </View>

    {/* Address */}
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Home Address *</Text>
      <TextInput
        style={styles.input}
        value={homeAddress}
        onChangeText={setHomeAddress}
        placeholder="Enter address"
        multiline
      />
    </View>
  </View>

  {/* Save Button */}
  <TouchableOpacity
    style={[
      styles.saveButton,
      saving && styles.saveButtonDisabled
    ]}
    onPress={handleSave}
    disabled={saving}
  >
    {saving ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.saveButtonText}>Save Changes</Text>
    )}
  </TouchableOpacity>
</ScrollView>

{/* OTP Verification Modal */}
<Modal
  visible={showOtpModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowOtpModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Enter Verification Code</Text>
      <Text style={styles.modalDescription}>
        Enter the 6-digit code sent to {maskedEmail}
      </Text>
      
      <TextInput
        style={styles.otpInput}
        value={otp}
        onChangeText={setOtp}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
      />
      
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.modalCancelButton}
          onPress={() => setShowOtpModal(false)}
        >
          <Text style={styles.modalCancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.modalVerifyButton}
          onPress={verifyOtpAndSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.modalVerifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

---

## 🔧 Backend Implementation

### 1. Request OTP Endpoint

**File**: `authCustomerController.js` (or `authserviceProviderController.js`)

```javascript
const requestProfileUpdateOtp = async (req, res) => {
  try {
    const userId = req.user.userId; // From authenticateToken middleware

    // Get customer details
    const customer = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { email: true, first_name: true, last_name: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await prisma.oTPVerification.upsert({
      where: { email: customer.email },
      update: {
        otp,
        expires_at: expiresAt,
        created_at: new Date()
      },
      create: {
        email: customer.email,
        otp,
        expires_at: expiresAt
      }
    });

    // Send OTP via email
    await sendEmail({
      to: customer.email,
      subject: 'Profile Update Verification Code',
      html: `
        <h2>Verify Your Identity</h2>
        <p>Hello ${customer.first_name},</p>
        <p>Your verification code for profile update is:</p>
        <h1 style="color: #399d9d;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    // Mask email for response
    const maskedEmail = maskEmail(customer.email);

    res.status(200).json({
      success: true,
      message: `OTP sent to your email address: ${maskedEmail}`,
      data: {
        maskedEmail,
        expiresIn: '10 minutes'
      }
    });

  } catch (error) {
    console.error('Error requesting profile update OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
};

// Helper function to mask email
function maskEmail(email) {
  const [username, domain] = email.split('@');
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  const visibleChars = username.slice(0, 2);
  return `${visibleChars}***@${domain}`;
}
```

---

### 2. Edit Profile with OTP Endpoint

**File**: `authCustomerController.js`

```javascript
const editCustomerProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { otp } = req.query;
    const { phone_number, email, user_location, exact_location } = req.body;

    // Get customer details
    const customer = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { email: true, phone_number: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify OTP
    const otpRecord = await prisma.oTPVerification.findUnique({
      where: { email: customer.email }
    });

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    if (new Date() > otpRecord.expires_at) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired'
      });
    }

    // Prepare update data
    const updateData = {};

    // Phone number
    if (phone_number && phone_number !== customer.phone_number) {
      // Check uniqueness across both tables
      const existingPhone = await prisma.$queryRaw`
        SELECT * FROM "User" 
        WHERE phone_number = ${phone_number} AND user_id != ${userId}
        UNION
        SELECT * FROM "ServiceProvider" 
        WHERE provider_phone_number = ${phone_number}
      `;

      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use'
        });
      }

      updateData.phone_number = phone_number;
    }

    // Email (requires additional verification)
    if (email && email !== customer.email) {
      // Check uniqueness
      const existingEmail = await prisma.$queryRaw`
        SELECT * FROM "User" 
        WHERE email = ${email} AND user_id != ${userId}
        UNION
        SELECT * FROM "ServiceProvider" 
        WHERE provider_email = ${email}
      `;

      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }

      // Send OTP to new email for verification
      const newEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.oTPVerification.upsert({
        where: { email: email },
        update: {
          otp: newEmailOtp,
          expires_at: expiresAt,
          created_at: new Date()
        },
        create: {
          email: email,
          otp: newEmailOtp,
          expires_at: expiresAt
        }
      });

      await sendEmail({
        to: email,
        subject: 'Verify Your New Email Address',
        html: `
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #399d9d;">${newEmailOtp}</h1>
          <p>Enter this code in the app to confirm your new email address.</p>
        `
      });

      // Don't update email yet - wait for verification
      return res.status(200).json({
        success: true,
        message: 'Verification code sent to new email address',
        requiresNewEmailVerification: true,
        newEmail: email
      });
    }

    // Location
    if (user_location) {
      updateData.user_location = user_location;
    }

    if (exact_location) {
      updateData.exact_location = exact_location;
    }

    // Update customer profile
    const updatedCustomer = await prisma.user.update({
      where: { user_id: userId },
      data: updateData
    });

    // Delete used OTP
    await prisma.oTPVerification.delete({
      where: { email: customer.email }
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedCustomer
    });

  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};
```

---

### 3. Verification Resubmission Endpoint

**File**: `verificationController.js`

```javascript
const resubmitCustomerVerification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      first_name,
      last_name,
      birthday,
      user_location,
      exact_location,
      profile_photo_url,
      valid_id_url
    } = req.body;

    const files = req.files;

    // Get current customer data
    const customer = await prisma.user.findUnique({
      where: { user_id: userId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Prepare update data
    const updateData = {
      verification_status: 'pending', // Reset to pending
      rejection_reason: null, // Clear rejection reason
      verification_submitted_at: new Date()
    };

    // Update personal information
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (birthday) updateData.birthday = new Date(birthday);
    if (user_location) updateData.user_location = user_location;
    if (exact_location) updateData.exact_location = exact_location;

    // Handle profile photo
    if (files?.profile_photo) {
      // Upload new photo to Cloudinary
      const profilePhotoResult = await uploadToCloudinary(
        files.profile_photo[0],
        'fixmo/verification/customers'
      );
      updateData.profile_photo = profilePhotoResult.secure_url;
    } else if (profile_photo_url) {
      // Use existing Cloudinary URL
      updateData.profile_photo = profile_photo_url;
    }

    // Handle valid ID
    if (files?.valid_id) {
      // Upload new ID to Cloudinary
      const validIdResult = await uploadToCloudinary(
        files.valid_id[0],
        'fixmo/verification/customers'
      );
      updateData.valid_id = validIdResult.secure_url;
    } else if (valid_id_url) {
      // Use existing Cloudinary URL
      updateData.valid_id = valid_id_url;
    }

    // Update customer
    const updatedCustomer = await prisma.user.update({
      where: { user_id: userId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Verification documents resubmitted successfully',
      data: {
        verification_status: updatedCustomer.verification_status,
        verification_submitted_at: updatedCustomer.verification_submitted_at
      }
    });

  } catch (error) {
    console.error('Error resubmitting customer verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resubmit verification'
    });
  }
};

// Helper function for Cloudinary upload
async function uploadToCloudinary(file, folder) {
  const cloudinary = require('cloudinary').v2;
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    uploadStream.end(file.buffer);
  });
}
```

---

### 4. Routes Configuration

**File**: `authCustomer.js` (or `serviceProvider.js`)

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const authCustomerController = require('../controller/authCustomerController');

// Profile edit routes
router.post(
  '/customer-profile/request-otp',
  authenticateToken,
  authCustomerController.requestProfileUpdateOtp
);

router.put(
  '/customer-profile',
  authenticateToken,
  authCustomerController.editCustomerProfile
);

module.exports = router;
```

**File**: `verification.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const verificationController = require('../controller/verificationController');

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Resubmission route
router.post(
  '/customer/resubmit',
  authenticateToken,
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'valid_id', maxCount: 1 }
  ]),
  verificationController.resubmitCustomerVerification
);

module.exports = router;
```

---

## 🎨 Verification Modal Component

**File**: `app/components/VerificationModal.tsx`

```typescript
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_LINK || 'http://localhost:3000';

interface VerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rejectionReason?: string;
  currentUserData?: {
    first_name?: string;
    last_name?: string;
    birthday?: string;
    user_location?: string;
    exact_location?: string;
    profile_photo?: string;
    valid_id?: string;
  };
}

const VerificationModal: React.FC<VerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  rejectionReason,
  currentUserData,
}) => {
  const [firstName, setFirstName] = useState(currentUserData?.first_name || '');
  const [lastName, setLastName] = useState(currentUserData?.last_name || '');
  const [birthday, setBirthday] = useState<Date | null>(
    currentUserData?.birthday ? new Date(currentUserData.birthday) : null
  );
  const [location, setLocation] = useState(currentUserData?.user_location || '');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(
    currentUserData?.profile_photo || null
  );
  const [validIdUri, setValidIdUri] = useState<string | null>(
    currentUserData?.valid_id || null
  );
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePhotoUri(result.assets[0].uri);
    }
  };

  const pickValidId = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setValidIdUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'First name and last name are required');
      return;
    }

    if (!birthday) {
      Alert.alert('Validation Error', 'Birthday is required');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Validation Error', 'Location is required');
      return;
    }

    if (!profilePhotoUri) {
      Alert.alert('Validation Error', 'Profile photo is required');
      return;
    }

    if (!validIdUri) {
      Alert.alert('Validation Error', 'Valid ID is required');
      return;
    }

    setSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('birthday', birthday.toISOString().split('T')[0]);
      formData.append('user_location', location);

      // Add exact_location if available
      if (currentUserData?.exact_location) {
        formData.append('exact_location', currentUserData.exact_location);
      }

      // Handle profile photo
      if (profilePhotoUri.startsWith('http')) {
        // Existing Cloudinary URL
        formData.append('profile_photo_url', profilePhotoUri);
      } else {
        // New photo selected
        const photoExt = profilePhotoUri.split('.').pop();
        formData.append('profile_photo', {
          uri: profilePhotoUri,
          type: `image/${photoExt}`,
          name: `profile.${photoExt}`,
        } as any);
      }

      // Handle valid ID
      if (validIdUri.startsWith('http')) {
        // Existing Cloudinary URL
        formData.append('valid_id_url', validIdUri);
      } else {
        // New ID selected
        const idExt = validIdUri.split('.').pop();
        formData.append('valid_id', {
          uri: validIdUri,
          type: `image/${idExt}`,
          name: `valid_id.${idExt}`,
        } as any);
      }

      const response = await fetch(`${BACKEND_URL}/api/verification/customer/resubmit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          rejectionReason
            ? 'Verification documents resubmitted successfully! Your documents will be reviewed again.'
            : 'Verification documents submitted successfully! Please wait for admin approval.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                handleClose();
              },
            },
          ]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to submit verification');
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', 'Network error while submitting verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {rejectionReason ? 'Resubmit Verification' : 'Submit Verification'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {rejectionReason && (
          <View style={styles.rejectionBanner}>
            <Ionicons name="alert-circle" size={24} color="#ff4444" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rejectionTitle}>Verification Rejected</Text>
              <Text style={styles.rejectionReason}>{rejectionReason}</Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.form}>
          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
            />
          </View>

          {/* Birthday */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birthday *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setDatePickerVisible(true)}
            >
              <Text style={styles.dateButtonText}>
                {birthday ? birthday.toLocaleDateString() : 'Select birthday'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={(date) => {
              setBirthday(date);
              setDatePickerVisible(false);
            }}
            onCancel={() => setDatePickerVisible(false)}
            maximumDate={new Date()}
          />

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              multiline
            />
          </View>

          {/* Profile Photo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Photo *</Text>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickProfilePhoto}
            >
              {profilePhotoUri ? (
                <Image source={{ uri: profilePhotoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={40} color="#999" />
                  <Text style={styles.photoPlaceholderText}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Valid ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Valid ID *</Text>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickValidId}
            >
              {validIdUri ? (
                <Image source={{ uri: validIdUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="card" size={40} color="#999" />
                  <Text style={styles.photoPlaceholderText}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe6e6',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    marginBottom: 4,
  },
  rejectionReason: {
    fontSize: 14,
    color: '#666',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  photoButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#399d9d',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerificationModal;
```

---

## 🔐 Security Features

### 1. **OTP Verification** (Approved Users)
- 6-digit random code
- 10-minute expiration
- One-time use only
- Email masked in responses
- Deleted after successful verification

### 2. **Email Change Verification**
- Requires OTP to current email
- Then requires OTP to new email
- Two-step verification process
- Prevents unauthorized email changes

### 3. **Uniqueness Validation**
- Checks phone/email across both customer and provider tables
- Prevents duplicate accounts
- Database-level constraints

### 4. **File Upload Security**
- File size limits (10MB)
- Cloudinary secure storage
- Accepts both new uploads and existing URLs
- Multer memory storage for processing

---

## 📊 Database Schema

### OTP Verification Table
```sql
CREATE TABLE "OTPVerification" (
  email TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### User Table Updates
```sql
ALTER TABLE "User" ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE "User" ADD COLUMN rejection_reason TEXT;
ALTER TABLE "User" ADD COLUMN verification_submitted_at TIMESTAMP;
ALTER TABLE "User" ADD COLUMN verification_reviewed_at TIMESTAMP;
ALTER TABLE "User" ADD COLUMN exact_location TEXT;
```

---

## 🚀 Provider Implementation Checklist

Use this checklist to implement the same system for providers:

### Backend:
- [ ] Create `requestProfileUpdateOtp()` in `authserviceProviderController.js`
- [ ] Create `editProviderProfile()` in `authserviceProviderController.js`
- [ ] Create `resubmitProviderVerification()` in `verificationController.js`
- [ ] Add POST route `/provider/profile/request-otp`
- [ ] Add PUT route `/provider/profile`
- [ ] Add POST route `/api/verification/provider/resubmit`
- [ ] Update field names (provider_email, provider_phone_number, etc.)

### Frontend:
- [ ] Create `app/editprofile-provider.tsx` (copy from `editprofile.tsx`)
- [ ] Update field names to match provider schema
- [ ] Update API endpoints to provider endpoints
- [ ] Create/update `VerificationModalProvider.tsx` component
- [ ] Add verification status banner in provider profile
- [ ] Test OTP flow for approved providers
- [ ] Test resubmission flow for rejected providers

### Testing:
- [ ] Test profile edit with valid OTP
- [ ] Test profile edit with expired OTP
- [ ] Test profile edit with invalid OTP
- [ ] Test email change (two-step verification)
- [ ] Test phone/email uniqueness validation
- [ ] Test resubmission with new photos
- [ ] Test resubmission with existing Cloudinary URLs
- [ ] Test verification status transitions

---

## 📖 API Reference Summary

### Customer Endpoints:
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/customer-profile/request-otp` | ✅ | Request OTP for profile edit |
| PUT | `/auth/customer-profile?otp=123456` | ✅ | Update profile with OTP |
| POST | `/api/verification/customer/resubmit` | ✅ | Resubmit verification documents |

### Provider Endpoints (to implement):
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/provider/profile/request-otp` | ✅ | Request OTP for profile edit |
| PUT | `/provider/profile?otp=123456` | ✅ | Update profile with OTP |
| POST | `/api/verification/provider/resubmit` | ✅ | Resubmit verification documents |

---

## 📝 Key Differences: Customer vs Provider

| Feature | Customer | Provider |
|---------|----------|----------|
| **Email field** | `email` | `provider_email` |
| **Phone field** | `phone_number` | `provider_phone_number` |
| **Name fields** | `first_name`, `last_name` | `provider_first_name`, `provider_last_name` |
| **Location field** | `user_location` | `provider_location` |
| **Exact location** | `exact_location` | `exact_location` |
| **Photo field** | `profile_photo` | `provider_profile_photo` |
| **ID field** | `valid_id` | `valid_id` |
| **Birthday field** | `birthday` | `birthday` |
| **Table name** | `User` | `ServiceProvider` |
| **ID field** | `user_id` | `provider_id` |

---

## 🎯 Success Criteria

### For Approved Users:
✅ Cannot save changes without requesting OTP first  
✅ OTP sent to current email successfully  
✅ OTP expires after 10 minutes  
✅ Invalid OTP shows error message  
✅ Expired OTP shows error message  
✅ Email change requires additional verification  
✅ Phone/email uniqueness validated  
✅ Profile updates successfully with valid OTP  

### For Rejected/Pending Users:
✅ Can edit name, birthday, location, and documents  
✅ No OTP required for resubmission  
✅ New photos uploaded to Cloudinary  
✅ Existing Cloudinary URLs preserved if no new photo  
✅ Verification status resets to 'pending'  
✅ Rejection reason cleared on resubmission  
✅ Success message shown after resubmission  

---

## 🐛 Common Issues & Solutions

### Issue 1: "OTP not found"
**Cause**: OTP might have expired or never been created  
**Solution**: Check OTP expiration time, ensure email sending works

### Issue 2: "Email already in use"
**Cause**: Another user has this email  
**Solution**: Check both User and ServiceProvider tables for uniqueness

### Issue 3: "File upload failed"
**Cause**: Cloudinary configuration or file size too large  
**Solution**: Check Cloudinary credentials, verify file size limits

### Issue 4: "Cannot read properties of undefined"
**Cause**: Missing middleware or authentication  
**Solution**: Ensure `authenticateToken` middleware is applied to routes

### Issue 5: "Verification status not updating"
**Cause**: Wrong endpoint or missing fields  
**Solution**: Verify using correct resubmission endpoint, check required fields

---

## 📚 Additional Resources

- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **Multer Documentation**: https://github.com/expressjs/multer
- **Nodemailer Documentation**: https://nodemailer.com/
- **React Native Image Picker**: https://github.com/react-native-image-picker/react-native-image-picker
- **Expo Image Picker**: https://docs.expo.dev/versions/latest/sdk/imagepicker/

---

## ✅ Conclusion

This system provides:
- ✅ **Secure profile editing** with OTP verification for approved users
- ✅ **Flexible document resubmission** for rejected/pending users  
- ✅ **Email change verification** with two-step OTP  
- ✅ **File upload handling** with Cloudinary integration  
- ✅ **Uniqueness validation** across tables  
- ✅ **Clear user feedback** with status banners and modals  

**Use this documentation to implement the exact same system for service providers by following the checklist and adapting field names according to the provider schema.**

---

**Created**: October 15, 2025  
**Last Updated**: October 15, 2025  
**Version**: 1.0.0  
**Author**: GitHub Copilot  
**For**: Service Provider Implementation Reference
