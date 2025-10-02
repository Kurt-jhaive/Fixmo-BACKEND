# Ratings API Documentation

## Overview
The Ratings API allows customers and providers to rate each other after completed appointments. The system supports photo uploads with ratings and provides comprehensive rating statistics and management features.

## Base URL
```
http://localhost:3000/api/ratings
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

## Enhanced Rating Detection

### Rating Status Fields
All appointment endpoints now include enhanced rating detection with simple boolean flags:

- **`is_rated`**: Main boolean flag indicating if the appointment is rated by customer (required rating)
- **`needs_rating`**: Boolean indicating if the appointment needs a customer rating
- **`rating_status`**: Detailed object with comprehensive rating information

### Example Rating Status Object
```json
{
  "rating_status": {
    "is_rated": true,
    "is_rated_by_customer": true,
    "is_rated_by_provider": false,
    "needs_rating": false,
    "customer_rating_value": 5,
    "provider_rating_value": null,
    "provider_rated_me": false
  }
}
```

## Table of Contents
1. [Appointment Rating Endpoints](#appointment-rating-endpoints)
2. [Customer Rating Endpoints](#customer-rating-endpoints)
3. [Provider Rating Endpoints](#provider-rating-endpoints)  
4. [Rating Management](#rating-management)
5. [Rating Statistics](#rating-statistics)
6. [Data Models](#data-models)
7. [Error Handling](#error-handling)
8. [Frontend Integration Examples](#frontend-integration-examples)

## Appointment Rating Endpoints

### 1. Get Appointments That Can Be Rated
Get appointments that can be rated (perfect for frontend rating prompts). Automatically loads all rateable appointments for the authenticated user.

```http
GET /api/appointments/can-rate?page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Note:** The endpoint automatically detects if you're a customer or provider from your JWT token and returns appropriate appointments.

**Response:**
```json
{
  "success": true,
  "message": "Appointments that can be rated retrieved successfully",
  "data": [
    {
      "appointment_id": 123,
      "appointment_status": "completed",
      "scheduled_date": "2025-09-25T14:00:00.000Z",
      "completed_at": "2025-09-25T16:30:00.000Z",
      "is_rated": false,
      "needs_rating": true,
      "rating_status": {
        "is_rated": false,
        "is_rated_by_customer": false,
        "is_rated_by_provider": true,
        "needs_rating": true,
        "customer_rating_value": null,
        "provider_rating_value": 4
      },
      "customer": {
        "user_id": 789,
        "first_name": "Jane",
        "last_name": "Smith",
        "profile_photo": "https://cloudinary.../profile.jpg"
      },
      "serviceProvider": {
        "provider_id": 456,
        "provider_first_name": "John",
        "provider_last_name": "Doe",
        "provider_profile_photo": "https://cloudinary.../provider.jpg"
      },
      "service": {
        "service_id": 101,
        "service_title": "AC Repair",
        "service_startingprice": 150.00
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_count": 1,
    "limit": 10,
    "has_next": false,
    "has_prev": false
  }
}
```

### 2. Check Appointment Rating Status
Check the rating status of a specific appointment.

```http
GET /api/appointments/{appointmentId}/rating-status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointment_id": 123,
    "appointment_status": "completed",
    "is_rated": true,
    "is_rated_by_customer": true,
    "is_rated_by_provider": false,
    "can_rate": false,
    "needs_rating": false,
    "rating_status": {
      "customer_rating": {
        "rating_id": 456,
        "rating_value": 5,
        "created_at": "2025-09-25T17:00:00.000Z"
      },
      "provider_rating": null
    }
  }
}
```

