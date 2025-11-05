# No-Show Reporting System API Documentation

## Overview
The No-Show Reporting System allows both providers and customers to report when the other party fails to show up for a scheduled appointment. The system includes grace periods, evidence requirements, and automatic penalty enforcement.

---

## Table of Contents
1. [Provider Reports Customer No-Show](#1-provider-reports-customer-no-show)
2. [Customer Reports Provider No-Show](#2-customer-reports-provider-no-show)
3. [Grace Periods](#grace-periods)
4. [Evidence Requirements](#evidence-requirements)
5. [Penalty System Integration](#penalty-system-integration)
6. [Status Codes](#status-codes)
7. [Error Handling](#error-handling)

---

## 1. Provider Reports Customer No-Show

### Endpoint
```
POST /api/serviceProvider/appointments/:appointmentId/report-no-show
```

### Description
Allows a service provider to report that a customer did not show up for their appointment. This endpoint enforces a 45-minute grace period after the appointment starts ("On the Way" status).

### Authentication
- **Required:** Yes
- **Type:** Bearer Token (Provider)
- **Header:** `Authorization: Bearer <provider_token>`

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The ID of the appointment to report |

### Request Body (multipart/form-data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| evidence_photo | file | Yes | Photo evidence of the no-show (image file) |
| description | string | Yes | Detailed description of what happened |

### Requirements
1. ✅ Appointment must be in **"On the Way"** status
2. ✅ At least **45 minutes** must have passed since scheduled time
3. ✅ Photo evidence is required
4. ✅ Written description is required

### Request Example
```javascript
// Using fetch API
const formData = new FormData();
formData.append('evidence_photo', photoFile);
formData.append('description', 'Customer was not at the location. Waited 50 minutes, called multiple times with no response.');

const response = await fetch('/api/serviceProvider/appointments/123/report-no-show', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${providerToken}`
  },
  body: formData
});
```

```bash
# Using cURL
curl -X POST \
  'https://api.fixmo.com/api/serviceProvider/appointments/123/report-no-show' \
  -H 'Authorization: Bearer <provider_token>' \
  -F 'evidence_photo=@/path/to/photo.jpg' \
  -F 'description=Customer was not at the location...'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Customer no-show reported successfully",
  "data": {
    "appointment": {
      "appointment_id": 123,
      "status": "user_no_show",
      "customer_name": "John Doe",
      "service": "AC Repair",
      "scheduled_date": "2025-11-03T14:00:00.000Z"
    },
    "report": {
      "appointment_id": 123,
      "reported_by": "provider",
      "reporter_id": 456,
      "evidence_photo": "https://res.cloudinary.com/fixmo/image/upload/v1234567890/no-show-evidence/abc123.jpg",
      "description": "Customer was not at the location...",
      "reported_at": "2025-11-03T14:50:00.000Z",
      "time_elapsed_minutes": 50
    }
  }
}
```

### Error Responses

#### 400 - Missing Required Fields
```json
{
  "success": false,
  "message": "Photo evidence and description are required to report a no-show"
}
```

#### 400 - Invalid Appointment Status
```json
{
  "success": false,
  "message": "Cannot report no-show. Appointment must be in \"On the Way\" status. Current status: scheduled"
}
```

#### 400 - Grace Period Not Met
```json
{
  "success": false,
  "message": "Grace period not met. You can report a no-show after 45 minutes. Time elapsed: 30 minutes",
  "timeElapsed": 30,
  "gracePeriod": 45,
  "canReportAt": "2025-11-03T14:45:00.000Z"
}
```

#### 404 - Appointment Not Found
```json
{
  "success": false,
  "message": "Appointment not found or does not belong to this provider"
}
```

#### 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to report no-show",
  "error": "Error message details"
}
```

### Penalties Applied
When a customer no-show is successfully reported:
- **Immediate:** Customer receives **10-point penalty**
- **Repeated Offense:** If customer has 3 no-shows within 7 days, additional **25-point penalty** is applied
- **Status Update:** Appointment status changes to `user_no_show`
- **Tracking:** Evidence and description are permanently stored

---

## 2. Customer Reports Provider No-Show

### Endpoint
```
POST /auth/appointments/:appointmentId/report-no-show
```

### Description
Allows a customer to report that a service provider did not show up for their scheduled appointment. The customer can only report after the appointment time slot has completely ended.

### Authentication
- **Required:** Yes
- **Type:** Bearer Token (Customer)
- **Header:** `Authorization: Bearer <customer_token>`

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| appointmentId | integer | Yes | The ID of the appointment to report |

### Request Body (multipart/form-data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| evidence_photo | file | Yes | Photo evidence of the no-show (image file) |
| description | string | Yes | Detailed description of what happened |

### Requirements
1. ✅ Appointment must be in **"scheduled"** status
2. ✅ Current time must be **past the appointment end time**
3. ✅ Photo evidence is required
4. ✅ Written description is required

### Request Example
```javascript
// Using fetch API
const formData = new FormData();
formData.append('evidence_photo', photoFile);
formData.append('description', 'Provider never showed up. Appointment time was 9:00-11:00 AM. It is now 11:30 AM with no contact.');

const response = await fetch('/auth/appointments/123/report-no-show', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${customerToken}`
  },
  body: formData
});
```

```bash
# Using cURL
curl -X POST \
  'https://api.fixmo.com/auth/appointments/123/report-no-show' \
  -H 'Authorization: Bearer <customer_token>' \
  -F 'evidence_photo=@/path/to/photo.jpg' \
  -F 'description=Provider never showed up...'
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Provider no-show reported successfully",
  "data": {
    "appointment": {
      "appointment_id": 123,
      "status": "provider_no_show",
      "provider_name": "Jane Smith",
      "service": "Plumbing",
      "scheduled_date": "2025-11-03T09:00:00.000Z",
      "time_slot": "09:00 - 11:00"
    },
    "report": {
      "appointment_id": 123,
      "reported_by": "customer",
      "reporter_id": 789,
      "evidence_photo": "https://res.cloudinary.com/fixmo/image/upload/v1234567890/no-show-evidence/xyz789.jpg",
      "description": "Provider never showed up...",
      "reported_at": "2025-11-03T11:15:00.000Z",
      "time_past_appointment": 15
    }
  }
}
```

### Error Responses

#### 400 - Missing Required Fields
```json
{
  "success": false,
  "message": "Photo evidence and description are required to report a no-show"
}
```

#### 400 - Invalid Appointment Status
```json
{
  "success": false,
  "message": "Cannot report no-show. Appointment must be in \"scheduled\" status. Current status: completed"
}
```

#### 400 - Time Slot Not Ended
```json
{
  "success": false,
  "message": "Cannot report no-show yet. The appointment time slot has not ended. Appointment ends at Mon Nov 03 2025 11:00:00",
  "appointmentEndTime": "2025-11-03T11:00:00.000Z",
  "currentTime": "2025-11-03T10:30:00.000Z"
}
```

#### 400 - Cannot Determine End Time
```json
{
  "success": false,
  "message": "Cannot determine appointment end time"
}
```

#### 404 - Appointment Not Found
```json
{
  "success": false,
  "message": "Appointment not found or does not belong to you"
}
```

#### 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to report no-show",
  "error": "Error message details"
}
```

