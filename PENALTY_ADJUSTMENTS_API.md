# Penalty Adjustments API Endpoint

## ✅ NEW ENDPOINT CREATED

### Endpoint: `/api/penalty/my-adjustments`

**Method:** GET  
**Authentication:** Required (Bearer Token)  
**Base URL:** `https://your-api-domain.com/api/penalty/my-adjustments`

---

## 📋 Description

Returns all penalty point adjustments (restorations, bonuses, resets) for the currently authenticated user or service provider. This endpoint retrieves records from the `PenaltyAdjustment` table.

---

## 🔑 Request Headers

```http
Authorization: Bearer <your_jwt_token>
```

---

## 📥 Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | `restore,bonus,reset` | Filter by adjustment type: `restore`, `bonus`, `reset`, `penalty` |
| `limit` | integer | No | 50 | Number of records to return |
| `offset` | integer | No | 0 | Number of records to skip (for pagination) |

---

## 📤 Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "adjustments": [
      {
        "adjustment_id": 5,
        "adjustment_type": "bonus",
        "points_adjusted": 5,
        "previous_points": 65,
        "new_points": 70,
        "reason": "Reward for successful booking completion - Appointment #123",
        "created_at": "2025-11-01T14:17:06.000Z",
        "adjusted_by_admin_id": null,
        "related_violation_id": null
      },
      {
        "adjustment_id": 4,
        "adjustment_type": "restore",
        "points_adjusted": 20,
        "previous_points": 50,
        "new_points": 70,
        "reason": "Manual point restoration - Testing penalty system",
        "created_at": "2025-11-01T14:16:45.000Z",
        "adjusted_by_admin_id": 1,
        "related_violation_id": null
      },
      {
        "adjustment_id": 3,
        "adjustment_type": "bonus",
        "points_adjusted": 2,
        "previous_points": 68,
        "new_points": 70,
        "reason": "Reward for receiving 4-star rating",
        "created_at": "2025-11-01T10:30:00.000Z",
        "adjusted_by_admin_id": null,
        "related_violation_id": null
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "message": "No token provided"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Failed to fetch penalty adjustments",
  "error": "Error details here"
}
```

---

## 📊 Field Descriptions

### Adjustment Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `adjustment_id` | integer | Unique identifier for the adjustment |
| `adjustment_type` | string | Type of adjustment: `restore` (admin restored points), `bonus` (earned through good behavior), `reset` (quarterly reset), `penalty` (points deducted) |
| `points_adjusted` | integer | Number of points added/deducted (positive for additions, negative for deductions) |
| `previous_points` | integer | Penalty points before this adjustment |
| `new_points` | integer | Penalty points after this adjustment |
| `reason` | string | Explanation for why the adjustment was made |
| `created_at` | string (ISO 8601) | When the adjustment was created |
| `adjusted_by_admin_id` | integer \| null | Admin ID if manually adjusted by admin, null for automatic adjustments |
| `related_violation_id` | integer \| null | Related violation ID if adjustment is related to an appeal |

### Pagination Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of adjustment records |
| `limit` | integer | Number of records returned in this request |
| `offset` | integer | Number of records skipped |
| `hasMore` | boolean | Whether there are more records available |

---

## 💡 Adjustment Types Explained

| Type | Description | Icon Suggestion | Color |
|------|-------------|----------------|-------|
| `restore` | Points restored by admin (appeal approved, correction) | 🔄 | Blue |
| `bonus` | Points earned through good behavior (completed appointments, good ratings) | 🎁 | Green |
| `reset` | Quarterly automatic reset to 100 points | 🔁 | Purple |
| `penalty` | Points deducted (usually shown in violations, but available here too) | ⚠️ | Red |

---

## 📱 Frontend Usage Examples

### React Native (Expo) Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const fetchAdjustments = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    const response = await fetch('https://your-api.com/api/penalty/my-adjustments?limit=20&offset=0', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      const { adjustments, pagination } = result.data;
      
      // Display adjustments
      console.log('Total adjustments:', pagination.total);
      console.log('Adjustments:', adjustments);
      
      return adjustments;
    } else {
      console.error('Failed to fetch adjustments:', result.message);
    }
  } catch (error) {
    console.error('Error fetching adjustments:', error);
  }
};
```

### Filter by Type

```javascript
// Get only bonuses (earned rewards)
const bonuses = await fetch('https://your-api.com/api/penalty/my-adjustments?type=bonus', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get only admin restorations
const restorations = await fetch('https://your-api.com/api/penalty/my-adjustments?type=restore', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Display in UI

```jsx
const AdjustmentItem = ({ adjustment }) => {
  const getTypeInfo = (type) => {
    switch (type) {
      case 'bonus':
        return { icon: '🎁', color: '#10B981', label: 'Bonus' };
      case 'restore':
        return { icon: '🔄', color: '#3B82F6', label: 'Restored' };
      case 'reset':
        return { icon: '🔁', color: '#8B5CF6', label: 'Reset' };
      default:
        return { icon: '➕', color: '#6B7280', label: 'Adjustment' };
    }
  };

  const typeInfo = getTypeInfo(adjustment.adjustment_type);

  return (
    <View style={styles.card}>
      <Text style={{ color: typeInfo.color, fontSize: 24 }}>
        {typeInfo.icon}
      </Text>
      <View style={styles.details}>
        <Text style={styles.reason}>{adjustment.reason}</Text>
        <Text style={styles.points}>
          +{adjustment.points_adjusted} points
        </Text>
        <Text style={styles.date}>
          {new Date(adjustment.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: typeInfo.color }]}>
        <Text style={styles.badgeText}>{typeInfo.label}</Text>
      </View>
    </View>
  );
};
```

---

## 🔍 Default Behavior

**By default (no `type` parameter):**
- Returns only **positive** adjustments: `restore`, `bonus`, `reset`
- Excludes `penalty` type (those are shown in violations)
- Orders by newest first (`created_at DESC`)
- Limit: 50 records

**To get ALL adjustments including penalties:**
```
GET /api/penalty/my-adjustments?type=penalty
```

Or omit the filter in your query to manually filter on the frontend.

---

## 🎨 UI Design Suggestions

### Combined Timeline View
Display adjustments and violations together in a unified timeline:

```
🎁 +5 pts - Completed appointment #123       [Bonus] ✅
   Nov 1, 2025 2:17 PM

⚠️  -10 pts - Late cancellation              [Violation] ⛔
   Nov 1, 2025 2:15 PM

🔄 +20 pts - Appeal approved by admin        [Restored] 🔵
   Nov 1, 2025 2:16 PM
```

### Separate Tabs
- **Violations** tab: Shows penalty deductions
- **Rewards** tab: Shows bonuses and restorations

### Filter Options
- All
- Bonuses only
- Restorations only
- Quarterly resets only

---

## ✅ Testing

Use these scripts to test the system:

```bash
# Deduct penalty points
node add-penalty.js

# Restore penalty points
node restore-points.js

# Check user status
node check-user-status.js
```

All adjustments are automatically logged in the database and will appear in this endpoint!

---

## 📞 Support

If you encounter any issues with this endpoint, contact the backend team or check the server logs for detailed error messages.
