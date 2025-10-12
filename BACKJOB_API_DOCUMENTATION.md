# Backjob API Documentation (Service Provider App)

## Overview

The Backjob system allows customers to request warranty work when issues persist after service completion. This documentation covers the **Service Provider** endpoints for managing backjob applications.

### Backjob Workflow

```
1. Customer applies for backjob (during warranty period)
   ↓
2. Backjob auto-approved → Warranty PAUSED
   ↓
3. Provider receives notification
   ↓
4. Provider Options:
   a) RESCHEDULE: Accept and schedule new appointment date
   b) DISPUTE: Contest the backjob with evidence
   ↓
5a. If RESCHEDULED: 
    - Appointment status → 'scheduled'
    - Provider completes work → Warranty resumes from pause
    
5b. If DISPUTED:
    - Admin reviews dispute
    - Warranty resumes from pause
    - Customer notified
```

---

## 🔑 Authentication

All endpoints require authentication via JWT token:

```
Headers:
  Authorization: Bearer <your_jwt_token>
```

**Note:** The JWT token must contain:
- `userId` - Provider ID
- `userType` - Must be 'provider'

---

## 📋 Provider Endpoints

### 1. View Appointments with Backjobs

**Endpoint:** `GET /api/appointments/provider/:providerId`

**Description:** Get all provider appointments (includes backjob information)