### Penalties Applied
When a provider no-show is successfully reported:
- **Immediate:** Provider receives **15-point penalty**
- **Status Update:** Appointment status changes to `provider_no_show`
- **Tracking:** Evidence and description are permanently stored
- **Admin Review:** Cases can be reviewed by admins for appeal processing

---

## 3. Grace Periods

### Provider Reporting Customer No-Show
- **Grace Period:** 45 minutes
- **Start Time:** When appointment status changes to "On the Way"
- **Rationale:** Gives customer reasonable time to arrive after provider departs

**Timeline Example:**
```
Scheduled Time: 2:00 PM
Status Changed to "On the Way": 2:00 PM
Can Report No-Show After: 2:45 PM
```

### Customer Reporting Provider No-Show
- **Grace Period:** Until appointment end time
- **Start Time:** Scheduled appointment start time
- **End Time:** Scheduled appointment end time (from availability slot)
- **Rationale:** Provider should arrive within the scheduled time window

**Timeline Example:**
```
Appointment Time Slot: 9:00 AM - 11:00 AM
Can Report No-Show After: 11:00 AM
```

---

## 4. Evidence Requirements

### Photo Evidence
- **Format:** JPG, JPEG, PNG
- **Required:** Yes, mandatory for both parties
- **Storage:** Cloudinary (permanent storage)
- **Purpose:** Visual proof of no-show situation
- **Suggestions:**
  - Timestamp visible in photo
  - Location identifiable
  - Shows attempt to reach other party (e.g., unanswered calls, messages)