### Frontend Usage for Rating Prompts
```javascript
// Check if any appointments can be rated (automatically detects user type)
const checkForRatingPrompts = async () => {
  const response = await fetch('/api/appointments/can-rate', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.success && data.data.length > 0) {
    // Show rating prompt for each appointment
    data.data.forEach(appointment => {
      if (appointment.needs_rating) {
        showRatingPrompt(appointment);
      }
    });
  }
};

// Check specific appointment
const checkAppointmentRating = async (appointmentId) => {
  const response = await fetch(`/api/appointments/${appointmentId}/rating-status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  return data.data.needs_rating;
};
```

## Customer Rating Endpoints

### 1. Get Rateable Appointments (Customer)
Get appointments that the authenticated customer can rate.

```http
GET /api/ratings/rateable-appointments
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "appointment_id": 123,
        "scheduled_date": "2025-09-25T14:00:00.000Z",
        "appointment_status": "completed",
        "serviceProvider": {
          "provider_id": 456,
          "provider_first_name": "John",
          "provider_last_name": "Doe",
          "provider_profile_photo": "https://cloudinary.../profile.jpg"
        },
        "service": {
          "service_id": 789,
          "service_title": "Air Conditioning Repair",
          "service_startingprice": 150.00
        },
        "can_rate": true
      }
    ],
    "total_count": 5
  }
}
```

### 2. Create Customer Rating
Customer rates a service provider after completed appointment.

```http
POST /api/ratings/create
Content-Type: multipart/form-data
Authorization: Bearer <customer_token>
```

**Form Data:**
- `appointment_id` (required): Number
- `provider_id` (required): Number  
- `rating_value` (required): Number (1-5)
- `rating_comment` (optional): String
- `rating_photo` (optional): File (image, max 3MB)

**Example Request:**
```javascript
const formData = new FormData();
formData.append('appointment_id', '123');
formData.append('provider_id', '456');
formData.append('rating_value', '5');
formData.append('rating_comment', 'Excellent service! Very professional and fixed the issue quickly.');
formData.append('rating_photo', photoFile);

