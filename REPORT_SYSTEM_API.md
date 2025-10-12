# Report System API Documentation

## Overview

The Report System allows users (customers, providers, or guests) to submit reports, feedback, complaints, or bug reports. When a report is submitted:

1. The report is stored in the database
2. Admin receives an email with report details
3. Reporter receives a confirmation email
4. **Admin can reply directly to the reporter's email** (no in-app messaging required)

## Key Features

- ✅ Public report submission (no authentication required)
- ✅ Email notifications to admin and reporter
- ✅ **Direct email replies** - Admin email has `replyTo` field set to reporter's email
- ✅ Priority levels (low, normal, high, urgent)
- ✅ Multiple report types (bug, complaint, feedback, etc.)
- ✅ Attachment support (URLs)
- ✅ Admin dashboard endpoints for managing reports
- ✅ Report statistics and filtering

---

## Report Types

```javascript
{
  "bug": "Technical issues or bugs",
  "complaint": "Service complaints",
  "feedback": "General feedback or suggestions",
  "account_issue": "Account-related problems",
  "payment_issue": "Payment or billing issues",
  "provider_issue": "Issues with service providers",
  "safety_concern": "Safety or security concerns",
  "other": "Other types of reports"
}
```

## Priority Levels

```javascript
{
  "low": "Low priority - can wait",
  "normal": "Normal priority (default)",
  "high": "High priority - needs attention soon",
  "urgent": "Urgent - needs immediate attention"
}
```

## Report Status

```javascript
{
  "pending": "Newly submitted, awaiting review",
  "in_progress": "Admin is reviewing/working on it",
  "resolved": "Issue has been resolved",
  "closed": "Report has been closed"
}
```

---

## API Endpoints

### 1. Submit Report (Public)

**POST** `/api/reports`

Submit a new report. No authentication required (public endpoint).

#### Request Body

```json
{
  "reporter_name": "John Doe",
  "reporter_email": "john@example.com",
  "reporter_phone": "+1234567890",
  "reporter_type": "customer",
  "report_type": "bug",
  "subject": "App crashes when viewing profile",
  "description": "The app crashes every time I try to view my profile page. This started happening after the latest update.",
  "attachment_urls": [
    "https://example.com/screenshot1.png",
    "https://example.com/screenshot2.png"
  ],
  "priority": "high"
}
```

#### Required Fields

- `reporter_name` (string)
- `reporter_email` (string, valid email format)
- `report_type` (string, one of the valid report types)
- `subject` (string)
- `description` (string)

#### Optional Fields

- `reporter_phone` (string)
- `reporter_type` (string: 'customer', 'provider', 'guest', default: 'guest')
- `attachment_urls` (array of strings)
- `priority` (string: 'low', 'normal', 'high', 'urgent', default: 'normal')

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Report submitted successfully. Admin will review and respond via email.",
  "data": {
    "report_id": 1,
    "reporter_email": "john@example.com",
    "report_type": "bug",
    "subject": "App crashes when viewing profile",
    "priority": "high",
    "status": "pending",
    "created_at": "2025-01-12T10:30:00.000Z"
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Missing required fields: reporter_name, reporter_email, report_type, subject, description"
}
```

#### Email Behavior

When a report is submitted:

1. **Admin receives email** with:
   - Report ID and priority badge
   - Reporter's contact information
   - Report type and subject
   - Full description
   - Attachments (if any)
   - **replyTo field set to reporter's email**

2. **Reporter receives confirmation email** with:
   - Report ID for reference
   - Summary of their report
   - Expected response time

---

### 2. Get All Reports (Admin)

**GET** `/api/reports`

Get all reports with optional filtering and pagination.

**Authentication:** Admin only

#### Query Parameters

```
?status=pending                    // Filter by status
&report_type=bug                   // Filter by report type
&priority=high                     // Filter by priority
&search=crash                      // Search in subject, description, reporter name/email
&page=1                           // Page number (default: 1)
&limit=20                         // Items per page (default: 20)
```

#### Example Request

```bash
GET /api/reports?status=pending&priority=high&page=1&limit=10
Authorization: Bearer <admin_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "report_id": 1,
      "reporter_name": "John Doe",
      "reporter_email": "john@example.com",
      "reporter_phone": "+1234567890",
      "reporter_type": "customer",
      "user_id": 5,
      "report_type": "bug",
      "subject": "App crashes when viewing profile",
      "description": "The app crashes every time I try to view my profile page...",
      "attachment_urls": ["https://example.com/screenshot1.png"],
      "priority": "high",
      "status": "pending",
      "admin_notes": null,
      "resolved_at": null,
      "resolved_by": null,
      "created_at": "2025-01-12T10:30:00.000Z",
      "updated_at": "2025-01-12T10:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 25,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 3. Get Single Report (Admin)

