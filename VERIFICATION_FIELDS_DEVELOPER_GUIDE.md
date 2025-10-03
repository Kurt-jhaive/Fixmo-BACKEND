# Verification Status Fields - Developer Quick Reference

## Field Definitions

| Field Name | Type | Values | Description |
|------------|------|--------|-------------|
| `verification_status` | String | 'pending', 'approved', 'rejected' | Current verification state |
| `rejection_reason` | String (nullable) | Any text | Admin's reason for rejection |
| `verification_submitted_at` | DateTime (nullable) | ISO 8601 | When user submitted documents |
| `verification_reviewed_at` | DateTime (nullable) | ISO 8601 | When admin reviewed |

## Endpoints Reference

### Customer Endpoints

#### Get User Profile
```http
GET /auth/user-profile/:userId
```
**Response includes:**
```json
{
  "user_id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "is_verified": false,
  "verification_status": "rejected",
  "rejection_reason": "ID document is unclear",
  "verification_submitted_at": "2025-01-15T10:30:00Z",
  "verification_reviewed_at": "2025-01-16T14:20:00Z"
}
```

### Provider Endpoints

#### Get Provider Profile
```http
GET /auth/provider/profile
Authorization: Bearer {token}
```
**Response includes:**
```json
{
  "provider_id": 1,
  "provider_first_name": "Jane",
  "provider_last_name": "Smith",
  "provider_email": "jane@example.com",
  "provider_isVerified": false,
  "verification_status": "pending",
  "rejection_reason": null,
  "verification_submitted_at": "2025-01-20T08:15:00Z",
  "verification_reviewed_at": null
}
```

### Admin Endpoints

#### List All Users
```http
GET /api/admin/users
Authorization: Bearer {admin-token}
```

#### Get User Details
```http
GET /api/admin/users/:userId
Authorization: Bearer {admin-token}
```

#### Verify User (Approve)
```http
PUT /api/admin/users/:userId/verify
Authorization: Bearer {admin-token}
```
**Sets:**
- `verification_status`: 'approved'
- `rejection_reason`: null
- `verification_reviewed_at`: current timestamp
- `is_verified`: true

#### Reject User
```http
PUT /api/admin/users/:userId/reject
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "reason": "ID document is unclear or expired"
}
```
**Sets:**
- `verification_status`: 'rejected'
- `rejection_reason`: provided reason
- `verification_reviewed_at`: current timestamp
- `is_verified`: false

#### List All Providers
```http
GET /api/admin/providers
Authorization: Bearer {admin-token}
```

#### Verify Provider (Approve)
```http
PUT /api/admin/providers/:providerId/verify
Authorization: Bearer {admin-token}
```
**Sets:**
- `verification_status`: 'approved'
- `rejection_reason`: null
- `verification_reviewed_at`: current timestamp
- `provider_isVerified`: true

#### Reject Provider
```http
PUT /api/admin/providers/:providerId/reject
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "reason": "Invalid business license or expired certificates"
}
```
**Sets:**
- `verification_status`: 'rejected'
- `rejection_reason`: provided reason
- `verification_reviewed_at`: current timestamp
- `provider_isVerified`: false

## Frontend Implementation Examples

### Display Verification Status Badge

#### React/React Native Example
```jsx
const VerificationBadge = ({ status, rejectionReason }) => {
  const statusConfig = {
    pending: { 
      color: 'orange', 
      icon: '⏳', 
      label: 'Pending Review' 
    },
    approved: { 
      color: 'green', 
      icon: '✓', 
      label: 'Verified' 
    },
    rejected: { 
      color: 'red', 
      icon: '✗', 
      label: 'Rejected' 
    }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View>
      <Badge color={config.color}>
        {config.icon} {config.label}
      </Badge>
      {status === 'rejected' && rejectionReason && (
        <Text style={{ color: 'red', fontSize: 12 }}>
          Reason: {rejectionReason}
        </Text>
      )}
    </View>
  );
};

// Usage
<VerificationBadge 
  status={user.verification_status} 
  rejectionReason={user.rejection_reason} 
/>
```

