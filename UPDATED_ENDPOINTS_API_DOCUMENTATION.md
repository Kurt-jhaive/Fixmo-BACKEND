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