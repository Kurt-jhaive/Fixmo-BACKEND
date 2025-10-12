# Backjob Dispute Resolution - Admin Endpoints

## Overview

When a provider disputes a backjob (claiming the original work was done correctly), admins can now make a final decision:
- **Approve Dispute** → Cancels customer's backjob request, resumes warranty
- **Reject Dispute** → Keeps backjob active, provider must reschedule

Both actions send professional email notifications to **both customer and provider**.

---

## New Features Implemented

### 1. ✅ **Admin Approve Provider Dispute**
- **Endpoint:** `POST /api/appointments/backjobs/:backjobId/approve-dispute`
- **Action:** Admin sides with provider
- **Result:** 
  - Backjob status → `cancelled-by-admin`
  - Appointment status → `in-warranty`
  - Warranty resumes from paused state
  - Customer receives explanation email
  - Provider receives confirmation email

### 2. ✅ **Admin Reject Provider Dispute**
- **Endpoint:** `POST /api/appointments/backjobs/:backjobId/reject-dispute`
- **Action:** Admin sides with customer
- **Result:**
  - Backjob status → `approved` (remains active)
  - Appointment status → `backjob` (unchanged)
  - Warranty remains paused
  - Customer receives confirmation email
  - Provider receives instruction to reschedule

---

## API Endpoints

### 1. Approve Provider's Dispute

**Cancels the customer's backjob request and resumes warranty.**

```http
POST /api/appointments/backjobs/:backjobId/approve-dispute
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "admin_notes": "Provider provided sufficient evidence. Original work was completed as specified."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Provider dispute approved. Customer backjob request cancelled and warranty resumed.",
  "data": {
    "backjob_id": 8,
    "appointment_id": 15,
    "status": "cancelled-by-admin",
    "reason": "Leak came back after 2 days",
    "provider_dispute_reason": "No leak when work was completed. Customer may have caused damage.",
    "admin_notes": "Provider provided sufficient evidence. Original work was completed as specified.",
    "resolved_at": "2025-10-12T16:30:00Z",
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-12T16:30:00Z"
  }
}
```

**What Happens:**
1. ✅ Backjob marked as `cancelled-by-admin` with `resolved_at` timestamp
2. ✅ Appointment status changes to `in-warranty`
3. ✅ Warranty resumes with remaining days (e.g., 20 days left)
4. ✅ Email sent to customer explaining the decision
5. ✅ Email sent to provider confirming dispute approval
6. ✅ Push notifications sent to both parties

---

### 2. Reject Provider's Dispute

**Keeps the customer's backjob request active. Provider must reschedule.**

```http
POST /api/appointments/backjobs/:backjobId/reject-dispute
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "admin_notes": "Customer's photos clearly show the issue. Provider must address the warranty claim."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Provider dispute rejected. Customer backjob request remains active. Provider must reschedule.",
  "data": {
    "backjob_id": 8,
    "appointment_id": 15,
    "status": "approved",
    "reason": "Leak came back after 2 days",
    "provider_dispute_reason": "No leak when work was completed. Customer may have caused damage.",
    "admin_notes": "Customer's photos clearly show the issue. Provider must address the warranty claim.",
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-12T16:35:00Z"
  }
}
```

**What Happens:**
1. ✅ Backjob status returns to `approved` (active)
2. ✅ Appointment remains in `backjob` status
3. ✅ Warranty remains paused
4. ✅ Email sent to customer confirming their request is valid
5. ✅ Email sent to provider instructing them to reschedule
6. ✅ Push notifications sent to both parties

---

## Email Notifications

### Approve Dispute Emails

#### Customer Email (Dispute Approved)
**Subject:** `Warranty Dispute Approved - Backjob #8 Cancelled`

**Key Points:**
- Admin approved provider's dispute
- Backjob request has been cancelled
- Provider's original work was determined satisfactory
- Warranty period resumes from paused state
- Customer can contact support if they disagree