### Show Rejection Message to User

```jsx
const RejectionAlert = ({ user }) => {
  if (user.verification_status !== 'rejected') return null;

  return (
    <Alert severity="error">
      <AlertTitle>Verification Rejected</AlertTitle>
      <p>Your verification was rejected: {user.rejection_reason}</p>
      <p>Please update your documents and submit again.</p>
      <Button onClick={handleResubmit}>Resubmit Documents</Button>
    </Alert>
  );
};
```

### Admin Review Interface

```jsx
const AdminVerificationReview = ({ user, onApprove, onReject }) => {
  const [rejectionReason, setRejectionReason] = useState('');

  return (
    <Card>
      <CardHeader>
        <h3>{user.first_name} {user.last_name}</h3>
        <Badge color={getStatusColor(user.verification_status)}>
          {user.verification_status}
        </Badge>
      </CardHeader>
      
      <CardContent>
        <p>Email: {user.email}</p>
        <p>Submitted: {formatDate(user.verification_submitted_at)}</p>
        
        {user.verification_status === 'rejected' && (
          <Alert severity="warning">
            Previously rejected: {user.rejection_reason}
          </Alert>
        )}
        
        <div>
          <img src={user.profile_photo} alt="Profile" />
          <img src={user.valid_id} alt="ID" />
        </div>
      </CardContent>
      
      <CardActions>
        <Button 
          color="success" 
          onClick={() => onApprove(user.user_id)}
        >
          Approve
        </Button>
        
        <Dialog>
          <TextField
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
            multiline
            rows={3}
          />
          <Button 
            color="error" 
            onClick={() => onReject(user.user_id, rejectionReason)}
            disabled={!rejectionReason}
          >
            Reject
          </Button>
        </Dialog>
      </CardActions>
    </Card>
  );
};
```

## Common Use Cases

### 1. Show pending verification banner
```javascript
if (user.verification_status === 'pending') {
  showBanner('Your verification is pending admin review');
}
```

### 2. Show rejection with reason
```javascript
if (user.verification_status === 'rejected') {
  showAlert(`Verification rejected: ${user.rejection_reason}`);
  showButton('Resubmit Documents');
}
```

### 3. Filter verified providers only
```javascript
const verifiedProviders = providers.filter(
  p => p.verification_status === 'approved'
);
```

### 4. Track verification timeline
```javascript
const timeline = [
  {
    event: 'Submitted',
    date: user.verification_submitted_at
  },
  {
    event: user.verification_status === 'approved' ? 'Approved' : 'Rejected',
    date: user.verification_reviewed_at
  }
];
```

## Best Practices

1. **Always check `verification_status` first** - It's the source of truth
2. **Show `rejection_reason` prominently** when status is 'rejected'
3. **Use timestamps** to show users when actions occurred
4. **Maintain backward compatibility** by still supporting `is_verified` and `provider_isVerified`
5. **Validate rejection reason** - Admin must provide a clear reason when rejecting

## Migration Tips for Existing Code

### Before (Old Code)
```javascript
if (user.is_verified) {
  // User is verified
}
```

### After (New Code - Recommended)
```javascript
if (user.verification_status === 'approved') {
  // User is verified
}
```

### Backward Compatible (If needed)
```javascript
const isVerified = user.verification_status === 'approved' || user.is_verified;
```

## Testing Checklist

- [ ] Test pending status display
- [ ] Test approved status display
- [ ] Test rejected status display with reason
- [ ] Test timestamp formatting
- [ ] Test admin approve flow
- [ ] Test admin reject flow with reason validation
- [ ] Test resubmission after rejection
- [ ] Test backward compatibility with old apps

## Support

For questions or issues, contact the backend team or refer to:
- Main documentation: `VERIFICATION_FIELDS_UPDATE_SUMMARY.md`
- API documentation: Swagger UI at `/api-docs`
