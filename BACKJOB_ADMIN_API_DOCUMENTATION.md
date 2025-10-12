# Backjob Admin API Documentation

## Overview

Admin endpoints for managing and reviewing backjob applications. Admins can view all backjobs, approve/reject disputes, and manage backjob statuses.

---

## 🔑 Authentication

All endpoints require **Admin authentication**:

```
Headers:
  Authorization: Bearer <admin_jwt_token>
```

**Note:** The JWT token must contain:
- `userType: 'admin'`
- Valid admin credentials

---

## Admin Endpoints

### 1. List All Backjob Applications

**Endpoint:** `GET /api/appointments/backjobs`

**Description:** Get all backjob applications with filtering and pagination

**Query Parameters:**
```javascript
{
  status?: String,              // Filter by status (optional)
  page?: Number (default: 1),   // Pagination page
  limit?: Number (default: 10)  // Items per page
}
```

**Status Filter Options:**
- `pending` - Awaiting admin approval
- `approved` - Approved, provider should reschedule
- `disputed` - Provider contested the backjob
- `rescheduled` - Provider has scheduled new date
- `cancelled-by-admin` - Admin cancelled
- `cancelled-by-customer` - Customer cancelled
- `cancelled-by-user` - User/provider cancelled

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "backjob_id": 8,
      "appointment_id": 15,
      "customer_id": 5,
      "provider_id": 1,
      "status": "disputed",
      "reason": "Leak still persists after repair",
      "evidence": {
        "description": "Photos showing the leak",
        "files": [
          "https://cloudinary.com/evidence1.jpg",
          "https://cloudinary.com/evidence2.jpg"
        ]
      },
      "provider_dispute_reason": "The issue is not related to my work",
      "provider_dispute_evidence": {
        "description": "Photos showing work was done correctly",
        "files": ["https://cloudinary.com/dispute1.jpg"]
      },
      "customer_cancellation_reason": null,
      "admin_notes": null,
      "created_at": "2025-10-20T08:30:00.000Z",
      "updated_at": "2025-10-21T09:15:00.000Z",
      
      // Appointment details
      "appointment": {
        "appointment_id": 15,
        "appointment_status": "backjob",
        "scheduled_date": "2025-10-15T10:00:00.000Z",
        "final_price": 500.00,
        "repairDescription": "Fix plumbing leak",
        "warranty_days": 30,
        "warranty_expires_at": "2025-11-14T10:00:00.000Z",
        "warranty_paused_at": "2025-10-20T08:30:00.000Z",
        "warranty_remaining_days": 25,
        
        "service": {
          "service_id": 3,
          "service_title": "Plumbing Repair",
          "service_startingprice": 450.00
        }
      },
      
      // Customer details
      "customer": {
        "user_id": 5,
        "first_name": "Kurt",
        "last_name": "Saldi",
        "email": "kurt@example.com",
        "phone_number": "+63 912 345 6789",
        "user_location": "Manila, Philippines"
      },
      
      // Provider details
      "provider": {
        "provider_id": 1,
        "provider_first_name": "John",
        "provider_last_name": "Doe",
        "provider_email": "john@example.com",
        "provider_phone_number": "+63 998 765 4321",
        "provider_location": "Quezon City, Philippines"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 45,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

**cURL Example:**
```bash
# Get all disputed backjobs
curl -X GET "https://your-api.com/api/appointments/backjobs?status=disputed&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**React/Next.js Example:**
```javascript
const getBackjobs = async (status = '', page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (status) {
    params.append('status', status);
  }
  
  const response = await fetch(
    `${API_URL}/appointments/backjobs?${params}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return await response.json();
};

// Usage
const disputedBackjobs = await getBackjobs('disputed', 1, 20);
```

---

### 2. Update Backjob Status (Admin Action)

**Endpoint:** `PATCH /api/appointments/backjobs/:backjobId`

**Description:** Admin approves, cancels, or manages backjob applications

**URL Parameters:**
- `backjobId` - ID of the backjob to update

**Request Body:**
```json
{
  "action": "approve" | "cancel-by-admin" | "cancel-by-user",
  "admin_notes": "Optional notes about the decision"
}
```

**Actions:**
- `approve` - Approve the backjob (provider should reschedule)
- `cancel-by-admin` - Admin rejects/cancels the backjob (ends warranty)
- `cancel-by-user` - Cancel on behalf of user (resumes warranty)

**Success Response (200):**

**Case 1: Approve Backjob**
```json
{
  "success": true,
  "message": "Backjob updated",
  "data": {
    "backjob_id": 8,
    "appointment_id": 15,
    "customer_id": 5,
    "provider_id": 1,
    "status": "approved",
    "reason": "Leak still persists",
    "evidence": {...},
    "admin_notes": "Reviewed evidence, backjob is valid",
    "created_at": "2025-10-20T08:30:00.000Z",
    "updated_at": "2025-10-22T10:00:00.000Z",
    
    "appointment": {
      "appointment_id": 15,
      "customer_id": 5,
      "provider_id": 1,
      "appointment_status": "backjob",
      "scheduled_date": "2025-10-15T10:00:00.000Z",
      "final_price": 500.00,
      
      "customer": {
        "user_id": 5,
        "first_name": "Kurt",
        "last_name": "Saldi",
        "email": "kurt@example.com"
      },
      
      "serviceProvider": {
        "provider_id": 1,
        "provider_first_name": "John",
        "provider_last_name": "Doe",
        "provider_email": "john@example.com"
      },
      
      "service": {
        "service_id": 3,
        "service_title": "Plumbing Repair",
        "service_startingprice": 450.00
      }
    }
  }
}
```

**Case 2: Cancel by Admin**
```json
{
  "success": true,
  "message": "Backjob updated",
  "data": {
    "backjob_id": 8,
    "status": "cancelled-by-admin",
    "admin_notes": "Provider dispute is valid. Issue not related to original work.",
    "appointment": {
      "appointment_status": "completed",
      "warranty_expires_at": "2025-10-22T10:00:00.000Z" // Expired immediately
    }
  }
}
```

**Error Responses:**

400 - Invalid action:
```json
{
  "success": false,
  "message": "Invalid action"
}
```

404 - Backjob not found:
```json
{
  "success": false,
  "message": "Backjob application not found"
}
```

**cURL Example:**
```bash
# Approve a backjob
curl -X PATCH "https://your-api.com/api/appointments/backjobs/8" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "admin_notes": "Reviewed evidence, backjob is valid"
  }'

# Cancel backjob (reject)
curl -X PATCH "https://your-api.com/api/appointments/backjobs/8" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel-by-admin",
    "admin_notes": "Provider dispute is valid. Not related to original work."
  }'
```

**React/Next.js Example:**
```javascript
const updateBackjobStatus = async (backjobId, action, adminNotes = '') => {
  const response = await fetch(
    `${API_URL}/appointments/backjobs/${backjobId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: action,
        admin_notes: adminNotes
      })
    }
  );
  
  return await response.json();
};

