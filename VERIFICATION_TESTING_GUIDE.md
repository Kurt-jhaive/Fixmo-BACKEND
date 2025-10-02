# Quick Testing Guide - Verification with Rejection Status

## Test the Updated Admin Controller

### Test 1: Approve a Provider
```bash
# Using curl
curl -X POST http://localhost:YOUR_PORT/api/admin/verify-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "provider_id": 1,
    "provider_isVerified": true
  }'

# Expected Response:
{
  "message": "Service provider approved successfully",
  "data": {
    "provider_id": 1,
    "provider_isVerified": true,
    "verification_status": "approved",
    "rejection_reason": null,
    "verification_reviewed_at": "2025-10-02T..."
  }
}
```

### Test 2: Reject a Provider with Reason
```bash
curl -X POST http://localhost:YOUR_PORT/api/admin/verify-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "provider_id": 2,
    "provider_isVerified": false,
    "rejection_reason": "Certificate image is not clear. Please upload a higher quality scan."
  }'

# Expected Response:
{
  "message": "Service provider rejected successfully",
  "data": {
    "provider_id": 2,
    "provider_isVerified": false,
    "verification_status": "rejected",
    "rejection_reason": "Certificate image is not clear...",
    "verification_reviewed_at": "2025-10-02T..."
  }
}
```

### Test 3: Approve a Customer
```bash
curl -X POST http://localhost:YOUR_PORT/api/admin/verify-customer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "user_id": 1,
    "is_verified": true
  }'

# Expected Response:
{
  "message": "Customer approved successfully",
  "data": {
    "user_id": 1,
    "is_verified": true,
    "verification_status": "approved",
    "rejection_reason": null,
    "verification_reviewed_at": "2025-10-02T..."
  }
}
```

### Test 4: Reject a Customer with Reason
```bash
curl -X POST http://localhost:YOUR_PORT/api/admin/verify-customer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "user_id": 2,
    "is_verified": false,
    "rejection_reason": "The ID document photo is too blurry. Please upload a clearer image."
  }'

# Expected Response:
{
  "message": "Customer rejected successfully",
  "data": {
    "user_id": 2,
    "is_verified": false,
    "verification_status": "rejected",
    "rejection_reason": "The ID document photo is too blurry...",
    "verification_reviewed_at": "2025-10-02T..."
  }
}
```

### Test 5: Get All Unverified Providers
```bash
curl -X GET http://localhost:YOUR_PORT/api/admin/unverified-providers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected Response:
{
  "success": true,
  "message": "Fetched unverified service providers",
  "data": [
    {
      "provider_id": 2,
      "provider_first_name": "John",
      "provider_last_name": "Doe",
      "provider_email": "john@example.com",
      "provider_isVerified": false,
      "verification_status": "rejected",
      "rejection_reason": "Certificate image is not clear...",
      "verification_submitted_at": "2025-10-01T10:00:00Z",
      "verification_reviewed_at": "2025-10-02T09:00:00Z",
      "provider_certificates": [...]
    },
    {
      "provider_id": 3,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_isVerified": false,
      "verification_status": "pending",
      "rejection_reason": null,
      "verification_submitted_at": "2025-10-02T08:00:00Z",
      "verification_reviewed_at": null,
      "provider_certificates": [...]
    }
  ]
}
```

### Test 6: Get All Unverified Customers
```bash
curl -X GET http://localhost:YOUR_PORT/api/admin/unverified-customers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected Response:
{
  "success": true,
  "message": "Fetched unverified customers",
  "data": [
    {
      "user_id": 2,
      "first_name": "Alice",
      "last_name": "Johnson",
      "email": "alice@example.com",
      "is_verified": false,
      "verification_status": "rejected",
      "rejection_reason": "The ID document photo is too blurry...",
      "verification_submitted_at": "2025-10-01T12:00:00Z",
      "verification_reviewed_at": "2025-10-02T09:30:00Z"
    },
    {
      "user_id": 3,
      "first_name": "Bob",
      "last_name": "Williams",
      "email": "bob@example.com",
      "is_verified": false,
      "verification_status": "pending",
      "rejection_reason": null,
      "verification_submitted_at": "2025-10-02T07:00:00Z",
      "verification_reviewed_at": null
    }
  ]
}
```

## Verification Status Flow Testing