### Written Description
- **Type:** String
- **Required:** Yes, mandatory for both parties
- **Minimum Length:** No specific limit, but should be descriptive
- **Content Should Include:**
  - What happened
  - Attempts made to contact other party
  - How long you waited
  - Any additional relevant details

**Good Example:**
```
"Arrived at customer location at 2:05 PM. Called customer 3 times 
(2:05, 2:20, 2:40) with no answer. Knocked on door multiple times. 
Waited until 2:50 PM (45 minutes after scheduled time). No one 
present at the address provided."
```

---

## 5. Penalty System Integration

### Customer No-Show Penalties

#### Single No-Show
- **Points Deducted:** 10 points
- **Violation Code:** `USER_NO_SHOW`
- **Tracking:** Recorded in `PenaltyViolation` table
- **Impact:** Based on total penalty points (see penalty tiers below)

#### Repeated No-Shows
- **Trigger:** 3 no-shows within 7 days
- **Additional Points Deducted:** 25 points (in addition to individual 10-point penalties)
- **Violation Code:** `USER_REPEATED_NO_SHOW`
- **Total Impact:** 3 × 10 + 25 = **55 points**

### Provider No-Show Penalties

#### Single No-Show
- **Points Deducted:** 15 points
- **Violation Code:** `PROVIDER_NO_SHOW`
- **Tracking:** Recorded in `PenaltyViolation` table
- **Impact:** Based on total penalty points

### Penalty Point Tiers

| Tier | Points Range | Status | Restrictions |
|------|--------------|--------|--------------|
| **Good Standing** | 100-81 | Active | No restrictions |
| **At Risk** | 80-71 | Active | Warning notifications |
| **Limited** | 70-61 | Active | Max 2 appointments, 3 slots |
| **Restricted** | 60-51 | Active | Max 1 appointment, 2 slots |
| **Deactivated** | ≤50 | Suspended | Account suspended |

### Automatic Checks
When a no-show is reported, the system automatically:
1. ✅ Records the violation with evidence
2. ✅ Deducts penalty points
3. ✅ Checks for repeated violations
4. ✅ Updates user/provider status if needed
5. ✅ Sends notifications (if applicable)
6. ✅ Logs all actions for audit trail

---

## 6. Status Codes

### Appointment Status Values

| Status | Description | Can Report No-Show? |
|--------|-------------|---------------------|
| `scheduled` | Appointment booked, waiting | Customer: After end time<br>Provider: No |
| `On the Way` | Provider en route to location | Provider: After 45 min<br>Customer: No |
| `in-progress` | Service currently being performed | Neither party |
| `finished` | Service completed | Neither party |
| `completed` | Customer confirmed completion | Neither party |
| `cancelled` | Appointment cancelled | Neither party |
| `user_no_show` | Customer reported as no-show | System set |
| `provider_no_show` | Provider reported as no-show | System set |

### Status Transitions

