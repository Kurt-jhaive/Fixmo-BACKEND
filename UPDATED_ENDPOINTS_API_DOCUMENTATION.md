# Updated Endpoints API Documentation

## Overview
This document provides detailed documentation for the endpoints that have been updated to support multiple photos for service listings and profession management for provider registration.

## Authentication
All endpoints require JWT authentication unless specified otherwise. Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Provider Registration with Professions

### Endpoint
```
POST /auth/provider-verify-register
```

### Description
Register a new service provider with profession and experience information.

### Content-Type
```
multipart/form-data
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userName` | string | Yes | Unique username for the provider |
| `email` | string | Yes | Provider's email address |
| `phoneNumber` | string | Yes | Provider's phone number |
| `password` | string | Yes | Account password |
| `name` | string | Yes | Provider's full name |
| `birthday` | string | Yes | Provider's birthday (YYYY-MM-DD) |
| `address` | string | Yes | Provider's address |
| `exact_longitude` | number | Yes | GPS longitude coordinate |
| `exact_latitude` | number | Yes | GPS latitude coordinate |
| `professions` | array[string] | No | Array of profession names |
| `experiences` | array[string] | No | Array of experience descriptions (must match professions array length) |
| `idFile` | file | Yes | Government ID file (image) |
| `profilePhoto` | file | Yes | Profile photo file |

### Example Request
```javascript
const formData = new FormData();
formData.append('userName', 'john_electrician');
formData.append('email', 'john@example.com');
formData.append('phoneNumber', '+639123456789');
formData.append('password', 'securePassword123');
formData.append('name', 'John Smith');
formData.append('birthday', '1990-05-15');
formData.append('address', '123 Main St, Manila');
formData.append('exact_longitude', '121.0244');
formData.append('exact_latitude', '14.5995');
formData.append('professions', JSON.stringify(['Electrician', 'Plumber']));
formData.append('experiences', JSON.stringify(['5 years electrical work', '2 years plumbing']));
formData.append('idFile', idFileBlob);
formData.append('profilePhoto', profilePhotoBlob);
```

### Success Response (201)
```json
{
  "message": "Provider registration successful. Please wait for admin verification.",
  "provider": {
    "id": 123,
    "userName": "john_electrician",
    "email": "john@example.com",
    "name": "John Smith",
    "status": "pending",
    "professions": [
      {
        "id": 1,
        "profession": "Electrician",
        "experience": "5 years electrical work"
      },
      {
        "id": 2,
        "profession": "Plumber",
        "experience": "2 years plumbing"
      }
    ]
  }
}
```

---

## 2. Create Service Listing with Multiple Photos

### Endpoint
```
POST /api/services/services
```

### Description
Create a new service listing with support for up to 5 photos.

### Content-Type
```
multipart/form-data
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `service_title` | string | Yes | Title of the service |
| `service_description` | string | Yes | Detailed description of the service |
| `service_startingprice` | number | Yes | Starting price for the service |
| `category_id` | integer | Yes | Service category ID |
| `service_photos` | array[file] | No | Up to 5 service photos (JPG/PNG, max 5MB each) |

### Example Request
```javascript
const formData = new FormData();
formData.append('service_title', 'Professional Home Cleaning');
formData.append('service_description', 'Complete home cleaning service including all rooms');
formData.append('service_startingprice', '500');
formData.append('category_id', '2');