// Usage
// Approve backjob
await updateBackjobStatus(8, 'approve', 'Evidence reviewed, backjob is valid');

// Reject backjob
await updateBackjobStatus(8, 'cancel-by-admin', 'Provider dispute accepted');
```

---

## 🎯 Admin Dashboard UI Guide

### 1. Backjobs List Screen

**Display Table with Columns:**
- Backjob ID
- Customer Name
- Provider Name
- Service Title
- Status Badge
- Reason (truncated)
- Created Date
- Actions

**Status Badge Colors:**
```javascript
const getStatusColor = (status) => {
  switch(status) {
    case 'pending': return '#FFA500'; // Orange
    case 'approved': return '#4CAF50'; // Green
    case 'disputed': return '#FF6B6B'; // Red
    case 'rescheduled': return '#2196F3'; // Blue
    case 'cancelled-by-admin': return '#999'; // Gray
    case 'cancelled-by-customer': return '#999'; // Gray
    default: return '#999';
  }
};
```

**Filter Options:**
```jsx
<select onChange={(e) => filterByStatus(e.target.value)}>
  <option value="">All Statuses</option>
  <option value="pending">Pending</option>
  <option value="approved">Approved</option>
  <option value="disputed">Disputed ⚠️</option>
  <option value="rescheduled">Rescheduled</option>
  <option value="cancelled-by-admin">Cancelled by Admin</option>
  <option value="cancelled-by-customer">Cancelled by Customer</option>
