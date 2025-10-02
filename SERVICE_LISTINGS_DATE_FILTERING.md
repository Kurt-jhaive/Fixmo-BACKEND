# Service Listings with Date-Based Availability Filtering

## 🗓️ Enhanced Provider Search with Date Filtering

The service listings endpoint has been enhanced to filter providers based on their availability for a specific date. When users select a date from the calendar, only providers who are available and not booked on that date will appear in the search results.

## 🎯 Key Features

### ✅ Date-Based Filtering
- **Calendar Integration** - Users select a date, see only available providers
- **Day-of-Week Checking** - Validates provider's weekly availability schedule  
- **Booking Conflict Detection** - Excludes providers with existing appointments
- **Past Date Handling** - Filters out past dates and times appropriately
- **Real-time Availability** - Checks current time for today's availability

### 🔍 Smart Availability Logic
- **Weekly Recurring Schedule** - Checks provider's availability for the day of week
- **Specific Date Conflicts** - Excludes providers with active appointments on that date
- **Time-based Filtering** - For today, excludes past time slots
- **Multiple Appointment Status** - Considers pending, accepted, confirmed, on-the-way bookings

### 📊 Enhanced Response Data
- **Availability Details** - Shows total, available, and booked slots per provider
- **Filtering Statistics** - Before/after filtering counts for transparency
- **Debug Information** - Date parsing and filtering details for development

## 📍 API Endpoint

### GET `/auth/service-listings` - Enhanced Service Listings

#### Query Parameters:

**Existing Parameters:**
- `page` (integer): Page number for pagination (default: 1)
- `limit` (integer): Number of results per page (default: 12)
- `search` (string): Search term for service title/description/provider name
- `category` (string): Filter by service category
- `location` (string): Filter by provider location
- `sortBy` (string): Sort order - 'rating', 'price-low', 'price-high', 'newest'

**New Parameter:**
- `date` (string): Filter by availability on specific date (YYYY-MM-DD format)

#### Usage Examples:

**1. Normal Service Listings (No Date Filter):**
```bash
GET /auth/service-listings?page=1&limit=10
```

**2. Filter by Specific Date (September 25, 2025):**
```bash
GET /auth/service-listings?date=2025-09-25&page=1&limit=10
```

**3. Combined Filters with Date:**
```bash
GET /auth/service-listings?date=2025-09-25&location=manila&search=repair&page=1&limit=10
```

## 📱 Frontend Integration Example

### React/React Native Calendar Integration:

```javascript
// 1. User selects date from calendar
const handleDateSelect = async (selectedDate) => {
  setLoading(true);
  
  try {
    // 2. Fetch providers available on selected date
    const response = await fetch(
      `/auth/service-listings?date=${selectedDate}&page=1&limit=20`
    );
    
    const data = await response.json();
    
    // 3. Display only available providers
    setAvailableProviders(data.listings);
    
    // 4. Show filtering statistics to user
    console.log(`Found ${data.listings.length} available providers for ${selectedDate}`);
    console.log(`Filtered from ${data.dateFilter?.totalProvidersBeforeFiltering} total providers`);
    
  } catch (error) {
    console.error('Error fetching available providers:', error);
  } finally {
    setLoading(false);
  }
};

// Calendar component
<Calendar
  onDayPress={(day) => handleDateSelect(day.dateString)}
  minDate={new Date().toISOString().split('T')[0]} // Don't allow past dates
/>
```

## 📋 Response Format