```
                    ┌──────────────┐
                    │  scheduled   │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌──────────────┐ ┌────────────┐  ┌──────────────┐
   │  cancelled   │ │ On the Way │  │provider_no_  │
   │              │ │            │  │  show        │
   └──────────────┘ └─────┬──────┘  └──────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   ┌──────────────┐ ┌────────────┐ ┌──────────────┐
   │ in-progress  │ │user_no_show│ │  cancelled   │
   └──────┬───────┘ └────────────┘ └──────────────┘
          │
          ▼
   ┌──────────────┐
   │   finished   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  completed   │
   └──────────────┘
```

---

## 7. Error Handling

### Common Error Scenarios

#### 1. Authentication Errors
**Status:** 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 2. Authorization Errors
**Status:** 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to report this appointment"
}
```

#### 3. Validation Errors
**Status:** 400 Bad Request
```json
{
  "success": false,
  "message": "Photo evidence and description are required to report a no-show"
}
```

#### 4. Business Logic Errors
**Status:** 400 Bad Request
```json
{
  "success": false,
  "message": "Grace period not met. You can report a no-show after 45 minutes.",
  "timeElapsed": 30,
  "gracePeriod": 45
}
```

#### 5. Resource Not Found
**Status:** 404 Not Found
```json
{
  "success": false,
  "message": "Appointment not found or does not belong to this provider"
}
```

#### 6. Upload Errors
**Status:** 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to upload evidence photo"
}
```

### Best Practices for Error Handling

```javascript
async function reportNoShow(appointmentId, photo, description) {
  try {
    const formData = new FormData();
    formData.append('evidence_photo', photo);
    formData.append('description', description);
    
    const response = await fetch(`/api/provider/appointments/${appointmentId}/report-no-show`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 400) {
        if (data.message.includes('grace period')) {
          // Show grace period message with countdown
          showGracePeriodMessage(data.canReportAt);
        } else if (data.message.includes('status')) {
          // Show status mismatch error
          showStatusError(data.message);
        } else {
          // Show validation error
          showValidationError(data.message);
        }
      } else if (response.status === 404) {
        showNotFoundError();
      } else {
        showGenericError();
      }
      return null;
    }
    
    // Success
    return data;
    
  } catch (error) {
    console.error('Network error:', error);
    showNetworkError();
    return null;
  }
}
```

---

## 8. Integration Examples

### React Native Example

```javascript
import { launchImageLibrary } from 'react-native-image-picker';

const ReportNoShowScreen = ({ appointmentId, userType }) => {
  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });
    
    if (result.assets && result.assets[0]) {
      setPhoto(result.assets[0]);
    }
  };
  
  const submitReport = async () => {
    if (!photo || !description.trim()) {
      Alert.alert('Error', 'Photo and description are required');
      return;
    }
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('evidence_photo', {
        uri: photo.uri,
        type: photo.type,
        name: photo.fileName,
      });
      formData.append('description', description);
      
      const endpoint = userType === 'provider' 
        ? `/api/serviceProvider/appointments/${appointmentId}/report-no-show`
        : `/auth/appointments/${appointmentId}/report-no-show`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'No-show reported successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', data.message);
      }
      
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View>
      <Button title="Select Photo" onPress={pickImage} />
      {photo && <Image source={{ uri: photo.uri }} />}
      
      <TextInput
        multiline
        placeholder="Describe what happened..."
        value={description}
        onChangeText={setDescription}
      />
      
      <Button 
        title="Submit Report" 
        onPress={submitReport}
        disabled={loading || !photo || !description.trim()}
      />
    </View>
  );
};
```

### Web Example (React)

```javascript
import { useState } from 'react';

const ReportNoShowForm = ({ appointmentId, userType }) => {
  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!photo || !description.trim()) {
      setError('Photo and description are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('evidence_photo', photo);
      formData.append('description', description);
      
      const endpoint = userType === 'provider' 
        ? `/api/serviceProvider/appointments/${appointmentId}/report-no-show`
        : `/auth/appointments/${appointmentId}/report-no-show`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('No-show reported successfully');
        window.location.href = '/appointments';
      } else {
        setError(data.message);
      }
      
    } catch (err) {
      setError('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Evidence Photo *</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handlePhotoChange}
          required
        />
      </div>
      
      <div>
        <label>Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened in detail..."
          rows={5}
          required
        />
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
};
```