</select>
```

---

### 2. Backjob Detail Modal

```jsx
const BackjobDetailModal = ({ backjob, onClose, onUpdate }) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleApprove = async () => {
    setLoading(true);
    try {
      const result = await updateBackjobStatus(
        backjob.backjob_id, 
        'approve', 
        adminNotes
      );
      
      if (result.success) {
        alert('Backjob approved! Provider will be notified.');
        onUpdate();
        onClose();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Failed to approve backjob');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!adminNotes) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setLoading(true);
    try {
      const result = await updateBackjobStatus(
        backjob.backjob_id, 
        'cancel-by-admin', 
        adminNotes
      );
      
      if (result.success) {
        alert('Backjob rejected. Warranty ended.');
        onUpdate();
        onClose();
      } else {
        alert('Error: ' + result.message);
      }
    } catch (error) {
      alert('Failed to reject backjob');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Backjob Details #{backjob.backjob_id}</h2>
        
        {/* Status Badge */}
        <div className="status-badge" style={{ 
          backgroundColor: getStatusColor(backjob.status) 
        }}>
          {backjob.status.toUpperCase()}
        </div>
        
        {/* Customer Info */}
        <div className="section">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> {backjob.customer.first_name} {backjob.customer.last_name}</p>
          <p><strong>Email:</strong> {backjob.customer.email}</p>
          <p><strong>Phone:</strong> {backjob.customer.phone_number}</p>
          <p><strong>Location:</strong> {backjob.customer.user_location}</p>
        </div>
        
        {/* Provider Info */}
        <div className="section">
          <h3>Provider Information</h3>
          <p><strong>Name:</strong> {backjob.provider.provider_first_name} {backjob.provider.provider_last_name}</p>
          <p><strong>Email:</strong> {backjob.provider.provider_email}</p>
          <p><strong>Phone:</strong> {backjob.provider.provider_phone_number}</p>
        </div>
        
        {/* Service Info */}
        <div className="section">
          <h3>Service Details</h3>
          <p><strong>Service:</strong> {backjob.appointment.service.service_title}</p>
          <p><strong>Price:</strong> ₱{backjob.appointment.final_price}</p>
          <p><strong>Original Date:</strong> {formatDate(backjob.appointment.scheduled_date)}</p>
          <p><strong>Warranty:</strong> {backjob.appointment.warranty_days} days</p>
          <p><strong>Warranty Paused At:</strong> {formatDate(backjob.appointment.warranty_paused_at)}</p>
          <p><strong>Days Remaining:</strong> {backjob.appointment.warranty_remaining_days} days</p>
        </div>
        
        {/* Customer's Backjob Reason */}
        <div className="section highlight">
          <h3>Customer's Reason</h3>
          <p>{backjob.reason}</p>
          
          {backjob.evidence?.files && (
            <div className="evidence">
              <h4>Evidence:</h4>
              {backjob.evidence.files.map((file, idx) => (
                <a key={idx} href={file} target="_blank" rel="noopener noreferrer">
                  <button>View Evidence {idx + 1}</button>
                </a>
              ))}
            </div>
          )}
        </div>
        
        {/* Provider's Dispute (if exists) */}
        {backjob.status === 'disputed' && backjob.provider_dispute_reason && (
          <div className="section dispute-section">
            <h3>⚠️ Provider's Dispute</h3>
            <p>{backjob.provider_dispute_reason}</p>
            
            {backjob.provider_dispute_evidence?.files && (
              <div className="evidence">
                <h4>Provider's Evidence:</h4>
                {backjob.provider_dispute_evidence.files.map((file, idx) => (
                  <a key={idx} href={file} target="_blank" rel="noopener noreferrer">
                    <button>View Dispute Evidence {idx + 1}</button>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Admin Actions */}
        {(backjob.status === 'pending' || backjob.status === 'disputed') && (
          <div className="admin-actions">
            <h3>Admin Decision</h3>
            
            <textarea
              placeholder="Admin notes (required for rejection)..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
            
            <div className="action-buttons">
              <button 
                className="btn-approve"
                onClick={handleApprove}
                disabled={loading}
              >
                ✅ Approve Backjob
              </button>
              
              <button 
                className="btn-reject"
                onClick={handleReject}
                disabled={loading || !adminNotes}
              >
                ❌ Reject Backjob
              </button>
            </div>
            
            <div className="info-box">
              <p><strong>Approve:</strong> Provider will be notified to reschedule. Warranty remains paused.</p>
              <p><strong>Reject:</strong> Backjob cancelled. Warranty ends immediately. Customer and provider notified.</p>
            </div>
          </div>
        )}
        
        {/* Existing Admin Notes */}
        {backjob.admin_notes && (
          <div className="section">
            <h3>Previous Admin Notes</h3>
            <p>{backjob.admin_notes}</p>
          </div>
        )}
        
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};
```

---

### 3. Dashboard Statistics

```jsx
const BackjobStats = ({ backjobs }) => {
  const stats = {
    total: backjobs.length,
    pending: backjobs.filter(b => b.status === 'pending').length,
    disputed: backjobs.filter(b => b.status === 'disputed').length,
    approved: backjobs.filter(b => b.status === 'approved').length,
    completed: backjobs.filter(b => b.status === 'rescheduled').length,
  };
  
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Backjobs</h3>
        <p className="stat-number">{stats.total}</p>
      </div>
      
      <div className="stat-card urgent">
        <h3>⚠️ Disputed</h3>
        <p className="stat-number">{stats.disputed}</p>
        <small>Requires review</small>
      </div>
      
      <div className="stat-card pending">
        <h3>Pending</h3>
        <p className="stat-number">{stats.pending}</p>
      </div>
      
      <div className="stat-card approved">
        <h3>Approved</h3>
        <p className="stat-number">{stats.approved}</p>
        <small>Awaiting provider reschedule</small>
      </div>
      
      <div className="stat-card completed">
        <h3>Rescheduled</h3>
        <p className="stat-number">{stats.completed}</p>
      </div>
    </div>
  );
};
```

---

## 🔔 Admin Notifications

When backjob status changes, notifications are sent:

### 1. Backjob Approved
**Sent to:** Provider (push + email) & Customer (email)  
**Message:** "Your warranty work request has been approved. Provider will reschedule."

### 2. Backjob Rejected
**Sent to:** Customer (push + email) & Provider (email)  
**Message:** "Your warranty work request has been reviewed and closed."

---

## 📊 Admin Workflow Diagram

```
Admin Dashboard
    │
    ├─► View All Backjobs
    │   └─► Filter by status: disputed
    │
    ├─► Click Backjob to Review
    │   │
    │   ├─► View Customer Reason + Evidence
    │   ├─► View Provider Dispute + Evidence
    │   ├─► View Appointment Details
    │   └─► View Warranty Status
    │
    └─► Make Decision
        │
        ├─► APPROVE
        │   └─► Provider notified to reschedule
        │   └─► Warranty remains paused
        │   └─► Status: 'approved'
        │
        └─► REJECT
            └─► Warranty ends immediately
            └─► Both parties notified
            └─► Status: 'cancelled-by-admin'
```

---

## 🧪 Testing Scenarios

### Test Case 1: Review Disputed Backjob
1. Admin logs into dashboard
2. Filter backjobs by "disputed" status
3. Click on backjob to view details
4. Review customer evidence
5. Review provider dispute evidence
6. Make decision (approve or reject)
7. Verify notifications sent

### Test Case 2: Approve Backjob
1. Open pending/disputed backjob
2. Review all evidence
3. Enter admin notes
4. Click "Approve Backjob"
5. Verify status changes to "approved"
6. Verify provider receives notification
7. Verify warranty remains paused

### Test Case 3: Reject Backjob
1. Open disputed backjob
2. Review provider's dispute
3. Enter rejection reason in admin notes
4. Click "Reject Backjob"
5. Verify status changes to "cancelled-by-admin"
6. Verify warranty expires immediately
7. Verify both parties notified

---

## ⚠️ Important Notes

### Decision Making Guidelines

**Approve When:**
- Customer evidence shows legitimate issue
- Issue is related to original service
- Within warranty period
- Provider dispute is weak or unfounded

**Reject When:**
- Provider dispute is valid with strong evidence
- Issue is NOT related to original service
- Customer caused the issue after service
- Issue is due to normal wear and tear
- Outside scope of warranty

### Warranty Implications

**On Approval:**
- ✅ Warranty stays PAUSED
- ✅ Provider must reschedule
- ✅ After re-completion, warranty RESUMES from pause point
- ✅ Customer keeps remaining warranty days

**On Rejection:**
- ❌ Warranty ENDS immediately
- ❌ Appointment marked as "completed"
- ❌ No further warranty claims allowed
- ❌ Both parties notified of decision

---

## 🚀 Quick Integration

```javascript
// services/adminBackjobService.js
export const adminBackjobAPI = {
  // List all backjobs
  listAll: async (filters = {}) => {
    const params = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 10,
    });
    
    if (filters.status) params.append('status', filters.status);
    
    const response = await fetch(
      `${API_URL}/appointments/backjobs?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
        },
      }
    );
    return response.json();
  },
  
  // Approve backjob
  approve: async (backjobId, notes) => {
    const response = await fetch(
      `${API_URL}/appointments/backjobs/${backjobId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          admin_notes: notes
        })
      }
    );
    return response.json();
  },
  
  // Reject backjob
  reject: async (backjobId, reason) => {
    const response = await fetch(
      `${API_URL}/appointments/backjobs/${backjobId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel-by-admin',
          admin_notes: reason
        })
      }
    );
    return response.json();
  },
};
```

---

## 📞 Support

For admin dashboard issues:
- 📧 Email: admin@fixmo.com
- 📖 Docs: https://docs.fixmo.com/admin/backjobs

---

**Last Updated:** October 12, 2025  
**Version:** 1.1  
**API Base URL:** `https://your-api.com/api`
