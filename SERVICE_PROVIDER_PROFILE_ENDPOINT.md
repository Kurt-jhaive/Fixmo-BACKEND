# Service Provider Profile Endpoint

This document describes how the service provider mobile/web client can retrieve the logged-in provider's profile details using the JWT token received during login.

## Endpoint Summary

| Property | Value |
| --- | --- |
| **HTTP Method** | `GET` |
| **URL** | `/auth/provider-profile` |
| **Auth** | Bearer token (provider JWT) |
| **Alt. Legacy Path** | `/auth/profile` (kept for backward compatibility) |

> **When to use:** Call immediately after a successful provider login (or on app launch when a valid token is stored) to hydrate the provider dashboard/profile screens.

## Required Headers

```
Authorization: Bearer <provider-jwt-token>
Content-Type: application/json
```

- The token is returned by the `/auth/provider-login` endpoint.
- If the token is missing, expired, or belongs to a non-provider account, the endpoint will return a `401`/`403` error.

## Request Example

```http
GET /auth/provider-profile HTTP/1.1
Host: <api-base-url>
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

No request body is required.

## Successful Response (`200 OK`)

```json
{
  "success": true,
  "message": "Provider profile retrieved successfully",
  "data": {
    "provider_id": 12,
    "first_name": "Alex",
    "last_name": "Santos",
    "full_name": "Alex Santos",
    "userName": "alexfix",
    "email": "alex@example.com",
    "phone_number": "+63 912 345 6789",
    "profile_photo": "https://res.cloudinary.com/.../profile.jpg",
    "valid_id": "https://res.cloudinary.com/.../id.jpg",
    "location": "Quezon City",
    "exact_location": "123 Kalayaan Ave",
    "uli": "ULI-00123",
    "birthday": "1990-05-20",
    "is_verified": true,
    "verification_status": "approved",
    "rejection_reason": null,
    "verification_submitted_at": "2025-09-12T10:45:00.000Z",
    "verification_reviewed_at": "2025-09-13T08:30:00.000Z",
    "rating": 4.8,
    "is_activated": true,
    "created_at": "2024-11-06T04:15:10.000Z",
    "professions": [
      {
        "id": 1,
        "profession": "Electrician",
        "experience": "5 years",
        "created_at": "2024-11-06T04:16:00.000Z"
      }
    ],
    "certificates": [
      {
        "certificate_id": 10,
        "certificate_name": "TESDA NCII",
        "certificate_number": "TESDA-12345",
        "certificate_file_path": "https://res.cloudinary.com/.../tesda.pdf",
        "expiry_date": "2026-12-31",
        "status": "approved",
        "created_at": "2024-11-07T02:10:00.000Z"
      }
    ],
    "recent_services": [
      {
        "service_id": 88,
        "service_title": "Home Electrical Inspection",
        "service_description": "Comprehensive inspection and minor repairs",
        "service_startingprice": 1500,
        "is_active": true,
        "created_at": "2025-01-05T09:20:00.000Z"
      }
    ],
    "totals": {
      "professions": 1,
      "certificates": 1,
      "recent_services": 1
    }
  }
}
```

### Field Notes

- `professions`: Ordered list of the provider's professions (oldest first).
- `certificates`: Latest snapshot of uploaded certifications including approval status.
- `recent_services`: Up to five most recently created service listings for quick dashboard previews.
- `totals`: Convenience counts for displaying badges or summary chips in the UI.

## Error Responses

| Status | When it Appears | Sample Payload |
| --- | --- | --- |
| `401 Unauthorized` | Token missing or invalid | `{ "message": "No token provided" }` or `{ "message": "Invalid token" }` |
| `403 Forbidden` | Token belongs to a non-provider account | `{ "success": false, "message": "Access denied. Provider token required." }` |
| `404 Not Found` | Provider record removed or not yet created | `{ "success": false, "message": "Provider not found" }` |
| `500 Internal Server Error` | Unexpected failure | `{ "success": false, "message": "Internal server error" }` |

## Frontend Integration Tips

1. **Token Storage**: Save the provider's JWT securely (e.g., encrypted storage on mobile). Attach it to every authenticated request.
2. **Hydration Flow**:
   - On app launch, verify the token's presence/expiry.
   - Call `GET /auth/provider-profile` to hydrate state (Redux, Zustand, Context, etc.).
   - Handle `401/403` by redirecting to the login screen and clearing session data.
3. **Caching**: Cache the profile response locally to enable offline/optimistic UI. Refresh on pull-to-refresh or when navigating back to the dashboard.
4. **Legacy Support**: Older clients using `/auth/profile` will continue to work, but new implementations should switch to `/auth/provider-profile` for clarity.
5. **Partial Rendering**: The response is already segmented (`professions`, `certificates`, `recent_services`, `totals`) to simplify component-level rendering.

---

_Last updated: 2025-10-04_