// Add up to 5 photos
for (let i = 0; i < photoFiles.length && i < 5; i++) {
  formData.append('service_photos', photoFiles[i]);
}
```

### Success Response (201)
```json
{
  "success": true,
  "message": "Service created successfully with 3 photos uploaded",
  "service": {
    "id": 456,
    "service_title": "Professional Home Cleaning",
    "service_description": "Complete home cleaning service including all rooms",
    "service_startingprice": 500,
    "category_id": 2,
    "provider_id": 123,
    "photos_uploaded": 3,
    "service_photos": [
      {
        "id": 1,
        "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_0.jpg",
        "uploadedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "id": 2,
        "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_1.jpg",
        "uploadedAt": "2025-01-15T10:30:00.000Z"
      },
      {
        "id": 3,
        "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_2.jpg",
        "uploadedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### Error Response (400) - Too Many Photos
```json
{
  "success": false,
  "message": "Maximum 5 photos allowed per service"
}
```

---

## 3. Get Provider Services (Updated)

### Endpoint
```
GET /api/services/services
```

### Description
Retrieve all services for the authenticated provider with multiple photos support.

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "listing_id": 456,
      "service_id": 456,
      "service_name": "Professional Home Cleaning",
      "service_title": "Professional Home Cleaning",
      "description": "Complete home cleaning service including all rooms",
      "service_description": "Complete home cleaning service including all rooms",
      "price": 500.00,
      "service_startingprice": 500.00,
      "price_per_hour": 500.00,
      "provider_id": 123,
      "is_available": true,
      "status": "active",
      "category_name": "Cleaning",
      "service_photos": [
        {
          "id": 1,
          "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_0.jpg",
          "uploadedAt": "2025-01-15T10:30:00.000Z"
        },
        {
          "id": 2,
          "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_1.jpg",
          "uploadedAt": "2025-01-15T10:30:00.000Z"
        }
      ]
    }
  ],
  "totalServices": 1
}
```

---

## 4. Get Service Listings for Date (Customer View - Updated)

### Endpoint
```
GET /auth/service-listings/:date
```

### Description
Get all available service listings for a specific date with multiple photos support.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | Yes | Date in YYYY-MM-DD format |

### Example Request
```
GET /auth/service-listings/2025-01-15
```

### Success Response (200)
```json
{
  "message": "Service listings for 2025-01-15 (Wednesday) retrieved successfully",
  "listings": [
    {
      "id": 456,
      "title": "Professional Home Cleaning",
      "description": "Complete home cleaning service including all rooms",
      "startingPrice": 500,
      "service_photos": [
        {
          "id": 1,
          "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_0.jpg",
          "uploadedAt": "2025-01-15T10:30:00.000Z"
        },
        {
          "id": 2,
          "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_1.jpg",
          "uploadedAt": "2025-01-15T10:30:00.000Z"
        }
      ],
      "provider": {
        "id": 123,
        "name": "John Smith",
        "userName": "john_electrician",
        "rating": 4.5,
        "location": "Manila, Philippines",
        "profilePhoto": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/profiles/profile_123.jpg"
      },
      "categories": [
        {
          "category_id": 2,
          "category_name": "Cleaning"
        }
      ]
    }
  ]
}
```

---

## 5. Get All Service Listings (Customer View - Updated)

### Endpoint
```
GET /auth/service-listings
```

### Description
Get all available service listings with multiple photos support.

### Success Response (200)
```json
{
  "message": "All service listings retrieved successfully",
  "listings": [
    {
      "id": 456,
      "title": "Professional Home Cleaning",
      "description": "Complete home cleaning service including all rooms",
      "startingPrice": 500,
      "service_photos": [
        {
          "id": 1,
          "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_456_0.jpg",
          "uploadedAt": "2025-01-15T10:30:00.000Z"
        }
      ],
      "provider": {
        "id": 123,
        "name": "John Smith",
        "userName": "john_electrician",
        "rating": 4.8,
        "location": "Manila, Philippines",
        "profilePhoto": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/profiles/profile_123.jpg"
      },
      "categories": [
        {
          "category_id": 2,
          "category_name": "Cleaning"
        }
      ]
    }
  ]
}
```

---

## Key Changes Summary

### 1. Multiple Photos Support
- **Previous**: Single `service_picture` field
- **Current**: `service_photos` array with up to 5 photos
- **Storage**: Cloudinary with organized naming (service_ID_index.jpg)

### 2. Provider Professions
- **New**: `professions` and `experiences` arrays in provider registration
- **Storage**: Separate `ProviderProfession` table with relationships

### 3. Enhanced Response Data
- All service listing endpoints now return `service_photos` arrays
- Each photo includes `id`, `imageUrl`, and `uploadedAt` fields
- Provider registration returns profession data in response

### 4. File Upload Limits
- Maximum 5 photos per service listing
- Maximum 5MB per photo file
- Supported formats: JPG, PNG
- Automatic validation and error handling

---

## 6. Get Service Categories (Public)

### Endpoint
```
GET /api/services/categories
```

### Description
Get all available service categories for dropdown selection. This is a public endpoint that doesn't require authentication.

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "category_name": "Plumbing"
    },
    {
      "category_id": 2,
      "category_name": "Electrical"
    },
    {
      "category_id": 3,
      "category_name": "Cleaning"
    }
  ]
}
```

---

## 7. Get Service by ID

### Endpoint
```
GET /api/services/services/{serviceId}
```

### Description
Get a specific service by ID for the authenticated provider.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceId` | integer | Yes | Service ID in the URL path |

### Example Request
```
GET /api/services/services/123
Authorization: Bearer <jwt_token>
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "service_id": 123,
    "service_title": "Professional Home Cleaning",
    "service_description": "Complete home cleaning service including all rooms",
    "service_startingprice": 500,
    "category_id": 2,
    "provider_id": 456,
    "servicelisting_isActive": true,
    "created_at": "2025-01-15T10:30:00.000Z",
    "service_photos": [
      {
        "id": 1,
        "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_123_0.jpg",
        "uploadedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "category": {
      "category_id": 2,
      "category_name": "Cleaning"
    }
  }
}
```

### Error Response (404)
```json
{
  "success": false,
  "message": "Service not found or access denied"
}
```

---

## 8. Update Service Listing

### Endpoint
```
PUT /api/services/services/{serviceId}
```

### Description
Update an existing service listing for the authenticated provider.

### Content-Type
```
application/json
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceId` | integer | Yes | Service ID in the URL path |
| `service_title` | string | Yes | Updated title of the service |
| `service_description` | string | Yes | Updated description of the service |
| `service_startingprice` | number | Yes | Updated starting price |
| `category_id` | integer | Yes | Updated service category ID |

### Example Request
```json
PUT /api/services/services/123
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "service_title": "Premium Home Cleaning Service",
  "service_description": "Professional deep cleaning service for homes and offices",
  "service_startingprice": 750,
  "category_id": 2
}
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "service_id": 123,
    "service_title": "Premium Home Cleaning Service",
    "service_description": "Professional deep cleaning service for homes and offices",
    "service_startingprice": 750,
    "category_id": 2,
    "provider_id": 456,
    "servicelisting_isActive": true,
    "service_photos": [
      {
        "id": 1,
        "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_123_0.jpg",
        "uploadedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "category": {
      "category_id": 2,
      "category_name": "Cleaning"
    }
  }
}
```

### Error Response (400)
```json
{
  "success": false,
  "message": "All fields are required (service_title, service_description, service_startingprice, category_id)."
}
```

---

## 9. Delete Service Listing

### Endpoint
```
DELETE /api/services/services/{serviceId}
```

### Description
Delete a service listing. This will also automatically delete all associated service photos.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceId` | integer | Yes | Service ID in the URL path |

