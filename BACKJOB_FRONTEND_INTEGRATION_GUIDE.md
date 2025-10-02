# Backjob System - Frontend Integration Guide

## Overview
The Backjob system allows customers to request additional work when they're unsatisfied with a completed service during the warranty period. This comprehensive guide covers all backjob-related API endpoints for frontend implementation.

## Table of Contents
1. [Authentication Requirements](#authentication-requirements)
2. [Backjob Workflow](#backjob-workflow)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Frontend Implementation Examples](#frontend-implementation-examples)
6. [Error Handling](#error-handling)
7. [Email Notifications](#email-notifications)

## Authentication Requirements
All backjob endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### User Types
- **Customer**: Can apply for and cancel backjobs
- **Provider**: Can dispute backjobs and reschedule approved ones
- **Admin**: Can view, approve, and manage all backjobs

## Backjob Workflow

### Customer Flow
1. **Apply for Backjob** → Status: `approved` (auto-approved)
2. **Cancel Backjob** → Status: `cancelled-by-customer`

### Provider Flow
1. **Dispute Backjob** → Status: `disputed`
2. **Reschedule Approved Backjob** → Appointment becomes `scheduled`

### Admin Flow
1. **List all Backjobs** → View and filter backjobs
2. **Update Backjob Status** → Approve, cancel, or manage backjobs

## API Endpoints

### 1. Upload Backjob Evidence
**Upload evidence files before applying for a backjob**

```http
POST /api/appointments/{appointmentId}/backjob-evidence
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
- `evidence_files`: File array (max 5 files)

**Response:**
```json
{
  "success": true,
  "message": "Evidence files uploaded successfully",
  "data": {
    "files": [
      {
        "url": "https://cloudinary.../evidence_123_456_1696089600000.jpg",
        "originalName": "problem_photo.jpg",
        "mimetype": "image/jpeg",
        "size": 2048576
      }
    ],
    "total_files": 1
  }
}
```

**Frontend Implementation:**
```javascript
const uploadBackjobEvidence = async (appointmentId, files) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('evidence_files', file);
  });

  const response = await fetch(`/api/appointments/${appointmentId}/backjob-evidence`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return await response.json();
};
```

### 2. Apply for Backjob (Customer)
**Submit a backjob application during warranty period**

```http
POST /api/appointments/{appointmentId}/apply-backjob
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "reason": "The service was not completed properly. The issue persists after the initial work.",
  "evidence": {
    "files": [
      {
        "url": "https://cloudinary.../evidence_123_456_1696089600000.jpg",
        "originalName": "problem_photo.jpg",
        "mimetype": "image/jpeg",
        "size": 2048576
      }
    ],
    "description": "As you can see in the photos, the problem still exists and needs to be addressed."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob application automatically approved - provider can now reschedule or dispute",
  "data": {
    "backjob": {
      "backjob_id": 123,
      "appointment_id": 456,
      "customer_id": 789,
      "provider_id": 101,
      "reason": "The service was not completed properly...",
      "evidence": { /* evidence object */ },
      "status": "approved",
      "created_at": "2025-09-30T10:00:00.000Z"
    },
    "appointment": {
      "appointment_id": 456,
      "appointment_status": "backjob",
      "warranty_paused_at": "2025-09-30T10:00:00.000Z",
      "warranty_remaining_days": 25
    }
  }
}
```

**Frontend Implementation:**
```javascript
const applyForBackjob = async (appointmentId, reason, evidence) => {
  const response = await fetch(`/api/appointments/${appointmentId}/apply-backjob`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      reason,
      evidence
    })
  });

  return await response.json();
};
```

### 3. Dispute Backjob (Provider)
**Provider disputes a backjob application**

```http
POST /api/appointments/backjobs/{backjobId}/dispute
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "dispute_reason": "The work was completed as agreed. The issue reported is not related to our service.",
  "dispute_evidence": {
    "photos": ["url1", "url2"],
    "description": "Photos showing the work was completed properly"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob disputed",
  "data": {
    "backjob_id": 123,
    "status": "disputed",
    "provider_dispute_reason": "The work was completed as agreed...",
    "provider_dispute_evidence": { /* evidence object */ }
  }
}
```

**Frontend Implementation:**
```javascript
const disputeBackjob = async (backjobId, disputeReason, disputeEvidence) => {
  const response = await fetch(`/api/appointments/backjobs/${backjobId}/dispute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      dispute_reason: disputeReason,
      dispute_evidence: disputeEvidence
    })
  });

  return await response.json();
};
```

### 4. Cancel Backjob (Customer)
**Customer cancels their own backjob application**

```http
POST /api/appointments/backjobs/{backjobId}/cancel
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "cancellation_reason": "Issue was resolved by myself. No longer need the service."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob cancelled successfully by customer and warranty resumed",
  "data": {
    "backjob_id": 123,
    "status": "cancelled-by-customer",
    "customer_cancellation_reason": "Issue was resolved by myself..."
  }
}
```

**Frontend Implementation:**
```javascript
const cancelBackjob = async (backjobId, cancellationReason) => {
  const response = await fetch(`/api/appointments/backjobs/${backjobId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      cancellation_reason: cancellationReason
    })
  });

  return await response.json();
};
```

### 5. List Backjobs (Admin)
**Admin endpoint to list all backjob applications with filtering**

```http
GET /api/appointments/backjobs?status=approved&page=1&limit=10
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (`approved`, `disputed`, `cancelled-by-customer`, etc.)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "backjob_id": 123,
      "appointment_id": 456,
      "status": "approved",
      "reason": "Service was not completed properly",
      "created_at": "2025-09-30T10:00:00.000Z",
      "appointment": {
        "appointment_id": 456,
        "scheduled_date": "2025-09-28T14:00:00.000Z",
        "appointment_status": "backjob"
      },
      "customer": {
        "user_id": 789,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "provider": {
        "provider_id": 101,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane@example.com"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 47,
    "limit": 10
  }
}
```

### 6. Update Backjob Status (Admin)
**Admin endpoint to manage backjob status**

```http
PATCH /api/appointments/backjobs/{backjobId}
Content-Type: application/json
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "action": "approve",
  "admin_notes": "Approved after reviewing evidence provided by customer"
}
```

**Actions:**
- `approve`: Approve the backjob
- `cancel-by-admin`: Cancel and mark appointment as completed
- `cancel-by-user`: Cancel and resume warranty

**Response:**
```json
{
  "success": true,
  "message": "Backjob updated",
  "data": {
    "backjob_id": 123,
    "status": "approved",
    "admin_notes": "Approved after reviewing evidence..."
  }
}
```

### 7. Reschedule from Backjob (Provider)
**Provider reschedules an approved backjob to a new date**

```http
PATCH /api/appointments/{appointmentId}/reschedule-backjob
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "new_scheduled_date": "2025-10-05T14:00:00.000Z",
  "availability_id": 789
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backjob appointment rescheduled",
  "data": {
    "appointment_id": 456,
    "scheduled_date": "2025-10-05T14:00:00.000Z",
    "appointment_status": "scheduled",
    "customer": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    "serviceProvider": {
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com"
    }
  }
}
```

## Data Models

### Backjob Application
```typescript
interface BackjobApplication {
  backjob_id: number;
  appointment_id: number;
  customer_id: number;
  provider_id: number;
  reason: string;
  evidence?: {
    files?: Array<{
      url: string;
      originalName: string;
      mimetype: string;
      size: number;
    }>;
    description?: string;
  };
  status: 'pending' | 'approved' | 'disputed' | 'cancelled-by-customer' | 'cancelled-by-admin' | 'cancelled-by-user';
  provider_dispute_reason?: string;
  provider_dispute_evidence?: any;
  customer_cancellation_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}
