# 🌟 Rating API Documentation - Fixmo Backend

## Overview
This API allows customers to rate service providers based on completed appointments. It includes star ratings (1-5), text reviews, and optional photo uploads for review proof.

## Base URL
```
http://localhost:3000/api/ratings
```

## Authentication
All endpoints require JWT authentication with `Bearer` token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 API Endpoints

### 1. Get Rateable Appointments
**GET** `/rateable-appointments`

Get all completed appointments that a customer can rate.

**Headers:**
- `Authorization: Bearer <customer_jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "Rateable appointments retrieved successfully",
  "appointments": [
    {
      "appointment_id": 1,
      "provider_id": 2,
      "scheduled_date": "2025-08-30T14:00:00.000Z",
      "service_title": "Plumbing Repair",
      "provider_name": "John Doe",
      "final_price": 150.00
    }
  ]
}
```

---

### 2. Create Rating
**POST** `/create`

Create a new rating for a service provider.

**Headers:**
- `Authorization: Bearer <customer_jwt_token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `appointment_id` (required): ID of the completed appointment
- `provider_id` (required): ID of the service provider
- `rating_value` (required): Star rating from 1-5
- `rating_comment` (optional): Text review
- `rating_photo` (optional): Photo file (max 3MB, images only)

**Example Request:**
```javascript
const formData = new FormData();
formData.append('appointment_id', '1');
formData.append('provider_id', '2');
formData.append('rating_value', '5');
formData.append('rating_comment', 'Excellent service!');
formData.append('rating_photo', photoFile); // File object

fetch('/api/ratings/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_token_here'
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "Rating created successfully",
  "rating": {
    "id": 1,
    "rating_value": 5,
    "rating_comment": "Excellent service!",
    "rating_photo": "uploads/rating-photos/rating_1693456789123-987654321.jpg",
    "appointment_id": 1,
    "user_id": 1,
    "provider_id": 2,
    "rated_by": "customer",
    "created_at": "2025-09-01T12:00:00.000Z"
  }
}
```

---

### 3. Update Rating
**PUT** `/update/:ratingId`

Update an existing rating.

**Headers:**
- `Authorization: Bearer <customer_jwt_token>`
- `Content-Type: multipart/form-data`

**Parameters:**
- `ratingId`: ID of the rating to update

**Form Data:** (same as create rating)

**Response:**
```json
{
  "success": true,
  "message": "Rating updated successfully",
  "rating": {
    "id": 1,
    "rating_value": 4,
    "rating_comment": "Updated review",
    "rating_photo": "uploads/rating-photos/rating_1693456789123-987654321.jpg",
    "created_at": "2025-09-01T12:00:00.000Z"
  }
}
```

---

### 4. Delete Rating
**DELETE** `/delete/:ratingId`

Delete a rating (only by the customer who created it).

**Headers:**
- `Authorization: Bearer <customer_jwt_token>`

**Parameters:**
- `ratingId`: ID of the rating to delete

**Response:**
```json
{
  "success": true,
  "message": "Rating deleted successfully"
}
```

---

### 5. Get Customer Ratings
**GET** `/customer/:customerId`

Get all ratings made by a specific customer.

**Headers:**
- `Authorization: Bearer <customer_jwt_token>`

**Parameters:**
- `customerId`: ID of the customer

**Response:**
```json
{
  "success": true,
  "message": "Customer ratings retrieved successfully",
  "ratings": [
    {
      "id": 1,
      "rating_value": 5,
      "rating_comment": "Excellent service!",
      "rating_photo": "uploads/rating-photos/rating_1693456789123-987654321.jpg",
      "created_at": "2025-09-01T12:00:00.000Z",
      "appointment": {
        "appointment_id": 1,
        "scheduled_date": "2025-08-30T14:00:00.000Z"
      },
      "serviceProvider": {
        "provider_id": 2,
        "provider_first_name": "John",
        "provider_last_name": "Doe"
      }
    }
  ]
}
```

---

### 6. Get Provider Ratings
**GET** `/provider/:providerId`

Get all ratings for a specific service provider (public endpoint).

**Parameters:**
- `providerId`: ID of the service provider

**Response:**
```json
{
  "success": true,
  "message": "Provider ratings retrieved successfully",
  "ratings": [
    {
      "id": 1,
      "rating_value": 5,
      "rating_comment": "Excellent service!",
      "rating_photo": "uploads/rating-photos/rating_1693456789123-987654321.jpg",
      "created_at": "2025-09-01T12:00:00.000Z",
      "user": {
        "user_id": 1,
        "first_name": "Jane",
        "last_name": "Smith"
      }
    }
  ],
  "averageRating": 4.8,
  "totalRatings": 15
}
```

---

## 🧪 Test Endpoints

### Test Customer Ratings
**GET** `/test/customer-ratings`

Get current authenticated customer's ratings.

**Headers:**
- `Authorization: Bearer <customer_jwt_token>`

### Quick Test Rating
**POST** `/test/quick-rating`

Quick endpoint for testing rating creation.

**Headers:**
- `Authorization: Bearer <customer_jwt_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "appointment_id": 1,
  "provider_id": 2,
  "rating_value": 5,
  "rating_comment": "Test rating"
}
```

---

## 📱 React Native Integration

### Example React Native Code

```javascript
// Create rating with photo
const createRating = async (appointmentId, providerId, rating, comment, photo) => {
  const formData = new FormData();
  formData.append('appointment_id', appointmentId.toString());
  formData.append('provider_id', providerId.toString());
  formData.append('rating_value', rating.toString());
  formData.append('rating_comment', comment);
  
  if (photo) {
    formData.append('rating_photo', {
      uri: photo.uri,
      type: photo.type,
      name: photo.fileName || 'rating_photo.jpg'
    });
  }

  try {
    const response = await fetch('http://your-server:3000/api/ratings/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Rating creation error:', error);
    throw error;
  }
};