#### Provider Email (Dispute Approved)
**Subject:** `Dispute Approved - Backjob #8 Cancelled`

**Key Points:**
- Admin approved your dispute
- Original work confirmed as satisfactory
- Backjob cancelled - no action required
- Customer warranty resumes
- Case closed

---

### Reject Dispute Emails

#### Customer Email (Dispute Rejected)
**Subject:** `Dispute Rejected - Backjob #8 Remains Active`

**Key Points:**
- Admin rejected provider's dispute
- Your warranty request is valid and stands
- Provider will contact you to reschedule
- Warranty remains paused until work completed
- You'll receive notification once rescheduled

#### Provider Email (Dispute Rejected)
**Subject:** `Dispute Rejected - Please Reschedule Backjob #8`

**Key Points:**
- Admin rejected your dispute
- Customer's warranty claim is valid
- You must reschedule the appointment
- Address the reported issue at no additional charge
- Failure to comply may affect your provider rating

---

## Complete Workflow Example

### Scenario: Provider Disputes Customer's Backjob Claim

**Step 1: Customer Reports Issue**
```http
POST /api/appointments/15/apply-backjob
{
  "reason": "Leak came back after 2 days",
  "evidence": { "description": "Water dripping from same pipe" }
}
```
- Result: Backjob #8 created (`status: approved`)
- Appointment status → `backjob`
- Warranty paused

---

**Step 2: Provider Files Dispute**
```http
POST /api/appointments/backjobs/8/dispute
{
  "dispute_reason": "No leak when work was completed. Customer may have caused damage.",
  "dispute_evidence": { "photos": ["before.jpg", "after.jpg"] }
}
```
- Result: Backjob status → `disputed`
- Admin review required

---

**Step 3a: Admin Approves Provider's Dispute**
```http
POST /api/appointments/backjobs/8/approve-dispute
{
  "admin_notes": "Provider photos show completed work. No issue visible."
}
```

**Result:**
| Item | Before | After |
|------|--------|-------|
| Backjob Status | `disputed` | `cancelled-by-admin` |
| Appointment Status | `backjob` | `in-warranty` |
| Warranty | Paused (20 days left) | Resumed (20 days left) |
| Customer Action | Waiting | Can apply new backjob if needed |
| Provider Action | Waiting | No action required ✅ |

**Emails Sent:**
- ✅ Customer: "Your backjob request was cancelled after review"
- ✅ Provider: "Your dispute was approved - case closed"

---

**Step 3b: Admin Rejects Provider's Dispute**
```http
POST /api/appointments/backjobs/8/reject-dispute
{
  "admin_notes": "Customer photos clearly show the leak. Provider must address."
}
```

**Result:**
| Item | Before | After |
|------|--------|-------|
| Backjob Status | `disputed` | `approved` |
| Appointment Status | `backjob` | `backjob` |
| Warranty | Paused (20 days left) | Paused (20 days left) |
| Customer Action | Waiting | Waiting for provider to reschedule |
| Provider Action | Waiting | **MUST RESCHEDULE** ⚠️ |

**Emails Sent:**
- ✅ Customer: "Your backjob request is valid - provider will reschedule"
- ✅ Provider: "Your dispute was rejected - please reschedule appointment"

---

**Step 4: Provider Reschedules (If Dispute Rejected)**
```http
PATCH /api/appointments/15/reschedule-backjob
{
  "new_scheduled_date": "2025-10-20T14:00:00Z",
  "availability_id": 456
}
```
- Result: Appointment status → `scheduled`
- Provider completes work
- Warranty resumes after completion

---

## Decision Flow Chart

