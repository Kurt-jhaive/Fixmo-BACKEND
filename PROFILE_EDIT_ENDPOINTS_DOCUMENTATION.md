# 📝 Profile Edit Endpoints Documentation

## Overview

New endpoints for editing customer and provider profiles. These endpoints allow updating **phone number**, **email**, and **address** (both `user_location` and `exact_location`).

---

## 🧑‍💼 Customer Profile Edit Endpoint

### **PUT** `/api/auth/customer/customer-profile`

Updates customer profile information (phone, email, and address).

#### **Authentication**
- ✅ Required: Bearer Token (JWT)
- User ID extracted from `authMiddleware`

#### **Request Body** (JSON)

All fields are optional, but **at least one** must be provided:

```json
{
  "phone_number": "09123456789",
  "email": "newemail@example.com",
  "user_location": "Bagong Pag-asa, Quezon City, Metro Manila",
  "exact_location": "14.6510,121.0355"
}
```

#### **Request Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone_number` | String | Optional | New phone number |
| `email` | String | Optional | New email address |
| `user_location` | String | Optional | Human-readable location (cascaded) |
| `exact_location` | String | Optional | GPS coordinates (lat,lng) |

#### **Validation Rules**

- ✅ At least one field must be provided
- ✅ Email must be unique (not used by another customer or provider)
- ✅ Phone number must be unique (not used by another customer or provider)
- ✅ Customer must exist
- ✅ User must be authenticated

#### **Success Response** (200 OK)

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user_id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "userName": "johndoe",
    "email": "newemail@example.com",
    "phone_number": "09123456789",
    "user_location": "Bagong Pag-asa, Quezon City, Metro Manila",
    "exact_location": "14.6510,121.0355",
    "profile_photo": "https://cloudinary.com/..."
  }
}
```

#### **Error Responses**

##### 400 - No Fields Provided
```json
{
  "success": false,
  "message": "At least one field (phone_number, email, user_location, or exact_location) is required"
}
```

##### 400 - Email Already Exists
```json
{
  "success": false,
  "message": "Email is already registered to another account"
}
```

or

```json
{
  "success": false,
  "message": "Email is already registered as a service provider"
}
```

##### 400 - Phone Already Exists
```json
{
  "success": false,
  "message": "Phone number is already registered to another account"
}
```

or

```json
{
  "success": false,
  "message": "Phone number is already registered as a service provider"
}
```

##### 401 - Unauthorized
```json
{
  "message": "Unauthorized"
}
```

##### 404 - Customer Not Found
```json
{
  "success": false,
  "message": "Customer not found"
}
```

##### 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to update profile",
  "error": "Error details..."
}
```

---

## 👨‍🔧 Provider Profile Edit Endpoint

### **PUT** `/api/provider/profile`

Updates provider profile information (phone, email, and address).

#### **Authentication**
- ✅ Required: Bearer Token (JWT)
- Provider ID extracted from `authMiddleware`

#### **Request Body** (JSON)

All fields are optional, but **at least one** must be provided:

```json
{
  "provider_phone_number": "09123456789",
  "provider_email": "newemail@example.com",
  "provider_location": "Bagong Pag-asa, Quezon City, Metro Manila",
  "exact_location": "14.6510,121.0355"
}
```

#### **Request Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_phone_number` | String | Optional | New phone number |
| `provider_email` | String | Optional | New email address |
| `provider_location` | String | Optional | Human-readable location (cascaded) |
| `exact_location` | String | Optional | GPS coordinates (lat,lng) |

#### **Validation Rules**

- ✅ At least one field must be provided
- ✅ Email must be unique (not used by another provider or customer)
- ✅ Phone number must be unique (not used by another provider or customer)
- ✅ Provider must exist
- ✅ User must be authenticated

#### **Success Response** (200 OK)

```json
{
  "success": true,
  "message": "Provider profile updated successfully",
  "data": {
    "provider_id": 456,
    "provider_first_name": "Jane",
    "provider_last_name": "Smith",
    "provider_userName": "janesmith",
    "provider_email": "newemail@example.com",
    "provider_phone_number": "09123456789",
    "provider_location": "Bagong Pag-asa, Quezon City, Metro Manila",
    "exact_location": "14.6510,121.0355",
    "provider_profile_photo": "https://cloudinary.com/..."
  }
}
```

#### **Error Responses**

##### 400 - No Fields Provided
```json
{
  "success": false,
  "message": "At least one field (provider_phone_number, provider_email, provider_location, or exact_location) is required"
}
```

##### 400 - Email Already Exists
```json
{
  "success": false,
  "message": "Email is already registered to another provider"
}
```

or