**GET** `/api/reports/:reportId`

Get detailed information about a specific report.

**Authentication:** Admin only

#### Example Request

```bash
GET /api/reports/1
Authorization: Bearer <admin_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "report_id": 1,
    "reporter_name": "John Doe",
    "reporter_email": "john@example.com",
    "reporter_phone": "+1234567890",
    "reporter_type": "customer",
    "user_id": 5,
    "report_type": "bug",
    "subject": "App crashes when viewing profile",
    "description": "The app crashes every time I try to view my profile page. This started happening after the latest update.",
    "attachment_urls": ["https://example.com/screenshot1.png"],
    "priority": "high",
    "status": "in_progress",
    "admin_notes": "Investigating this issue. Looks like a database query problem.",
    "resolved_at": null,
    "resolved_by": null,
    "created_at": "2025-01-12T10:30:00.000Z",
    "updated_at": "2025-01-12T11:45:00.000Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "Report not found"
}
```

---

### 4. Update Report Status (Admin)

**PATCH** `/api/reports/:reportId`

Update report status, add admin notes, or mark as resolved.

**Authentication:** Admin only

#### Request Body

```json
{
  "status": "resolved",
  "admin_notes": "Fixed in version 2.1.0. Bug was caused by incorrect data validation.",
  "resolved_by": 1
}
```

#### Optional Fields

- `status` (string: 'pending', 'in_progress', 'resolved', 'closed')
- `admin_notes` (string)
- `resolved_by` (integer, admin_id)

**Note:** When status is set to 'resolved' or 'closed', `resolved_at` timestamp is automatically set.

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "report_id": 1,
    "reporter_name": "John Doe",
    "reporter_email": "john@example.com",
    "status": "resolved",
    "admin_notes": "Fixed in version 2.1.0. Bug was caused by incorrect data validation.",
    "resolved_at": "2025-01-12T15:30:00.000Z",
    "resolved_by": 1,
    "created_at": "2025-01-12T10:30:00.000Z",
    "updated_at": "2025-01-12T15:30:00.000Z"
  }
}
```

---

### 5. Delete Report (Admin)

**DELETE** `/api/reports/:reportId`

Delete a report permanently.

**Authentication:** Admin only

#### Example Request

```bash
DELETE /api/reports/1
Authorization: Bearer <admin_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

---

### 6. Get Report Statistics (Admin)

**GET** `/api/reports/statistics`

Get overview statistics of all reports.

**Authentication:** Admin only

#### Example Request

```bash
GET /api/reports/statistics
Authorization: Bearer <admin_token>
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "total": 125,
    "by_status": {
      "pending": 25,
      "in_progress": 15,
      "resolved": 80
    },
    "by_type": {
      "bug": 40,
      "complaint": 30,
      "feedback": 25,
      "account_issue": 10,
      "payment_issue": 8,
      "provider_issue": 7,
      "safety_concern": 3,
      "other": 2
    },
    "by_priority": {
      "low": 30,
      "normal": 60,
      "high": 25,
      "urgent": 10
    }
  }
}
```

---

## Email Communication Flow

### When User Submits Report

1. **Admin receives email with:**
   ```
   From: Fixmo Support <support@fixmo.com>
   To: admin@fixmo.com
   Reply-To: john@example.com  ← CRITICAL: Admin replies go directly to reporter
   Subject: [Fixmo Report #1] 🐛 Bug Report - App crashes when viewing profile
   
   [Email contains formatted report details, priority badge, reporter contact info]
   ```

2. **Reporter receives confirmation:**
   ```
   From: Fixmo Support <support@fixmo.com>
   To: john@example.com
   Subject: [Fixmo Report #1] Your report has been received
   
   Thank you for submitting your report. Our team will review it and respond within 24-48 hours.
   ```

### When Admin Replies

