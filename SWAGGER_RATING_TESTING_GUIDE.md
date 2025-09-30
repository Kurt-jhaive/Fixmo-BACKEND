# Testing Rating System in Swagger UI

## 🧪 **New Rating Endpoints Available for Testing**

After updating your Swagger documentation, you can now test the enhanced rating system directly in Swagger UI.

### **Access Swagger UI:**
```
http://localhost:3000/api-docs
```

## **New Endpoints Added to Swagger:**

### **1. Get Appointments That Can Be Rated**
- **Endpoint**: `GET /api/appointments/can-rate`
- **Tag**: `Appointments, Ratings`
- **Authentication**: Required (Bearer Token)

#### **Test Parameters:**
- `userType` (optional): `customer` or `provider`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

#### **Example Test:**
1. Click on the endpoint in Swagger UI
2. Click "Try it out"
3. Enter your Bearer token
4. Set `userType` to `customer`
5. Execute the request

#### **Expected Response:**
```json
{
  "success": true,
  "message": "Appointments that can be rated retrieved successfully",
  "data": [
    {
      "appointment_id": 123,
      "is_rated": false,
      "needs_rating": true,
      "rating_status": {
        "is_rated": false,
        "is_rated_by_customer": false,
        "is_rated_by_provider": true,
        "needs_rating": true,
        "customer_rating_value": null,
        "provider_rating_value": 4
      }
    }
  ]
}
```

### **2. Check Appointment Rating Status**
- **Endpoint**: `GET /api/appointments/{appointmentId}/rating-status`
- **Tag**: `Appointments, Ratings`
- **Authentication**: Required (Bearer Token)

#### **Test Parameters:**
- `appointmentId` (required): The appointment ID to check

#### **Example Test:**
1. Click on the endpoint in Swagger UI
2. Click "Try it out"
3. Enter your Bearer token
4. Enter an appointment ID (e.g., `123`)
5. Execute the request

#### **Expected Response:**
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

## **Enhanced Existing Endpoints:**

### **All Appointment Endpoints Now Include:**
- `is_rated` boolean flag
- `needs_rating` boolean flag
- `rating_status` comprehensive object

### **Updated Endpoints:**
1. `GET /api/appointments` - List all appointments with rating status
2. `GET /api/appointments/{id}` - Get single appointment with rating status
3. `GET /api/appointments/provider/{providerId}` - Provider appointments with rating status
4. `GET /api/appointments/customer/{customerId}` - Customer appointments with rating status

## **Testing Workflow:**

### **1. Test Basic Rating Detection:**
```bash
# Get all appointments (now includes rating status)
GET /api/appointments
Authorization: Bearer <your_token>

# Check response for new fields:
# - is_rated: boolean
# - needs_rating: boolean  
# - rating_status: object
```

### **2. Test Rating Prompt Functionality:**
```bash
# Get appointments that can be rated (for frontend prompts)
GET /api/appointments/can-rate?userType=customer
Authorization: Bearer <your_token>

# This returns only appointments where needs_rating=true
```

### **3. Test Specific Appointment Status:**
```bash
# Check specific appointment rating status
GET /api/appointments/123/rating-status
Authorization: Bearer <your_token>

# Returns detailed rating information for that appointment
```

## **Swagger Schema Components Added:**

### **RatingStatus Schema:**
- Complete rating status information object
- All boolean flags and rating values
- User-specific fields (customer/provider views)

### **AppointmentWithRatingStatus Schema:**
- Extended appointment object
- Includes all new rating detection fields
- Compatible with existing appointment structure

## **Testing Different User Types:**

### **As Customer:**
- Set `userType=customer` in rating endpoints
- Test `needs_rating` detection for customer ratings
- Verify `provider_rated_me` field

### **As Provider:**
- Set `userType=provider` in rating endpoints  
- Test `provider_can_rate_customer` functionality
- Verify provider-specific rating logic

## **Common Test Scenarios:**

### **1. Completed Appointment - No Ratings:**
- `is_rated`: `false`
- `needs_rating`: `true`
- Both customer and provider ratings: `null`

### **2. Customer Rated, Provider Didn't:**
- `is_rated`: `true`
- `needs_rating`: `false`
- Customer rating: Present, Provider rating: `null`

### **3. Both Parties Rated:**
- `is_rated`: `true` 
- `needs_rating`: `false`
- Both ratings: Present with values

### **4. Appointment Not Completed:**
- `is_rated`: `false`
- `needs_rating`: `false`
- Status not `completed`

## **Error Testing:**

### **Test Invalid Scenarios:**
- Non-existent appointment IDs (404 error)
- Unauthorized access (403 error)
- Invalid tokens (401 error)
- Appointments user doesn't have access to

Your enhanced rating system is now fully documented and ready for testing in Swagger UI! 🚀