```json
{
  "success": false,
  "message": "Email is already registered as a customer"
}
```

##### 400 - Phone Already Exists
```json
{
  "success": false,
  "message": "Phone number is already registered to another provider"
}
```

or

```json
{
  "success": false,
  "message": "Phone number is already registered as a customer"
}
```

##### 401 - Unauthorized
```json
{
  "message": "Unauthorized"
}
```

##### 404 - Provider Not Found
```json
{
  "success": false,
  "message": "Provider not found"
}
```

##### 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to update provider profile",
  "error": "Error details..."
}
```

---

## 🧪 Testing Examples

### Customer Profile Update

#### Update Only Phone Number
```bash
curl -X PUT http://localhost:3000/api/auth/customer/customer-profile \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "09123456789"
  }'
```

#### Update Email and Address
```bash
curl -X PUT http://localhost:3000/api/auth/customer/customer-profile \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "user_location": "Bagong Pag-asa, Quezon City, Metro Manila",
    "exact_location": "14.6510,121.0355"
  }'
```

#### Update All Fields
```bash
curl -X PUT http://localhost:3000/api/auth/customer/customer-profile \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "09123456789",
    "email": "newemail@example.com",
    "user_location": "Bagong Pag-asa, Quezon City, Metro Manila",
    "exact_location": "14.6510,121.0355"
  }'
```

### Provider Profile Update

#### Update Only Phone Number
```bash
curl -X PUT http://localhost:3000/api/provider/profile \
  -H "Authorization: Bearer YOUR_PROVIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_phone_number": "09123456789"
  }'
```

#### Update Email and Address
```bash
curl -X PUT http://localhost:3000/api/provider/profile \
  -H "Authorization: Bearer YOUR_PROVIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_email": "newemail@example.com",
    "provider_location": "Bagong Pag-asa, Quezon City, Metro Manila",
    "exact_location": "14.6510,121.0355"
  }'
```

#### Update All Fields
```bash
curl -X PUT http://localhost:3000/api/provider/profile \
  -H "Authorization: Bearer YOUR_PROVIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_phone_number": "09123456789",
    "provider_email": "newemail@example.com",
    "provider_location": "Bagong Pag-asa, Quezon City, Metro Manila",
    "exact_location": "14.6510,121.0355"
  }'
```

---

## 📱 React Native Example

### Customer Profile Update
```javascript
const updateCustomerProfile = async (token, updates) => {
  try {
    const response = await fetch('https://api.yourbackend.com/api/auth/customer/customer-profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Profile updated:', result.data);
      return result.data;
    } else {
      console.error('❌ Update failed:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
await updateCustomerProfile(userToken, {
  phone_number: '09123456789',
  user_location: 'Bagong Pag-asa, Quezon City, Metro Manila',
  exact_location: '14.6510,121.0355'
});
```

### Provider Profile Update
```javascript
const updateProviderProfile = async (token, updates) => {
  try {
    const response = await fetch('https://api.yourbackend.com/api/provider/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Profile updated:', result.data);
      return result.data;
    } else {
      console.error('❌ Update failed:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Usage
await updateProviderProfile(providerToken, {
  provider_email: 'newemail@example.com',
  provider_location: 'Bagong Pag-asa, Quezon City, Metro Manila',
  exact_location: '14.6510,121.0355'
});
```

---

## 🔑 Key Features

1. **Flexible Updates** - Update any combination of fields
2. **Uniqueness Validation** - Prevents duplicate emails and phone numbers
3. **Cross-Table Checking** - Validates against both customer and provider tables
4. **Address Support** - Handles both human-readable location and GPS coordinates
5. **Secure** - Requires authentication
6. **Detailed Errors** - Clear error messages for debugging

---

## 📝 Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/customer/customer-profile` | PUT | Required | Update customer profile |
| `/api/provider/profile` | PUT | Required | Update provider profile |

### Fields Updated:
- **Customer**: `phone_number`, `email`, `user_location`, `exact_location`
- **Provider**: `provider_phone_number`, `provider_email`, `provider_location`, `exact_location`

---

## 🎯 Implementation Details

### Files Modified:
- ✅ `src/controller/authCustomerController.js` - Added `editCustomerProfile`
- ✅ `src/controller/authserviceProviderController.js` - Added `editProviderProfile`
- ✅ `src/route/authCustomer.js` - Added PUT route for customer profile
- ✅ `src/route/serviceProvider.js` - Added PUT route for provider profile

### Database Tables:
- ✅ `User` table (for customers)
- ✅ `ServiceProviderDetails` table (for providers)

---

**Date Created:** October 3, 2025  
**Status:** ✅ Ready for Testing