Admin simply hits "Reply" in their email client (Gmail, Outlook, etc.). The reply automatically goes to the reporter's email because of the `replyTo` field.

**No in-app messaging required!**

---

## Frontend Integration Example

### React Form Component

```javascript
const ReportForm = () => {
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    reporter_phone: '',
    report_type: 'bug',
    subject: '',
    description: '',
    priority: 'normal'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Report submitted! Report ID: ${data.data.report_id}`);
        // Reset form or redirect
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert('Failed to submit report. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

### Admin Dashboard Component

```javascript
const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending',
    priority: '',
    page: 1
  });

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    const token = localStorage.getItem('adminToken');
    const query = new URLSearchParams(filters).toString();
    
    const response = await fetch(`http://localhost:3000/api/reports?${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (data.success) {
      setReports(data.data);
    }
  };

  const updateReportStatus = async (reportId, status, notes) => {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch(`http://localhost:3000/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status,
        admin_notes: notes
      })
    });

    const data = await response.json();
    if (data.success) {
      fetchReports(); // Refresh list
    }
  };

  return (
    <div>
      {/* Reports list and management UI */}
    </div>
  );
};
```

---

## Database Schema

```prisma
model Report {
  report_id        Int       @id @default(autoincrement())
  reporter_name    String
  reporter_email   String
  reporter_phone   String?
  reporter_type    String    @default("guest")
  user_id          Int?
  report_type      String
  subject          String
  description      String    @db.Text
  attachment_urls  Json?
  priority         String    @default("normal")
  status           String    @default("pending")
  admin_notes      String?   @db.Text
  resolved_at      DateTime?
  resolved_by      Int?
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt

  @@index([status])
  @@index([report_type])
  @@index([reporter_email])
}
```

---

## Testing the System

### 1. Test Report Submission

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_name": "Test User",
    "reporter_email": "test@example.com",
    "report_type": "bug",
    "subject": "Test Report",
    "description": "This is a test report to verify the system is working.",
    "priority": "normal"
  }'
```

### 2. Test Admin Endpoints

```bash
# Get all reports
curl -X GET http://localhost:3000/api/reports \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get single report
curl -X GET http://localhost:3000/api/reports/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Update report
curl -X PATCH http://localhost:3000/api/reports/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "admin_notes": "Issue has been fixed"
  }'

# Get statistics
curl -X GET http://localhost:3000/api/reports/statistics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=support@fixmo.com
ADMIN_EMAIL=admin@fixmo.com
```

---

## Common Use Cases

### 1. User Reports a Bug

```
User fills form → API stores report → Admin gets email (with replyTo) → Admin investigates → Admin replies directly to user via email
```

### 2. User Gives Feedback

```
User submits feedback → API stores → Admin receives → Admin reads → Admin replies with thanks
```

### 3. User Has Account Issue

```
User reports issue → Admin receives → Admin checks account → Admin resolves issue → Admin updates report status → Admin emails user directly
```

### 4. Admin Reviews Pending Reports

```
Admin opens dashboard → Sees list filtered by 'pending' → Clicks report → Reviews details → Updates status to 'in_progress' → Adds notes → Emails user directly
```

---

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `201` - Created (new report)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (admin endpoints without token)
- `404` - Not Found (report doesn't exist)
- `500` - Internal Server Error

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

---

## Best Practices

1. **For Reporters:**
   - Provide clear, detailed descriptions
   - Include screenshots/attachments when relevant
   - Use appropriate priority levels
   - Check email for admin responses

2. **For Admins:**
   - Review reports promptly
   - Update status as you work on them
   - Add detailed admin notes for tracking
   - Reply directly via email (hits "Reply" button)
   - Mark reports as resolved when complete

3. **For Developers:**
   - Monitor email delivery success
   - Set up error logging for failed emails
   - Regularly check for unresolved urgent reports
   - Keep report statistics updated

---

## Future Enhancements

Potential improvements for the system:

- [ ] Automated report categorization using AI
- [ ] Email notifications when report status changes
- [ ] Report threading (link related reports)
- [ ] SLA tracking (response time metrics)
- [ ] Report templates for common issues
- [ ] File upload support (not just URLs)
- [ ] Public report status page
- [ ] Report analytics dashboard

---

## Support

For issues with the report system, contact the development team or check the application logs for error details.
