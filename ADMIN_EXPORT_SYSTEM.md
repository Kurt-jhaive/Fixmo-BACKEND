# Admin Export System Documentation (CSV & PDF)

## Overview

The Admin Export System allows administrators to export data for **Users, Service Providers, Certificates, and Appointments** in either **CSV** or **PDF** format with advanced filtering capabilities.

---

## 🔍 Is This Frontend or Backend?

### **BOTH - Here's the breakdown:**

| Component | Responsibility | Status |
|-----------|---------------|--------|
| **Backend** | ✅ Query database with filters<br>✅ Generate CSV files<br>✅ Generate PDF files<br>✅ Send files as download | **COMPLETED** |
| **Frontend** | ⏳ Provide filter UI<br>⏳ Trigger export API calls<br>⏳ Handle file downloads | **TO BE IMPLEMENTED** |

---

## Backend Implementation (✅ Complete)

### Installed Dependencies

```bash
npm install csv-writer pdfkit --save
```

- **csv-writer** - Generate CSV files
- **pdfkit** - Generate PDF files

### Files Created

1. ✅ `src/services/exportService.js` - Export generation logic
2. ✅ `src/controller/exportController.js` - API endpoints
3. ✅ `src/route/exportRoutes.js` - Route definitions
4. ✅ `src/server.js` - Routes integrated

---

## API Endpoints

All endpoints require **admin authentication**.

### Base URL
```
/api/admin/export
```

---

## 1. Export Users

**Endpoint:** `GET /api/admin/export/users`

**Authentication:** Admin token required

**Query Parameters:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `format` | string | `csv`, `pdf` | **Required** - Export format |
| `verification_status` | string | `pending`, `approved`, `rejected` | Filter by verification status |
| `is_activated` | boolean | `true`, `false` | Filter by activation status |
| `is_verified` | boolean | `true`, `false` | Filter by verification |
| `search` | string | any | Search in name, email, username |
| `start_date` | date | ISO 8601 | Filter from this date |
| `end_date` | date | ISO 8601 | Filter until this date |

**Example Requests:**

```bash
# Export all users to CSV
GET /api/admin/export/users?format=csv

# Export verified users to PDF
GET /api/admin/export/users?format=pdf&is_verified=true

# Export users created in October 2025 to CSV
GET /api/admin/export/users?format=csv&start_date=2025-10-01&end_date=2025-10-31

# Export approved and activated users to PDF
GET /api/admin/export/users?format=pdf&verification_status=approved&is_activated=true

# Search and export users with name "John" to CSV
GET /api/admin/export/users?format=csv&search=John
```

**CSV Columns:**
- User ID
- First Name
- Last Name
- Email
- Phone Number
- Location
- Username
- Verified (Yes/No)
- Verification Status
- Active (Yes/No)
- Verified By Admin ID
- Created At

**PDF Content:**
- Header with title and generation date
- Total users count
- Table with ID, Name, Email, Phone, Status, Verified

---

## 2. Export Service Providers

**Endpoint:** `GET /api/admin/export/providers`

**Authentication:** Admin token required

**Query Parameters:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `format` | string | `csv`, `pdf` | **Required** - Export format |
| `verification_status` | string | `pending`, `approved`, `rejected` | Filter by verification status |
| `provider_isActivated` | boolean | `true`, `false` | Filter by activation status |
| `provider_isVerified` | boolean | `true`, `false` | Filter by verification |
| `search` | string | any | Search in name, email, username |
| `start_date` | date | ISO 8601 | Filter from this date |
| `end_date` | date | ISO 8601 | Filter until this date |

**Example Requests:**

```bash
# Export all providers to CSV
GET /api/admin/export/providers?format=csv

# Export approved providers to PDF
GET /api/admin/export/providers?format=pdf&verification_status=approved

# Export active and verified providers to CSV
GET /api/admin/export/providers?format=csv&provider_isActivated=true&provider_isVerified=true

# Export providers registered in September 2025
GET /api/admin/export/providers?format=pdf&start_date=2025-09-01&end_date=2025-09-30
```

**CSV Columns:**
- Provider ID
- First Name
- Last Name
- Email
- Phone Number
- Location
- Username
- Verified (Yes/No)
- Verification Status
- Active (Yes/No)
- Rating
- Verified By Admin ID
- Created At

**PDF Content:**
- Header with title and generation date
- Total providers count
- Table with ID, Name, Email, Phone, Rating, Status

---

## 3. Export Certificates

**Endpoint:** `GET /api/admin/export/certificates`

**Authentication:** Admin token required

