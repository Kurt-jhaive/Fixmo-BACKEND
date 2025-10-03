# Admin Panel - Appointment Management Guide

## 🎯 Overview

This guide is specifically for **admin users** who need to manage appointments, handle disputes, resolve no-show cases, and maintain the integrity of the Fixmo platform.

**Target Audience:** Platform administrators, support staff, dispute resolution team

---

## 📋 Table of Contents

1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [Viewing All Appointments](#viewing-all-appointments)
3. [Managing Backjobs and Disputes](#managing-backjobs-and-disputes)
4. [Handling No-Show Cases](#handling-no-show-cases)
5. [Penalty System](#penalty-system)
6. [Reporting and Analytics](#reporting-and-analytics)
7. [Admin Actions Reference](#admin-actions-reference)

---

## Admin Dashboard Overview

### Key Metrics to Monitor

```javascript
GET /api/appointments/stats

Response:
{
  "total_appointments": 1250,
  "pending_appointments": 45,
  "completed_appointments": 890,
  "cancelled_appointments": 78,
  "active_appointments": 156,
  "in_warranty": 89,
  "backjobs_total": 32,
  "backjobs_pending": 8,
  "backjobs_disputed": 5,
  "backjobs_resolved": 19
}
```

### Dashboard Implementation

```javascript
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const response = await axios.get('/api/appointments/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    setStats(response.data.data);
  };

  return (
    <div className="admin-dashboard">
      <h1>Appointment Management Dashboard</h1>
      
      <div className="stats-grid">
        <StatCard title="Total Appointments" value={stats?.total_appointments} />
        <StatCard title="Pending" value={stats?.pending_appointments} color="orange" />
        <StatCard title="Active Warranties" value={stats?.in_warranty} color="green" />
        <StatCard title="Disputed Backjobs" value={stats?.backjobs_disputed} color="red" />
      </div>

      <div className="quick-actions">
        <button onClick={() => navigate('/admin/disputes')}>
          Review Disputes ({stats?.backjobs_disputed})
        </button>
        <button onClick={() => navigate('/admin/no-shows')}>
          Handle No-Shows
        </button>
        <button onClick={() => navigate('/admin/appointments')}>
          View All Appointments
        </button>
      </div>
    </div>
  );
};
```

---

## Viewing All Appointments

### Filter Options

```javascript
GET /api/appointments?status=backjob&page=1&limit=20
```

**Available Filters:**
- `status`: pending, accepted, scheduled, on-the-way, in-progress, finished, completed, in-warranty, backjob, disputed, cancelled, expired
- `provider_id`: Filter by provider
- `customer_id`: Filter by customer
- `from_date`: Start date (ISO 8601)
- `to_date`: End date (ISO 8601)
- `sort_by`: Field to sort by (default: scheduled_date)
- `sort_order`: asc or desc

### Admin Appointment List Component

```javascript
const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 20
  });

  const fetchAppointments = async () => {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await axios.get(
      `/api/appointments?${queryParams}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    setAppointments(response.data.data);
  };

  return (
    <div className="appointment-list">
      <h2>All Appointments</h2>
      
      {/* Filters */}
      <div className="filters">
        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-warranty">In Warranty</option>
          <option value="backjob">Backjob</option>
          <option value="disputed">Disputed</option>
        </select>
        
        <input 
          type="date"
          onChange={(e) => setFilters({...filters, from_date: e.target.value})}
          placeholder="From Date"
        />
        
        <input 
          type="date"
          onChange={(e) => setFilters({...filters, to_date: e.target.value})}
          placeholder="To Date"
        />
        
        <button onClick={fetchAppointments}>Apply Filters</button>
      </div>

      {/* Appointment Table */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Provider</th>
            <th>Service</th>
            <th>Status</th>
            <th>Scheduled Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map(appt => (
            <tr key={appt.appointment_id}>
              <td>{appt.appointment_id}</td>
              <td>{appt.customer.first_name} {appt.customer.last_name}</td>
              <td>{appt.serviceProvider.provider_first_name}</td>
              <td>{appt.service.service_title}</td>
              <td>
                <StatusBadge status={appt.appointment_status} />
              </td>
              <td>{formatDate(appt.scheduled_date)}</td>
              <td>
                <button onClick={() => viewDetails(appt.appointment_id)}>
                  View
                </button>
                <button onClick={() => openCancelModal(appt.appointment_id)}>
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Managing Backjobs and Disputes

### List All Backjobs

```javascript
GET /api/appointments/backjobs?status=disputed&page=1&limit=10
```

### Dispute Management Dashboard

```javascript
const DisputeManagement = () => {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);

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

  const resolveDispute = async (backjobId, action, adminNotes) => {
    try {
      await axios.patch(
        `/api/appointments/backjobs/${backjobId}`,
        {
          action: action, // 'approve' or 'cancel-by-admin'
          admin_notes: adminNotes
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      Alert.success('Dispute resolved successfully');
      fetchDisputes(); // Refresh list
    } catch (error) {
      Alert.error('Failed to resolve dispute');
    }
  };

  return (
    <div className="dispute-management">
      <h2>Dispute Resolution Center</h2>
      <p className="subtitle">Review and resolve backjob disputes</p>

      <div className="dispute-list">
        {disputes.map(dispute => (
          <DisputeCard 
            key={dispute.backjob_id}
            dispute={dispute}
            onSelect={setSelectedDispute}
          />
        ))}
      </div>

      {selectedDispute && (
        <DisputeDetailModal 
          dispute={selectedDispute}
          onResolve={resolveDispute}
          onClose={() => setSelectedDispute(null)}
        />
      )}
    </div>
  );
};
```

### Dispute Detail View

```javascript
const DisputeDetailModal = ({ dispute, onResolve, onClose }) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [decision, setDecision] = useState('');

  const handleResolve = () => {
    if (!decision || !adminNotes) {
      alert('Please select a decision and add notes');
      return;
    }

    onResolve(dispute.backjob_id, decision, adminNotes);
    onClose();
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Dispute #{dispute.backjob_id}</h3>
        
        {/* Appointment Info */}
        <section className="appointment-info">
          <h4>Appointment Details</h4>
          <p>ID: {dispute.appointment_id}</p>
          <p>Service: {dispute.appointment.service?.service_title}</p>
          <p>Date: {formatDate(dispute.appointment.scheduled_date)}</p>
          <p>Price: ₱{dispute.appointment.final_price}</p>
        </section>

        {/* Customer Claim */}
        <section className="customer-claim">
          <h4>Customer's Claim</h4>
          <p><strong>Reason:</strong> {dispute.reason}</p>
          
          {dispute.evidence && (
            <>
              <p><strong>Description:</strong> {dispute.evidence.description}</p>
              
              <div className="evidence-files">
                <h5>Evidence Files:</h5>
                {dispute.evidence.files?.map((file, index) => (
                  <div key={index}>
                    <a href={file} target="_blank" rel="noopener noreferrer">
                      View Evidence {index + 1}
                    </a>
                    <img src={file} alt={`Evidence ${index + 1}`} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Provider's Dispute */}
        <section className="provider-dispute">
          <h4>Provider's Dispute</h4>
          <p><strong>Dispute Reason:</strong> {dispute.provider_dispute_reason}</p>
          
          {dispute.provider_dispute_evidence && (
            <>
              <p><strong>Description:</strong> {dispute.provider_dispute_evidence.description}</p>
              
              <div className="evidence-files">
                <h5>Provider Evidence:</h5>
                {dispute.provider_dispute_evidence.files?.map((file, index) => (
                  <div key={index}>
                    <a href={file} target="_blank" rel="noopener noreferrer">
                      View Provider Evidence {index + 1}
                    </a>
                    <img src={file} alt={`Provider Evidence ${index + 1}`} />
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Customer & Provider Info */}
        <div className="parties-info">
          <div className="customer-info">
            <h5>Customer</h5>
            <p>{dispute.customer.first_name} {dispute.customer.last_name}</p>
            <p>{dispute.customer.email}</p>
          </div>
          
          <div className="provider-info">
            <h5>Provider</h5>
            <p>{dispute.provider.provider_first_name} {dispute.provider.provider_last_name}</p>
            <p>{dispute.provider.provider_email}</p>
          </div>
        </div>

        {/* Admin Decision */}
        <section className="admin-decision">
          <h4>Admin Decision</h4>
          
          <div className="decision-options">
            <label>
              <input 
                type="radio" 
                value="approve" 
                checked={decision === 'approve'}
                onChange={(e) => setDecision(e.target.value)}
              />
              Approve Customer's Claim (Provider must fix issue)
            </label>
            
            <label>
              <input 
                type="radio" 
                value="cancel-by-admin" 
                checked={decision === 'cancel-by-admin'}
                onChange={(e) => setDecision(e.target.value)}
              />
              Reject Customer's Claim (Provider's dispute is valid)
            </label>
          </div>

          <textarea 
            placeholder="Admin notes (required) - Explain your decision..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={5}
          />

          <div className="actions">
            <button onClick={handleResolve} className="primary">
              Submit Decision
            </button>
            <button onClick={onClose} className="secondary">
              Cancel
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
```

### Decision Guidelines for Admins

#### Approve Customer's Claim (action: "approve")
✅ **When to approve:**
- Customer evidence clearly shows installation defect
- Issue occurred within reasonable time after service
- Provider's dispute lacks credible evidence
- Multiple similar complaints about this provider

❌ **When NOT to approve:**
- Evidence shows customer misuse or negligence
- Issue is clearly not related to original service
- Provider has strong counter-evidence

#### Reject Customer's Claim (action: "cancel-by-admin")
✅ **When to reject:**
- Provider evidence proves proper installation
- Customer evidence shows clear misuse
- Issue is outside warranty scope
- Customer has history of false claims

❌ **When NOT to reject:**
- Insufficient evidence from provider
- Provider has pattern of disputes
- Customer evidence is compelling

---

## Handling No-Show Cases

### No-Show Workflow

```
1. Report received (from provider or customer)
      ↓
2. Admin reviews evidence
      ↓
3. Admin cancels appointment with penalty
      ↓
4. Penalty logged in system
      ↓
5. Notification sent to both parties
```

### Customer No-Show Handler

```javascript
const NoShowHandler = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const handleCustomerNoShow = async (appointmentId, evidence, penaltyAmount) => {
    try {
      // Cancel appointment with penalty
      const response = await axios.post(
        `/api/appointments/${appointmentId}/admin-cancel`,
        {
          cancellation_reason: 'Customer no-show - Evidence verified',
          admin_notes: `Provider evidence reviewed and verified. Customer was unreachable. Penalty: ₱${penaltyAmount}`,
          penalty_applied: true,
          penalty_type: 'no_show_customer',
          penalty_amount: penaltyAmount
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success) {
        // Log penalty
        await logPenalty({
          appointment_id: appointmentId,
          user_id: selectedReport.customer_id,
          type: 'no_show',
          amount: penaltyAmount,
          evidence: evidence,
          admin_notes: response.data.data.admin_notes
        });

        // Send notifications
        await sendNoShowNotification(
          selectedReport.customer_id,
          appointmentId,
          penaltyAmount
        );

        Alert.success('No-show handled. Penalty applied.');
      }
    } catch (error) {
      Alert.error('Failed to process no-show');
      console.error(error);
    }
  };

  return (
    <div className="no-show-handler">
      <h2>No-Show Management</h2>

      <div className="reports-list">
        {reports.map(report => (
          <NoShowReportCard 
            key={report.id}
            report={report}
            onHandle={handleCustomerNoShow}
          />
        ))}
      </div>
    </div>
  );
};
```

### No-Show Report Card

```javascript
const NoShowReportCard = ({ report, onHandle }) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState(200);

  return (
    <div className="no-show-card">
      <div className="header">
        <h3>No-Show Report #{report.id}</h3>
        <span className="badge">{report.reported_by}</span>
      </div>

      <div className="details">
        <p><strong>Appointment ID:</strong> {report.appointment_id}</p>
        <p><strong>Scheduled Date:</strong> {formatDateTime(report.scheduled_date)}</p>
        <p><strong>Service:</strong> {report.service_title}</p>
        <p><strong>Price:</strong> ₱{report.final_price}</p>
      </div>

      <div className="parties">
        <div>
          <strong>Customer:</strong>
          <p>{report.customer_name}</p>
          <p>{report.customer_phone}</p>
          <p>{report.customer_email}</p>
        </div>
        <div>
          <strong>Provider:</strong>
          <p>{report.provider_name}</p>
          <p>{report.provider_phone}</p>
          <p>{report.provider_email}</p>
        </div>
      </div>

      <div className="evidence">
        <h4>Evidence Submitted</h4>
        <p>{report.evidence.description}</p>
        
        <div className="evidence-files">
          {report.evidence.photos?.map((photo, index) => (
            <div key={index}>
              <img src={photo} alt={`Evidence ${index + 1}`} />
              <a href={photo} target="_blank" rel="noopener noreferrer">
                View Full Size
              </a>
            </div>
          ))}
        </div>

        {report.evidence.location && (
          <div className="location-evidence">
            <p><strong>Location:</strong> {report.evidence.location}</p>
            <p><strong>Timestamp:</strong> {formatDateTime(report.evidence.timestamp)}</p>
          </div>
        )}
      </div>

      <div className="admin-action">
        <textarea 
          placeholder="Admin notes..."
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />

        <div className="penalty-input">
          <label>Penalty Amount (₱)</label>
          <input 
            type="number"
            value={penaltyAmount}
            onChange={(e) => setPenaltyAmount(e.target.value)}
            min="0"
            step="50"
          />
        </div>

        <div className="actions">
          <button 
            onClick={() => onHandle(
              report.appointment_id, 
              report.evidence, 
              penaltyAmount
            )}
            className="primary"
          >
            Apply Penalty & Cancel
          </button>
          <button className="secondary">
            Request More Evidence
          </button>
          <button className="tertiary">
            Dismiss Report
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Provider No-Show Handler

```javascript
const handleProviderNoShow = async (appointmentId, evidence) => {
  try {
    const response = await axios.post(
      `/api/appointments/${appointmentId}/admin-cancel`,
      {
        cancellation_reason: 'Provider no-show - Evidence verified',
        admin_notes: `Customer evidence reviewed. Provider was unreachable. Provider penalty applied.`,
        penalty_applied: true,
        penalty_type: 'no_show_provider',
        provider_penalty: true
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      // Log provider penalty
      await logProviderPenalty({
        appointment_id: appointmentId,
        provider_id: selectedReport.provider_id,
        type: 'no_show',
        penalty_points: 10, // Affects provider rating/standing
        evidence: evidence
      });

      // Customer gets refund/compensation
      await processCustomerCompensation(
        selectedReport.customer_id,
        appointmentId
      );

      Alert.success('Provider no-show handled. Penalty applied to provider.');
    }
  } catch (error) {
    Alert.error('Failed to process provider no-show');
  }
};
```

---

## Penalty System

### Penalty Types

| Type | Amount | Description |
|------|--------|-------------|
| `no_show_customer` | ₱200 | Customer didn't show up |
| `no_show_provider` | 10 points | Provider didn't show up |
| `false_backjob` | ₱100 | Customer filed false warranty claim |
| `repeated_cancellation` | ₱50-200 | Pattern of cancellations |
| `policy_violation` | Varies | Terms of service violation |

### Penalty Logging System

```javascript
const logPenalty = async (penaltyData) => {
  await axios.post('/api/admin/penalties', {
    appointment_id: penaltyData.appointment_id,
    user_id: penaltyData.user_id,
    penalty_type: penaltyData.type,
    amount: penaltyData.amount,
    reason: penaltyData.reason,
    evidence: penaltyData.evidence,
    admin_notes: penaltyData.admin_notes,
    admin_id: currentAdmin.admin_id
  }, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
};
```

### View User Penalties

```javascript
const UserPenaltyHistory = ({ userId }) => {
  const [penalties, setPenalties] = useState([]);

  useEffect(() => {
    fetchPenalties();
  }, [userId]);

  const fetchPenalties = async () => {
    const response = await axios.get(
      `/api/admin/penalties?user_id=${userId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    setPenalties(response.data.data);
  };

  return (
    <div className="penalty-history">
      <h3>Penalty History</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Reason</th>
            <th>Admin Notes</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map(penalty => (
            <tr key={penalty.id}>
              <td>{formatDate(penalty.created_at)}</td>
              <td>{penalty.penalty_type}</td>
              <td>₱{penalty.amount}</td>
              <td>{penalty.reason}</td>
              <td>{penalty.admin_notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Reporting and Analytics

### Appointment Statistics Dashboard

```javascript
const AppointmentAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: '2025-10-01',
    to: '2025-10-31'
  });

  const fetchAnalytics = async () => {
    const response = await axios.get(
      `/api/admin/analytics/appointments?from=${dateRange.from}&to=${dateRange.to}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    setAnalytics(response.data.data);
  };

  return (
    <div className="analytics-dashboard">
      <h2>Appointment Analytics</h2>

      {/* Date Range Selector */}
      <div className="date-range">
        <input 
          type="date" 
          value={dateRange.from}
          onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
        />
        <input 
          type="date" 
          value={dateRange.to}
          onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
        />
        <button onClick={fetchAnalytics}>Generate Report</button>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard title="Total Bookings" value={analytics?.total_bookings} />
        <MetricCard title="Completion Rate" value={`${analytics?.completion_rate}%`} />
        <MetricCard title="Cancellation Rate" value={`${analytics?.cancellation_rate}%`} />
        <MetricCard title="Average Rating" value={analytics?.avg_rating} />
      </div>

      {/* Charts */}
      <div className="charts">
        <BarChart data={analytics?.bookings_by_day} />
        <PieChart data={analytics?.status_distribution} />
        <LineChart data={analytics?.warranty_claims_trend} />
      </div>

      {/* Detailed Tables */}
      <div className="tables">
        <h3>Top Performing Providers</h3>
        <table>
          {/* Provider performance table */}
        </table>

        <h3>Problem Users (High Cancellation Rate)</h3>
        <table>
          {/* Problem users table */}
        </table>
      </div>
    </div>
  );
};
```

---

## Admin Actions Reference

### Quick Action Cheat Sheet

| Action | Endpoint | Method | When to Use |
|--------|----------|--------|-------------|
| View all appointments | `/api/appointments` | GET | Daily monitoring |
| View disputes | `/api/appointments/backjobs?status=disputed` | GET | Dispute resolution |
| Cancel appointment | `/api/appointments/:id/admin-cancel` | POST | No-show, violation |
| Approve backjob | `/api/appointments/backjobs/:id` (action: approve) | PATCH | Customer claim valid |
| Reject backjob | `/api/appointments/backjobs/:id` (action: cancel-by-admin) | PATCH | Provider dispute valid |
| View penalties | `/api/admin/penalties` | GET | User history review |
| Generate report | `/api/admin/analytics/appointments` | GET | Weekly/monthly reports |

### Admin Decision Matrix

#### When Customer Reports No-Show (Provider)
1. ✅ Verify customer evidence (timestamp, location, photos)
2. ✅ Attempt to contact provider
3. ✅ If confirmed: Cancel appointment, apply provider penalty
4. ✅ Process customer refund/compensation

#### When Provider Reports No-Show (Customer)
1. ✅ Verify provider evidence (GPS, timestamp, photos)
2. ✅ Attempt to contact customer
3. ✅ If confirmed: Cancel appointment, apply customer penalty
4. ✅ Compensate provider for travel time

#### When Reviewing Disputes
1. ✅ Review both parties' evidence thoroughly
2. ✅ Check service history of both parties
3. ✅ Consider provider's overall rating and customer's claim history
4. ✅ Make fair, evidence-based decision
5. ✅ Document reasoning clearly in admin notes

---

## Best Practices for Admins

### Do's ✅
- Always review ALL evidence before making decisions
- Document reasoning in admin notes for every action
- Contact both parties if evidence is unclear
- Apply penalties fairly and consistently
- Monitor repeat offenders (both customers and providers)
- Generate weekly reports to identify patterns
- Respond to disputes within 48 hours

### Don'ts ❌
- Don't make decisions without sufficient evidence
- Don't apply penalties without clear policy violation
- Don't ignore patterns of behavior
- Don't rush dispute resolutions
- Don't share user details publicly
- Don't show bias toward providers or customers

---

## Security and Compliance

### Admin Action Logging
All admin actions are automatically logged:
- Appointment cancellations
- Backjob status changes
- Penalty applications
- Dispute resolutions

### Data Privacy
- Admin access is role-based
- Sensitive data (phone numbers, addresses) only shown when necessary
- Evidence files access logged
- Admin notes are internal only

### Audit Trail
```javascript
const AdminAuditLog = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    const response = await axios.get('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    setLogs(response.data.data);
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Admin</th>
          <th>Action</th>
          <th>Target</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(log => (
          <tr key={log.id}>
            <td>{formatDateTime(log.timestamp)}</td>
            <td>{log.admin_name}</td>
            <td>{log.action_type}</td>
            <td>{log.target_type} #{log.target_id}</td>
            <td>{log.details}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## Support and Escalation

### When to Escalate
- Legal disputes requiring legal team involvement
- Suspected fraud or criminal activity
- Threats or harassment between parties
- Technical issues affecting multiple appointments
- Policy violations requiring senior management decision

### Escalation Process
1. Document the issue thoroughly
2. Gather all evidence and communications
3. Notify senior admin or management
4. Freeze affected accounts if necessary
5. Follow platform escalation protocol

---

## Contact

**Admin Support:**
- Email: admin-support@fixmo.com
- Slack: #admin-support
- Emergency: +63-XXX-XXXX (24/7 hotline)

**Technical Issues:**
- Email: dev-support@fixmo.com
- Slack: #tech-support

---

**Admin Guide Version:** 1.0  
**Last Updated:** October 3, 2025  
**Maintained By:** Fixmo Admin Team
