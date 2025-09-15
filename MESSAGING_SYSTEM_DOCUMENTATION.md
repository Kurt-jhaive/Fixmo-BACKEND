# 💬 Fixmo Messaging System Documentation

## Overview
The Fixmo Messaging System is a real-time chat platform that enables communication between customers and service providers within the context of appointments. It supports text messages, image attachments, and real-time notifications.

## 🏗️ Architecture

### Components
- **Backend API**: RESTful endpoints for message management
- **WebSocket Server**: Real-time communication using Socket.IO
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: Local file system for attachments
- **Authentication**: JWT-based authentication

### Technology Stack
- **Node.js** with Express.js
- **Socket.IO** for WebSocket communication
- **Prisma ORM** with PostgreSQL
- **Multer** for file uploads
- **JWT** for authentication

## 📊 Database Schema

### Conversation Model
```prisma
model Conversation {
  conversation_id   Int       @id @default(autoincrement())
  appointment_id    Int       @unique
  customer_id       Int
  provider_id       Int
  status           String    @default("active") // active, archived, closed
  created_at       DateTime  @default(now())
  last_message_at  DateTime?
  
  // Relations
  appointment      Appointment @relation(fields: [appointment_id], references: [appointment_id])
  customer         User        @relation(fields: [customer_id], references: [user_id])
  provider         ServiceProviderDetails @relation(fields: [provider_id], references: [provider_id])
  messages         Message[]
}
```

### Message Model
```prisma
model Message {
  message_id      Int          @id @default(autoincrement())
  conversation_id Int
  sender_id       Int
  sender_type     String       // 'customer' or 'provider'
  message_type    String       @default("text") // text, image, file, location
  content         String
  attachment_url  String?
  is_read         Boolean      @default(false)
  is_edited       Boolean      @default(false)
  edited_at       DateTime?
  replied_to_id   Int?         // For reply functionality
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt
  
  // Relations
  conversation    Conversation @relation(fields: [conversation_id], references: [conversation_id])
  replied_to      Message?     @relation("MessageReplies", fields: [replied_to_id], references: [message_id])
  replies         Message[]    @relation("MessageReplies")
}
```

## 🔌 API Endpoints

### Base URL: `/api/messages`

#### Conversation Management

##### 1. Get Conversations
```http
GET /conversations?userType={customer|provider}
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "conversation_id": 1,
      "appointment": {
        "appointment_id": 123,
        "appointment_status": "confirmed",
        "scheduled_date": "2025-09-03T10:00:00Z",
        "service": {
          "service_title": "House Cleaning"
        }
      },
      "participant": {
        "user_id": 2,
        "first_name": "John",
        "last_name": "Doe"
      },
      "last_message": "Hello, when will you arrive?",
      "unread_count": 2,
      "last_message_at": "2025-09-03T09:30:00Z"
    }
  ]
}
```

##### 2. Create Conversation
```http
POST /conversations
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "appointmentId": 123,
  "userType": "customer"
}
```

##### 3. Get Conversation Details
```http
GET /conversations/{conversationId}?userType={customer|provider}
Authorization: Bearer {jwt_token}
```

#### Message Management

##### 4. Send Message
```http
POST /conversations/{conversationId}/messages
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "content": "Hello, I'll be there in 30 minutes",
  "userType": "provider",
  "messageType": "text"
}
```

##### 5. Upload Image
```http
POST /upload
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

FormData:
- file: {image_file}
- conversationId: {conversation_id}
- senderType: {customer|provider}
```

##### 6. Get Messages
```http
GET /conversations/{conversationId}/messages?page=1&limit=20
Authorization: Bearer {jwt_token}
```

##### 7. Mark Messages as Read
```http
PUT /conversations/{conversationId}/messages/read
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "messageIds": [1, 2, 3]
}
```

## 🔄 WebSocket Events

### Client → Server Events

#### Authentication
```javascript
socket.emit('authenticate', {
  token: 'jwt_token_here',
  userType: 'customer' // or 'provider'
});
```

#### Join Conversation
```javascript
socket.emit('join_conversation', {
  conversationId: 123
});
```

#### Leave Conversation
```javascript
socket.emit('leave_conversation', {
  conversationId: 123
});
```

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing_start', {
  conversationId: 123
});

// Stop typing
socket.emit('typing_stop', {
  conversationId: 123
});
```

#### Mark as Read
```javascript
socket.emit('mark_as_read', {
  conversationId: 123,
  messageIds: [1, 2, 3]
});
```

### Server → Client Events

#### Authentication Result
```javascript
socket.on('authenticated', (data) => {
  if (data.success) {
    console.log('Connected successfully');
  }
});
```

#### New Message
```javascript
socket.on('new_message', (message) => {
  console.log('New message received:', message);
  // message = {
  //   message_id: 1,
  //   conversation_id: 123,
  //   sender_id: 2,
  //   sender_type: 'provider',
  //   content: 'Hello!',
  //   message_type: 'text',
  //   attachment_url: null,
  //   created_at: '2025-09-03T10:00:00Z'
  // }
});
```

#### Message Status Update
```javascript
socket.on('message_status_update', (data) => {
  console.log('Message read status updated:', data);
});
```

#### Typing Indicators
```javascript
socket.on('user_typing', (data) => {
  console.log(`${data.userName} is typing...`);
});

