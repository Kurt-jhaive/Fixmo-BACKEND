# Location-Based Distance Calculation & Sorting

## Overview
Service providers are now automatically sorted by distance when customers browse available providers. Nearby providers appear first, making it easier for customers to find local services.

---

## 🎯 Feature: Distance-Based Provider Sorting

### Description
When authenticated customers browse service listings, the system:
1. ✅ Calculates the distance between customer and each provider
2. ✅ Displays distance in a user-friendly format (e.g., "2.5km" or "500m")
3. ✅ Automatically sorts providers by distance (nearest first)
4. ✅ Categorizes distances (very-close, nearby, moderate, far)

### How It Works

#### Distance Calculation
Uses the **Haversine formula** to calculate the great-circle distance between two coordinates:
- Accurate for most practical distances
- Returns distance in kilometers (rounded to 1 decimal place)
- Falls back gracefully if location data is missing

#### Distance Categories
| Distance | Category | Display |
|----------|----------|---------|
| < 1 km | `very-close` | e.g., "500m" |
| 1-5 km | `nearby` | e.g., "2.5km" |
| 5-15 km | `moderate` | e.g., "10.3km" |
| > 15 km | `far` | e.g., "25.7km" |

---

## 📍 API Response

### Endpoint
```
GET /auth/service-listings
Headers: Authorization: Bearer <customer_token> (optional but recommended)
```

### Response with Distance Information

```json
{
  "message": "Service listings retrieved successfully",
  "listings": [
    {
      "id": 1,
      "title": "Professional Plumbing Services",
      "description": "Expert plumbing solutions...",
      "startingPrice": 500,
      "service_photos": [...],
      "provider": {
        "id": 45,
        "name": "John Smith",
        "rating": 4.8,
        "location": "Manila",
        "profilePhoto": "https://..."
      },
      "categories": ["Plumbing", "Home Repair"],
      "specificServices": [...],
      "distance": {
        "km": 2.3,
        "formatted": "2.3km",
        "category": "nearby"
      }
    },
    {
      "id": 2,
      "title": "Electrical Repair Services",
      "description": "Licensed electrician...",
      "startingPrice": 600,
      "provider": {
        "id": 67,
        "name": "Jane Doe",
        "rating": 4.9,
        "location": "Quezon City"
      },
      "distance": {
        "km": 5.1,
        "formatted": "5.1km",
        "category": "moderate"
      }
    },
    {
      "id": 3,
      "title": "Carpentry Services",
      "provider": {
        "name": "Bob Builder",
        "rating": 4.7
      }
      // No distance field - provider has no location set
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 48
  }
}
```

### Response Notes:
- ✅ `distance` field only appears when both customer and provider have valid locations
- ✅ Listings are sorted by distance (nearest first)
- ✅ Providers without locations appear at the end
- ✅ Works without authentication (no distance calculation)

---

## 🗺️ Location Data Format

### Supported Formats

The system supports multiple location formats in the `exact_location` and `provider_exact_location` fields:

#### 1. Simple Comma-Separated (Recommended)
```
"14.5995,120.9842"
```

#### 2. JSON Object String
```json
"{\"lat\":14.5995,\"lng\":120.9842}"
```

#### 3. Alternative JSON Format
```json
"{\"latitude\":14.5995,\"longitude\":120.9842}"
```

#### 4. With Spaces
```
"14.5995, 120.9842"
```

### Example Coordinates

| Location | Latitude | Longitude | Format |
|----------|----------|-----------|--------|
| Manila City Hall | 14.5995 | 120.9842 | `"14.5995,120.9842"` |
| Quezon City Hall | 14.6760 | 121.0437 | `"14.6760,121.0437"` |
| Makati CBD | 14.5547 | 121.0244 | `"14.5547,121.0244"` |

---

## 🛠️ Implementation Details

### Files Created/Modified