### Example Request
```
DELETE /api/services/services/123
Authorization: Bearer <jwt_token>
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

### Error Response (404)
```json
{
  "success": false,
  "message": "Service not found or access denied"
}
```

---

## 10. Toggle Service Availability

### Endpoint
```
PATCH /api/services/services/{serviceId}/toggle
```

### Description
Toggle the availability status of a service listing (activate/deactivate).

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serviceId` | integer | Yes | Service ID in the URL path |

### Example Request
```
PATCH /api/services/services/123/toggle
Authorization: Bearer <jwt_token>
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Service activated successfully",
  "data": {
    "service_id": 123,
    "service_title": "Professional Home Cleaning",
    "service_description": "Complete home cleaning service including all rooms",
    "service_startingprice": 500,
    "servicelisting_isActive": true,
    "serviceProvider": {
      "provider_id": 456,
      "provider_first_name": "John",
      "provider_last_name": "Smith"
    },
    "category": {
      "category_id": 2,
      "category_name": "Cleaning"
    },
    "service_photos": [
      {
        "id": 1,
        "imageUrl": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/service-photos/service_123_0.jpg",
        "uploadedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 11. Get Provider Certificates

### Endpoint
```
GET /api/services/certificates
```

### Description
Get all certificates for the authenticated provider (for backward compatibility).

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "certificate_id": 1,
      "certificate_name": "Electrical Safety Certificate",
      "certificate_file_path": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/certificates/cert_1.pdf",
      "expiry_date": "2025-12-31T00:00:00.000Z"
    },
    {
      "certificate_id": 2,
      "certificate_name": "Plumbing License",
      "certificate_file_path": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/certificates/cert_2.pdf",
      "expiry_date": "2026-06-30T00:00:00.000Z"
    }
  ]
}
```

