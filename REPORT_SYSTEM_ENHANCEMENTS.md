# Report System Enhancements

## ✅ Updates Applied (October 13, 2025)

### 1. Image Upload Support ✨

**Feature:** Users can now upload up to **5 images** when submitting a report.

**Details:**
- **Maximum files:** 5 images
- **File size limit:** 5MB per image
- **Accepted formats:** JPEG, PNG, GIF, WebP, etc.
- **Storage:** Images uploaded to Cloudinary (`fixmo/reports` folder)
- **Optional:** Users can submit reports with or without images

**Example:**
```javascript
// Frontend - React/React Native
const formData = new FormData();
formData.append('reporter_name', 'John Doe');
formData.append('reporter_email', 'john@example.com');
formData.append('report_type', 'provider_issue');
formData.append('subject', 'Provider issue');
formData.append('description', 'Provider was late');

// Add images (up to 5)
formData.append('images', imageFile1);
formData.append('images', imageFile2);

const response = await fetch('/api/reports', {
    method: 'POST',
    body: formData
    // Don't set Content-Type header - browser will set it automatically
});
```

---

### 2. Optional Provider ID Field 🔧

**Feature:** Users can specify which provider they're reporting.

**Use Case:**
- Reporting a specific service provider
- Provider-related complaints
- Provider behavior issues

**Field:** `provider_id` (Integer, Optional)

**Example:**
```json
{
  "reporter_name": "Jane Smith",
  "reporter_email": "jane@example.com",
  "report_type": "provider_issue",
  "subject": "Provider was unprofessional",
  "description": "The provider arrived late and was rude",
  "provider_id": 123
}
```

**Frontend Implementation:**
```jsx
// Combobox for report type
<select name="report_type" onChange={handleReportTypeChange}>
  <option value="">Select Report Type</option>
  <option value="provider_issue">Provider Issue</option>
  <option value="account_issue">Account Issue</option>
  <option value="payment_issue">Payment Issue</option>
  <option value="bug">Bug</option>
  <option value="other">Other</option>
</select>

// Show provider field only when provider_issue is selected
{reportType === 'provider_issue' && (
  <div>
    <label>Provider</label>
    <select name="provider_id">
      <option value="">Select Provider</option>
      {providers.map(p => (
        <option key={p.provider_id} value={p.provider_id}>
          {p.provider_first_name} {p.provider_last_name} - #{p.provider_id}
        </option>
      ))}
    </select>
  </div>
)}
```

---

### 3. Optional Appointment ID Field 📅

**Feature:** Users can link their report to a specific appointment/booking.

**Use Case:**
- Reporting issues with a specific booking
- Service quality complaints
- Payment disputes

**Field:** `appointment_id` (Integer, Optional)

**Example:**
```json
{
  "reporter_name": "John Doe",
  "reporter_email": "john@example.com",
  "report_type": "complaint",
  "subject": "Service not completed",
  "description": "The service was scheduled but provider never showed up",
  "appointment_id": 456
}
```

**Frontend Implementation:**
```jsx
// Show appointment field when relevant
{(reportType === 'complaint' || reportType === 'provider_issue') && (
  <div>
    <label>Booking/Appointment (Optional)</label>
    <select name="appointment_id">
      <option value="">Select Booking</option>
      {appointments.map(a => (
        <option key={a.appointment_id} value={a.appointment_id}>
          Booking #{a.appointment_id} - {a.service?.service_title} on {formatDate(a.scheduled_date)}
        </option>
      ))}
    </select>
  </div>
)}
```

---

### 4. Fixed Admin Email 📧

**Before:** Emails sent to `admin@fixmo.com` (generic)

**After:** Emails sent to **`ipafixmo@gmail.com`** ✅

**Configuration:**
```javascript
// src/services/report-mailer.js
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ipafixmo@gmail.com';
```

**Environment Variable (Optional):**
```env
ADMIN_EMAIL=ipafixmo@gmail.com
```

**Email Template Updates:**
Admin emails now include:
- Provider ID (if provided)
- Booking ID (if provided)
- Image attachments with links

---

## API Documentation

### POST /api/reports

**Endpoint:** `/api/reports`

**Method:** `POST`

**Content-Type:** `multipart/form-data` (when uploading images)