### Scenario 1: Complete Provider Verification Flow
1. Provider registers → `verification_status: "pending"`
2. Provider submits documents → `verification_submitted_at: [timestamp]`
3. Admin reviews and REJECTS → `verification_status: "rejected"`, `rejection_reason: "..."`, `verification_reviewed_at: [timestamp]`
4. Provider fixes issues and resubmits → `verification_submitted_at: [new timestamp]`
5. Admin reviews and APPROVES → `verification_status: "approved"`, `rejection_reason: null`, `verification_reviewed_at: [timestamp]`

### Scenario 2: Complete Customer Verification Flow
1. Customer registers → `verification_status: "pending"`
2. Customer submits ID → `verification_submitted_at: [timestamp]`
3. Admin reviews and APPROVES → `verification_status: "approved"`, `verification_reviewed_at: [timestamp]`

## Database Verification Queries

Check the changes directly in your database:

```sql
-- Check provider verification status
SELECT 
  provider_id,
  provider_first_name,
  provider_last_name,
  provider_email,
  provider_isVerified,
  verification_status,
  rejection_reason,
  verification_submitted_at,
  verification_reviewed_at
FROM "ServiceProviderDetails"
WHERE provider_isVerified = false;

-- Check customer verification status
SELECT 
  user_id,
  first_name,
  last_name,
  email,
  is_verified,
  verification_status,
  rejection_reason,
  verification_submitted_at,
  verification_reviewed_at
FROM "User"
WHERE is_verified = false;
```

## Common Rejection Reasons Examples

### For Providers:
- "Certificate image is not clear. Please upload a higher quality scan."
- "The certificate has expired. Please upload a valid, current certificate."
- "The name on the certificate does not match your registered name."
- "Missing required certificate for the services you're offering."
- "ID document photo is not legible. Please provide a clearer image."

### For Customers:
- "ID document photo is too blurry. Please upload a clearer image."
- "The ID document has expired. Please upload a valid ID."
- "The photo on the ID does not match your profile photo."
- "ID document type is not acceptable. Please upload a government-issued ID."
- "Full ID document is not visible. Please upload a complete image."

## Frontend Display Example

```javascript
// Display verification status badge
function VerificationBadge({ status, rejection_reason }) {
  const badges = {
    pending: { color: 'yellow', text: 'Pending Review', icon: '⏳' },
    approved: { color: 'green', text: 'Verified', icon: '✅' },
    rejected: { color: 'red', text: 'Rejected', icon: '❌' }
  };

  const badge = badges[status];

  return (
    <div>
      <span className={`badge ${badge.color}`}>
        {badge.icon} {badge.text}
      </span>
      {status === 'rejected' && rejection_reason && (
        <div className="rejection-reason">
          <strong>Reason:</strong> {rejection_reason}
          <button onClick={handleResubmit}>Re-submit Documents</button>
        </div>
      )}
    </div>
  );
}
```

## What to Check After Testing

✅ **Provider Approval:**
- `provider_isVerified` is `true`
- `verification_status` is `"approved"`
- `rejection_reason` is `null`
- `verification_reviewed_at` has timestamp

✅ **Provider Rejection:**
- `provider_isVerified` is `false`
- `verification_status` is `"rejected"`
- `rejection_reason` contains the reason
- `verification_reviewed_at` has timestamp

✅ **Customer Approval:**
- `is_verified` is `true`
- `verification_status` is `"approved"`
- `rejection_reason` is `null`
- `verification_reviewed_at` has timestamp

✅ **Customer Rejection:**
- `is_verified` is `false`
- `verification_status` is `"rejected"`
- `rejection_reason` contains the reason
- `verification_reviewed_at` has timestamp

## Troubleshooting

### Issue: "Cannot find provider/customer"
- **Check:** Verify the ID exists in the database
- **Check:** Ensure you're using the correct ID field (`provider_id` or `user_id`)

### Issue: Rejection reason not being saved
- **Check:** Make sure `rejection_reason` is included in the request body
- **Check:** Ensure `provider_isVerified: false` or `is_verified: false` is set when rejecting

### Issue: Old rejection reason still showing after approval
- **Fix:** The controller automatically sets `rejection_reason: null` on approval

## Summary

Your verification system now:
✅ Uses existing Prisma schema fields
✅ Tracks approval/rejection status
✅ Stores rejection reasons for user feedback
✅ Records review timestamps for audit trail
✅ Clears rejection reason on approval
✅ Returns detailed information including verification history
✅ Provides proper error handling and status codes

No database migrations needed - it all works with your current schema! 🎉
