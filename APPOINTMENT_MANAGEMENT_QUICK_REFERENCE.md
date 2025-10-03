# Appointment Management - Quick Reference Guide

## 🚀 Quick Start

### Base URL
```
/api/appointments
```

### Authentication
All endpoints require JWT token:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

---

## 📋 API Quick Reference

### Appointments

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/appointments` | Get all appointments with filters | All |
| GET | `/api/appointments/:id` | Get appointment by ID | All |
| GET | `/api/appointments/stats` | Get appointment statistics | Admin |
| GET | `/api/appointments/provider/:providerId` | Get provider's appointments | Provider |
| GET | `/api/appointments/customer/:customerId` | Get customer's appointments | Customer |
| POST | `/api/appointments` | Create new appointment | Customer |
| PATCH | `/api/appointments/:id/status` | Update appointment status | Provider/Customer |
| PUT | `/api/appointments/:id/cancel` | Cancel appointment | Provider/Customer |
| POST | `/api/appointments/:id/admin-cancel` | Admin cancel (no-show) | Admin |
| POST | `/api/appointments/:id/complete` | Complete appointment | Customer |
| PATCH | `/api/appointments/:id/reschedule` | Reschedule appointment | Provider/Customer |

### Backjobs (Warranty Claims)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/appointments/:id/apply-backjob` | Apply for backjob | Customer |
| POST | `/api/appointments/:id/backjob-evidence` | Upload evidence files | Customer/Provider |
| POST | `/api/appointments/backjobs/:backjobId/dispute` | Dispute backjob | Provider |
| POST | `/api/appointments/backjobs/:backjobId/cancel` | Cancel backjob | Customer |
| GET | `/api/appointments/backjobs` | List all backjobs | Admin |
| PATCH | `/api/appointments/backjobs/:backjobId` | Update backjob status | Admin |
| PATCH | `/api/appointments/:id/reschedule-backjob` | Reschedule backjob | Provider |

---

## 🔄 Appointment Status Flow

```
pending → accepted → scheduled → on-the-way → in-progress 
                                                    ↓
                                               finished
                                                    ↓
                                              completed
                                                    ↓
                                             in-warranty
                                                    ↓
                                               backjob
                                              /        \
                                        disputed    rescheduled
```

---

## 💡 Common Use Cases

### 1. Get Appointments with Filters

```javascript
// Get in-warranty appointments
GET /api/appointments?status=in-warranty&page=1&limit=20

// Get appointments by date range
GET /api/appointments?from_date=2025-10-01&to_date=2025-10-31

// Get customer's appointments
GET /api/appointments/customer/10

// Get provider's appointments
GET /api/appointments/provider/5
```

### 2. Create Appointment

```javascript
POST /api/appointments
{
  "customer_id": 10,
  "provider_id": 5,
  "service_id": 3,
  "availability_id": 15,
  "scheduled_date": "2025-10-15T10:00:00.000Z",
  "repairDescription": "AC not cooling"
}
```

### 3. Update Appointment Status

```javascript
PATCH /api/appointments/125/status
{
  "status": "in-progress"
}
```

### 4. Apply for Backjob

```javascript
// Step 1: Upload evidence
POST /api/appointments/125/backjob-evidence
Content-Type: multipart/form-data
evidence_files: [File1, File2, ...]

// Response: { uploaded_files: ["url1", "url2"] }

// Step 2: Apply for backjob
POST /api/appointments/125/apply-backjob
{
  "reason": "AC unit not cooling after 2 weeks",
  "evidence": {
    "description": "Unit blows warm air",
    "files": ["url1", "url2"]
  }
}
```

### 5. Dispute Backjob (Provider)

```javascript
POST /api/appointments/backjobs/45/dispute
{
  "dispute_reason": "Issue caused by customer misuse",
  "dispute_evidence": {
    "description": "Customer used wrong voltage",
    "files": ["evidence_url"]
  }
}
```

### 6. Admin Cancel Appointment (No-Show)

```javascript
POST /api/appointments/125/admin-cancel
{
  "cancellation_reason": "Customer no-show - Provider provided evidence",
  "admin_notes": "Provider sent GPS screenshot. Customer unreachable.",
  "penalty_applied": true
}
```