**Authentication:** None (Public endpoint)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reporter_name` | String | ✅ Yes | Reporter's full name |
| `reporter_email` | String | ✅ Yes | Reporter's email (valid format) |
| `reporter_phone` | String | ❌ No | Reporter's phone number |
| `reporter_type` | String | ❌ No | `customer`, `provider`, or `guest` |
| `provider_id` | Integer | ❌ No | ID of provider being reported |
| `appointment_id` | Integer | ❌ No | ID of appointment/booking being reported |
| `report_type` | String | ✅ Yes | Type of report (see below) |
| `subject` | String | ✅ Yes | Report subject/title |
| `description` | String | ✅ Yes | Detailed description |
| `priority` | String | ❌ No | `low`, `normal`, `high`, `urgent` (default: `normal`) |
| `images` | File[] | ❌ No | Up to 5 image files |

**Valid Report Types:**
- `bug` - Technical bugs/issues
- `complaint` - Service complaints
- `feedback` - General feedback
- `account_issue` - Account-related problems
- `payment_issue` - Payment problems
- `provider_issue` - Provider-specific issues
- `safety_concern` - Safety concerns
- `other` - Other issues

**Example Request (with images):**

```javascript
// React/React Native
const formData = new FormData();
formData.append('reporter_name', 'John Doe');
formData.append('reporter_email', 'john@example.com');
formData.append('reporter_phone', '+1234567890');
formData.append('reporter_type', 'customer');
formData.append('provider_id', '123');
formData.append('appointment_id', '456');
formData.append('report_type', 'provider_issue');
formData.append('subject', 'Provider was unprofessional');
formData.append('description', 'The provider arrived 2 hours late and was rude to me.');
formData.append('priority', 'high');

// Add images
imageFiles.forEach(file => {
  formData.append('images', file);
});

try {
  const response = await fetch('http://localhost:3000/api/reports', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  console.log('Report submitted:', data);
} catch (error) {
  console.error('Error submitting report:', error);
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Report submitted successfully. Admin will review and respond via email.",
  "data": {
    "report_id": 42,
    "reporter_email": "john@example.com",
    "provider_id": 123,
    "appointment_id": 456,
    "report_type": "provider_issue",
    "subject": "Provider was unprofessional",
    "priority": "high",
    "status": "pending",
    "has_attachments": true,
    "created_at": "2025-10-13T18:37:23.000Z"
  }
}
```

**Error Responses:**

```json
// 400 - Missing required fields
{
  "success": false,
  "message": "Missing required fields: reporter_name, reporter_email, report_type, subject, description"
}

// 400 - Invalid email
{
  "success": false,
  "message": "Invalid email format"
}

// 400 - Invalid report type
{
  "success": false,
  "message": "Invalid report_type. Must be one of: bug, complaint, feedback, account_issue, payment_issue, provider_issue, safety_concern, other"
}

// 500 - Image upload failed
{
  "success": false,
  "message": "Error uploading images. Please try again."
}
```

---

## Database Schema Updates

```prisma
model Report {
  report_id         Int      @id @default(autoincrement())
  reporter_name     String
  reporter_email    String
  reporter_phone    String?
  reporter_type     String?
  user_id           Int?
  provider_id       Int?     // NEW ✨
  appointment_id    Int?     // NEW ✨
  report_type       String
  subject           String
  description       String   @db.Text
  attachment_urls   Json?    // Stores Cloudinary URLs
  priority          String   @default("normal")
  status            String   @default("pending")
  admin_notes       String?  @db.Text
  resolved_at       DateTime?
  resolved_by       Int?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  @@index([status])
  @@index([report_type])
  @@index([reporter_email])
  @@index([provider_id])      // NEW ✨
  @@index([appointment_id])   // NEW ✨
}
```

**Migration Applied:**
```bash
npx prisma migrate dev --name add_report_provider_appointment_fields
```

**Migration File:** `20251012183723_add_report_provider_appointment_fields`

---

## Email Notifications

### Admin Email (ipafixmo@gmail.com)

**Includes:**
- ✅ Report ID, Type, Subject, Priority
- ✅ Reporter name, email, phone
- ✅ **Provider ID** (if provided)
- ✅ **Booking ID** (if provided)
- ✅ Full description
- ✅ **Image attachments with links**
- ✅ ReplyTo field = reporter's email

**Example:**

```
From: noreply@fixmo.com
To: ipafixmo@gmail.com
Reply-To: john@example.com
Subject: [Fixmo Report #42] Provider Issue - Provider was unprofessional

📢 New Report Received
[HIGH PRIORITY]

📋 Report Details
- Report ID: #42
- Type: Provider Issue
- Subject: Provider was unprofessional
- Submitted: Sunday, October 13, 2025 at 11:37 AM

👤 Reporter Information
- Name: John Doe
- Email: john@example.com
- Phone: +1234567890
- User Type: CUSTOMER
- Provider ID: #123
- Booking ID: #456

📝 Description
The provider arrived 2 hours late and was rude to me.

📎 Attachments
- Attachment 1 (opens Cloudinary link)
- Attachment 2 (opens Cloudinary link)

✅ Next Steps
- Reply directly to this email to respond to John Doe
- Review report in admin dashboard
- Investigate and take appropriate action
```

### Reporter Confirmation Email

**Includes:**
- Report ID and status
- Expected response time
- Confirmation that admin was notified

---

## Frontend Integration Examples

### React Component with Image Upload

```jsx
import React, { useState } from 'react';

const ReportForm = () => {
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    reporter_phone: '',
    report_type: '',
    subject: '',
    description: '',
    provider_id: '',
    appointment_id: '',
    priority: 'normal'
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        submitData.append(key, formData[key]);
      }
    });

    images.forEach(image => {
      submitData.append('images', image);
    });

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        body: submitData
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Report submitted successfully!');
        // Reset form
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error submitting report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Your Name"
        value={formData.reporter_name}
        onChange={(e) => setFormData({...formData, reporter_name: e.target.value})}
        required
      />
      
      <input
        type="email"
        placeholder="Your Email"
        value={formData.reporter_email}
        onChange={(e) => setFormData({...formData, reporter_email: e.target.value})}
        required
      />

      <select
        value={formData.report_type}
        onChange={(e) => setFormData({...formData, report_type: e.target.value})}
        required
      >
        <option value="">Select Report Type</option>
        <option value="provider_issue">Provider Issue</option>
        <option value="complaint">Complaint</option>
        <option value="payment_issue">Payment Issue</option>
        <option value="bug">Bug</option>
        <option value="other">Other</option>
      </select>

      {/* Show provider field for provider issues */}
      {formData.report_type === 'provider_issue' && (
        <input
          type="number"
          placeholder="Provider ID (Optional)"
          value={formData.provider_id}
          onChange={(e) => setFormData({...formData, provider_id: e.target.value})}
        />
      )}

      {/* Show appointment field for complaints */}
      {(formData.report_type === 'complaint' || formData.report_type === 'provider_issue') && (
        <input
          type="number"
          placeholder="Booking ID (Optional)"
          value={formData.appointment_id}
          onChange={(e) => setFormData({...formData, appointment_id: e.target.value})}
        />
      )}

      <input
        type="text"
        placeholder="Subject"
        value={formData.subject}
        onChange={(e) => setFormData({...formData, subject: e.target.value})}
        required
      />

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        required
      />

      <div>
        <label>Upload Images (Optional, Max 5)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />
        {images.length > 0 && (
          <p>{images.length} image(s) selected</p>
        )}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
};