const response = await fetch('/api/ratings/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "Rating created successfully",
  "data": {
    "id": 789,
    "rating_value": 5,
    "rating_comment": "Excellent service! Very professional and fixed the issue quickly.",
    "rating_photo": "https://cloudinary.../rating_photo.jpg",
    "appointment_id": 123,
    "user_id": 101,
    "provider_id": 456,
    "rated_by": "customer",
    "created_at": "2025-09-30T10:00:00.000Z",
    "user": {
      "user_id": 101,
      "first_name": "Jane",
      "last_name": "Smith",
      "profile_photo": "https://cloudinary.../customer_profile.jpg"
    },
    "serviceProvider": {
      "provider_id": 456,
      "provider_first_name": "John",
      "provider_last_name": "Doe"
    },
    "appointment": {
      "appointment_id": 123,
      "scheduled_date": "2025-09-25T14:00:00.000Z",
      "service": {
        "service_title": "Air Conditioning Repair"
      }
    }
  }
}
```

### 3. Update Customer Rating
Update an existing rating created by the customer.

```http
PUT /api/ratings/update/{ratingId}
Content-Type: multipart/form-data
Authorization: Bearer <customer_token>
```

**Path Parameters:**
- `ratingId`: Rating ID to update

**Form Data:**
- `rating_value` (optional): Number (1-5)
- `rating_comment` (optional): String
- `rating_photo` (optional): File (image, max 3MB)

**Response:**
```json
{
  "success": true,
  "message": "Rating updated successfully",
  "data": {
    "id": 789,
    "rating_value": 4,
    "rating_comment": "Updated: Good service, minor issues but overall satisfied.",
    "rating_photo": "https://cloudinary.../updated_rating_photo.jpg",
    "updated_at": "2025-09-30T11:30:00.000Z"
  }
}
```

### 4. Delete Customer Rating
Delete a rating created by the customer.

```http
DELETE /api/ratings/delete/{ratingId}
Authorization: Bearer <customer_token>
```

**Path Parameters:**
- `ratingId`: Rating ID to delete

**Response:**
```json
{
  "success": true,
  "message": "Rating deleted successfully"
}
```

### 5. Get Customer's Given Ratings
Get all ratings that the customer has given to providers.

```http
GET /api/ratings/customer/{customerId}?page=1&limit=10
Authorization: Bearer <customer_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": 789,
        "rating_value": 5,
        "rating_comment": "Excellent service!",
        "rating_photo": "https://cloudinary.../rating_photo.jpg",
        "created_at": "2025-09-25T15:00:00.000Z",
        "serviceProvider": {
          "provider_id": 456,
          "provider_first_name": "John",
          "provider_last_name": "Doe",
          "provider_profile_photo": "https://cloudinary.../provider_profile.jpg"
        },
        "appointment": {
          "appointment_id": 123,
          "scheduled_date": "2025-09-25T14:00:00.000Z",
          "service": {
            "service_title": "Air Conditioning Repair"
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_ratings": 25,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## Provider Rating Endpoints

### 1. Get Provider Ratings
Get all ratings received by a specific provider (public endpoint).

```http
GET /api/ratings/provider/{providerId}?page=1&limit=10
```

**Path Parameters:**
- `providerId`: Provider ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": 789,
        "rating_value": 5,
        "rating_comment": "Excellent service! Very professional.",
        "rating_photo": "https://cloudinary.../rating_photo.jpg",
        "created_at": "2025-09-25T15:00:00.000Z",
        "user": {
          "user_id": 101,
          "first_name": "Jane",
          "last_name": "Smith",
          "profile_photo": "https://cloudinary.../customer_profile.jpg"
        },
        "appointment": {
          "appointment_id": 123,
          "scheduled_date": "2025-09-25T14:00:00.000Z",
          "service": {
            "service_title": "Air Conditioning Repair"
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 8,
      "total_ratings": 76,
      "has_next": true,
      "has_prev": false
    },
    "statistics": {
      "average_rating": 4.65,
      "total_ratings": 76,
      "rating_distribution": [
        {"star": 1, "count": 2},
        {"star": 2, "count": 3},
        {"star": 3, "count": 8},
        {"star": 4, "count": 23},
        {"star": 5, "count": 40}
      ]
    }
  }
}
```

### 2. Get Provider's Rateable Appointments
Get appointments where the provider can rate customers.

```http
GET /api/ratings/provider/rateable-appointments
Authorization: Bearer <provider_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "appointment_id": 123,
        "scheduled_date": "2025-09-25T14:00:00.000Z",
        "appointment_status": "finished",
        "customer": {
          "user_id": 101,
          "first_name": "Jane",
          "last_name": "Smith",
          "profile_photo": "https://cloudinary.../customer_profile.jpg"
        },
        "service": {
          "service_id": 789,
          "service_title": "Air Conditioning Repair"
        },
        "can_rate": true
      }
    ],
    "total_count": 3
  }
}
```

### 3. Provider Rate Customer
Provider rates a customer after completed appointment.

```http
POST /api/ratings/provider/rate-customer
Content-Type: multipart/form-data
Authorization: Bearer <provider_token>
```

**Form Data:**
- `appointment_id` (required): Number
- `customer_id` (required): Number
- `rating_value` (required): Number (1-5)
- `rating_comment` (optional): String
- `rating_photo` (optional): File (image, max 3MB)

**Response:**
```json
{
  "success": true,
  "message": "Rating created successfully for customer",
  "data": {
    "id": 790,
    "rating_value": 5,
    "rating_comment": "Great customer! Very cooperative and understanding.",
    "rating_photo": "https://cloudinary.../provider_rating_photo.jpg",
    "appointment_id": 123,
    "user_id": 101,
    "provider_id": 456,
    "rated_by": "provider",
    "created_at": "2025-09-30T10:30:00.000Z"
  }
}
```

### 4. Get Provider's Given Ratings
Get all ratings that the provider has given to customers.

```http
GET /api/ratings/provider/given-ratings?page=1&limit=10
Authorization: Bearer <provider_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": 790,
        "rating_value": 5,
        "rating_comment": "Great customer! Very cooperative.",
        "created_at": "2025-09-25T16:00:00.000Z",
        "user": {
          "user_id": 101,
          "first_name": "Jane",
          "last_name": "Smith",
          "profile_photo": "https://cloudinary.../customer_profile.jpg"
        },
        "appointment": {
          "appointment_id": 123,
          "scheduled_date": "2025-09-25T14:00:00.000Z",
          "service": {
            "service_title": "Air Conditioning Repair"
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_ratings": 15,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 5. Get Customer's Received Ratings
Get all ratings received by a specific customer from providers.

```http
GET /api/ratings/customer/{customerId}/received-ratings?page=1&limit=10
```

**Path Parameters:**
- `customerId`: Customer ID

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": 790,
        "rating_value": 5,
        "rating_comment": "Great customer! Very cooperative and understanding.",
        "rating_photo": "https://cloudinary.../provider_rating_photo.jpg",
        "created_at": "2025-09-25T16:00:00.000Z",
        "serviceProvider": {
          "provider_id": 456,
          "provider_first_name": "John",
          "provider_last_name": "Doe",
          "provider_profile_photo": "https://cloudinary.../provider_profile.jpg"
        },
        "appointment": {
          "appointment_id": 123,
          "scheduled_date": "2025-09-25T14:00:00.000Z",
          "service": {
            "service_title": "Air Conditioning Repair"
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_ratings": 8,
      "has_next": false,
      "has_prev": false
    },
    "statistics": {
      "average_rating": 4.75,
      "total_ratings": 8
    }
  }
}
```

## Rating Management

### Test Endpoints (Development)

#### Get Current Customer's Ratings
```http
GET /api/ratings/test/customer-ratings
Authorization: Bearer <customer_token>
```

#### Quick Rating Creation (Testing)
```http
POST /api/ratings/test/quick-rating
Content-Type: application/json
Authorization: Bearer <customer_token>

{
  "appointment_id": 123,
  "provider_id": 456,
  "rating_value": 5,
  "rating_comment": "Test rating"
}
```

## Data Models

### Rating Object
```typescript
interface Rating {
  id: number;
  rating_value: number; // 1-5 stars
  rating_comment?: string;
  rating_photo?: string; // Cloudinary URL
  appointment_id: number;
  user_id: number; // Customer ID
  provider_id: number;
  rated_by: 'customer' | 'provider';
  created_at: string; // ISO date
  updated_at: string; // ISO date
}
```

### Rating with Relations
```typescript
interface RatingWithRelations extends Rating {
  user?: {
    user_id: number;
    first_name: string;
    last_name: string;
    profile_photo?: string;
  };
  serviceProvider?: {
    provider_id: number;
    provider_first_name: string;
    provider_last_name: string;
    provider_profile_photo?: string;
  };
  appointment?: {
    appointment_id: number;
    scheduled_date: string;
    service?: {
      service_title: string;
    };
  };
}
```

### Rating Statistics
```typescript
interface RatingStatistics {
  average_rating: number;
  total_ratings: number;
  rating_distribution: Array<{
    star: number; // 1-5
    count: number;
  }>;
}
```

### Pagination
```typescript
interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_ratings: number;
  has_next: boolean;
  has_prev: boolean;
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Rating value must be between 1 and 5"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required. Customer ID is missing."
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "You are not authorized to rate this appointment"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Appointment not found or not completed, or you are not authorized to rate this appointment"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "message": "You have already rated this appointment"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "message": "File too large. Maximum size is 3MB"
}
```

#### 422 Unprocessable Entity
```json
{
  "success": false,
  "message": "Only image files are allowed for rating photos!"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error uploading rating photo. Please try again."
}
```

## Frontend Integration Examples

### React Component for Creating Rating
```jsx
import React, { useState } from 'react';