```

### Backjob Status Values
- `pending`: Initial status (not used in current implementation)
- `approved`: Auto-approved backjob, provider can reschedule or dispute
- `disputed`: Provider has disputed the backjob
- `cancelled-by-customer`: Customer cancelled their own backjob
- `cancelled-by-admin`: Admin cancelled the backjob
- `cancelled-by-user`: Alternative cancellation by user

## Frontend Implementation Examples

### React Component for Applying Backjob
```jsx
import React, { useState } from 'react';

const BackjobApplication = ({ appointmentId }) => {
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async () => {
    if (files.length === 0) return [];
    
    const uploadResult = await uploadBackjobEvidence(appointmentId, files);
    return uploadResult.success ? uploadResult.data.files : [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload evidence files first
      const uploadedFiles = await handleFileUpload();
      
      // Apply for backjob
      const result = await applyForBackjob(appointmentId, reason, {
        files: uploadedFiles,
        description
      });

      if (result.success) {
        alert('Backjob application submitted successfully!');
        // Handle success (redirect, update UI, etc.)
      }
    } catch (error) {
      console.error('Error applying for backjob:', error);
      alert('Failed to submit backjob application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="backjob-form">
      <div className="form-group">
        <label>Reason for Backjob:</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Please describe why you need additional work..."
        />
      </div>

      <div className="form-group">
        <label>Evidence Photos/Videos (Optional):</label>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
      </div>

      <div className="form-group">
        <label>Additional Description:</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide additional details about the issue..."
        />
      </div>

      <button type="submit" disabled={loading || !reason}>
        {loading ? 'Submitting...' : 'Apply for Backjob'}
      </button>
    </form>
  );
};
```

### Provider Dispute Component
```jsx
const BackjobDispute = ({ backjobId }) => {
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');

  const handleDispute = async (e) => {
    e.preventDefault();
    
    try {
      const result = await disputeBackjob(backjobId, disputeReason, {
        description: disputeEvidence
      });

      if (result.success) {
        alert('Backjob disputed successfully');
        // Handle success
      }
    } catch (error) {
      console.error('Error disputing backjob:', error);
    }
  };

  return (
    <form onSubmit={handleDispute}>
      <div className="form-group">
        <label>Dispute Reason:</label>
        <textarea
          value={disputeReason}
          onChange={(e) => setDisputeReason(e.target.value)}
          required
          placeholder="Explain why you're disputing this backjob..."
        />
      </div>

      <div className="form-group">
        <label>Supporting Evidence:</label>
        <textarea
          value={disputeEvidence}
          onChange={(e) => setDisputeEvidence(e.target.value)}
          placeholder="Provide evidence to support your dispute..."
        />
      </div>

      <button type="submit">Submit Dispute</button>
    </form>
  );
};
```

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

### Error Status Codes
- `400`: Bad Request (validation errors, invalid data)
- `401`: Unauthorized (invalid or missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (duplicate backjob, scheduling conflicts)
- `500`: Internal Server Error

### Frontend Error Handling
```javascript
const handleBackjobError = (error, response) => {
  switch (response.status) {
    case 400:
      return 'Please check your input and try again.';
    case 401:
      return 'Please log in to continue.';
    case 403:
      return 'You don\'t have permission to perform this action.';
    case 404:
      return 'The requested item was not found.';
    case 409:
      return 'A conflict occurred. Please refresh and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};
```

## Email Notifications

The system automatically sends email notifications for backjob events:

### Customer Notifications
- **Backjob Application Confirmation**: Sent when customer applies for backjob
- **Backjob Disputed**: Sent when provider disputes the backjob
- **Backjob Rescheduled**: Sent when provider reschedules approved backjob
- **Backjob Cancelled**: Sent when backjob is cancelled

### Provider Notifications
- **New Backjob Application**: Sent when customer applies for backjob
- **Backjob Cancelled**: Sent when customer cancels backjob
- **Backjob Rescheduled**: Sent when provider reschedules backjob

## Warranty Management

### Key Concepts
1. **Warranty Pause**: When a backjob is applied, the warranty countdown is paused
2. **Warranty Resume**: When a backjob is disputed or cancelled, warranty resumes from where it was paused
3. **Warranty Expiration**: When customer manually completes appointment or admin cancels backjob, warranty expires immediately

### Frontend Considerations
- Display warranty status clearly to users
- Show remaining warranty days when applicable
- Indicate when warranty is paused due to active backjob
- Provide clear messaging about warranty implications of backjob actions

## Best Practices

### UI/UX Recommendations
1. **Clear Messaging**: Always inform users about the implications of their actions
2. **Evidence Upload**: Make it easy to upload multiple photos/videos as evidence
3. **Status Indicators**: Use clear visual indicators for different backjob statuses
4. **Confirmation Dialogs**: Show confirmation for important actions like cancellation
5. **Real-time Updates**: Consider using WebSockets for real-time status updates

### Security Considerations
1. **File Validation**: Validate file types and sizes before upload
2. **Input Sanitization**: Sanitize all user inputs before sending to API
3. **Token Management**: Handle JWT tokens securely
4. **Permission Checks**: Always verify user permissions on the frontend

### Performance Tips
1. **Lazy Loading**: Load backjob data only when needed
2. **Caching**: Cache backjob status to reduce API calls
3. **Pagination**: Implement proper pagination for backjob lists
4. **File Compression**: Consider compressing images before upload

This documentation provides everything you need to implement the backjob system in your frontend application. Each endpoint includes detailed request/response examples and practical implementation code snippets.