# Verification System with Rejection Status

## Overview
The verification system uses the existing `rejection_reason` field in your Prisma models rather than creating a separate verification model. This provides a cleaner, more integrated approach to managing verification status for both customers and service providers.

## Database Schema (Existing Fields)

### User Model (Customers)
```prisma
model User {
  is_verified               Boolean   @default(false)
  verification_status       String    @default("pending") // pending, approved, rejected
  rejection_reason          String?
  verification_submitted_at DateTime?
  verification_reviewed_at  DateTime?
  valid_id                  String?
  // ... other fields
}
```

### ServiceProviderDetails Model (Providers)
```prisma
model ServiceProviderDetails {
  provider_isVerified       Boolean   @default(false)
  verification_status       String    @default("pending") // pending, approved, rejected
  rejection_reason          String?
  verification_submitted_at DateTime?
  verification_reviewed_at  DateTime?
  provider_valid_id         String?
  // ... other fields
}
```

## API Endpoints

### Admin Controller Endpoints

#### 1. Verify Service Provider
**Endpoint:** `POST /api/admin/verify-provider`

**Request Body:**
```json
{
  "provider_id": 1,
  "provider_isVerified": true,
  "rejection_reason": "Optional - required only if rejecting"
}
```

**Response (Approval):**
```json
{
  "message": "Service provider approved successfully",
  "data": {
    "provider_id": 1,
    "provider_isVerified": true,
    "verification_status": "approved",
    "rejection_reason": null,
    "verification_reviewed_at": "2025-10-02T10:30:00.000Z"
  }
}
```

**Response (Rejection):**
```json
{
  "message": "Service provider rejected successfully",
  "data": {
    "provider_id": 1,
    "provider_isVerified": false,
    "verification_status": "rejected",
    "rejection_reason": "Invalid ID document - image is blurry",
    "verification_reviewed_at": "2025-10-02T10:30:00.000Z"
  }
}
```

#### 2. Verify Customer
**Endpoint:** `POST /api/admin/verify-customer`

**Request Body:**
```json
{
  "user_id": 1,
  "is_verified": true,
  "rejection_reason": "Optional - required only if rejecting"
}
```

**Response (Approval):**
```json
{
  "message": "Customer approved successfully",
  "data": {
    "user_id": 1,
    "is_verified": true,
    "verification_status": "approved",
    "rejection_reason": null,
    "verification_reviewed_at": "2025-10-02T10:30:00.000Z"
  }
}
```

**Response (Rejection):**
```json
{
  "message": "Customer rejected successfully",
  "data": {
    "user_id": 1,
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "ID document expired",
    "verification_reviewed_at": "2025-10-02T10:30:00.000Z"
  }
}
```

#### 3. Get Unverified Service Providers
**Endpoint:** `GET /api/admin/unverified-providers`

**Response:**
```json
{
  "success": true,
  "message": "Fetched unverified service providers",
  "data": [
    {
      "provider_id": 1,
      "provider_first_name": "John",
      "provider_last_name": "Doe",
      "provider_email": "john@example.com",
      "provider_phone_number": "+1234567890",
      "provider_profile_photo": "https://...",
      "provider_valid_id": "https://...",
      "provider_isVerified": false,
      "verification_status": "pending",
      "rejection_reason": null,
      "verification_submitted_at": "2025-10-01T09:00:00.000Z",
      "verification_reviewed_at": null,
      "created_at": "2025-09-30T10:00:00.000Z",
      "provider_location": "Manila",
      "provider_certificates": [
        {
          "certificate_id": 1,
          "certificate_name": "Electrical License",
          "certificate_file_path": "https://...",
          "certificate_status": "Pending",
          "certificate_reason": null,
          "created_at": "2025-10-01T09:05:00.000Z"
        }
      ]
    }
  ]
}
```

#### 4. Get Unverified Customers
**Endpoint:** `GET /api/admin/unverified-customers`