export default ReportForm;
```

---

## Testing

### Test Report Submission with Images

```bash
curl -X POST http://localhost:3000/api/reports \
  -F "reporter_name=John Doe" \
  -F "reporter_email=john@example.com" \
  -F "reporter_phone=+1234567890" \
  -F "reporter_type=customer" \
  -F "provider_id=123" \
  -F "appointment_id=456" \
  -F "report_type=provider_issue" \
  -F "subject=Provider was unprofessional" \
  -F "description=The provider arrived 2 hours late and was rude." \
  -F "priority=high" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### Verify Admin Email

1. Check `ipafixmo@gmail.com` inbox
2. Look for email with subject: `[Fixmo Report #XX] ...`
3. Verify email includes:
   - Provider ID (if provided)
   - Booking ID (if provided)
   - Image attachment links
4. Click "Reply" - should go to reporter's email

---

## Summary of Changes

| Feature | Status | Description |
|---------|--------|-------------|
| Image Upload | ✅ Complete | Up to 5 images per report, stored in Cloudinary |
| Provider ID Field | ✅ Complete | Optional field to link reports to providers |
| Appointment ID Field | ✅ Complete | Optional field to link reports to bookings |
| Admin Email Fix | ✅ Complete | Changed to `ipafixmo@gmail.com` |
| Email Template Update | ✅ Complete | Includes provider_id, appointment_id, and images |
| Database Migration | ✅ Complete | Schema updated with new fields |
| API Updated | ✅ Complete | Controller handles new fields and uploads |
| Multer Middleware | ✅ Complete | File upload handling configured |

**All enhancements are LIVE and ready to use!** 🎉
