# 🚫 No-Show Appointment Status - Quick Reference

## What Is It?

Automatic system that marks appointments as **"no-show"** if they're not updated within 2 hours after the scheduled time.

---

## ⚡ Quick Facts

| Feature | Value |
|---------|-------|
| **Check Frequency** | Every 1 hour |
| **Grace Period** | 2 hours after scheduled time |
| **Affected Statuses** | `scheduled`, `accepted`, `pending`, `in-progress`, `on-the-way` |
| **Safe Statuses** | `completed`, `finished`, `cancelled`, `in-warranty`, `backjob` |

---

## 🎯 How to Prevent No-Show

### For Providers

```javascript
// 1. Customer books → Status: 'accepted' (automatic)

// 2. You're heading to customer
PUT /api/provider/appointment/:id/status
{ "status": "on-the-way" }

// 3. You arrive and start
PUT /api/provider/appointment/:id/status
{ "status": "in-progress" }

// 4. You complete the work
PUT /api/provider/appointment/:id/status
{ "status": "finished" }
```

### For Customers

```javascript
// Confirm provider finished work
PUT /api/customer/appointment/:id/status
{ "status": "completed" }

// OR cancel if can't make it
PUT /api/customer/appointment/:id/cancel
{ "cancellation_reason": "Need to reschedule" }
```

---

## 📊 Timeline Example

```
┌─────────────────────────────────────────────────────────────┐
│  Appointment scheduled for 2:00 PM                          │
│  Grace period: 2 hours                                      │
│  Auto-marked no-show at: 4:01 PM (next hourly check)       │
└─────────────────────────────────────────────────────────────┘

2:00 PM          3:00 PM          4:00 PM          5:00 PM
   │                │                │                │
   ├─ Scheduled     │                │                │
   │                │                │                │
   └────────────────┴────────────────┤◄─ Grace Period End
                                     │
                                     └─► Job runs at 5:00 PM
                                         → Marked as no-show
```

---

## 🔧 Configuration

Located in: `src/server.js`

```javascript
const NO_SHOW_CHECK_INTERVAL_MS = 60 * 60 * 1000;  // Check every 1 hour
const NO_SHOW_GRACE_PERIOD_HOURS = 2;              // 2 hours grace
```

### Change Grace Period

```javascript
// 1 hour grace (more strict)
const NO_SHOW_GRACE_PERIOD_HOURS = 1;

// 3 hours grace (more lenient)
const NO_SHOW_GRACE_PERIOD_HOURS = 3;

// 4 hours grace (very lenient)
const NO_SHOW_GRACE_PERIOD_HOURS = 4;
```

---

## 📝 Valid Appointment Statuses

```javascript
[
  'pending',      // Awaiting approval
  'approved',     // Approved by provider
  'confirmed',    // Confirmed by customer
  'accepted',     // Auto-accepted (default when booking)
  'scheduled',    // Scheduled for future
  'on-the-way',   // Provider heading to customer
  'in-progress',  // Service currently happening
  'finished',     // Provider marked done
  'completed',    // Customer confirmed completion
  'cancelled',    // Cancelled by either party
  'no-show'       // ⚠️ Automatic or manual no-show
]
```

---

## 🔍 Monitoring

### Server Logs

**On startup:**
```
🚫 No-show appointment detection job initialized (Grace period: 2 hours)
```

**Every hour (when checking):**
```
🔍 Checking for no-show appointments (grace period: 2h)
🚫 Marked 3 appointment(s) as no-show:
   - Appointment #123 (accepted → no-show) scheduled for 2025-06-15T14:00:00.000Z
   - Appointment #124 (in-progress → no-show) scheduled for 2025-06-15T15:30:00.000Z
```

**When no appointments to mark:**
```
🔍 Checking for no-show appointments (grace period: 2h)
✅ No appointments to mark as no-show
```

---

## 📱 API Endpoints

### Check Appointment Status

```http
GET /api/customer/appointment/:id
Authorization: Bearer {token}

Response:
{
  "appointment_id": 123,
  "appointment_status": "no-show",
  "scheduled_date": "2025-06-15T14:00:00.000Z"
}
```

### Filter No-Show Appointments

```http
GET /api/admin/appointments?appointment_status=no-show
GET /api/provider/appointments?status=no-show
GET /api/customer/appointments?status=no-show
```

### Manual No-Show Mark

```http
PUT /api/provider/appointment/:id/status
{ "status": "no-show" }
```

---

## ⚠️ Important Notes

1. **Update status regularly** - Any status update prevents no-show marking
2. **Grace period is generous** - 2 hours gives plenty of time for delays
3. **Automatic process** - Runs every hour, no manual intervention needed
4. **Cannot be unmarked** - Once no-show, stays no-show (like cancelled)
5. **Database unchanged** - Uses existing `appointment_status` field

---

## 🎯 Best Practices

### ✅ DO:
- Update status as soon as you start traveling
- Update to `in-progress` when you arrive
- Mark `finished` when work is done
- Cancel properly if you can't make it

### ❌ DON'T:
- Leave appointments in `accepted` status
- Forget to update status during service
- Ignore appointments you can't fulfill
- Rely on manual marking

---

## 🐛 Troubleshooting

### Marked too early?
→ Increase grace period in `src/server.js`

### Not marking at all?
→ Check server logs for job execution
→ Verify database connection

### Too frequent checks?
→ Increase `NO_SHOW_CHECK_INTERVAL_MS`

---

## 📚 Full Documentation

For complete details, see: [`NO_SHOW_APPOINTMENT_FEATURE.md`](./NO_SHOW_APPOINTMENT_FEATURE.md)

---

**✅ Feature is production-ready and active!**