### 7. List Disputed Backjobs (Admin)

```javascript
GET /api/appointments/backjobs?status=disputed&page=1&limit=10
```

### 8. Resolve Dispute (Admin)

```javascript
// Approve customer's claim
PATCH /api/appointments/backjobs/45
{
  "action": "approve",
  "admin_notes": "Customer evidence is valid"
}

// Reject customer's claim
PATCH /api/appointments/backjobs/45
{
  "action": "cancel-by-admin",
  "admin_notes": "Provider dispute is valid"
}
```

---

## 🔐 Authorization Matrix

| Endpoint | Customer | Provider | Admin |
|----------|----------|----------|-------|
| Get all appointments | ✅ (own) | ✅ (own) | ✅ (all) |
| Create appointment | ✅ | ❌ | ✅ |
| Update status | ✅ (complete) | ✅ (all) | ✅ |
| Cancel appointment | ✅ (own) | ✅ (own) | ✅ |
| Admin cancel | ❌ | ❌ | ✅ |
| Apply backjob | ✅ (own) | ❌ | ❌ |
| Dispute backjob | ❌ | ✅ (own) | ❌ |
| Cancel backjob | ✅ (own) | ❌ | ❌ |
| List backjobs | ❌ | ❌ | ✅ |
| Update backjob | ❌ | ❌ | ✅ |
| Reschedule backjob | ❌ | ✅ (own) | ❌ |

---

## 📊 Backjob Status Definitions

| Status | Description | Set By |
|--------|-------------|--------|
| `pending` | Awaiting approval | System (not used in auto-approve) |
| `approved` | Approved, awaiting reschedule | System (auto) |
| `disputed` | Provider disputes claim | Provider |
| `cancelled-by-customer` | Customer cancels claim | Customer |
| `cancelled-by-admin` | Admin rejects claim | Admin |
| `cancelled-by-user` | Admin cancels on behalf of user | Admin |
| `rescheduled` | Provider rescheduled service | Provider |

---

## ⚙️ Warranty System

### Warranty Start
```javascript
// When customer completes appointment
warranty_expires_at = finished_at + warranty_days
appointment_status = 'in-warranty'
```

### Warranty Pause (Backjob Applied)
```javascript
warranty_paused_at = new Date()
warranty_remaining_days = calculate_days_left(warranty_expires_at)
appointment_status = 'backjob'
```

### Warranty Resume (Backjob Cancelled/Disputed)
```javascript
new_warranty_expires_at = now + warranty_remaining_days
warranty_paused_at = null
warranty_remaining_days = null
appointment_status = 'in-warranty'
```

### Warranty End (Admin Cancels Backjob)
```javascript
warranty_expires_at = new Date() // Expire immediately
warranty_paused_at = null
warranty_remaining_days = null
appointment_status = 'completed'
```

---

## 🚨 Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Missing required fields, invalid format |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Appointment/backjob doesn't exist |
| 409 | Conflict | Active backjob already exists |
| 500 | Server Error | Database or system error |

---

## 📱 Frontend Integration Examples

### React Native - Book Appointment

```javascript
const bookAppointment = async () => {
  try {
    const response = await axios.post(
      '/api/appointments',
      {
        customer_id: user.user_id,
        provider_id: selectedProvider.provider_id,
        service_id: selectedService.service_id,
        availability_id: selectedSlot.availability_id,
        scheduled_date: selectedDate,
        repairDescription: description
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    if (response.data.success) {
      Alert.alert('Success', 'Appointment booked!');
      navigation.navigate('AppointmentDetails', { 
        appointmentId: response.data.data.appointment_id 
      });
    }
  } catch (error) {
    Alert.alert('Error', error.response?.data?.message || 'Booking failed');
  }
};
```

### React Native - Apply for Backjob