---

## 9. Testing Guidelines

### Manual Testing Checklist

#### Provider Reporting Customer No-Show
- [ ] Can report when status is "On the Way" and 45+ minutes elapsed
- [ ] Cannot report before 45 minutes
- [ ] Cannot report with missing photo
- [ ] Cannot report with missing description
- [ ] Cannot report wrong appointment (belongs to another provider)
- [ ] Photo uploads successfully to Cloudinary
- [ ] Penalty points are deducted correctly (10 points)
- [ ] Repeated no-show penalty triggers at 3 within 7 days
- [ ] Appointment status changes to `user_no_show`

#### Customer Reporting Provider No-Show
- [ ] Can report when status is "scheduled" and past end time
- [ ] Cannot report before end time
- [ ] Cannot report with missing photo
- [ ] Cannot report with missing description
- [ ] Cannot report wrong appointment (belongs to another customer)
- [ ] Photo uploads successfully to Cloudinary
- [ ] Penalty points are deducted correctly (15 points)
- [ ] Appointment status changes to `provider_no_show`

### Test Data Examples

```javascript
// Test Case 1: Valid provider no-show report (45 min elapsed)
{
  appointmentId: 123,
  currentStatus: "On the Way",
  scheduledTime: "2025-11-03T14:00:00Z",
  currentTime: "2025-11-03T14:50:00Z", // 50 minutes elapsed
  photo: validImageFile,
  description: "Customer not present at location",
  expectedResult: "Success - 10 points deducted"
}

// Test Case 2: Invalid - grace period not met
{
  appointmentId: 124,
  currentStatus: "On the Way",
  scheduledTime: "2025-11-03T14:00:00Z",
  currentTime: "2025-11-03T14:30:00Z", // Only 30 minutes
  photo: validImageFile,
  description: "Customer not present",
  expectedResult: "Error - Grace period not met (30/45 minutes)"
}

// Test Case 3: Valid customer no-show report
{
  appointmentId: 125,
  currentStatus: "scheduled",
  timeSlot: "09:00 - 11:00",
  currentTime: "2025-11-03T11:15:00Z", // 15 min after end
  photo: validImageFile,
  description: "Provider never arrived",
  expectedResult: "Success - 15 points deducted"
}
```

---

## 10. FAQ

### Q: What happens if both parties try to report each other?
**A:** The first report to be submitted will be processed. The appointment status will change, preventing the other party from reporting.

### Q: Can a no-show report be appealed?
**A:** Yes, users can appeal penalty violations through the penalty system. Appeals are reviewed by admins who can reverse the penalty if justified.

### Q: What if the photo upload fails?
**A:** The entire report submission will fail with a 500 error. The user should retry with a smaller or different image file.

### Q: Are there any file size limits for photo evidence?
**A:** Cloudinary has default limits. Recommended maximum: 10MB. The mobile app should compress images before upload.

### Q: How long is evidence stored?
**A:** Evidence photos and descriptions are stored permanently in the database for audit and appeal purposes.

### Q: Can the grace period be adjusted?
**A:** The grace periods are hardcoded in the backend (45 minutes for providers, end time for customers). To change them, the code must be updated.

### Q: What time zone is used for calculations?
**A:** All times are stored and calculated in UTC. The frontend should convert to local time for display.

### Q: What happens to penalties after quarterly reset?
**A:** Penalty points reset to 100 every quarter (Jan 1, Apr 1, Jul 1, Oct 1), but violation records remain for historical tracking.

---

## 11. Support & Contact

For technical support or questions:
- **Email:** dev@fixmo.com
- **Documentation:** https://docs.fixmo.com
- **API Status:** https://status.fixmo.com

---

**Last Updated:** November 3, 2025  
**API Version:** 1.0  
**Document Version:** 1.0
