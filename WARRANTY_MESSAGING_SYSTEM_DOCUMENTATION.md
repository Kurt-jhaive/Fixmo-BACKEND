# Fixmo Warranty-Based Messaging System

## 📋 Overview

The Fixmo Warranty-Based Messaging System allows customers and service providers to maintain **single, continuous conversations** that remain open as long as **any of their appointments is within its warranty period**.

## 🎯 Key Features

### ✅ Single Conversation Per Customer-Provider Pair
- One active conversation between each customer and provider
- Automatically extends warranty period when new appointments are booked/completed
- Prevents duplicate conversations

### ✅ Warranty-Based Access Control
- Messaging is only available during warranty periods
- Conversations automatically close when all warranties expire
- Real-time WebSocket notifications for conversation closures

### ✅ Automatic Warranty Management
- Warranty periods calculated from appointment completion dates
- Automatic extension when new appointments have longer warranties
- Scheduled cleanup job closes expired conversations

## 🏗️ Architecture Changes

### Database Schema Updates

```prisma
model Conversation {
  conversation_id   Int                    @id @default(autoincrement())
  customer_id       Int
  provider_id       Int
  status            String                 @default("active") // active, archived, closed
  warranty_expires  DateTime?              // When this conversation should close
  last_message_at   DateTime?
  created_at        DateTime               @default(now())
  updated_at        DateTime               @updatedAt
  
  customer          User                   @relation(fields: [customer_id], references: [user_id])
  provider          ServiceProviderDetails @relation(fields: [provider_id], references: [provider_id])
  messages          Message[]
  
  @@unique([customer_id, provider_id]) // Only one active conversation per pair
}
```

**Key Changes:**
- Removed `appointment_id` unique constraint
- Added `warranty_expires` field
- Added unique constraint on `customer_id + provider_id`

### New Service Functions

#### `conversationWarrantyService.js`
- `calculateWarrantyExpiry(baseDate, warrantyDays)` - Calculate warranty expiry dates
- `findOrCreateConversation(customerId, providerId, warrantyExpires)` - Get or create conversation
- `extendConversationWarranty(conversationId, newWarrantyExpiry)` - Extend warranty period
- `handleAppointmentWarranty(appointment, eventType)` - Main workflow handler
- `closeExpiredConversations()` - Cleanup expired conversations
- `isMessagingAllowed(customerId, providerId)` - Check messaging permissions

#### `warrantyExpiryJob.js`
- Scheduled cron job (runs every hour)
- Closes conversations with expired warranties
- Sends WebSocket notifications
- Admin endpoints for manual triggers

## 🔄 Workflow

### 1. Appointment Booking
```javascript
// When appointment is created
await handleAppointmentWarranty(appointment, 'booked');
```

**Process:**
1. Calculate warranty expiry = `booking_date + warranty_days`
2. Find existing conversation or create new one
3. Set/extend `warranty_expires` to latest expiry date

### 2. Appointment Completion
```javascript
// When appointment is finished/completed
await handleAppointmentWarranty(appointment, 'completed');
```

**Process:**
1. Calculate warranty expiry = `completion_date + warranty_days`
2. Update conversation's `warranty_expires` if this is later
3. Conversation remains active for warranty period

### 3. Messaging Access Control
```javascript
// Before sending messages
const isAllowed = await isMessagingAllowed(customerId, providerId);
```

**Process:**
1. Check if active conversation exists
2. Verify `warranty_expires > now()`
3. Allow/deny messaging access

### 4. Automatic Cleanup
```javascript
// Runs every hour via cron job
const expired = await closeExpiredConversations();
```

**Process:**
1. Find conversations where `warranty_expires < now()`
2. Update status to 'closed'
3. Send WebSocket notifications to participants

## 📡 API Changes

### Updated Endpoints

#### `POST /api/messages/conversations`
**New Request Format:**
```json
{
  "customerId": 123,
  "providerId": 456
}
```
- No longer requires `appointmentId`
- Creates/finds conversation for customer-provider pair
- Validates warranty-based access

#### `POST /api/messages/:conversationId`
**Enhanced Validation:**
- Checks conversation status ('active' only)
- Validates warranty expiry date
- Prevents messaging after warranty expires