```javascript
const applyForBackjob = async (appointmentId) => {
  try {
    // 1. Upload evidence
    const formData = new FormData();
    evidencePhotos.forEach((photo, index) => {
      formData.append('evidence_files', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `evidence_${index}.jpg`
      });
    });

    const uploadRes = await axios.post(
      `/api/appointments/${appointmentId}/backjob-evidence`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    const evidenceUrls = uploadRes.data.data.uploaded_files;

    // 2. Apply for backjob
    const backjobRes = await axios.post(
      `/api/appointments/${appointmentId}/apply-backjob`,
      {
        reason: issueDescription,
        evidence: {
          description: issueDescription,
          files: evidenceUrls
        }
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    Alert.alert('Success', 'Warranty claim submitted successfully!');
  } catch (error) {
    Alert.alert('Error', 'Failed to submit warranty claim');
  }
};
```

### React - Admin Dispute Dashboard

```javascript
const DisputeList = () => {
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    const response = await axios.get(
      '/api/appointments/backjobs?status=disputed',
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    setDisputes(response.data.data);
  };

  const resolveDispute = async (backjobId, action, notes) => {
    await axios.patch(
      `/api/appointments/backjobs/${backjobId}`,
      { action, admin_notes: notes },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    fetchDisputes(); // Refresh
  };

  return (
    <div>
      {disputes.map(dispute => (
        <DisputeCard 
          key={dispute.backjob_id}
          dispute={dispute}
          onResolve={resolveDispute}
        />
      ))}
    </div>
  );
};
```

---

## 🧪 Testing with cURL

### Get Appointments
```bash
curl -X GET "http://localhost:3000/api/appointments?status=in-warranty" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Apply for Backjob
```bash
curl -X POST "http://localhost:3000/api/appointments/125/apply-backjob" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "AC not cooling",
    "evidence": {
      "description": "Unit blows warm air",
      "files": ["https://cloudinary.com/evidence.jpg"]
    }
  }'
```

### Dispute Backjob
```bash
curl -X POST "http://localhost:3000/api/appointments/backjobs/45/dispute" \
  -H "Authorization: Bearer PROVIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dispute_reason": "Customer misuse",
    "dispute_evidence": {
      "description": "Installation was correct",
      "files": ["https://cloudinary.com/proof.jpg"]
    }
  }'
```

### Admin Cancel (No-Show)
```bash
curl -X POST "http://localhost:3000/api/appointments/125/admin-cancel" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancellation_reason": "Customer no-show",
    "admin_notes": "Provider provided evidence",
    "penalty_applied": true
  }'
```

---

## 📝 Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment_id": 125,
    "appointment_status": "accepted",
    "scheduled_date": "2025-10-15T10:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Appointment not found",
  "error": "No appointment exists with ID 999"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* appointments array */ ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 48,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 🎯 Best Practices

### For API Consumers

1. **Always handle errors gracefully**
   ```javascript
   try {
     const response = await fetch(url);
     const data = await response.json();
     if (!data.success) throw new Error(data.message);
   } catch (error) {
     // Handle error
   }
   ```

2. **Use pagination for large datasets**
   ```javascript
   GET /api/appointments?page=1&limit=20
   ```

3. **Filter on the backend, not frontend**
   ```javascript
   // ✅ Good
   GET /api/appointments?status=in-warranty&customer_id=10

   // ❌ Bad
   GET /api/appointments
   // Then filter in frontend
   ```

4. **Cache frequently accessed data**
   ```javascript
   // Cache appointment details for 5 minutes
   const cachedAppointment = await getCached(
     `appointment_${id}`, 
     () => fetchAppointment(id), 
     300
   );
   ```

5. **Handle warranty expiration in UI**
   ```javascript
   const daysLeft = calculateDaysLeft(appointment.warranty_expires_at);
   if (daysLeft <= 3) {
     showWarrantyExpiringWarning();
   }
   ```

---

## 🔔 Webhook Events (Future Feature)

### Planned Webhook Events
- `appointment.created`
- `appointment.status_changed`
- `appointment.cancelled`
- `backjob.applied`
- `backjob.disputed`
- `backjob.resolved`
- `warranty.expiring` (3 days before)
- `warranty.expired`

---

## 📞 Support

- **API Issues**: support@fixmo.com
- **Documentation**: https://docs.fixmo.com
- **Full Documentation**: `APPOINTMENT_MANAGEMENT_DOCUMENTATION.md`

---

**Quick Reference Version:** 1.0  
**Last Updated:** October 3, 2025