**Query Parameters:**
```javascript
{
  status: String (optional),        // Filter by appointment status
  page: Number (default: 1),        // Pagination page
  limit: Number (default: 10),      // Items per page
  sort_order: 'asc' | 'desc'       // Sort by scheduled_date
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 15,
      "customer_id": 5,
      "provider_id": 1,
      "service_id": 3,
      "scheduled_date": "2025-10-15T10:00:00.000Z",
      "appointment_status": "backjob",
      "final_price": 500.00,
      "repairDescription": "Fix plumbing leak",
      "warranty_days": 30,
      "warranty_expires_at": "2025-11-14T10:00:00.000Z",
      "warranty_paused_at": "2025-10-20T08:30:00.000Z",
      "warranty_remaining_days": 25,
      "days_left": 25,
      
      // Customer info
      "customer": {
        "user_id": 5,
        "first_name": "Kurt",
        "last_name": "Saldi",
        "email": "kurt@example.com",
        "phone_number": "+63 912 345 6789",
        "user_location": "Manila, Philippines",
        "exact_location": "123 Main St, Quezon City"
      },
      
      // Service info
      "service": {
        "service_id": 3,
        "service_title": "Plumbing Repair",
        "service_startingprice": 450.00
      },
      
      // Current backjob (if exists)
      "current_backjob": {
        "backjob_id": 8,
        "reason": "Leak still persists after repair",
        "status": "approved",
        "created_at": "2025-10-20T08:30:00.000Z",
        "customer_cancellation_reason": null
      }
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

**Backjob Statuses:**
- `pending` - Awaiting admin approval (currently auto-approved)
- `approved` - Approved, provider should reschedule
- `disputed` - Provider contested the backjob
- `rescheduled` - Provider has scheduled new appointment
- `cancelled-by-admin` - Admin cancelled the backjob
- `cancelled-by-customer` - Customer cancelled the backjob
- `cancelled-by-user` - User/provider cancelled the backjob

---

### 2. Dispute a Backjob

**Endpoint:** `POST /api/appointments/backjobs/:backjobId/dispute`

**Description:** Provider disputes a backjob application with reason and evidence

**URL Parameters:**
- `backjobId` - ID of the backjob to dispute

**Request Body:**
```json
{
  "dispute_reason": "The issue reported is not related to my original work. The customer damaged the pipes after I left.",
  "dispute_evidence": {
    "description": "Photos showing the work was done correctly",
    "files": [
      "https://cloudinary.com/evidence1.jpg",
      "https://cloudinary.com/evidence2.jpg"
    ],
    "notes": "Customer confirmed everything was working when I completed the job"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Backjob disputed",
  "data": {
    "backjob_id": 8,
    "appointment_id": 15,
    "customer_id": 5,
    "provider_id": 1,
    "reason": "Leak still persists after repair",
    "status": "disputed",
    "provider_dispute_reason": "The issue reported is not related to my original work...",
    "provider_dispute_evidence": {
      "description": "Photos showing the work was done correctly",
      "files": ["https://cloudinary.com/evidence1.jpg"],
      "notes": "Customer confirmed everything was working..."
    },
    "created_at": "2025-10-20T08:30:00.000Z",
    "updated_at": "2025-10-21T09:15:00.000Z"
  }
}
```

**Error Responses:**

404 - Backjob not found:
```json
{
  "success": false,
  "message": "Backjob application not found"
}
```

403 - Not authorized:
```json
{
  "success": false,
  "message": "Only the appointment provider can dispute a backjob"
}
```

400 - Cannot dispute:
```json
{
  "success": false,
  "message": "Cannot dispute a backjob with status: cancelled-by-admin"
}
```

**Notes:**
- ✅ Disputing resumes the warranty from where it was paused
- ✅ Customer receives email notification about the dispute
- ✅ Admin will review the dispute
- ⚠️ Can only dispute backjobs with status `approved` or `pending`

---

### 3. Reschedule Backjob Appointment

**Endpoint:** `PATCH /api/appointments/:appointmentId/reschedule-backjob`

**Description:** Accept backjob and schedule new appointment date

**URL Parameters:**
- `appointmentId` - ID of the appointment with approved backjob

**Request Body:**
```json
{
  "new_scheduled_date": "2025-10-25T14:00:00.000Z",
  "availability_id": 45
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Backjob appointment rescheduled",
  "data": {
    "appointment_id": 15,
    "customer_id": 5,
    "provider_id": 1,
    "service_id": 3,
    "scheduled_date": "2025-10-25T14:00:00.000Z",
    "appointment_status": "scheduled",
    "final_price": 500.00,
    "availability_id": 45,
    "warranty_paused_at": "2025-10-20T08:30:00.000Z",
    "warranty_remaining_days": 25,
    
    "customer": {
      "user_id": 5,
      "first_name": "Kurt",
      "last_name": "Saldi",
      "email": "kurt@example.com",
      "phone_number": "+63 912 345 6789"
    },
    
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "John",
      "provider_last_name": "Doe",
      "provider_email": "john@example.com",
      "provider_phone_number": "+63 998 765 4321"
    },
    
    "service": {
      "service_id": 3,
      "service_title": "Plumbing Repair",
      "service_startingprice": 450.00
    }
  }
}
```

**Error Responses:**

400 - Missing fields:
```json
{
  "success": false,
  "message": "New scheduled date and availability_id are required"
}
```

400 - Wrong status:
```json
{
  "success": false,
  "message": "Appointment is not in backjob status"
}
```

400 - No approved backjob:
```json
{
  "success": false,
  "message": "No approved backjob found for this appointment"
}
```

409 - Scheduling conflict:
```json
{
  "success": false,
  "message": "Provider already has an appointment at this time"
}
```

**Notes:**
- ✅ Appointment status changes from `backjob` → `scheduled`
- ✅ Warranty remains paused until work is completed again
- ✅ Both customer and provider receive email notifications
- ⚠️ Must have an `approved` backjob to reschedule
- ⚠️ Checks for scheduling conflicts with your other appointments

---

### 4. Upload Evidence for Backjob (Optional)

**Endpoint:** `POST /api/appointments/:appointmentId/backjob-evidence`

**Description:** Upload photos/videos as evidence (for disputes or support)

**URL Parameters:**
- `appointmentId` - ID of the appointment

**Request Body:** `multipart/form-data`
```
Form Fields:
  evidence_files: File[] (max 5 files)