// Get rateable appointments
const getRateableAppointments = async () => {
  try {
    const response = await fetch('http://your-server:3000/api/ratings/rateable-appointments', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get appointments error:', error);
    throw error;
  }
};
```

---

## 🛠️ Testing

### 1. Web Test Interface
Visit: `http://localhost:3000/rating-test`

### 2. Manual API Testing
Use tools like Postman or curl:

```bash
# Get rateable appointments
curl -X GET http://localhost:3000/api/ratings/rateable-appointments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create rating
curl -X POST http://localhost:3000/api/ratings/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "appointment_id=1" \
  -F "provider_id=2" \
  -F "rating_value=5" \
  -F "rating_comment=Great service!" \
  -F "rating_photo=@/path/to/photo.jpg"
```

---

## 📝 Database Schema

The rating system uses the `Rating` table with the following structure:

```sql
model Rating {
  id              Int                    @id @default(autoincrement())
  rating_value    Int                    // 1-5 stars
  rating_comment  String?                // Optional text review
  rating_photo    String?                // Path to uploaded photo
  appointment_id  Int                    // Related appointment
  user_id         Int                    // Customer who rated
  provider_id     Int                    // Provider being rated
  rated_by        String                 // 'customer' or 'provider'
  created_at      DateTime               @default(now())
  
  // Relations
  appointment     Appointment            @relation(fields: [appointment_id], references: [appointment_id])
  serviceProvider ServiceProviderDetails @relation(fields: [provider_id], references: [provider_id])
  user            User                   @relation(fields: [user_id], references: [user_id])
}
```

---

## 🔧 Configuration

### Environment Variables
Make sure your `.env` file has:
```
DATABASE_URL="postgresql://postgres:1234@localhost:5432/NodeJsTutorial?schema=public"
JWT_SECRET=super_secret_fixmo_key_123
```

### File Upload Settings
- **Location**: `uploads/rating-photos/`
- **Max Size**: 3MB
- **Allowed Types**: Images only (jpg, png, gif, etc.)
- **Naming**: `rating_[timestamp]-[random].jpg`

---

## ⚠️ Important Notes

1. **Authentication**: All endpoints require valid customer JWT tokens
2. **Permissions**: Customers can only rate their own completed appointments
3. **File Security**: Uploaded photos are validated and stored securely
4. **Database**: Uses Prisma ORM with PostgreSQL
5. **Testing**: Ready for React Native integration

This rating system is production-ready and optimized for mobile app integration! 🚀