#### `GET /api/messages/conversations`
**Enhanced Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "conversation_id": 1,
      "participant": {...},
      "warranty_expires": "2025-10-29T12:00:00Z",
      "is_warranty_active": true,
      "status": "active",
      "last_message": {...}
    }
  ]
}
```

### New Admin Endpoints

#### `GET /api/admin/warranty/status`
Get warranty system statistics and job status

#### `POST /api/admin/warranty/cleanup`
Manually trigger warranty cleanup

#### `GET /api/admin/warranty/expired`
List conversations with expired warranties

#### `GET /api/admin/warranty/upcoming`
List conversations expiring in next 24 hours

## 🔌 WebSocket Events

### New Event: `conversation_closed`
```javascript
{
  "type": "conversation_closed",
  "conversation_id": 123,
  "customer_id": 456,
  "provider_id": 789,
  "warranty_expires": "2025-09-29T12:00:00Z",
  "message": "This conversation has been closed due to warranty expiry"
}
```

Sent to both customer and provider when conversation is closed.

## 🧪 Testing

### Run Test Suite
```bash
node test-warranty-system.js
```

### Manual Testing Examples

#### Example 1: Create Warranty Conversation
```javascript
import { handleAppointmentWarranty } from './src/services/conversationWarrantyService.js';

const appointment = {
  appointment_id: 1,
  customer_id: 123,
  provider_id: 456,
  warranty_days: 30,
  completed_at: new Date()
};

const conversation = await handleAppointmentWarranty(appointment, 'completed');
console.log('Warranty expires:', conversation.warranty_expires);
```

#### Example 2: Check Messaging Permission
```javascript
import { isMessagingAllowed } from './src/services/conversationWarrantyService.js';

const allowed = await isMessagingAllowed(123, 456);
console.log('Can send messages:', allowed);
```

#### Example 3: Manual Cleanup
```javascript
import { closeExpiredConversations } from './src/services/conversationWarrantyService.js';

const closed = await closeExpiredConversations();
console.log('Closed conversations:', closed.length);
```

## 📊 Sample Queries

### Find Active Conversations with Warranty Info
```javascript
const activeConversations = await prisma.conversation.findMany({
  where: { status: 'active' },
  include: {
    customer: { select: { first_name: true, last_name: true } },
    provider: { select: { provider_first_name: true, provider_last_name: true } },
    _count: { select: { messages: true } }
  }
});
```

### Find Conversations Expiring Soon
```javascript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const expiringSoon = await prisma.conversation.findMany({
  where: {
    status: 'active',
    warranty_expires: { lte: tomorrow }
  },
  orderBy: { warranty_expires: 'asc' }
});
```

### Get Conversation Statistics
```javascript
const stats = await prisma.conversation.groupBy({
  by: ['status'],
  _count: { conversation_id: true }
});
```

## ⚙️ Configuration

### Environment Variables
```env
# Cron job runs every hour by default
WARRANTY_CLEANUP_CRON="0 * * * *"

# Enable development mode for immediate cleanup on startup
NODE_ENV="development"
```

### Cron Schedule
- **Production**: Every hour at minute 0 (`0 * * * *`)
- **Development**: Runs immediately on startup + every hour

## 🚨 Error Handling

### Common Scenarios
1. **No warranty period**: Messaging not allowed, no conversation created
2. **Expired warranty**: Messaging blocked, conversation closed automatically
3. **Multiple appointments**: Warranty extended to latest expiry date
4. **WebSocket failures**: Cleanup continues, notifications logged as errors

### Logging
```javascript
// Success logs
✅ Conversation warranty handling completed for booking
📅 Warranty expires: 2025-10-29T12:00:00.000Z
🔒 Closed 3 expired conversations

// Error logs
❌ Error handling appointment warranty: [error details]
📢 WebSocket notifications sent for closed conversation 123
```

## 🔄 Migration Guide

### From Old System
1. **Database**: Apply Prisma migration for schema changes
2. **Code**: Update imports to use new service functions
3. **Frontend**: Handle new WebSocket events and API responses
4. **Testing**: Run warranty test suite to verify functionality

### Breaking Changes
- `createConversation` now requires `customerId` and `providerId` instead of `appointmentId`
- Conversations no longer tied to specific appointments
- New access control based on warranty expiry dates

## 📈 Performance Considerations

### Database Indexes
- Unique constraint on `(customer_id, provider_id)` prevents duplicates
- Index on `warranty_expires` for efficient cleanup queries
- Index on `status` for filtering active conversations

### Scalability
- Cron job runs hourly to balance cleanup frequency vs. performance
- WebSocket notifications are fire-and-forget (non-blocking)
- Cleanup queries use efficient date range filtering

## 🎯 Benefits

### For Customers
- Single conversation thread per provider
- Messaging available throughout warranty period
- Clear warranty expiry notifications

### For Providers
- Simplified conversation management
- Automatic warranty period handling
- Reduced conversation clutter

### For System
- Prevents conversation duplication
- Automatic cleanup reduces database bloat
- Real-time warranty status updates

---

🎉 **Your Fixmo Warranty-Based Messaging System is now complete and ready for production use!**