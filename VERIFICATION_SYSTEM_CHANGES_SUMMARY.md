# Verification System Changes Summary

## What Changed?

Your `adminController.js` has been updated to properly use the existing `rejection_reason` field from your Prisma models instead of requiring a separate verification model.

## Changes Made

### 1. `verifyServiceProvider()` Function

**BEFORE:**
```javascript
export const verifyServiceProvider = async (req, res) => {
    const {provider_isVerified, provider_id} = req.body;
    
    try {
        const verifyProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id },
            data: { provider_isVerified }
        })
        res.status(200).json({ message: 'Service provider verification status updated successfully', data: verifyProvider });
    } catch (error) {
        console.error('Error updating service provider verification status:', error);
    }
}
```

**AFTER:**
```javascript
export const verifyServiceProvider = async (req, res) => {
    const {provider_isVerified, provider_id, rejection_reason} = req.body;

    try {
        // Prepare update data
        const updateData = {
            provider_isVerified,
            verification_status: provider_isVerified ? 'approved' : 'rejected',
            verification_reviewed_at: new Date()
        };

        // Add rejection reason only if rejecting
        if (!provider_isVerified && rejection_reason) {
            updateData.rejection_reason = rejection_reason;
        } else if (provider_isVerified) {
            // Clear rejection reason if approving
            updateData.rejection_reason = null;
        }

        const verifyProvider = await prisma.serviceProviderDetails.update({
            where: { provider_id },
            data: updateData
        });

        res.status(200).json({ 
            message: `Service provider ${provider_isVerified ? 'approved' : 'rejected'} successfully`, 
            data: verifyProvider 
        });
    } catch (error) {
        console.error('Error updating service provider verification status:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
```

**Key Improvements:**
- ✅ Now accepts `rejection_reason` parameter
- ✅ Updates `verification_status` field (pending/approved/rejected)
- ✅ Sets `verification_reviewed_at` timestamp
- ✅ Clears rejection reason when approving
- ✅ Better error handling with status codes
- ✅ Dynamic success message

### 2. `verifyCustomer()` Function

**BEFORE:**
```javascript
export const verifyCustomer = async (req, res) => {
    const { customer_isVerified, user_id } = req.body;

    try {
        const verifyCustomer = await prisma.customerDetails.update({
            where: { user_id },
            data: { isVerified }
        });
        res.status(200).json({ message: 'Customer verification status updated successfully', data: verifyCustomer });
    } catch (error) {
        console.error('Error updating customer verification status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
```

**AFTER:**
```javascript
export const verifyCustomer = async (req, res) => {
    const { is_verified, user_id, rejection_reason } = req.body;

    try {
        // Prepare update data
        const updateData = {
            is_verified,
            verification_status: is_verified ? 'approved' : 'rejected',
            verification_reviewed_at: new Date()
        };

        // Add rejection reason only if rejecting
        if (!is_verified && rejection_reason) {
            updateData.rejection_reason = rejection_reason;
        } else if (is_verified) {
            // Clear rejection reason if approving
            updateData.rejection_reason = null;
        }

        const verifyCustomer = await prisma.user.update({
            where: { user_id },
            data: updateData
        });

        res.status(200).json({ 
            message: `Customer ${is_verified ? 'approved' : 'rejected'} successfully`, 
            data: verifyCustomer 
        });
    } catch (error) {
        console.error('Error updating customer verification status:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
```

**Key Improvements:**
- ✅ Fixed parameter name: `customer_isVerified` → `is_verified` (matches schema)
- ✅ Fixed model name: `customerDetails` → `user` (matches your actual model)
- ✅ Now accepts `rejection_reason` parameter
- ✅ Updates `verification_status` field
- ✅ Sets `verification_reviewed_at` timestamp
- ✅ Clears rejection reason when approving
- ✅ Better error handling

### 3. `getUnverifiedServiceProviders()` Function

**BEFORE:**
```javascript
export const getUnverifiedServiceProviders = async (req, res) => {
  try {
    const unverifiedProviders = await prisma.serviceProviderDetails.findMany({
      where: {
        provider_isVerified: false
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        provider_certificates: true,
      }
    });

    res.status(200).json({
      message: 'Fetched unverified service providers',
      data: unverifiedProviders
    });

  } catch (error) {
    console.error('Error fetching unverified service providers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
```