**Response:**
```json
{
  "success": true,
  "message": "Fetched unverified customers",
  "data": [
    {
      "user_id": 1,
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "phone_number": "+1234567890",
      "profile_photo": "https://...",
      "valid_id": "https://...",
      "user_location": "Quezon City",
      "is_verified": false,
      "verification_status": "rejected",
      "rejection_reason": "ID document is not clear enough",
      "verification_submitted_at": "2025-10-01T08:00:00.000Z",
      "verification_reviewed_at": "2025-10-01T14:00:00.000Z",
      "created_at": "2025-09-29T12:00:00.000Z"
    }
  ]
}
```

## Verification Controller Endpoints (Already Implemented)

The `verificationController.js` already has comprehensive endpoints that work with the existing schema:

### Admin Endpoints:
- `GET /api/verification/admin/pending` - Get all pending verifications (with rejection status)
- `PUT /api/verification/admin/customer/:user_id/approve` - Approve customer
- `PUT /api/verification/admin/customer/:user_id/reject` - Reject customer with reason
- `PUT /api/verification/admin/provider/:provider_id/approve` - Approve provider
- `PUT /api/verification/admin/provider/:provider_id/reject` - Reject provider with reason

### User Endpoints:
- `GET /api/verification/customer/status` - Get customer verification status
- `GET /api/verification/provider/status` - Get provider verification status

## Verification Status Flow

### Status Values:
1. **pending** - Initial status when user submits verification documents
2. **approved** - Admin approves the verification
3. **rejected** - Admin rejects with a reason, user can re-submit

### Customer Flow:
```
1. Customer registers → verification_status: "pending", is_verified: false
2. Customer uploads valid_id → verification_submitted_at: [timestamp]
3. Admin reviews:
   a. Approve → verification_status: "approved", is_verified: true, rejection_reason: null
   b. Reject → verification_status: "rejected", is_verified: false, rejection_reason: "reason here"
4. If rejected, customer can update documents and re-submit
```

### Provider Flow:
```
1. Provider registers → verification_status: "pending", provider_isVerified: false
2. Provider uploads valid_id & certificates → verification_submitted_at: [timestamp]
3. Admin reviews:
   a. Approve → verification_status: "approved", provider_isVerified: true, rejection_reason: null
   b. Reject → verification_status: "rejected", provider_isVerified: false, rejection_reason: "reason here"
4. If rejected, provider can update documents and re-submit
```

## Benefits of This Approach

1. **No Additional Model Needed** - Uses existing schema fields
2. **Audit Trail** - Tracks submission and review timestamps
3. **Clear Status** - Three distinct states (pending/approved/rejected)
4. **Rejection Feedback** - Stores reason for rejection to help users
5. **Email Notifications** - Already implemented in verificationController
6. **Re-submission Support** - Users can see why they were rejected and fix issues

## Email Notifications

The verification controller automatically sends emails:
- ✅ **Approval Email** - Welcomes user and explains next steps
- ⚠️ **Rejection Email** - Explains reason and how to re-submit

## Frontend Integration Tips

### Display Verification Status:
```javascript
// Customer status check
const statusColor = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red'
};

const statusMessage = {
  pending: 'Your verification is being reviewed',
  approved: 'Your account is verified!',
  rejected: 'Verification rejected - please re-submit'
};
```

### Show Rejection Reason:
```javascript
if (verification_status === 'rejected' && rejection_reason) {
  return (
    <Alert type="warning">
      <h4>Verification Update Required</h4>
      <p>Reason: {rejection_reason}</p>
      <button>Re-submit Documents</button>
    </Alert>
  );
}
```

## Testing Examples

### Approve a Provider:
```bash
POST /api/admin/verify-provider
{
  "provider_id": 1,
  "provider_isVerified": true
}
```

### Reject a Customer:
```bash
POST /api/admin/verify-customer
{
  "user_id": 1,
  "is_verified": false,
  "rejection_reason": "ID document photo is too blurry, please upload a clearer image"
}
```

## Summary

Your existing Prisma schema already has all the necessary fields for a complete verification system with rejection tracking. The updated `adminController.js` now properly uses these fields, and the `verificationController.js` provides comprehensive endpoints for managing the entire verification workflow including email notifications.

No database migrations are needed - everything works with your current schema! 🎉