```
Customer applies backjob
    ↓
Backjob created (status: approved)
    ↓
Provider disputes backjob
    ↓
Backjob status → disputed
    ↓
    ├─────── ADMIN APPROVES DISPUTE ───────┐
    │                                       │
    │  Backjob → cancelled-by-admin         │
    │  Appointment → in-warranty             │
    │  Warranty RESUMED                      │
    │  Emails sent to both parties          │
    │  Provider: No action needed ✅         │
    │  Customer: Can apply new backjob      │
    │                                       │
    └───────────── CASE CLOSED ─────────────┘
    
    ↓
    ├─────── ADMIN REJECTS DISPUTE ────────┐
    │                                       │
    │  Backjob → approved                   │
    │  Appointment → backjob                │
    │  Warranty PAUSED                      │
    │  Emails sent to both parties          │
    │  Provider: MUST RESCHEDULE ⚠️         │
    │  Customer: Waiting for provider       │
    │                                       │
    └──── Provider Reschedules & Fixes ────┘
```

---

## Admin Dashboard Integration

### UI Components

```typescript
// Admin Dispute Resolution Component
interface BackjobDispute {
  backjob_id: number;
  appointment_id: number;
  status: 'disputed';
  customer_name: string;
  provider_name: string;
  reason: string;
  provider_dispute_reason: string;
  created_at: string;
}

const DisputeResolutionCard = ({ backjob }: { backjob: BackjobDispute }) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleApproveDispute = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `/api/appointments/backjobs/${backjob.backjob_id}/approve-dispute`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ admin_notes: adminNotes }),
        }
      );
      
      if (response.ok) {
        alert('✅ Provider dispute approved! Backjob cancelled.');
        refreshBackjobsList();
      }
    } catch (error) {
      alert('❌ Error approving dispute');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDispute = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `/api/appointments/backjobs/${backjob.backjob_id}/reject-dispute`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ admin_notes: adminNotes }),
        }
      );
      
      if (response.ok) {
        alert('✅ Provider dispute rejected! Backjob remains active.');
        refreshBackjobsList();
      }
    } catch (error) {
      alert('❌ Error rejecting dispute');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="dispute-card">
      <div className="dispute-header">
        <span className="status-badge disputed">⚖️ DISPUTED</span>
        <span>Backjob #{backjob.backjob_id}</span>
      </div>

      <div className="dispute-details">
        <div className="party">
          <h4>👤 Customer: {backjob.customer_name}</h4>
          <p><strong>Claim:</strong> {backjob.reason}</p>
        </div>

        <div className="party">
          <h4>👨‍🔧 Provider: {backjob.provider_name}</h4>
          <p><strong>Dispute:</strong> {backjob.provider_dispute_reason}</p>
        </div>
      </div>

      <div className="admin-decision">
        <textarea
          placeholder="Admin notes (optional but recommended)"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
        />

        <div className="action-buttons">
          <button
            className="btn btn-success"
            onClick={handleApproveDispute}
            disabled={processing}
          >
            ✅ Approve Dispute
            <small>Cancel backjob</small>
          </button>

          <button
            className="btn btn-danger"
            onClick={handleRejectDispute}
            disabled={processing}
          >
            ❌ Reject Dispute
            <small>Keep backjob active</small>
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Error Handling

### 1. Backjob Not Found
```json
{
  "success": false,
  "message": "Backjob not found"
}
```
**HTTP Status:** `404 Not Found`

---

### 2. Invalid Status
```json
{
  "success": false,
  "message": "Only disputed backjobs can have disputes approved. Current status: approved"
}
```
**HTTP Status:** `400 Bad Request`

**Valid statuses for dispute resolution:** Only `disputed`

---

### 3. Unauthorized Access
```json
{
  "success": false,
  "message": "Admin authentication required"
}
```
**HTTP Status:** `401 Unauthorized`

---

## Testing Checklist

### Test Case 1: Approve Provider Dispute
- [ ] Create backjob (customer reports issue)
- [ ] Provider disputes backjob
- [ ] Admin approves dispute with notes
- [ ] Verify backjob status = `cancelled-by-admin`
- [ ] Verify appointment status = `in-warranty`
- [ ] Verify warranty resumed with correct remaining days
- [ ] Verify customer received dispute approval email
- [ ] Verify provider received dispute approval email
- [ ] Verify push notifications sent

### Test Case 2: Reject Provider Dispute
- [ ] Create backjob (customer reports issue)
- [ ] Provider disputes backjob
- [ ] Admin rejects dispute with notes
- [ ] Verify backjob status = `approved`
- [ ] Verify appointment status = `backjob`
- [ ] Verify warranty remains paused
- [ ] Verify customer received dispute rejection email
- [ ] Verify provider received dispute rejection email
- [ ] Verify push notifications sent
- [ ] Provider can reschedule appointment

### Test Case 3: Error Handling
- [ ] Try to approve non-disputed backjob (should fail)
- [ ] Try to reject non-disputed backjob (should fail)
- [ ] Try without admin token (should fail with 401)
- [ ] Try with invalid backjobId (should fail with 404)

### Test Case 4: Email Delivery
- [ ] Verify all 4 email templates are sent correctly
- [ ] Check email formatting and styling
- [ ] Verify all dynamic data populates correctly
- [ ] Test with missing optional fields (admin_notes)

---

## Files Modified

1. **src/controller/appointmentController.js**
   - Added `approveBackjobDispute()` function
   - Added `rejectBackjobDispute()` function

2. **src/services/backjob-mailer.js**
   - Added `sendDisputeApprovedToCustomer()`
   - Added `sendDisputeApprovedToProvider()`
   - Added `sendDisputeRejectedToCustomer()`
   - Added `sendDisputeRejectedToProvider()`

3. **src/route/appointmentRoutes.js**
   - Added `POST /backjobs/:backjobId/approve-dispute` route
   - Added `POST /backjobs/:backjobId/reject-dispute` route

---

## API Summary Table

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/backjobs` | GET | Admin | List all backjobs with filters |
| `/backjobs/:backjobId` | PATCH | Admin | Approve/cancel backjob (old method) |
| `/backjobs/:backjobId/approve-dispute` | POST | **Admin** | **Approve provider dispute** |
| `/backjobs/:backjobId/reject-dispute` | POST | **Admin** | **Reject provider dispute** |
| `/backjobs/:backjobId/dispute` | POST | Provider | Provider files dispute |
| `/backjobs/:backjobId/cancel` | POST | Customer | Customer cancels their backjob |
| `/:appointmentId/apply-backjob` | POST | Customer | Customer applies for backjob |
| `/:appointmentId/reschedule-backjob` | PATCH | Provider | Provider reschedules backjob |

---

## Status Lifecycle

```
Customer applies backjob
    ↓
[approved] ← Backjob active, provider can reschedule or dispute
    ↓
    ├─── Provider reschedules → Work completed → [completed]
    │
    ├─── Provider disputes → [disputed]
    │        ↓
    │        ├─── Admin approves dispute → [cancelled-by-admin] ← Warranty resumes
    │        │
    │        └─── Admin rejects dispute → [approved] ← Provider must reschedule
    │
    └─── Customer cancels → [cancelled-by-customer] ← Warranty resumes
```

---

## Summary

✅ **Added:** Admin dispute resolution endpoints (approve/reject)  
✅ **Added:** 4 professional email templates for dispute resolution  
✅ **Enhanced:** Backjob lifecycle management with proper status transitions  
✅ **Implemented:** Transaction-based updates for data consistency  
✅ **Improved:** Admin decision-making with optional notes  
✅ **Maintained:** Push notification support  

---

**Status:** ✅ COMPLETE  
**Date:** October 12, 2025  
**Files Changed:** 3 (controller, routes, mailer service)  
**New Endpoints:** 2 (approve-dispute, reject-dispute)  
**Email Templates:** 4 (2 per action × 2 parties)  
**Features:** Admin dispute resolution with automated notifications