const CreateRating = ({ appointment, onRatingCreated }) => {
  const [rating, setRating] = useState({
    appointment_id: appointment.appointment_id,
    provider_id: appointment.provider_id,
    rating_value: 5,
    rating_comment: '',
    rating_photo: null
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('appointment_id', rating.appointment_id);
      formData.append('provider_id', rating.provider_id);
      formData.append('rating_value', rating.rating_value);
      formData.append('rating_comment', rating.rating_comment);
      
      if (rating.rating_photo) {
        formData.append('rating_photo', rating.rating_photo);
      }

      const response = await fetch('/api/ratings/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        onRatingCreated(result.data);
        alert('Rating submitted successfully!');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error creating rating:', error);
      alert('Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rating-form">
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`star ${star <= rating.rating_value ? 'active' : ''}`}
            onClick={() => setRating({...rating, rating_value: star})}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={rating.rating_comment}
        onChange={(e) => setRating({...rating, rating_comment: e.target.value})}
        placeholder="Share your experience..."
        rows={4}
      />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setRating({...rating, rating_photo: e.target.files[0]})}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Rating'}
      </button>
    </form>
  );
};
```

### Display Provider Ratings
```jsx
const ProviderRatings = ({ providerId }) => {
  const [ratings, setRatings] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchRatings();
  }, [providerId, page]);

  const fetchRatings = async () => {
    try {
      const response = await fetch(`/api/ratings/provider/${providerId}?page=${page}&limit=10`);
      const result = await response.json();

      if (result.success) {
        setRatings(result.data.ratings);
        setStatistics(result.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading ratings...</div>;

  return (
    <div className="provider-ratings">
      <div className="rating-statistics">
        <h3>Rating Overview</h3>
        <div className="average-rating">
          <span className="stars">{'★'.repeat(Math.round(statistics.average_rating))}</span>
          <span className="score">{statistics.average_rating.toFixed(1)}</span>
          <span className="total">({statistics.total_ratings} reviews)</span>
        </div>
        
        <div className="rating-distribution">
          {statistics.rating_distribution.map(({ star, count }) => (
            <div key={star} className="distribution-bar">
              <span>{star}★</span>
              <div className="bar">
                <div 
                  className="fill" 
                  style={{width: `${(count / statistics.total_ratings) * 100}%`}}
                />
              </div>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ratings-list">
        {ratings.map(rating => (
          <div key={rating.id} className="rating-item">
            <div className="rating-header">
              <img 
                src={rating.user.profile_photo || '/default-avatar.png'} 
                alt="Customer"
                className="avatar"
              />
              <div className="customer-info">
                <span className="name">
                  {rating.user.first_name} {rating.user.last_name}
                </span>
                <div className="stars">
                  {'★'.repeat(rating.rating_value)}{'☆'.repeat(5 - rating.rating_value)}
                </div>
              </div>
              <span className="date">
                {new Date(rating.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <p className="comment">{rating.rating_comment}</p>
            
            {rating.rating_photo && (
              <img 
                src={rating.rating_photo} 
                alt="Rating photo"
                className="rating-photo"
              />
            )}
            
            <div className="service-info">
              Service: {rating.appointment.service.service_title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### JavaScript API Client
```javascript
class RatingsAPI {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async createRating(appointmentId, providerId, ratingValue, comment, photo) {
    const formData = new FormData();
    formData.append('appointment_id', appointmentId);
    formData.append('provider_id', providerId);
    formData.append('rating_value', ratingValue);
    formData.append('rating_comment', comment);
    
    if (photo) {
      formData.append('rating_photo', photo);
    }

    const response = await fetch(`${this.baseUrl}/ratings/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    return await response.json();
  }

  async getProviderRatings(providerId, page = 1, limit = 10) {
    const response = await fetch(
      `${this.baseUrl}/ratings/provider/${providerId}?page=${page}&limit=${limit}`
    );
    return await response.json();
  }

  async getRateableAppointments() {
    const response = await fetch(`${this.baseUrl}/ratings/rateable-appointments`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return await response.json();
  }

  async updateRating(ratingId, updates) {
    const formData = new FormData();
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== null && updates[key] !== undefined) {
        formData.append(key, updates[key]);
      }
    });

    const response = await fetch(`${this.baseUrl}/ratings/update/${ratingId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    return await response.json();
  }

  async deleteRating(ratingId) {
    const response = await fetch(`${this.baseUrl}/ratings/delete/${ratingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return await response.json();
  }
}
```

## Best Practices

### File Upload Guidelines
1. **Image Formats**: Support JPG, PNG, WebP formats
2. **File Size**: Maximum 3MB per image
3. **Image Dimensions**: Automatically optimized by Cloudinary
4. **Validation**: Always validate file type and size on both frontend and backend

### Rating Guidelines
1. **Rating Scale**: 1-5 stars (required)
2. **Comments**: Optional but encouraged for detailed feedback
3. **Photo Evidence**: Optional but helps build trust
4. **One Rating Per Appointment**: Customers and providers can each rate once per appointment

### Security Considerations
1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Users can only rate their own appointments
3. **File Upload Security**: Strict file type and size validation
4. **Rate Limiting**: Consider implementing rate limiting for rating creation

### Performance Tips
1. **Pagination**: Always paginate rating lists for better performance
2. **Image Optimization**: Cloudinary automatically optimizes images
3. **Caching**: Consider caching rating statistics for frequently viewed providers
4. **Database Indexing**: Ensure proper indexing on provider_id, appointment_id, etc.

This comprehensive documentation provides everything needed to integrate with the Ratings API, including detailed examples, error handling, and best practices for implementation.