1. **`src/utils/locationUtils.js`** (NEW)
   - `calculateDistance()` - Haversine formula implementation
   - `parseLocation()` - Parse various location formats
   - `formatDistance()` - Format for display
   - `getDistanceCategory()` - Categorize distance
   - `calculateCustomerProviderDistance()` - Main function

2. **`src/controller/authCustomerController.js`** (MODIFIED)
   - Import location utilities
   - Fetch customer's `exact_location`
   - Fetch provider's `provider_exact_location`
   - Calculate distance for each listing
   - Sort listings by distance

### Distance Calculation Logic

```javascript
// 1. Get customer location (if authenticated)
const customerDetails = await prisma.user.findUnique({
  where: { user_id: authenticatedUserId },
  select: { exact_location: true, ... }
});

// 2. Get provider location (included in query)
serviceProvider: {
  select: { provider_exact_location: true, ... }
}

// 3. Calculate distance for each listing
const distanceInfo = calculateCustomerProviderDistance(
  customerDetails.exact_location,
  listing.serviceProvider.provider_exact_location
);

// 4. Add to response
distance: {
  km: distanceInfo.distance,
  formatted: distanceInfo.formatted,
  category: distanceInfo.category
}

// 5. Sort by distance
formattedListings.sort((a, b) => {
  if (a.distance && b.distance) {
    return a.distance.km - b.distance.km;
  }
  // ... handle missing distances
});
```

---

## 📊 Sorting Behavior

### Priority Order (When Customer Has Location)

1. **Nearest providers with location** (sorted by distance)
2. **Providers without location** (sorted by original criteria: rating/price)

### Example Sort Result

```
1. Provider A - 0.8km (very-close) ⭐️
2. Provider B - 2.3km (nearby)
3. Provider C - 4.7km (nearby)
4. Provider D - 12.5km (moderate)
5. Provider E - No location
6. Provider F - No location
```

### Without Customer Location

If customer is not authenticated or has no location set:
- ❌ No distance calculation
- ❌ No distance-based sorting
- ✅ Falls back to default sorting (rating, price, etc.)

---

## 🔍 Console Logging

### Debug Output

```
🔍 Customer authenticated: {
  userId: 123,
  name: 'John Doe',
  has_location: true
}

📍 Distance to Jane Smith: 2.3km (nearby)
📍 Distance to Bob Builder: 15.7km (far)
📍 Distance to Alice Wong: 0.5km (very-close)

✅ Service listings sorted by distance (nearest first)
```

---

## 🧪 Testing

### Test Scenarios

#### Scenario 1: Customer with Location Browses Providers
```bash
# Setup:
# - Customer location: "14.5995,120.9842" (Manila City Hall)
# - Provider A location: "14.5547,121.0244" (Makati - ~5km)
# - Provider B location: "14.6105,120.9845" (Nearby - ~1km)

# Request:
GET /auth/service-listings
Authorization: Bearer <customer_token>

# Expected:
# - Provider B appears first (1km)
# - Provider A appears second (5km)
# - Both have distance field in response
```

#### Scenario 2: Customer Without Location
```bash
# Setup:
# - Customer has no exact_location set

# Request:
GET /auth/service-listings
Authorization: Bearer <customer_token>

# Expected:
# - No distance fields in response
# - Default sorting (by rating/price)
# - No distance-based reordering
```

#### Scenario 3: Mixed Providers (Some with Location, Some Without)
```bash
# Setup:
# - Provider A: Has location (2km away)
# - Provider B: No location
# - Provider C: Has location (5km away)

# Expected Order:
# 1. Provider A (2km)
# 2. Provider C (5km)
# 3. Provider B (no distance)
```

#### Scenario 4: Unauthenticated User
```bash
# Request:
GET /auth/service-listings
# No Authorization header

# Expected:
# - All providers shown
# - No distance calculation
# - Default sorting
```

---

## 📱 Frontend Integration

### React/React Native Example

