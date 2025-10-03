# New Features Implementation Summary

## 1. Verification Resubmit for Rejected Users

### Overview
Users whose verification has been rejected can now resubmit their verification documents for admin review. This changes their status from "rejected" back to "pending" for admin approval.

### API Endpoints

#### Get Customer Verification Status
```
GET /api/verification/customer/status
```

**Headers:**
```json
{
  "Authorization": "Bearer <customer_jwt_token>"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification status retrieved successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "ID document photo is too blurry",
    "verification_submitted_at": "2025-10-01T10:30:00.000Z",
    "verification_reviewed_at": "2025-10-02T14:20:00.000Z",
    "valid_id": "https://cloudinary.com/...",
    "profile_photo": "https://cloudinary.com/..."
  }
}
```

#### Resubmit Verification (Rejected Users Only)
```
POST /api/verification/customer/resubmit
```

**Headers:**
```json
{
  "Authorization": "Bearer <customer_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "valid_id_url": "https://cloudinary.com/new-valid-id-image.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification documents re-submitted successfully. Our team will review within 24-48 hours.",
  "data": {
    "user_id": 123,
    "verification_status": "pending",
    "verification_submitted_at": "2025-10-03T09:15:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** (No valid ID URL provided):
```json
{
  "success": false,
  "message": "Valid ID image is required"
}
```

- **400 Bad Request** (Account already verified):
```json
{
  "success": false,
  "message": "Your account is already verified"
}
```

- **404 Not Found** (Customer not found):
```json
{
  "success": false,
  "message": "Customer not found"
}
```

### Workflow

1. **Customer Registration**: Customer registers and submits valid ID → status = "pending"
2. **Admin Reviews**: Admin reviews and may reject → status = "rejected", rejection_reason set
3. **Customer Resubmits**: Customer uploads new valid ID → status changes to "pending"
4. **Admin Re-reviews**: Admin reviews again and approves/rejects
5. **Approval**: If approved → status = "approved", is_verified = true

### Database Schema Fields Used

From `User` model in `schema.prisma`:
```prisma
model User {
  user_id                   Int       @id @default(autoincrement())
  first_name                String
  last_name                 String
  email                     String    @unique
  phone_number              String    @unique
  valid_id                  String?
  is_verified               Boolean   @default(false)
  verification_status       String    @default("pending") // "pending" | "approved" | "rejected"
  rejection_reason          String?
  verification_submitted_at DateTime?
  verification_reviewed_at  DateTime?
  // ... other fields
}
```

### Implementation Files
- **Controller**: `src/controller/verificationController.js`
  - `getCustomerVerificationStatus()` - Get current status
  - `resubmitCustomerVerification()` - Resubmit documents
- **Routes**: `src/route/verificationRoutes.js`
- **Middleware**: `src/middleware/authMiddleware.js` (for authentication)

---

## 2. Self-Exclusion Filter for Service Listings

### Overview
When a customer browses service listings, if they also have a service provider account with the same name and contact details (email or phone), their own provider account will NOT appear in the search results. This prevents users from booking appointments with themselves.

### API Endpoint

```
GET /auth/service-listings
```

**Headers (Optional):**
```json
{
  "Authorization": "Bearer <customer_jwt_token>"
}
```

**Query Parameters:**
- `page`: number (default: 1) - Page number for pagination
- `limit`: number (default: 12) - Items per page
- `search`: string - Search in service title, description, provider name
- `category`: string - Filter by service category
- `location`: string - Filter by provider location
- `sortBy`: string - Sort order: "rating" | "price-low" | "price-high" | "newest"
- `date`: string - Filter by availability (YYYY-MM-DD format)

**Response (200):**
```json
{
  "message": "Service listings retrieved successfully",
  "listings": [
    {
      "id": 1,
      "title": "Professional Plumbing Services",
      "description": "Expert plumbing solutions...",
      "startingPrice": 500,
      "service_photos": [...],
      "provider": {
        "id": 45,
        "name": "Jane Smith",
        "rating": 4.8,
        "location": "Manila",
        "profilePhoto": "https://cloudinary.com/..."
      },
      "categories": ["Plumbing", "Home Repair"],
      "specificServices": [...]
    }
    // Note: Customer's own provider account is excluded
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 48,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### How It Works

#### Matching Criteria
A provider is considered the "same person" as the customer if:
1. **First name** matches (case-insensitive, trimmed)
2. **AND Last name** matches (case-insensitive, trimmed)
3. **AND** (Email matches **OR** Phone number matches)

#### Examples

**Scenario 1: Match Found (Provider Excluded)**
```
Customer:  John Doe, john@example.com, +639171234567
Provider:  John Doe, john@example.com, +639171234567
Result:    Provider EXCLUDED from customer's search results ✅
```

**Scenario 2: Names Match, Different Contact (Provider Shown)**
```
Customer:  John Doe, john@example.com, +639171234567
Provider:  John Doe, johndoe2@example.com, +639189876543
Result:    Provider SHOWN in search results (different email AND phone) ❌
```

**Scenario 3: Same Email, Different Names (Provider Shown)**
```
Customer:  John Doe, john@example.com, +639171234567
Provider:  Jane Smith, john@example.com, +639171234567
Result:    Provider SHOWN in search results (different names) ❌
```

### Authentication Behavior

| Authentication Status | Behavior |
|----------------------|----------|
| **No token provided** | All service listings shown (no filtering) |
| **Valid customer token** | Customer's own provider account excluded |
| **Invalid token** | Treated as unauthenticated (all listings shown) |
| **Provider token** | No exclusion (only works for customer tokens) |

### Implementation Details

#### File Structure
- **Controller**: `src/controller/authCustomerController.js`
  - Function: `getServiceListingsForCustomer()`
- **Routes**: `src/route/authCustomer.js`
  - Middleware: `optionalAuth` (custom middleware)
- **Middleware**: `src/middleware/authMiddleware.js`

#### Optional Authentication Middleware
```javascript
// Custom middleware that doesn't fail when no token is provided
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return next(); // No token, continue without auth
  }

  try {
    const jwt = require('jsonwebtoken');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    req.userType = decoded.userType;
  } catch (err) {
    // Invalid token, continue without auth (don't throw error)
  }
  
  next();
};
```

#### Filter Logic
```javascript
// In getServiceListingsForCustomer function
if (customerDetails) {
  const customerFirstName = customerDetails.first_name.toLowerCase().trim();
  const customerLastName = customerDetails.last_name.toLowerCase().trim();
  const customerEmail = customerDetails.email.toLowerCase().trim();
  const customerPhone = customerDetails.phone_number.trim();
  
  filteredListings = filteredListings.filter(listing => {
    const provider = listing.serviceProvider;
    const providerFirstName = provider.provider_first_name.toLowerCase().trim();
    const providerLastName = provider.provider_last_name.toLowerCase().trim();
    const providerEmail = provider.provider_email.toLowerCase().trim();
    const providerPhone = provider.provider_phone_number.trim();
    
    // Exclude if names match AND (email OR phone matches)
    const namesMatch = customerFirstName === providerFirstName && 
                      customerLastName === providerLastName;
    const emailMatches = customerEmail === providerEmail;
    const phoneMatches = customerPhone === providerPhone;
    
    const isSamePerson = namesMatch && (emailMatches || phoneMatches);
    
    return !isSamePerson; // Keep if NOT the same person
  });
}
```

### Console Logging

The implementation includes debug logging:
```
🔍 Customer authenticated: { userId: 123, name: 'John Doe' }
🚫 Excluding provider (same person as customer): { 
  provider_id: 45, 
  name: 'John Doe', 
  email: 'john@example.com' 
}
✅ Self-exclusion filter applied: 1 provider(s) excluded
```

### Database Schema References

**Customer (User model):**
```prisma
model User {
  user_id      Int    @id @default(autoincrement())
  first_name   String
  last_name    String
  email        String @unique
  phone_number String @unique
}
```

**Provider (ServiceProviderDetails model):**
```prisma
model ServiceProviderDetails {
  provider_id             Int    @id @default(autoincrement())
  provider_first_name     String
  provider_last_name      String
  provider_email          String @unique
  provider_phone_number   String @unique
}
```

---

## Testing

### Test Files Created
1. `test-verification-resubmit.js` - Testing guide for verification resubmit
2. `test-self-exclusion-filter.js` - Testing guide for self-exclusion filter

### Running Tests
```bash
# Show verification resubmit testing guide
node test-verification-resubmit.js

# Show self-exclusion filter testing guide
node test-self-exclusion-filter.js
```

---

## Frontend Integration Examples

### 1. Resubmit Verification (React/React Native)

```javascript
// Get verification status
const getVerificationStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/api/verification/customer/status`, {
      headers: {
        'Authorization': `Bearer ${customerToken}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      setVerificationStatus(data.data.verification_status);
      setRejectionReason(data.data.rejection_reason);
    }
  } catch (error) {
    console.error('Failed to get verification status:', error);
  }
};

// Resubmit verification
const resubmitVerification = async (validIdUrl) => {
  try {
    const response = await fetch(`${API_URL}/api/verification/customer/resubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({ valid_id_url: validIdUrl })
    });
    const data = await response.json();
    
    if (data.success) {
      alert('Verification resubmitted successfully!');
      // Refresh verification status
      getVerificationStatus();
    }
  } catch (error) {
    console.error('Failed to resubmit verification:', error);
  }
};
```

### 2. Browse Service Listings with Self-Exclusion

```javascript
// Browse service listings (automatically excludes own provider account)
const getServiceListings = async (page = 1, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page,
      limit: 12,
      ...filters
    });
    
    const response = await fetch(
      `${API_URL}/auth/service-listings?${queryParams}`,
      {
        headers: {
          // Include token if customer is logged in (optional)
          'Authorization': customerToken ? `Bearer ${customerToken}` : undefined
        }
      }
    );
    const data = await response.json();
    
    setServiceListings(data.listings);
    setPagination(data.pagination);
  } catch (error) {
    console.error('Failed to get service listings:', error);
  }
};
```

---

## Summary

### ✅ Feature 1: Verification Resubmit
- **Endpoint**: `POST /api/verification/customer/resubmit`
- **Purpose**: Allow rejected users to resubmit verification documents
- **Status Change**: `rejected` → `pending`
- **Authentication**: Required (customer JWT token)
- **Files Modified**:
  - Already implemented in `src/controller/verificationController.js`
  - Already exposed in `src/route/verificationRoutes.js`

### ✅ Feature 2: Self-Exclusion Filter
- **Endpoint**: `GET /auth/service-listings` (with optional authentication)
- **Purpose**: Hide customer's own provider account from search results
- **Matching**: Same name + (email OR phone)
- **Authentication**: Optional (works with or without token)
- **Files Modified**:
  - `src/controller/authCustomerController.js` - Added filter logic
  - `src/route/authCustomer.js` - Added optionalAuth middleware

---

## Notes for Developers

1. **Verification Resubmit** already existed in the codebase - no new implementation needed
2. **Self-Exclusion Filter** is new - uses optional authentication to maintain backward compatibility
3. Both features include console logging for debugging
4. Test scripts provide comprehensive testing guides
5. No database migrations required - uses existing schema fields

---

## Future Enhancements

1. **Verification Resubmit**:
   - Email notification to customer when status changes
   - Track resubmission history
   - Limit number of resubmissions

2. **Self-Exclusion Filter**:
   - Add admin setting to enable/disable self-exclusion
   - Support for business accounts (same business name)
   - Analytics on excluded providers

---

**Implementation Date**: October 3, 2025
**Developer**: GitHub Copilot
**Version**: 1.0