```

**File Requirements:**
- Maximum 5 files per upload
- Supported formats: JPG, PNG, JPEG, MP4, MOV
- Files uploaded to Cloudinary

**Success Response (200):**
```json
{
  "success": true,
  "message": "Evidence files uploaded successfully",
  "data": {
    "files": [
      {
        "url": "https://res.cloudinary.com/fixmo/backjob-evidence/evidence_15_1_1729508123456.jpg",
        "originalName": "photo1.jpg",
        "mimetype": "image/jpeg",
        "size": 245678
      },
      {
        "url": "https://res.cloudinary.com/fixmo/backjob-evidence/evidence_15_1_1729508123789.mp4",
        "originalName": "video1.mp4",
        "mimetype": "video/mp4",
        "size": 1245678
      }
    ],
    "total_files": 2
  }
}
```

**cURL Example:**
```bash
curl -X POST "https://your-api.com/api/appointments/15/backjob-evidence" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "evidence_files=@photo1.jpg" \
  -F "evidence_files=@photo2.jpg" \
  -F "evidence_files=@video1.mp4"
```

**React Native Example:**
```javascript
const uploadEvidence = async (appointmentId, files) => {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('evidence_files', {
      uri: file.uri,
      type: file.type,
      name: file.name
    });
  });
  
  const response = await fetch(
    `${API_URL}/appointments/${appointmentId}/backjob-evidence`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );
  
  return await response.json();
};
```

**Error Responses:**

400 - No files:
```json
{
  "success": false,
  "message": "No evidence files provided"
}
```

403 - Not authorized:
```json
{
  "success": false,
  "message": "Only the appointment provider can upload evidence"
}
```

---

## 🔔 Push Notifications

Provider receives push notifications for backjob events:

### Backjob Assignment Notification
```json
{
  "title": "Warranty Work Required",
  "body": "Plumbing Repair service needs warranty work",
  "data": {
    "type": "backjob_assignment",
    "appointmentId": 15,
    "backjobId": 8,
    "serviceName": "Plumbing Repair"
  }
}
```

**When:** Customer applies for backjob (auto-approved)

**Action:** Navigate to appointment details → Show backjob options (Dispute or Reschedule)

---

## 📧 Email Notifications

### 1. Backjob Assignment Email
**Sent to:** Provider  
**When:** Customer applies for backjob  
**Subject:** "Warranty Work Required - Plumbing Repair"

**Contains:**
- Customer information
- Original appointment details
- Backjob reason and evidence
- Links to dispute or reschedule

---

### 2. Backjob Dispute Confirmation Email
**Sent to:** Provider (confirmation)  
**When:** Provider disputes backjob  
**Subject:** "Backjob Dispute Submitted"

**Contains:**
- Dispute reason summary
- Next steps (admin review)
- Warranty status (resumed)

---

### 3. Backjob Reschedule Confirmation Email
**Sent to:** Provider & Customer  
**When:** Provider reschedules backjob  
**Subject:** "Warranty Appointment Scheduled"

**Contains:**
- New appointment date and time
- Service details
- Customer/Provider contact info

---

## 🎯 UI Implementation Guide for Provider App

### 1. Appointments List Screen

**Display Backjob Badge:**
```javascript
{appointment.current_backjob && (
  <View style={styles.backjobBadge}>
    <Icon name="alert-circle" size={16} color="#FF6B6B" />
    <Text style={styles.backjobText}>
      Backjob: {appointment.current_backjob.status}
    </Text>
  </View>
)}
```

**Filter Options:**
- All Appointments
- Active Backjobs (`appointment_status === 'backjob'`)
- Disputed Backjobs

---

### 2. Appointment Detail Screen with Backjob

**Show Backjob Information:**
```javascript
{appointment.current_backjob && (
  <View style={styles.backjobSection}>
    <Text style={styles.sectionTitle}>🔧 Warranty Work Request</Text>
    
    <View style={styles.backjobCard}>
      <Text style={styles.label}>Status:</Text>
      <Text style={styles.status}>{appointment.current_backjob.status}</Text>
      
      <Text style={styles.label}>Customer Reason:</Text>
      <Text style={styles.reason}>{appointment.current_backjob.reason}</Text>
      
      <Text style={styles.label}>Submitted:</Text>
      <Text>{formatDate(appointment.current_backjob.created_at)}</Text>
      
      {/* Evidence (if provided) */}
      {appointment.current_backjob.evidence?.files && (
        <View style={styles.evidenceSection}>
          <Text style={styles.label}>Evidence:</Text>
          {appointment.current_backjob.evidence.files.map((file, idx) => (
            <TouchableOpacity key={idx} onPress={() => openFile(file)}>
              <Text style={styles.evidenceLink}>View Evidence {idx + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
    
    {/* Action Buttons */}
    {appointment.current_backjob.status === 'approved' && (
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.rescheduleButton]}
          onPress={() => handleReschedule(appointment.appointment_id)}
        >
          <Text style={styles.buttonText}>📅 Reschedule Appointment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.disputeButton]}
          onPress={() => handleDispute(appointment.current_backjob.backjob_id)}
        >
          <Text style={styles.buttonText}>⚠️ Dispute Backjob</Text>
        </TouchableOpacity>
      </View>
    )}
    
    {/* Disputed Status */}
    {appointment.current_backjob.status === 'disputed' && (
      <View style={styles.statusBanner}>
        <Icon name="clock" size={20} color="#FFA500" />
        <Text style={styles.statusText}>
          Dispute submitted. Awaiting admin review.
        </Text>
      </View>
    )}
  </View>
)}
```

---

### 3. Dispute Backjob Modal

```javascript
const DisputeBackjobModal = ({ backjobId, onClose, onSuccess }) => {
  const [disputeReason, setDisputeReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Upload evidence files first (if any)
      let uploadedFiles = [];
      if (evidenceFiles.length > 0) {
        const uploadResponse = await uploadEvidence(appointmentId, evidenceFiles);
        uploadedFiles = uploadResponse.data.files.map(f => f.url);
      }
      
      // Submit dispute
      const response = await fetch(
        `${API_URL}/appointments/backjobs/${backjobId}/dispute`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dispute_reason: disputeReason,
            dispute_evidence: {
              description: disputeReason,
              files: uploadedFiles,
              notes: 'Uploaded evidence photos'
            }
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Dispute submitted successfully');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit dispute');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal visible={true} animationType="slide">
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Dispute Backjob</Text>
        
        <Text style={styles.label}>Reason for Dispute:</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={6}
          placeholder="Explain why this backjob is not valid..."
          value={disputeReason}
          onChangeText={setDisputeReason}
        />
        
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => pickEvidence()}
        >
          <Text>📎 Upload Evidence (Optional)</Text>
        </TouchableOpacity>
        
        {evidenceFiles.length > 0 && (
          <Text style={styles.fileCount}>
            {evidenceFiles.length} file(s) selected
          </Text>
        )}
        
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={!disputeReason || loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Dispute'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
```

---

### 4. Reschedule Backjob Screen

```javascript
const RescheduleBackjobScreen = ({ route, navigation }) => {
  const { appointmentId } = route.params;
  const [selectedDate, setSelectedDate] = useState(null);
  const [availabilityId, setAvailabilityId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleReschedule = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `${API_URL}/appointments/${appointmentId}/reschedule-backjob`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            new_scheduled_date: selectedDate,
            availability_id: availabilityId
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Success', 
          'Backjob appointment rescheduled successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reschedule Warranty Work</Text>
      
      <Text style={styles.info}>
        ℹ️ Select a new date to complete the warranty work
      </Text>
      
      <Calendar
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
          loadAvailabilities(day.dateString);
        }}
        minDate={new Date().toISOString().split('T')[0]}
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: '#007AFF' }
        }}
      />
      
      {selectedDate && (
        <View style={styles.timeSlots}>
          <Text style={styles.label}>Available Time Slots:</Text>
          {/* Render your availability slots */}
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.button, (!selectedDate || !availabilityId) && styles.buttonDisabled]}
        onPress={handleReschedule}
        disabled={!selectedDate || !availabilityId || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Scheduling...' : 'Confirm Reschedule'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

---

## 🧪 Testing Scenarios

### Test Case 1: Receive Backjob Notification
1. Customer applies for backjob
2. Provider receives push notification
3. Navigate to appointment details
4. Verify backjob information displayed

### Test Case 2: Dispute Backjob
1. Open appointment with approved backjob
2. Tap "Dispute Backjob"
3. Enter dispute reason
4. Upload evidence (optional)
5. Submit dispute
6. Verify status changes to "disputed"

### Test Case 3: Reschedule Backjob
1. Open appointment with approved backjob
2. Tap "Reschedule Appointment"
3. Select new date and time
4. Confirm reschedule
5. Verify appointment status changes to "scheduled"

### Test Case 4: Complete Rescheduled Backjob
1. Mark rescheduled backjob as "in-progress"
2. Complete the warranty work
3. Mark as "finished"
4. Verify warranty resumes from where it was paused

---

## ⚠️ Important Notes

### Warranty Pause Logic
When a customer applies for a backjob:
- ✅ Warranty is **PAUSED** immediately
- ✅ Remaining days are saved
- ✅ Provider has time to reschedule without warranty expiring
- ✅ After completing rescheduled work, warranty **RESUMES** from pause point

### Example:
```
Original warranty: 30 days
Customer uses service for 5 days → Applies for backjob
Warranty paused with 25 days remaining

Provider reschedules and completes work after 10 days
Warranty resumes: Customer still has 25 days (not reduced)
```

### Dispute vs Cancel
- **Dispute:** Provider contests the backjob (requires reason + evidence)
- **Cancel:** Only customer or admin can cancel backjobs
- **Note:** Providers cannot directly cancel backjobs, only dispute them

### Status Flow
```
approved → Provider reschedules → scheduled → in-progress → finished
                                                                ↓
                                                        Warranty resumes

approved → Provider disputes → disputed → Admin reviews
                                              ↓
                                    Approved/Rejected
```

---

## 🚀 Quick Start Integration

### 1. Add to your API service:
```javascript
// services/backjobService.js
export const disputeBackjob = async (backjobId, disputeData) => {
  const response = await api.post(
    `/appointments/backjobs/${backjobId}/dispute`,
    disputeData
  );
  return response.data;
};

export const rescheduleBackjob = async (appointmentId, scheduleData) => {
  const response = await api.patch(
    `/appointments/${appointmentId}/reschedule-backjob`,
    scheduleData
  );
  return response.data;
};

export const uploadBackjobEvidence = async (appointmentId, files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('evidence_files', file);
  });
  
  const response = await api.post(
    `/appointments/${appointmentId}/backjob-evidence`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  return response.data;
};
```

### 2. Handle push notifications:
```javascript
// Handle backjob assignment notification
if (notification.data.type === 'backjob_assignment') {
  navigation.navigate('AppointmentDetail', {
    appointmentId: notification.data.appointmentId
  });
}
```

### 3. Display backjob status badge:
```javascript
const getBackjobBadgeColor = (status) => {
  switch(status) {
    case 'approved': return '#FFA500'; // Orange
    case 'disputed': return '#FF6B6B'; // Red
    case 'rescheduled': return '#4CAF50'; // Green
    default: return '#999';
  }
};
```

---

## 📞 Support

For questions or issues with the Backjob API:
- 📧 Email: support@fixmo.com
- 📱 Phone: +63 XXX XXX XXXX
- 📖 Docs: https://docs.fixmo.com/backjobs

---

**Last Updated:** October 11, 2025  
**Version:** 1.0  
**API Base URL:** `https://your-api.com/api`