```javascript
const ServiceProviderList = ({ listings }) => {
  return (
    <div className="provider-list">
      {listings.map(listing => (
        <div key={listing.id} className="provider-card">
          <h3>{listing.provider.name}</h3>
          <div className="rating">⭐ {listing.provider.rating}</div>
          
          {/* Display distance badge */}
          {listing.distance && (
            <div className={`distance-badge ${listing.distance.category}`}>
              📍 {listing.distance.formatted}
              {listing.distance.category === 'very-close' && ' - Very Close!'}
              {listing.distance.category === 'nearby' && ' - Nearby'}
            </div>
          )}
          
          <div className="location">{listing.provider.location}</div>
          <div className="price">Starting at ₱{listing.startingPrice}</div>
        </div>
      ))}
    </div>
  );
};
```

### Distance Badge Styling

```css
.distance-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: 600;
}

.distance-badge.very-close {
  background-color: #4CAF50;
  color: white;
}

.distance-badge.nearby {
  background-color: #8BC34A;
  color: white;
}

.distance-badge.moderate {
  background-color: #FFC107;
  color: #333;
}

.distance-badge.far {
  background-color: #FF9800;
  color: white;
}
```

---

## ⚙️ Configuration

### Customize Distance Categories

Edit `src/utils/locationUtils.js`:

```javascript
export function getDistanceCategory(distanceKm) {
    if (distanceKm < 2) return 'very-close';  // Change from 1 to 2
    if (distanceKm < 10) return 'nearby';     // Change from 5 to 10
    if (distanceKm < 25) return 'moderate';   // Change from 15 to 25
    return 'far';
}
```

### Change Distance Unit (km to miles)

```javascript
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Change from 6371 (km) to 3959 (miles)
    // ... rest of code
}

export function formatDistance(distanceMiles) {
    if (distanceMiles < 0.5) {
        return `${Math.round(distanceMiles * 5280)}ft`; // Convert to feet
    }
    return `${distanceMiles.toFixed(1)}mi`;
}
```

---

## 🚀 Benefits

1. **Better User Experience**
   - Customers see nearby providers first
   - Clear distance indicators
   - Easier to plan appointments

2. **Increased Bookings**
   - Customers prefer nearby providers
   - Reduces travel time concerns
   - Higher conversion rate

3. **Fair Competition**
   - Local providers get priority for local customers
   - Distance-based matching
   - Geographic market segmentation

4. **Transparency**
   - Clear distance information
   - Categorized for quick understanding
   - No hidden information

---

## 🔒 Privacy & Security

- ✅ Location data only used for distance calculation
- ✅ Exact coordinates not exposed in API response
- ✅ Distance calculation happens server-side
- ✅ Optional authentication (works without login)
- ✅ No location tracking or storage beyond DB fields

---

## 📈 Future Enhancements

1. **Travel Time Estimation**
   - Integrate with Google Maps API
   - Show estimated travel time
   - Consider traffic conditions

2. **Radius Filtering**
   - Allow customers to set max distance
   - Filter out providers beyond radius
   - "Within 5km" toggle

3. **Map View**
   - Display providers on interactive map
   - Visual distance representation
   - Cluster nearby providers

4. **Location Caching**
   - Cache calculated distances
   - Reduce computation on repeat requests
   - Invalidate on location changes

---

## 📝 Summary

| Feature | Status | Authentication Required | Sorting |
|---------|--------|------------------------|---------|
| Distance Calculation | ✅ Active | Optional (recommended) | Nearest first |
| Distance Display | ✅ Active | Optional | N/A |
| Distance Categories | ✅ Active | Optional | N/A |
| Location Parsing | ✅ Active | N/A | N/A |
| Auto-Sorting | ✅ Active | Required (customer must have location) | Ascending |

---

**Last Updated**: October 15, 2025  
**Version**: 1.0.0  
**Dependencies**: None (pure JavaScript/Math)