---

## 12. Get Certificate Services Mapping

### Endpoint
```
GET /api/services/certificate-services
```

### Description
Get certificate-service mappings from JSON file (for backward compatibility). This is a public endpoint.

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "category_name": "Plumbing",
      "required_certificates": ["Plumbing License", "Safety Certificate"]
    },
    {
      "category_id": 2,
      "category_name": "Electrical",
      "required_certificates": ["Electrical License", "Safety Certificate"]
    }
  ]
}
```

---

## Service Controller Endpoints Summary

### Public Endpoints (No Authentication)
- `GET /api/services/categories` - Get service categories
- `GET /api/services/certificate-services` - Get certificate mappings

### Protected Endpoints (Provider Authentication Required)
- `GET /api/services/services` - Get all provider services with photos
- `GET /api/services/services/{serviceId}` - Get specific service by ID
- `POST /api/services/services` - Create service with multiple photos (max 5)
- `PUT /api/services/services/{serviceId}` - Update service details
- `DELETE /api/services/services/{serviceId}` - Delete service and photos
- `PATCH /api/services/services/{serviceId}/toggle` - Toggle service availability
- `GET /api/services/certificates` - Get provider certificates

### Key Features
- **Multiple Photo Support**: Up to 5 photos per service with Cloudinary storage
- **Category Integration**: Direct category_id relationship with ServiceCategory
- **Availability Toggle**: Easy activation/deactivation of services
- **Data Validation**: Comprehensive input validation and error handling
- **Provider Security**: All operations restricted to service owner
- **Backward Compatibility**: Legacy certificate endpoints maintained

---

## 13. Get Provider Ratings

### Endpoint
```
GET /api/ratings/provider/{providerId}
```

### Description
Get all ratings for a specific provider with pagination and statistics.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `providerId` | integer | Yes | Provider ID in the URL path |
| `page` | integer | No | Page number for pagination (default: 1) |
| `limit` | integer | No | Number of ratings per page (default: 10) |

### Example Request
```
GET /api/ratings/provider/123?page=1&limit=5
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": 1,
        "rating_value": 5,
        "rating_comment": "Excellent service! Very professional and thorough.",
        "rating_photo": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/ratings/rating_1.jpg",
        "appointment_id": 456,
        "user_id": 789,
        "provider_id": 123,
        "rated_by": "customer",
        "created_at": "2025-01-15T14:30:00.000Z",
        "user": {
          "user_id": 789,
          "first_name": "John",
          "last_name": "Doe",
          "profile_photo": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/profiles/user_789.jpg"
        },
        "appointment": {
          "appointment_id": 456,
          "scheduled_date": "2025-01-10T09:00:00.000Z",
          "service": {
            "service_title": "Professional Home Cleaning"
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_ratings": 15,
      "has_next": true,
      "has_prev": false
    },
    "statistics": {
      "average_rating": 4.67,
      "total_ratings": 15,
      "rating_distribution": [
        { "star": 1, "count": 0 },
        { "star": 2, "count": 1 },
        { "star": 3, "count": 2 },
        { "star": 4, "count": 5 },
        { "star": 5, "count": 7 }
      ]
    }
  }
}
```

### Error Response (500)
```json
{
  "success": false,
  "message": "Internal server error while fetching ratings"
}
```

---

## 14. Get Provider Professions and Experience

### Endpoint
```
GET /api/service-providers/professions/{providerId}
```

### Description
Get profession and experience details for a specific service provider. This is a public endpoint that doesn't require authentication.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `providerId` | integer | Yes | Provider ID in the URL path |

### Example Request
```
GET /api/service-providers/professions/123
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Provider professions retrieved successfully",
  "data": {
    "provider_id": 123,
    "provider_name": "John Smith",
    "provider_email": "john@example.com",
    "provider_phone_number": "+639123456789",
    "provider_location": "Manila, Philippines",
    "provider_rating": 4.8,
    "provider_isVerified": true,
    "provider_profile_photo": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/provider-profiles/provider_123.jpg",
    "provider_member_since": "2025-01-10T08:30:00.000Z",
    "total_professions": 2,
    "professions": [
      {
        "id": 1,
        "profession": "Electrician",
        "experience": "5 years electrical work experience",
        "created_at": "2025-01-10T08:30:00.000Z"
      },
      {
        "id": 2,
        "profession": "Plumber",
        "experience": "2 years plumbing experience",
        "created_at": "2025-01-10T08:30:00.000Z"
      }
    ]
  }
}
```

### Error Response (404)
```json
{
  "success": false,
  "message": "Provider not found"
}
```

---

## 15. Get Provider Details (Own Profile)

### Endpoint
```
GET /api/service-providers/details
```

### Description
Get comprehensive details for the authenticated provider including professions, certificates, and recent services.

### Authentication Required
```
Authorization: Bearer <provider_jwt_token>
```

### Example Request
```
GET /api/service-providers/details
Authorization: Bearer <provider_jwt_token>
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Provider details retrieved successfully",
  "data": {
    "provider_id": 123,
    "provider_first_name": "John",
    "provider_last_name": "Smith",
    "provider_full_name": "John Smith",
    "provider_email": "john@example.com",
    "provider_phone_number": "+639123456789",
    "provider_userName": "john_electrician",
    "provider_birthday": "1990-05-15T00:00:00.000Z",
    "provider_location": "Manila, Philippines",
    "provider_exact_location": "Makati City, Metro Manila",
    "provider_uli": "ULI123456789",
    "provider_rating": 4.8,
    "provider_isVerified": true,
    "provider_isActivated": true,
    "provider_rejection_reason": null,
    "provider_profile_photo": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/provider-profiles/provider_123.jpg",
    "provider_valid_id": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/provider-ids/id_123.jpg",
    "created_at": "2025-01-10T08:30:00.000Z",
    "provider_member_since": "2025-01-10T08:30:00.000Z",
    "professions": [
      {
        "id": 1,
        "profession": "Electrician",
        "experience": "5 years electrical work experience",
        "created_at": "2025-01-10T08:30:00.000Z"
      },
      {
        "id": 2,
        "profession": "Plumber", 
        "experience": "2 years plumbing experience",
        "created_at": "2025-01-10T08:30:00.000Z"
      }
    ],
    "certificates": [
      {
        "certificate_id": 1,
        "certificate_name": "Electrical Safety Certificate",
        "certificate_number": "ESC-2024-001",
        "certificate_file_path": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/certificates/cert_1.pdf",
        "expiry_date": "2025-12-31T00:00:00.000Z",
        "status": "approved",
        "created_at": "2025-01-10T08:30:00.000Z"
      }
    ],
    "recent_services": [
      {
        "service_id": 456,
        "service_title": "Professional Home Electrical Work",
        "service_description": "Complete electrical installation and repair services",
        "service_startingprice": 750,
        "is_active": true,
        "created_at": "2025-01-15T10:30:00.000Z"
      }
    ],
    "total_professions": 2,
    "total_certificates": 1,
    "total_services": 5
  }
}
```

### Error Response (404)
```json
{
  "success": false,
  "message": "Provider not found"
}
```

---

## 16. Update Provider Details

### Endpoint
```
PUT /api/service-providers/details
```

### Description
Update provider details including basic information, photos, and professions for the authenticated provider.

### Content-Type
```
multipart/form-data
```

### Authentication Required
```
Authorization: Bearer <provider_jwt_token>
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_first_name` | string | No | Updated first name |
| `provider_last_name` | string | No | Updated last name |
| `provider_phone_number` | string | No | Updated phone number |
| `provider_birthday` | string | No | Updated birthday (YYYY-MM-DD) |
| `provider_location` | string | No | Updated location |
| `provider_exact_location` | string | No | Updated exact location |
| `professions` | array | No | Array of profession objects |
| `provider_profile_photo` | file | No | New profile photo (max 5MB) |
| `provider_valid_id` | file | No | New valid ID photo (max 5MB) |

### Professions Array Format
```json
[
  {
    "profession": "Electrician",
    "experience": "5 years electrical work experience"
  },
  {
    "profession": "Plumber",
    "experience": "2 years plumbing experience"
  }
]
```

### Example Request
```javascript
const formData = new FormData();
formData.append('provider_first_name', 'John');
formData.append('provider_last_name', 'Smith');
formData.append('provider_phone_number', '+639123456789');
formData.append('provider_location', 'Manila, Philippines');
formData.append('professions', JSON.stringify([
  {
    "profession": "Master Electrician",
    "experience": "8 years electrical work experience"
  },
  {
    "profession": "Plumber",
    "experience": "3 years plumbing experience"
  }
]));
// Optional: Add new photos
formData.append('provider_profile_photo', profilePhotoFile);
formData.append('provider_valid_id', validIdFile);
```

### Success Response (200)
```json
{
  "success": true,
  "message": "Provider details updated successfully",
  "data": {
    "provider_id": 123,
    "provider_first_name": "John",
    "provider_last_name": "Smith",
    "provider_full_name": "John Smith",
    "provider_email": "john@example.com",
    "provider_phone_number": "+639123456789",
    "provider_userName": "john_electrician",
    "provider_birthday": "1990-05-15T00:00:00.000Z",
    "provider_location": "Manila, Philippines",
    "provider_exact_location": "Makati City, Metro Manila",
    "provider_rating": 4.8,
    "provider_isVerified": true,
    "provider_profile_photo": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/provider-profiles/provider_123_updated.jpg",
    "provider_valid_id": "https://res.cloudinary.com/dgbtmbdla/image/upload/v1673123456/fixmo/provider-ids/id_123_updated.jpg",
    "professions": [
      {
        "id": 5,
        "profession": "Master Electrician",
        "experience": "8 years electrical work experience"
      },
      {
        "id": 6,
        "profession": "Plumber",
        "experience": "3 years plumbing experience"
      }
    ],
    "updated_at": "2025-01-20T14:30:00.000Z"
  }
}
```

### Error Response (400)
```json
{
  "success": false,
  "message": "Error uploading profile photo. Please try again."
}
```

### Error Response (404)
```json
{
  "success": false,
  "message": "Provider not found"
}
```

---

## Provider Management Endpoints Summary

### New Provider Endpoints
- `GET /api/service-providers/professions/{providerId}` - Get provider professions (public)
- `GET /api/service-providers/details` - Get own provider details (authenticated)
- `PUT /api/service-providers/details` - Update own provider details (authenticated)

### Key Features
- **Comprehensive Provider Data**: All provider information in one place
- **Profession Management**: Add, update, and remove professions with experience
- **Photo Updates**: Update profile photo and valid ID with Cloudinary storage
- **Transaction Safety**: Database transactions ensure data consistency
- **Public Access**: Provider professions viewable without authentication
- **File Upload Support**: Multipart form data with file validation

### Use Cases
1. **Provider Profile Management**: Complete provider profile editing
2. **Public Provider Info**: Display provider expertise to customers
3. **Skill Updates**: Keep provider professions and experience current
4. **Photo Management**: Update profile and verification photos
5. **Profile Verification**: Comprehensive provider information for admin review

---

## Error Codes

| Status | Description | Common Causes |
|--------|-------------|---------------|
| 400 | Bad Request | Invalid data, too many photos, missing required fields |
| 401 | Unauthorized | Missing or invalid JWT token |
| 413 | Payload Too Large | File size exceeds 5MB limit |
| 415 | Unsupported Media Type | Invalid file format (not JPG/PNG) |
| 500 | Internal Server Error | Server or database issues |

---

## Testing

Use the provided test script `test-updated-endpoints.js` to test all updated endpoints:

```bash
node test-updated-endpoints.js
```

The test script includes:
- Provider registration with professions
- Service creation with multiple photos
- Service retrieval verification
- Error handling validation