socket.on('user_stopped_typing', (data) => {
  console.log(`${data.userName} stopped typing`);
});
```

#### Error Handling
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## 🔧 Implementation Guide

### 1. Authentication Setup
```javascript
// JWT Token should contain:
{
  "userId": 123,
  "userType": "customer", // or "provider"
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 2. File Upload Configuration
- **Allowed Types**: Images only (jpeg, jpg, png, gif, webp)
- **Max Size**: 5MB per file
- **Storage**: `/uploads/message-attachments/`
- **Naming**: `msg_{userId}_{timestamp}.{ext}`

### 3. Message Flow
1. User selects conversation
2. Client emits `join_conversation`
3. Server validates access and joins room
4. User types message
5. Client sends via REST API
6. Server creates message in database
7. Server broadcasts to WebSocket room
8. All participants receive real-time update

### 4. Error Handling
- **401**: Authentication required
- **403**: Access denied to conversation
- **404**: Conversation/message not found
- **400**: Invalid request data
- **500**: Server error

## 🔒 Security Features

### Authentication
- JWT token validation on all endpoints
- WebSocket authentication required
- User type verification (customer/provider)

### Authorization
- Users can only access their own conversations
- Conversation access validated by appointment ownership
- Message sending restricted to conversation participants

### File Upload Security
- File type validation (images only)
- File size limits (5MB)
- Secure filename generation
- Virus scanning ready (implement with ClamAV if needed)

### Data Validation
- Input sanitization on all endpoints
- SQL injection prevention via Prisma
- XSS protection on message content

## 📱 Frontend Integration Guide

### Required Libraries
```json
{
  "socket.io-client": "^4.7.0",
  "axios": "^1.4.0" // or fetch for HTTP requests
}
```

### WebSocket Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://your-backend-url:3000', {
  autoConnect: false
});

// Authenticate
socket.emit('authenticate', {
  token: userToken,
  userType: userType
});
```

### Message Components Structure
```
/screens
  /ChatScreen.js           # Main chat interface
  /ConversationList.js     # List of conversations
/components
  /MessageBubble.js        # Individual message display
  /MessageInput.js         # Text input with send button
  /ImagePicker.js          # Image upload component
  /TypingIndicator.js      # Typing status display
/services
  /messageService.js       # API calls
  /socketService.js        # WebSocket management
/utils
  /messageUtils.js         # Message formatting utilities
```

## 🧪 Testing

### Unit Tests
- Message creation and validation
- File upload handling
- Authentication middleware
- WebSocket event handling

### Integration Tests
- End-to-end conversation flow
- Real-time message delivery
- File upload and retrieval
- Multi-user chat scenarios

### Load Testing
- Concurrent users: 1000+
- Messages per second: 100+
- File uploads: 50 concurrent

## 🚀 Deployment

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/fixmo
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret
PORT=3000
```

### Docker Setup
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Considerations
- Use Redis for WebSocket scaling
- Implement rate limiting
- Add CDN for file serving
- Monitor WebSocket connections
- Database connection pooling

## 📊 Monitoring & Analytics

### Key Metrics
- Message delivery time
- WebSocket connection stability
- File upload success rate
- User engagement per conversation
- Error rates by endpoint

### Logging
- All API requests/responses
- WebSocket events
- File upload activities
- Authentication attempts
- Error tracking

## 🔄 Future Enhancements

### Phase 2 Features
- Message reactions (like, dislike)
- Message forwarding
- Voice messages
- Video attachments
- Message search functionality

### Phase 3 Features
- Group conversations
- Message encryption
- Push notifications
- Offline message sync
- Message scheduling

## 📞 Support & Maintenance

### Common Issues
1. **WebSocket disconnections**: Implement reconnection logic
2. **File upload failures**: Check file size and type
3. **Message delays**: Verify database performance
4. **Authentication errors**: Validate JWT token format

### Maintenance Tasks
- Database cleanup (old messages)
- File storage management
- Performance monitoring
- Security audits
- Dependency updates

---

## 📋 Quick Reference

### Test Mode
- Use token: `test-token`
- Bypasses authentication
- User ID: 1, Type: customer

### Important URLs
- API Base: `http://localhost:3000/api/messages`
- WebSocket: `http://localhost:3000`
- File Uploads: `http://localhost:3000/uploads/message-attachments/`

### Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

---

*Last Updated: September 3, 2025*
*Version: 1.0.0*
