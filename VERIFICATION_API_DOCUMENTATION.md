# Fixmo Verification API Documentation

## Overview
The Verification API handles the verification process for both customers and service providers in the Fixmo platform. It includes admin endpoints for reviewing and managing verification requests, as well as user endpoints for checking status and resubmitting documents.

**Base URL:** `/api/verification`

---

## Table of Contents
1. [Admin Endpoints](#admin-endpoints)
2. [Customer Endpoints](#customer-endpoints)
3. [Provider Endpoints](#provider-endpoints)
4. [Response Formats](#response-formats)
5. [Verification Status Flow](#verification-status-flow)
6. [Email Notifications](#email-notifications)

---

## Admin Endpoints

### 1. Get All Pending Verification Requests

Retrieve all pending verification requests for customers and/or providers.

**Endpoint:** `GET /api/verification/admin/pending`

**Authentication:** Required (Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | `all` | Filter by type: `customer`, `provider`, or `all` |

**Request Example:**
```http
GET /api/verification/admin/pending?type=customer
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pending verifications fetched successfully",
  "data": {
    "customers": [
      {
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone_number": "+1234567890",
        "profile_photo": "https://cloudinary.com/profile1.jpg",
        "valid_id": "https://cloudinary.com/id1.jpg",
        "user_location": "New York, NY",
        "verification_status": "pending",
        "verification_submitted_at": "2025-10-01T10:30:00.000Z",
        "created_at": "2025-09-15T08:20:00.000Z",
        "rejection_reason": null
      }
    ],
    "providers": [
      {
        "provider_id": 5,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane.smith@example.com",
        "provider_phone_number": "+0987654321",
        "provider_profile_photo": "https://cloudinary.com/provider5.jpg",
        "provider_valid_id": "https://cloudinary.com/provider_id5.jpg",
        "provider_location": "Los Angeles, CA",
        "verification_status": "pending",
        "verification_submitted_at": "2025-10-02T14:45:00.000Z",
        "created_at": "2025-09-20T11:00:00.000Z",
        "rejection_reason": null,
        "provider_certificates": [
          {
            "certificate_id": 1,
            "certificate_image": "https://cloudinary.com/cert1.jpg",
            "created_at": "2025-09-20T11:30:00.000Z"
          }
        ]
      }
    ],
    "total": {
      "customers": 1,
      "providers": 1
    }
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Failed to fetch pending verifications",
  "error": "Error details"
}
```

---

### 2. Approve Customer Verification

Approve a customer's verification request.

**Endpoint:** `POST /api/verification/admin/customer/:user_id/approve`

**Authentication:** Required (Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | integer | Yes | The customer's user ID |

**Request Example:**
```http
POST /api/verification/admin/customer/1/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer verification approved successfully",
  "data": {
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "is_verified": true,
    "verification_status": "approved",
    "verification_reviewed_at": "2025-10-03T09:15:00.000Z",
    "rejection_reason": null
  }
}
```

**Error Responses:**

**404 - Customer Not Found:**
```json
{
  "success": false,
  "message": "Customer not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to approve verification",
  "error": "Error details"
}
```

**Email Notification:** An approval email is automatically sent to the customer upon successful approval.

---

### 3. Approve Provider Verification

Approve a service provider's verification request.

**Endpoint:** `POST /api/verification/admin/provider/:provider_id/approve`

**Authentication:** Required (Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>"
}
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider_id` | integer | Yes | The provider's ID |

**Request Example:**
```http
POST /api/verification/admin/provider/5/approve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Provider verification approved successfully",
  "data": {
    "provider_id": 5,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane.smith@example.com",
    "provider_isVerified": true,
    "verification_status": "approved",
    "verification_reviewed_at": "2025-10-03T09:20:00.000Z",
    "rejection_reason": null
  }
}
```

**Error Responses:**

**404 - Provider Not Found:**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to approve verification",
  "error": "Error details"
}
```

**Email Notification:** An approval email is automatically sent to the provider upon successful approval.

---

### 4. Reject Customer Verification

Reject a customer's verification request with a reason.

**Endpoint:** `POST /api/verification/admin/customer/:user_id/reject`

**Authentication:** Required (Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | integer | Yes | The customer's user ID |

**Request Body:**
```json
{
  "rejection_reason": "The ID photo is blurry. Please upload a clear, high-resolution image."
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rejection_reason` | string | Yes | Detailed reason for rejection |

**Request Example:**
```http
POST /api/verification/admin/customer/1/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "rejection_reason": "The ID photo is blurry. Please upload a clear, high-resolution image."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Customer verification rejected successfully",
  "data": {
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "The ID photo is blurry. Please upload a clear, high-resolution image.",
    "verification_reviewed_at": "2025-10-03T09:25:00.000Z"
  }
}
```

**Error Responses:**

**400 - Missing Rejection Reason:**
```json
{
  "success": false,
  "message": "Rejection reason is required"
}
```

**404 - Customer Not Found:**
```json
{
  "success": false,
  "message": "Customer not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to reject verification",
  "error": "Error details"
}
```

**Email Notification:** A rejection email with the reason is automatically sent to the customer.

---

### 5. Reject Provider Verification

Reject a provider's verification request with a reason.

**Endpoint:** `POST /api/verification/admin/provider/:provider_id/reject`

**Authentication:** Required (Admin)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider_id` | integer | Yes | The provider's ID |

**Request Body:**
```json
{
  "rejection_reason": "The certificate images are not legible. Please upload clear copies of your professional certifications."
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rejection_reason` | string | Yes | Detailed reason for rejection |

**Request Example:**
```http
POST /api/verification/admin/provider/5/reject
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "rejection_reason": "The certificate images are not legible. Please upload clear copies of your professional certifications."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Provider verification rejected successfully",
  "data": {
    "provider_id": 5,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane.smith@example.com",
    "provider_isVerified": false,
    "verification_status": "rejected",
    "rejection_reason": "The certificate images are not legible. Please upload clear copies of your professional certifications.",
    "verification_reviewed_at": "2025-10-03T09:30:00.000Z"
  }
}
```

**Error Responses:**

**400 - Missing Rejection Reason:**
```json
{
  "success": false,
  "message": "Rejection reason is required"
}
```

**404 - Provider Not Found:**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to reject verification",
  "error": "Error details"
}
```

**Email Notification:** A rejection email with the reason is automatically sent to the provider.

---

## Customer Endpoints

### 6. Get Customer Verification Status

Get the verification status of the authenticated customer.

**Endpoint:** `GET /api/verification/customer/status`

**Authentication:** Required (Customer)

**Headers:**
```json
{
  "Authorization": "Bearer <customer_token>"
}
```

**Request Example:**
```http
GET /api/verification/customer/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "The ID photo is blurry. Please upload a clear, high-resolution image.",
    "verification_submitted_at": "2025-10-01T10:30:00.000Z",
    "verification_reviewed_at": "2025-10-03T09:25:00.000Z",
    "valid_id": "https://cloudinary.com/id1.jpg",
    "profile_photo": "https://cloudinary.com/profile1.jpg"
  }
}
```

**Error Responses:**

**404 - Customer Not Found:**
```json
{
  "success": false,
  "message": "Customer not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to get verification status",
  "error": "Error details"
}
```

---

### 7. Re-submit Customer Verification

Re-submit verification documents after rejection.

**Endpoint:** `POST /api/verification/customer/resubmit`

**Authentication:** Required (Customer)

**Headers:**
```json
{
  "Authorization": "Bearer <customer_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "valid_id_url": "https://cloudinary.com/new_id_photo.jpg"
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `valid_id_url` | string | Yes | Cloudinary URL of the new valid ID image |

**Request Example:**
```http
POST /api/verification/customer/resubmit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "valid_id_url": "https://cloudinary.com/new_id_photo.jpg"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "user_id": 1,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-03T10:00:00.000Z"
  }
}
```

**Error Responses:**

**400 - Missing Valid ID:**
```json
{
  "success": false,
  "message": "Valid ID image is required"
}
```

**400 - Already Verified:**
```json
{
  "success": false,
  "message": "Your account is already verified"
}
```

**404 - Customer Not Found:**
```json
{
  "success": false,
  "message": "Customer not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to resubmit verification",
  "error": "Error details"
}
```

---

## Provider Endpoints

### 8. Get Provider Verification Status

Get the verification status of the authenticated provider.

**Endpoint:** `GET /api/verification/provider/status`

**Authentication:** Required (Provider)

**Headers:**
```json
{
  "Authorization": "Bearer <provider_token>"
}
```

**Request Example:**
```http
GET /api/verification/provider/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "provider_id": 5,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_email": "jane.smith@example.com",
    "provider_isVerified": false,
    "verification_status": "rejected",
    "rejection_reason": "The certificate images are not legible. Please upload clear copies of your professional certifications.",
    "verification_submitted_at": "2025-10-02T14:45:00.000Z",
    "verification_reviewed_at": "2025-10-03T09:30:00.000Z",
    "provider_valid_id": "https://cloudinary.com/provider_id5.jpg",
    "provider_profile_photo": "https://cloudinary.com/provider5.jpg",
    "provider_certificates": [
      {
        "certificate_id": 1,
        "certificate_image": "https://cloudinary.com/cert1.jpg",
        "created_at": "2025-09-20T11:30:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**

**404 - Provider Not Found:**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to get verification status",
  "error": "Error details"
}
```

---

### 9. Re-submit Provider Verification

Re-submit verification documents after rejection.

**Endpoint:** `POST /api/verification/provider/resubmit`

**Authentication:** Required (Provider)

**Headers:**
```json
{
  "Authorization": "Bearer <provider_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "valid_id_url": "https://cloudinary.com/new_provider_id.jpg",
  "certificate_urls": [
    "https://cloudinary.com/new_cert1.jpg",
    "https://cloudinary.com/new_cert2.jpg"
  ]
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `valid_id_url` | string | Yes | Cloudinary URL of the new valid ID image |
| `certificate_urls` | string[] | No | Array of Cloudinary URLs for certificate images |

**Request Example:**
```http
POST /api/verification/provider/resubmit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "valid_id_url": "https://cloudinary.com/new_provider_id.jpg",
  "certificate_urls": [
    "https://cloudinary.com/new_cert1.jpg",
    "https://cloudinary.com/new_cert2.jpg"
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "provider_id": 5,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-03T10:15:00.000Z"
  }
}
```

**Error Responses:**

**400 - Missing Valid ID:**
```json
{
  "success": false,
  "message": "Valid ID image is required"
}
```

**400 - Already Verified:**
```json
{
  "success": false,
  "message": "Your account is already verified"
}
```

**404 - Provider Not Found:**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "Failed to resubmit verification",
  "error": "Error details"
}
```

**Note:** When `certificate_urls` is provided, all old certificates are deleted and replaced with the new ones.

---

## Response Formats

### Success Response Structure
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* Response data */ }
}
```

### Error Response Structure
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (optional)"
}
```

---

## Verification Status Flow

### Status Values
- **`pending`**: Verification documents submitted and awaiting admin review
- **`approved`**: Verification approved by admin
- **`rejected`**: Verification rejected by admin (with reason)
- **`null`/not set: User hasn't submitted verification documents yet

### Flow Diagram
```
Initial State (null/unverified)
         ↓
User submits documents → verification_status: "pending"
         ↓
Admin reviews
         ↓
    ┌────┴────┐
    ↓         ↓
Approved    Rejected (with reason)
    ↓         ↓
verified    User resubmits → back to "pending"
```

### Field Updates by Action

| Action | is_verified/provider_isVerified | verification_status | rejection_reason | verification_reviewed_at |
|--------|--------------------------------|---------------------|------------------|--------------------------|
| Submit | false | pending | null | null |
| Approve | true | approved | null | current timestamp |
| Reject | false | rejected | admin's reason | current timestamp |
| Resubmit | false | pending | null | null |

---

## Email Notifications

### Approval Email (Customer)
**Subject:** ✅ Your Fixmo Account Has Been Verified!

**Content Includes:**
- Congratulatory message
- Benefits of verified account
- Next steps for using the platform

### Approval Email (Provider)
**Subject:** ✅ Your Fixmo Provider Account Has Been Verified!

**Content Includes:**
- Congratulatory message
- Provider-specific benefits
- Next steps for creating listings and accepting bookings

### Rejection Email (Customer)
**Subject:** ⚠️ Fixmo Account Verification Update Required

**Content Includes:**
- Friendly notification message
- Detailed rejection reason
- Step-by-step instructions for resubmission
- Support contact information

### Rejection Email (Provider)
**Subject:** ⚠️ Fixmo Provider Verification Update Required

**Content Includes:**
- Friendly notification message
- Detailed rejection reason
- Step-by-step instructions for resubmission (including certificates)
- Support contact information

**Note:** Email sending failures are logged but do not cause the verification action to fail. The database is always updated regardless of email status.

---

## Authentication Requirements

### Admin Routes
All admin routes require:
- Valid admin authentication token in `Authorization` header
- Admin middleware validates the token and sets `req.adminId`

### Customer Routes
All customer routes require:
- Valid customer authentication token in `Authorization` header
- Auth middleware validates the token and sets `req.userId`

### Provider Routes
All provider routes require:
- Valid provider authentication token in `Authorization` header
- Auth middleware validates the token and sets `req.userId`

---

## Best Practices

### For Admins
1. **Review Promptly**: Check pending verifications regularly (within 24-48 hours)
2. **Be Specific**: Provide clear, actionable rejection reasons
3. **Verify Authenticity**: Check ID documents thoroughly before approval
4. **Check Certificates**: For providers, verify professional certifications are valid and relevant

### For Users (Customers/Providers)
1. **Upload Clear Images**: Ensure ID photos and certificates are high-resolution and legible
2. **Check Status**: Use status endpoints to monitor verification progress
3. **Address Feedback**: If rejected, carefully read the rejection reason and address all concerns
4. **Wait for Review**: Allow 24-48 hours for admin review after submission

### For Developers
1. **Handle Errors**: Always handle potential error responses
2. **Validate Uploads**: Validate image URLs from Cloudinary before submission
3. **Token Management**: Ensure tokens are properly stored and refreshed
4. **UI Feedback**: Display verification status clearly in the user interface

---

## Error Handling

### Common HTTP Status Codes
- **200**: Success
- **400**: Bad Request (missing or invalid parameters)
- **404**: Resource Not Found (user/provider not found)
- **500**: Internal Server Error

### Handling 401 Unauthorized
If you receive a 401 error, the authentication token is invalid or expired:
1. Refresh the token
2. If refresh fails, redirect to login

### Handling 500 Errors
Server errors are logged with details. If persistent:
1. Check the error message in the response
2. Verify all required fields are provided
3. Contact support if the issue persists

---

## Testing Examples

### Postman/Insomnia Collection
Import these examples into your API testing tool:

#### Get Pending Verifications
```
GET {{base_url}}/api/verification/admin/pending?type=all
Authorization: Bearer {{admin_token}}
```

#### Approve Customer
```
POST {{base_url}}/api/verification/admin/customer/1/approve
Authorization: Bearer {{admin_token}}
```

#### Reject Provider
```
POST {{base_url}}/api/verification/admin/provider/5/reject
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "rejection_reason": "Certificate is expired. Please upload a current, valid certificate."
}
```

#### Check Customer Status
```
GET {{base_url}}/api/verification/customer/status
Authorization: Bearer {{customer_token}}
```

#### Resubmit Customer Verification
```
POST {{base_url}}/api/verification/customer/resubmit
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "valid_id_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456/valid_id.jpg"
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-03 | Initial documentation |

---

## Support

For questions or issues with the Verification API, please contact:
- **Technical Support**: support@fixmo.com
- **Admin Support**: admin@fixmo.com

---

## Related Documentation

- [Authentication API Documentation](AUTHENTICATION_DOCUMENTATION_SUMMARY.md)
- [Verification System Summary](VERIFICATION_SYSTEM_SUMMARY.md)
- [Verification Testing Guide](VERIFICATION_TESTING_GUIDE.md)
- [Email System Documentation](EMAIL_SYSTEM_DOCUMENTATION.md)