**Query Parameters:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `format` | string | `csv`, `pdf` | **Required** - Export format |
| `certificate_status` | string | `Pending`, `Approved`, `Rejected` | Filter by certificate status |
| `provider_id` | integer | any | Filter by specific provider |
| `search` | string | any | Search in certificate name/number |
| `start_date` | date | ISO 8601 | Filter from this date |
| `end_date` | date | ISO 8601 | Filter until this date |

**Example Requests:**

```bash
# Export all certificates to CSV
GET /api/admin/export/certificates?format=csv

# Export approved certificates to PDF
GET /api/admin/export/certificates?format=pdf&certificate_status=Approved

# Export certificates for provider ID 5 to CSV
GET /api/admin/export/certificates?format=csv&provider_id=5

# Export pending certificates to PDF
GET /api/admin/export/certificates?format=pdf&certificate_status=Pending

# Search certificates by name
GET /api/admin/export/certificates?format=csv&search=plumbing
```

**CSV Columns:**
- Certificate ID
- Certificate Name
- Certificate Number
- Status
- Provider Name
- Provider Email
- Expiry Date
- Reviewed By Admin ID
- Reviewed At
- Created At

**PDF Content:**
- Header with title and generation date
- Total certificates count
- Table with ID, Name, Number, Status, Provider, Expiry

---

## 4. Export Appointments

**Endpoint:** `GET /api/admin/export/appointments`

**Authentication:** Admin token required

**Query Parameters:**

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `format` | string | `csv`, `pdf` | **Required** - Export format |
| `appointment_status` | string | `pending`, `scheduled`, `completed`, `cancelled`, etc. | Filter by appointment status |
| `customer_id` | integer | any | Filter by specific customer |
| `provider_id` | integer | any | Filter by specific provider |
| `service_id` | integer | any | Filter by specific service |
| `start_date` | date | ISO 8601 | Filter from this date |
| `end_date` | date | ISO 8601 | Filter until this date |

**Example Requests:**

```bash
# Export all appointments to CSV
GET /api/admin/export/appointments?format=csv

# Export completed appointments to PDF
GET /api/admin/export/appointments?format=pdf&appointment_status=completed

# Export appointments for customer ID 10 to CSV
GET /api/admin/export/appointments?format=csv&customer_id=10

# Export appointments for provider ID 5 to PDF
GET /api/admin/export/appointments?format=pdf&provider_id=5

# Export appointments for October 2025
GET /api/admin/export/appointments?format=csv&start_date=2025-10-01&end_date=2025-10-31

# Export cancelled appointments to PDF
GET /api/admin/export/appointments?format=pdf&appointment_status=cancelled
```

**CSV Columns:**
- Appointment ID
- Customer Name
- Customer Email
- Provider Name
- Provider Email
- Service
- Status
- Scheduled Date
- Final Price
- Cancelled By Admin ID
- Created At

**PDF Content:**
- Header with title and generation date
- Total appointments count
- Table with ID, Customer, Provider, Service, Status, Date, Price
- **Note:** PDF uses landscape orientation for better readability

---

## Frontend Implementation Guide

### 1. Filter UI Component

```javascript
// ExportUsersComponent.jsx
import React, { useState } from 'react';

const ExportUsers = () => {
  const [filters, setFilters] = useState({
    format: 'csv',
    verification_status: '',
    is_activated: '',
    is_verified: '',
    search: '',
    start_date: '',
    end_date: ''
  });

  const handleExport = async () => {
    const adminToken = localStorage.getItem('adminToken');
    
    // Build query string
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/export/users?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${Date.now()}.${filters.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('Export successful!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    }
  };

  return (
    <div className="export-container">
      <h2>Export Users</h2>
      
      {/* Format Selection */}
      <div>
        <label>Format:</label>
        <select 
          value={filters.format}
          onChange={(e) => setFilters({...filters, format: e.target.value})}
        >
          <option value="csv">CSV</option>
          <option value="pdf">PDF</option>
        </select>
      </div>

      {/* Verification Status Filter */}
      <div>
        <label>Verification Status:</label>
        <select 
          value={filters.verification_status}
          onChange={(e) => setFilters({...filters, verification_status: e.target.value})}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Is Activated Filter */}
      <div>
        <label>Active Status:</label>
        <select 
          value={filters.is_activated}
          onChange={(e) => setFilters({...filters, is_activated: e.target.value})}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Search Input */}
      <div>
        <label>Search:</label>
        <input 
          type="text"
          placeholder="Search by name, email, username..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
      </div>

      {/* Date Range */}
      <div>
        <label>From Date:</label>
        <input 
          type="date"
          value={filters.start_date}
          onChange={(e) => setFilters({...filters, start_date: e.target.value})}
        />
      </div>

      <div>
        <label>To Date:</label>
        <input 
          type="date"
          value={filters.end_date}
          onChange={(e) => setFilters({...filters, end_date: e.target.value})}
        />
      </div>

      {/* Export Button */}
      <button onClick={handleExport}>
        Export to {filters.format.toUpperCase()}
      </button>
    </div>
  );
};

export default ExportUsers;
```

