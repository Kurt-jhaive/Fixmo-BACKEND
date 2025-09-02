# Swagger UI Authentication Guide

## How to Authenticate in Swagger UI

### Step 1: Get a JWT Token
Before testing protected endpoints in Swagger UI, you need to obtain a JWT token by logging in.

#### For Service Providers:
1. Go to `/api-docs` in your browser
2. Find the **Auth Service Provider** section
3. Use the `POST /api/auth/provider/login` endpoint
4. Provide your login credentials:
   ```json
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```
5. Copy the JWT token from the response

#### For Customers:
1. Use the `POST /api/auth/customer/login` endpoint
2. Provide your login credentials
3. Copy the JWT token from the response

### Step 2: Authorize in Swagger UI
1. Click the **"Authorize"** button at the top of the Swagger UI page (🔒 icon)
2. In the "bearerAuth" section, enter your token in this format:
   ```
   Bearer your-jwt-token-here
   ```
   **Important:** Make sure to include "Bearer " (with a space) before your token
3. Click **"Authorize"**
4. Click **"Close"** to close the authorization dialog

### Step 3: Test Protected Endpoints
Now you can test any endpoint that requires authentication. The lock icon (🔒) next to endpoints indicates they require authentication.

## Common Issues & Solutions

### "No token provided" Error
- **Cause:** You haven't authorized in Swagger UI or the token format is incorrect
- **Solution:** Follow Step 2 above, ensuring you include "Bearer " before your token

### "Invalid token" Error
- **Cause:** The token has expired or is malformed
- **Solution:** Get a new token by logging in again (Step 1)

### File Upload with Authentication
For endpoints like certificate upload that require both authentication and file upload:
1. Make sure you're authorized (Steps 1-2)
2. Fill in all required fields
3. Use the "Choose file" button to select your file
4. Click "Execute"

## Example Token Format
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiaWF0IjoxNjQxNTc2ODAwLCJleHAiOjE2NDE2NjMyMDB9.example
```

## Testing Certificate Upload
1. First, login as a service provider to get a JWT token
2. Authorize in Swagger UI with the token
3. Go to the `POST /api/certificates/upload` endpoint
4. Fill in the required fields:
   - `certificate_name`: e.g., "Plumbing License"
   - `certificate_number`: e.g., "PL123456789"  
   - `expiry_date`: e.g., "2025-12-31" (optional)
   - `certificateFile`: Choose a PDF, image, or document file
5. Click "Execute"

**Note:** The `provider_id` is automatically extracted from your JWT token, so you don't need to provide it manually.

The endpoint should now work without the "No token provided" error.