### Without Date Filter (Normal Response):
```json
{
  "message": "Service listings retrieved successfully",
  "listings": [
    {
      "id": 1,
      "title": "Home Repair Service",
      "description": "Professional home repair and maintenance",
      "startingPrice": 500,
      "service_picture": "https://...",
      "provider": {
        "id": 1,
        "name": "John Doe",
        "rating": 4.5,
        "location": "Manila",
        "profilePhoto": "https://..."
      },
      "categories": ["Home Repair"],
      "specificServices": [...]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### With Date Filter (Enhanced Response):
```json
{
  "message": "Service listings for 2025-09-25 (Thursday) retrieved successfully",
  "listings": [
    {
      "id": 1,
      "title": "Home Repair Service",
      "description": "Professional home repair and maintenance",
      "startingPrice": 500,
      "service_picture": "https://...",
      "provider": {
        "id": 1,
        "name": "John Doe",
        "rating": 4.5,
        "location": "Manila",
        "profilePhoto": "https://..."
      },
      "categories": ["Home Repair"],
      "specificServices": [...],
      "availability": {
        "date": "2025-09-25",
        "dayOfWeek": "Thursday",
        "hasAvailability": true,
        "totalSlots": 3,
        "availableSlots": 2,
        "bookedSlots": 1
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalCount": 15,
    "hasNext": true,
    "hasPrev": false
  },
  "dateFilter": {
    "requestedDate": "2025-09-25",
    "dayOfWeek": "Thursday",
    "totalProvidersBeforeFiltering": 50,
    "availableProvidersAfterFiltering": 15,
    "filteringApplied": true
  }
}
```

## 🔧 Technical Implementation

### Availability Logic Flow:

1. **Parse Requested Date**
   ```javascript
   const requestedDate = new Date(date + 'T00:00:00.000Z');
   const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' });
   ```

2. **Get Provider Availability**
   ```javascript
   const providerAvailability = await prisma.availability.findMany({
     where: {
       provider_id: { in: providerIds },
       dayOfWeek: dayOfWeek,
       availability_isActive: true
     },
     include: {
       appointments: {
         where: {
           scheduled_date: { gte: startOfDay, lt: endOfDay },
           appointment_status: { in: ['accepted', 'pending', 'approved', 'confirmed'] }
         }
       }
     }
   });
   ```

3. **Filter Available Providers**
   ```javascript
   const isAvailable = !isPastDate && !(isPast && isToday) && !hasActiveAppointments;
   if (isAvailable) {
     availableProviderIds.add(availability.provider_id);
   }
   ```

### Database Queries Optimized:
- **Single Query** for all provider availability data
- **Efficient Filtering** using Set for O(1) lookup
- **Proper Indexing** on provider_id, dayOfWeek, and scheduled_date
- **Minimal Data Transfer** with selective field inclusion

## 🧪 Testing

### Test Script Available:
```bash
node test-service-listings-date-filter.js
```

**Test Coverage:**
- ✅ Normal listings without date filter
- ✅ Date-based availability filtering  
- ✅ Multiple date scenarios
- ✅ Combined filters with date
- ✅ Edge cases (past dates, invalid dates)
- ✅ Provider availability details
- ✅ Pagination with filtering

### Manual Testing Steps:
1. **Test Normal Flow**: GET `/auth/service-listings` (should work as before)
2. **Test Date Filter**: GET `/auth/service-listings?date=2025-09-25`
3. **Verify Filtering**: Compare results with/without date parameter
4. **Check Availability**: Verify availability details in response
5. **Test Edge Cases**: Past dates, invalid dates, today's date

## 🔍 Troubleshooting

### Common Issues:

**No Providers Returned:**
- Check if providers have availability set for the requested day of week
- Verify providers are verified and activated
- Ensure date format is YYYY-MM-DD

**Incorrect Filtering:**
- Check provider's weekly availability schedule
- Verify appointment statuses being filtered
- Check timezone handling for date parsing

**Performance Issues:**
- Add database indexes on availability table
- Consider caching for frequently requested dates
- Optimize with proper LIMIT and pagination

## 📊 Performance Considerations

### Optimization Strategies:
- **Database Indexing**: Index on (provider_id, dayOfWeek, availability_isActive)
- **Query Batching**: Single query for all provider availability
- **Result Caching**: Cache availability for popular dates
- **Pagination**: Proper LIMIT to avoid large result sets

### Monitoring:
- Track query execution time for availability checks
- Monitor cache hit rates for date-based queries
- Log slow queries for optimization opportunities

## 🎯 User Experience Benefits

### For Customers:
- **Accurate Results**: Only see providers who are actually available
- **Time Savings**: No need to check availability manually
- **Better Planning**: Can see availability details upfront
- **Fewer Disappointments**: No booking conflicts or unavailable slots

### For Providers:
- **Accurate Representation**: Only shown when actually available
- **Better Bookings**: Customers book appropriate time slots
- **Reduced Conflicts**: Fewer double-booking attempts
- **Professional Image**: Availability management appears seamless

## 🚀 Next Steps

### Potential Enhancements:
1. **Time-Specific Filtering**: Filter by specific time slots, not just day
2. **Duration-Based Filtering**: Consider service duration for availability
3. **Geographic Proximity**: Combine with location-based sorting
4. **Provider Preferences**: Allow providers to set booking preferences
5. **Real-time Updates**: WebSocket updates for live availability changes

---

## 🎉 Ready for Production!

The enhanced service listings endpoint now provides intelligent date-based filtering, ensuring customers only see providers who are actually available on their selected date. This creates a much better user experience and reduces booking conflicts.

**Example User Flow:**
1. Customer opens "Find Providers" in app
2. Calendar appears asking "When do you need service?"
3. Customer selects "September 25, 2025"
4. Only providers available on Thursday, Sept 25 are shown
5. Customer can confidently book knowing the provider is available

**Test the functionality:**
```bash
node test-service-listings-date-filter.js
```