**AFTER:**
```javascript
export const getUnverifiedServiceProviders = async (req, res) => {
  try {
    const unverifiedProviders = await prisma.serviceProviderDetails.findMany({
      where: {
        provider_isVerified: false
      },
      orderBy: {
        created_at: 'desc'
      },
      select: {
        provider_id: true,
        provider_first_name: true,
        provider_last_name: true,
        provider_email: true,
        provider_phone_number: true,
        provider_profile_photo: true,
        provider_valid_id: true,
        provider_isVerified: true,
        verification_status: true,
        rejection_reason: true,
        verification_submitted_at: true,
        verification_reviewed_at: true,
        created_at: true,
        provider_location: true,
        provider_certificates: {
          select: {
            certificate_id: true,
            certificate_name: true,
            certificate_file_path: true,
            certificate_status: true,
            certificate_reason: true,
            created_at: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Fetched unverified service providers',
      data: unverifiedProviders
    });

  } catch (error) {
    console.error('Error fetching unverified service providers:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
```

**Key Improvements:**
- ✅ Now includes `verification_status` field
- ✅ Now includes `rejection_reason` field
- ✅ Now includes `verification_submitted_at` and `verification_reviewed_at`
- ✅ Better certificate selection (only needed fields)
- ✅ Consistent response format with `success` flag
- ✅ Better error messages

### 4. `getUnverifiedCustomers()` Function

**BEFORE:**
```javascript
export const getUnverifiedCustomers = async (req, res) => {
    try {
        const unverifiedCustomers = await prisma.user.findMany({
            where: {
                is_verified: false
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    
        res.status(200).json({
            message: 'Fetched unverified customers',
            data: unverifiedCustomers
        });
    
    } catch (error) {
        console.error('Error fetching unverified customers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
```

**AFTER:**
```javascript
export const getUnverifiedCustomers = async (req, res) => {
    try {
        const unverifiedCustomers = await prisma.user.findMany({
            where: {
                is_verified: false
            },
            orderBy: {
                created_at: 'desc'
            },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_number: true,
                profile_photo: true,
                valid_id: true,
                user_location: true,
                is_verified: true,
                verification_status: true,
                rejection_reason: true,
                verification_submitted_at: true,
                verification_reviewed_at: true,
                created_at: true
            }
        });
    
        res.status(200).json({
            success: true,
            message: 'Fetched unverified customers',
            data: unverifiedCustomers
        });
    
    } catch (error) {
        console.error('Error fetching unverified customers:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
}
```

**Key Improvements:**
- ✅ Now includes `verification_status` field
- ✅ Now includes `rejection_reason` field
- ✅ Now includes `verification_submitted_at` and `verification_reviewed_at`
- ✅ Explicit field selection (doesn't return password or sensitive data)
- ✅ Consistent response format with `success` flag
- ✅ Better error messages

## No Database Changes Required!

Your existing Prisma schema already has all the necessary fields:

**User Model:**
- ✅ `is_verified`
- ✅ `verification_status`
- ✅ `rejection_reason`
- ✅ `verification_submitted_at`
- ✅ `verification_reviewed_at`

**ServiceProviderDetails Model:**
- ✅ `provider_isVerified`
- ✅ `verification_status`
- ✅ `rejection_reason`
- ✅ `verification_submitted_at`
- ✅ `verification_reviewed_at`

## How to Use

### Approve a Provider:
```javascript
POST /api/admin/verify-provider
{
  "provider_id": 1,
  "provider_isVerified": true
}
```

### Reject a Provider:
```javascript
POST /api/admin/verify-provider
{
  "provider_id": 1,
  "provider_isVerified": false,
  "rejection_reason": "Certificate is expired"
}
```

### Approve a Customer:
```javascript
POST /api/admin/verify-customer
{
  "user_id": 1,
  "is_verified": true
}
```

### Reject a Customer:
```javascript
POST /api/admin/verify-customer
{
  "user_id": 1,
  "is_verified": false,
  "rejection_reason": "ID photo is not clear"
}
```

## Benefits

1. **Uses Existing Schema** - No need for new migrations or models
2. **Backward Compatible** - Works with your existing data
3. **Audit Trail** - Tracks when verification was reviewed
4. **User Feedback** - Rejection reasons help users fix issues
5. **Status Tracking** - Clear states: pending, approved, rejected
6. **Better Error Handling** - Proper HTTP status codes and error messages
7. **Consistent API** - All responses follow the same format

## Complete Verification System

You now have TWO ways to manage verification:

1. **adminController.js** (Simple approach)
   - Quick approve/reject endpoints
   - Basic verification management
   
2. **verificationController.js** (Advanced approach)
   - Comprehensive endpoints with email notifications
   - Detailed verification tracking
   - Automatic email sending on approval/rejection

Both controllers work with the same database fields and are fully compatible!

## Next Steps

1. ✅ Database schema - Already setup
2. ✅ Controllers updated - Both adminController and verificationController
3. 🔄 Test the endpoints with your frontend
4. 🔄 Update your frontend to display rejection reasons
5. 🔄 (Optional) Add email notifications to adminController if needed

You're all set! 🎉
