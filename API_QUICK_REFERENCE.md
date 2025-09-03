# 📋 Fixmo Messaging API Quick Reference

## 🔗 Base URLs
- **API**: `http://localhost:3000/api/messages`
- **WebSocket**: `http://localhost:3000`
- **File Uploads**: `http://localhost:3000/uploads/message-attachments/`

## 🔐 Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer {jwt_token}
```

## 📡 REST API Endpoints

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/conversations?userType={type}` | Get user's conversations |
| `POST` | `/conversations` | Create new conversation |
| `GET` | `/conversations/{id}?userType={type}` | Get conversation details |
| `PUT` | `/conversations/{id}/archive` | Archive conversation |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/conversations/{id}/messages` | Get conversation messages |
| `POST` | `/conversations/{id}/messages` | Send text message |
| `POST` | `/upload` | Upload image message |
| `PUT` | `/conversations/{id}/messages/read` | Mark messages as read |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?q={query}&userType={type}` | Search messages |

## 🔄 WebSocket Events

### Client → Server
| Event | Data | Description |
|-------|------|-------------|
| `authenticate` | `{token, userType}` | Authenticate connection |
| `join_conversation` | `{conversationId}` | Join conversation room |
| `leave_conversation` | `{conversationId}` | Leave conversation room |
| `typing_start` | `{conversationId}` | Start typing indicator |
| `typing_stop` | `{conversationId}` | Stop typing indicator |
| `mark_as_read` | `{conversationId, messageIds}` | Mark messages read |

### Server → Client
| Event | Data | Description |
|-------|------|-------------|
| `authenticated` | `{success, message}` | Authentication result |
| `new_message` | `{message_id, content, ...}` | New message received |
| `message_status_update` | `{messageId, status}` | Message read status |
| `user_typing` | `{conversationId, userName}` | User typing notification |
| `user_stopped_typing` | `{conversationId}` | User stopped typing |
| `error` | `{message}` | Error notification |

## 📝 Request/Response Examples

### Create Conversation
```javascript
POST /conversations
{
  "appointmentId": 123,
  "userType": "customer"
}

// Response
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "conversation_id": 1,
    "appointment_id": 123,
    "customer_id": 1,
    "provider_id": 2,
    "created_at": "2025-09-03T10:00:00Z"
  }
}
```

### Send Message
```javascript
POST /conversations/1/messages
{
  "content": "Hello, when will you arrive?",
  "userType": "customer"
}

// Response
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message_id": 1,
    "conversation_id": 1,
    "sender_id": 1,
    "sender_type": "customer",
    "content": "Hello, when will you arrive?",
    "message_type": "text",
    "created_at": "2025-09-03T10:00:00Z"
  }
}
```

### Upload Image
```javascript
POST /upload
FormData:
- file: {image_file}
- conversationId: 1
- senderType: "customer"

// Response
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "message_id": 2,
    "conversation_id": 1,
    "content": "📸 Image attachment",
    "message_type": "image",
    "attachment_url": "/uploads/message-attachments/msg_1_1725360000000.jpg"
  }
}
```

### Get Conversations
```javascript
GET /conversations?userType=customer

// Response
{
  "success": true,
  "data": [
    {
      "conversation_id": 1,
      "appointment": {
        "appointment_id": 123,
        "appointment_status": "confirmed",
        "service": {
          "service_title": "House Cleaning"
        }
      },
      "participant": {
        "provider_first_name": "John",
        "provider_last_name": "Doe"
      },
      "last_message": "I'll be there in 30 minutes",
      "unread_count": 2,
      "last_message_at": "2025-09-03T10:30:00Z"
    }
  ]
}
```

## ❌ Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `400` | Bad Request | Check request parameters |
| `401` | Unauthorized | Verify JWT token |
| `403` | Forbidden | Check user permissions |
| `404` | Not Found | Verify resource exists |
| `500` | Server Error | Check server logs |

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/fixmo
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret
PORT=3000
```

### File Upload Limits
- **Max Size**: 5MB
- **Allowed Types**: image/jpeg, image/jpg, image/png, image/gif, image/webp
- **Storage Path**: `/uploads/message-attachments/`

### Rate Limits
- **Messages**: 100 per minute per user
- **File Uploads**: 10 per minute per user
- **API Calls**: 1000 per hour per user

## 🧪 Test Mode

### Test Authentication
```javascript
// Use this token to bypass authentication
token: "test-token"

// Will authenticate as:
{
  userId: 1,
  userType: "customer"
}
```

### Test Endpoints
```bash
# Test conversation creation
curl -X POST http://localhost:3000/api/messages/conversations \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": 1, "userType": "customer"}'

# Test message sending
curl -X POST http://localhost:3000/api/messages/conversations/1/messages \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello!", "userType": "customer"}'
```

## 📊 Database Schema Reference

### Conversation Table
```sql
conversation_id   SERIAL PRIMARY KEY
appointment_id    INTEGER UNIQUE NOT NULL
customer_id       INTEGER NOT NULL
provider_id       INTEGER NOT NULL
status           VARCHAR DEFAULT 'active'
created_at       TIMESTAMP DEFAULT NOW()
last_message_at  TIMESTAMP
```

### Message Table
```sql
message_id       SERIAL PRIMARY KEY
conversation_id  INTEGER NOT NULL
sender_id        INTEGER NOT NULL
sender_type      VARCHAR NOT NULL -- 'customer' | 'provider'
message_type     VARCHAR DEFAULT 'text' -- 'text' | 'image'
content          TEXT NOT NULL
attachment_url   VARCHAR
is_read          BOOLEAN DEFAULT FALSE
created_at       TIMESTAMP DEFAULT NOW()
```

## 🚀 Performance Tips

### Frontend Optimization
- Use pagination for message lists (50 messages per page)
- Implement message caching with AsyncStorage
- Use image optimization for uploads
- Implement pull-to-refresh for conversations

### Backend Scaling
- Use Redis for WebSocket session storage
- Implement database connection pooling
- Add CDN for file serving
- Use message queues for push notifications

---

*Last Updated: September 3, 2025*