### 2. Alternative: Axios Implementation

```javascript
import axios from 'axios';

const exportUsers = async (filters) => {
  try {
    const response = await axios.get('/api/admin/export/users', {
      params: filters,
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      responseType: 'blob' // Important for file download
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users_export.${filters.format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

### 3. React Native Implementation

```javascript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const exportUsers = async (filters) => {
  try {
    const params = new URLSearchParams(filters).toString();
    const url = `${API_BASE_URL}/api/admin/export/users?${params}`;
    
    const downloadResult = await FileSystem.downloadAsync(
      url,
      FileSystem.documentDirectory + `users_export.${filters.format}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      }
    );

    if (downloadResult.status === 200) {
      // Share the file
      await Sharing.shareAsync(downloadResult.uri);
      Alert.alert('Success', 'Export completed!');
    }
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Error', 'Export failed');
  }
};
```

---

## Error Responses

### 400 Bad Request - Invalid Format

```json
{
  "success": false,
  "message": "Invalid format. Use 'csv' or 'pdf'"
}
```

### 401 Unauthorized - No Token

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 404 Not Found - No Data

```json
{
  "success": false,
  "message": "No users found with the specified filters"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Error exporting users",
  "error": "Detailed error message"
}
```

---

## File Management

### Auto Cleanup

Old export files are automatically deleted after **1 hour** to save server space.

```javascript
// Cleanup runs after each export
cleanupOldExports(); // Deletes files older than 1 hour
```

### Export Directory

Files are temporarily stored in:
```
/exports/
  ├── users_export_1697234567890.csv
  ├── providers_export_1697234598123.pdf
  └── appointments_export_1697234623456.csv
```

---

## Complete Example: Admin Dashboard Integration

```javascript
// AdminDashboard.jsx
import React, { useState } from 'react';

const AdminDashboard = () => {
  const [exportType, setExportType] = useState('users');
  const [format, setFormat] = useState('csv');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    
    const endpoints = {
      users: '/api/admin/export/users',
      providers: '/api/admin/export/providers',
      certificates: '/api/admin/export/certificates',
      appointments: '/api/admin/export/appointments'
    };

    try {
      const response = await fetch(
        `${endpoints[exportType]}?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_export.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert('Export successful!');
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Admin Dashboard - Export Data</h1>
      
      <select value={exportType} onChange={(e) => setExportType(e.target.value)}>
        <option value="users">Users</option>
        <option value="providers">Service Providers</option>
        <option value="certificates">Certificates</option>
        <option value="appointments">Appointments</option>
      </select>

      <select value={format} onChange={(e) => setFormat(e.target.value)}>
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
      </select>

      <button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting...' : `Export ${exportType} to ${format.toUpperCase()}`}
      </button>
    </div>
  );
};

export default AdminDashboard;
```

---

## Testing

### Test Export Users (cURL)

```bash
# CSV Export
curl -X GET "http://localhost:3000/api/admin/export/users?format=csv" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output users_export.csv

# PDF Export with filters
curl -X GET "http://localhost:3000/api/admin/export/users?format=pdf&verification_status=approved&is_activated=true" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output users_export.pdf
```

### Test Export Appointments

```bash
# Export completed appointments to CSV
curl -X GET "http://localhost:3000/api/admin/export/appointments?format=csv&appointment_status=completed" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output appointments_export.csv
```

---

## Summary

### Backend (✅ COMPLETED)
- ✅ 4 export endpoints created
- ✅ CSV generation implemented
- ✅ PDF generation implemented
- ✅ Advanced filtering support
- ✅ Admin authentication enforced
- ✅ Auto cleanup of old files

### Frontend (⏳ TO BE IMPLEMENTED)
- ⏳ Filter UI components
- ⏳ Export button triggers
- ⏳ File download handling
- ⏳ Loading states
- ⏳ Error handling

### Files Created
1. ✅ `src/services/exportService.js`
2. ✅ `src/controller/exportController.js`
3. ✅ `src/route/exportRoutes.js`
4. ✅ `src/server.js` (updated)

### Available Exports
- ✅ Users
- ✅ Service Providers
- ✅ Certificates
- ✅ Appointments

### Formats Supported
- ✅ CSV
- ✅ PDF

**The backend is ready! Frontend just needs to call the API endpoints and handle the file downloads.**
