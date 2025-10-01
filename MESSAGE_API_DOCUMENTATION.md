# Message API Documentation

## Overview
The Message API provides real-time messaging functionality between customers and service providers. It includes conversation management, message sending/receiving, file attachments, and warranty-based messaging restrictions.

## Base URLs

### HTTP API
```
# Local development
http://localhost:3000/api/messages

# Development with IP access (replace with your IP)
http://192.168.1.100:3000/api/messages

# Production
https://your-domain.com/api/messages
```

### Socket.IO WebSocket Connection
```
# Local development
http://localhost:3000

# Development with IP access (replace with your IP)
http://192.168.1.100:3000

# Production
https://your-domain.com
```

**Important**: This backend uses **Socket.IO**, not raw WebSockets! Use the Socket.IO client library, not `new WebSocket()`.

**Note**: The server is configured to accept connections from any IP address (`0.0.0.0:3000`), so you can access it using your computer's IP address from other devices on the same network.

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

## Key Features
- **Appointment-Based Messaging**: Available from booking until appointment completion or cancellation
- **Pre-Warranty Messaging**: Customers can message providers immediately after booking
- **Real-time Updates**: WebSocket support for instant message delivery
- **File Attachments**: Support for images and documents up to 5MB
- **Auto-Conversation Management**: Automatically manages conversation lifecycle based on appointment status
- **Message Threading**: Reply-to functionality for message threads
- **Read Receipts**: Track message read status
- **Search Functionality**: Search messages across conversations

## Table of Contents
1. [Conversation Management](#conversation-management)
2. [Message Operations](#message-operations)
3. [File Handling](#file-handling)
4. [Search & Utilities](#search--utilities)
5. [WebSocket Integration](#websocket-integration)
6. [Data Models](#data-models)
7. [Error Handling](#error-handling)
8. [Frontend Integration Examples](#frontend-integration-examples)

---

## Conversation Management

### 1. Get User Conversations
Retrieve all conversations for the authenticated user with automatic warranty status checking.

```http
GET /api/messages/conversations?page=1&limit=20&userType=customer
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `userType` (optional): 'customer' or 'provider' (usually detected from JWT)

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "conversation_id": 123,
      "participant": {
        "provider_id": 456,
        "provider_first_name": "John",
        "provider_last_name": "Doe",
        "provider_profile_photo": "https://cloudinary.../profile.jpg"
      },
      "last_message": {
        "message_id": 789,
        "content": "Thank you for the service!",
        "message_type": "text",
        "sender_type": "customer",
        "is_read": true,
        "created_at": "2025-09-30T14:30:00.000Z"
      },
      "unread_count": 0,
      "status": "active",
      "warranty_expires": "2025-10-30T12:00:00.000Z",
      "appointment_status": "in-warranty",
      "created_at": "2025-09-25T12:00:00.000Z",
      "last_message_at": "2025-09-30T14:30:00.000Z",
      "is_warranty_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

### 2. Create Conversation
Create a new conversation between customer and provider (requires valid appointment that is not cancelled or completed).

```http
POST /api/messages/conversations
Content-Type: application/json
Authorization: Bearer <token>

{
  "customerId": 123,
  "providerId": 456,
  "userType": "customer"
}
```

**Request Body:**
- `customerId` (required): Customer user ID
- `providerId` (required): Provider user ID
- `userType` (optional): User type for validation

**Response:**
```json
{
  "success": true,
  "message": "Conversation ready",
  "data": {
    "conversation_id": 789,
    "customer_id": 123,
    "provider_id": 456,
    "status": "active",
    "warranty_expires": "2025-10-30T12:00:00.000Z",
    "created_at": "2025-09-30T15:00:00.000Z",
    "customer": {
      "user_id": 123,
      "first_name": "Jane",
      "last_name": "Smith",
      "profile_photo": "https://cloudinary.../profile.jpg"
    },
    "provider": {
      "provider_id": 456,
      "provider_first_name": "John",
      "provider_last_name": "Doe",
      "provider_profile_photo": "https://cloudinary.../profile.jpg"
    }
  }
}
```

### 3. Get Conversation Details
Get detailed information about a specific conversation including all messages.

```http
GET /api/messages/conversations/{conversationId}?userType=customer
Authorization: Bearer <token>
```

**Path Parameters:**
- `conversationId`: Conversation ID

**Query Parameters:**
- `userType` (optional): User type for validation

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation_id": 123,
    "customer_id": 789,
    "provider_id": 456,
    "status": "active",
    "warranty_expires": "2025-10-30T12:00:00.000Z",
    "created_at": "2025-09-25T12:00:00.000Z",
    "customer": {
      "user_id": 789,
      "first_name": "Jane",
      "last_name": "Smith",
      "profile_photo": "https://cloudinary.../profile.jpg",
      "phone_number": "+1234567890"
    },
    "provider": {
      "provider_id": 456,
      "provider_first_name": "John",
      "provider_last_name": "Doe",
      "provider_profile_photo": "https://cloudinary.../profile.jpg",
      "provider_phone_number": "+0987654321",
      "provider_rating": 4.8
    },
    "messages": [
      {
        "message_id": 101,
        "content": "Hello, I need help with my AC unit.",
        "message_type": "text",
        "sender_id": 789,
        "sender_type": "customer",
        "attachment_url": null,
        "is_read": true,
        "replied_to_id": null,
        "created_at": "2025-09-30T10:00:00.000Z"
      }
    ],
    "_count": {
      "messages": 15
    }
  }
}
```

### 4. Archive Conversation
Archive a conversation (change status to archived).

```http
PUT /api/messages/conversations/{conversationId}/archive
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation archived successfully",
  "conversation": {
    "conversation_id": 123,
    "status": "archived",
    "updated_at": "2025-09-30T15:30:00.000Z"
  }
}
```

---

## Message Operations

### 1. Get Messages in Conversation
Retrieve messages from a specific conversation with pagination.

```http
GET /api/messages/conversations/{conversationId}/messages?page=1&limit=50
Authorization: Bearer <token>
```

**Path Parameters:**
- `conversationId`: Conversation ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "message_id": 101,
      "conversation_id": 123,
      "sender_id": 789,
      "sender_type": "customer",
      "content": "The AC is making strange noises again.",
      "message_type": "text",
      "attachment_url": null,
      "is_read": true,
      "replied_to_id": null,
      "created_at": "2025-09-30T10:00:00.000Z",
      "replied_to": null
    },
    {
      "message_id": 102,
      "conversation_id": 123,
      "sender_id": 456,
      "sender_type": "provider",
      "content": "I'll check it out for you.",
      "message_type": "text",
      "attachment_url": null,
      "is_read": false,
      "replied_to_id": 101,
      "created_at": "2025-09-30T10:05:00.000Z",
      "replied_to": {
        "message_id": 101,
        "content": "The AC is making strange noises again.",
        "sender_type": "customer",
        "created_at": "2025-09-30T10:00:00.000Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "has_more": false
  }
}
```

### 2. Send Message
Send a text message or message with attachment to a conversation.

```http
POST /api/messages/conversations/{conversationId}/messages
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
- `content` (required): Message text content
- `messageType` (optional): 'text', 'image', 'document' (default: 'text')
- `replyToId` (optional): ID of message being replied to
- `userType` (optional): Sender type for validation
- `attachment` (optional): File attachment (image/document, max 5MB)

**Example Request:**
```javascript
const formData = new FormData();
formData.append('content', 'Here is the photo you requested');
formData.append('messageType', 'image');
formData.append('attachment', imageFile);

const response = await fetch('/api/messages/conversations/123/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message_id": 103,
    "conversation_id": 123,
    "sender_id": 789,
    "sender_type": "customer",
    "content": "Here is the photo you requested",
    "message_type": "image",
    "attachment_url": "https://cloudinary.../message_photo.jpg",
    "is_read": false,
    "replied_to_id": null,
    "created_at": "2025-09-30T11:00:00.000Z",
    "replied_to": null
  }
}
```

### 3. Mark Messages as Read
Mark specific messages as read (updates read receipts).

```http
PUT /api/messages/conversations/{conversationId}/messages/read
Content-Type: application/json
Authorization: Bearer <token>

{
  "messageIds": [101, 102, 103]
}
```

**Request Body:**
- `messageIds` (required): Array of message IDs to mark as read

**Response:**
```json
{
  "success": true,
  "message": "3 messages marked as read"
}
```

---

## File Handling

### 1. Upload File Message
Upload and send a file as a message (separate endpoint for file-focused uploads).

```http
POST /api/messages/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
- `conversationId` (required): Target conversation ID
- `senderType` (optional): Sender type for validation
- `file` (required): File to upload (image only, max 5MB)

**Supported File Types:**
- Images: JPEG, JPG, PNG, GIF, WebP (max 5MB)
- Documents: PDF, DOC, DOCX, TXT (max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "message_id": 104,
    "conversation_id": 123,
    "sender_id": 789,
    "sender_type": "customer",
    "content": "📸 Image attachment",
    "message_type": "image",
    "attachment_url": "https://cloudinary.../uploaded_image.jpg",
    "is_read": false,
    "created_at": "2025-09-30T11:30:00.000Z"
  }
}
```

---

## Search & Utilities

### 1. Search Messages
Search for messages across conversations or within a specific conversation.

```http
GET /api/messages/search?query=AC%20repair&conversationId=123&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `query` (required): Search text (case-insensitive)
- `conversationId` (optional): Limit search to specific conversation
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `userType` (optional): User type for validation

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "message_id": 105,
      "conversation_id": 123,
      "sender_id": 456,
      "sender_type": "provider",
      "content": "I completed the AC repair as requested.",
      "message_type": "text",
      "created_at": "2025-09-30T12:00:00.000Z",
      "conversation": {
        "conversation_id": 123,
        "customer": {
          "user_id": 789,
          "first_name": "Jane",
          "last_name": "Smith"
        },
        "provider": {
          "provider_id": 456,
          "provider_first_name": "John",
          "provider_last_name": "Doe"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_more": false
  }
}
```

---

## WebSocket Integration

### Socket.IO Connection Setup
**IMPORTANT**: This backend uses Socket.IO, not raw WebSockets!

```javascript
import { io } from 'socket.io-client';

// Connection URLs for different environments
const getSocketUrl = () => {
  // Development (local)
  return 'http://localhost:3000';
  
  // Development (your IP address)
  // return 'http://192.168.1.100:3000'; // Replace with your actual IP
  
  // Production
  // return 'https://your-domain.com';
  
  // Auto-detect (recommended for web apps)
  // return `${window.location.protocol}//${window.location.hostname}:3000`;
};

// Connect to Socket.IO server
const socket = io(getSocketUrl(), {
  transports: ['websocket', 'polling'], // Allow fallback to polling
  upgrade: true,
  rememberUpgrade: true
});

// STEP 1: Listen for connection
socket.on('connect', () => {
  console.log('Connected to Socket.IO server:', socket.id);
  
  // STEP 2: Authenticate immediately after connection
  socket.emit('authenticate', {
    token: 'your_jwt_token',
    userType: 'customer' // or 'provider'
  });
});

// STEP 3: Wait for authentication success
socket.on('authenticated', (data) => {
  console.log('Authentication successful:', data);
  // data contains: { success: true, userId, userType, user, socketId }
  
  // STEP 4: Now join conversation (only after authentication)
  socket.emit('join_conversation', {
    conversationId: 123
    // userId and userType are automatically extracted from authenticated socket
  });
});

// STEP 5: Handle successful conversation join
socket.on('joined_conversation', (data) => {
  console.log('Successfully joined conversation:', data);
  // data contains: { success: true, conversationId, roomName, message }
});

// Handle authentication failure
socket.on('authentication_failed', (error) => {
  console.error('Authentication failed:', error);
});

// Handle conversation join failure
socket.on('join_conversation_failed', (error) => {
  console.error('Failed to join conversation:', error);
});
```

### Real-time Events
```javascript
// Connection events
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
});

// Authentication events
socket.on('authenticated', (data) => {
  console.log('Socket.IO authenticated:', data);
});

socket.on('authentication_failed', (error) => {
  console.error('Authentication failed:', error);
});

// Message events
socket.on('new_message', (message) => {
  console.log('New message received:', message);
  handleNewMessage(message);
});

socket.on('message_read', (data) => {
  console.log('Message read update:', data);
  updateMessageStatus(data.messageId);
});

// Conversation events
socket.on('conversation_closed', (data) => {
  console.log('Conversation closed:', data);
  handleConversationClosed(data.conversationId);
});

socket.on('conversation_updated', (data) => {
  console.log('Conversation updated:', data);
  handleConversationUpdate(data);
});

// Error handling
socket.on('error', (error) => {
  console.error('Socket.IO error:', error);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Environment Configuration for Socket.IO
Create a configuration file for different environments:

```javascript
// config/socket.js
export const getSocketConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (typeof window !== 'undefined') {
    // Browser environment
    if (isDevelopment) {
      // Use localhost for local development
      return {
        url: 'http://localhost:3000',
        options: {
          transports: ['websocket', 'polling'],
          upgrade: true
        }
      };
    } else {
      // Production web environment
      return {
        url: `${window.location.protocol}//${window.location.hostname}`,
        options: {
          transports: ['websocket', 'polling'],
          upgrade: true
        }
      };
    }
  } else {
    // React Native or Node environment
    if (isDevelopment || __DEV__) {
      return {
        url: 'http://192.168.1.100:3000', // Replace with your computer's IP
        options: {
          transports: ['websocket', 'polling'],
          upgrade: true,
          forceNew: true
        }
      };
    } else {
      return {
        url: 'https://your-production-domain.com', // Replace with your domain
        options: {
          transports: ['websocket', 'polling'],
          upgrade: true
        }
      };
    }
  }
};

// Usage
import { io } from 'socket.io-client';
const { url, options } = getSocketConfig();
const socket = io(url, options);
```

---

## Data Models

### Conversation Object
```typescript
interface Conversation {
  conversation_id: number;
  customer_id: number;
  provider_id: number;
  status: 'active' | 'closed' | 'archived';
  warranty_expires?: string; // ISO date
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}
```

### Message Object
```typescript
interface Message {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  sender_type: 'customer' | 'provider';
  content: string;
  message_type: 'text' | 'image' | 'document';
  attachment_url?: string;
  is_read: boolean;
  replied_to_id?: number;
  created_at: string;
  updated_at: string;
}
```

### User Profile Objects
```typescript
interface CustomerProfile {
  user_id: number;
  first_name: string;
  last_name: string;
  profile_photo?: string;
  phone_number?: string;
}

interface ProviderProfile {
  provider_id: number;
  provider_first_name: string;
  provider_last_name: string;
  provider_profile_photo?: string;
  provider_phone_number?: string;
  provider_rating?: number;
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Message content is required"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden - Messaging Not Available
```json
{
  "success": false,
  "message": "Messaging not available - appointment is cancelled or completed"
}
```

#### 403 Forbidden - Conversation Closed
```json
{
  "success": false,
  "message": "This conversation has been closed - appointment is cancelled or completed"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Conversation not found or access denied"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB"
}
```

#### 422 Unprocessable Entity
```json
{
  "success": false,
  "message": "Invalid file type for message attachment."
}
```

---

## Frontend Integration Examples

### React Chat Component
```jsx
import React, { useState, useEffect, useRef } from 'react';

const ChatComponent = ({ conversationId, userType, token }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load initial messages
    loadMessages();
    
    // Setup WebSocket connection
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupWebSocket = () => {
    // Import Socket.IO client
    const { io } = require('socket.io-client');
    
    // Socket.IO URL (not ws://)
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
    
    wsRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      forceNew: true
    });
    
    wsRef.current.on('connect', () => {
      console.log('Socket.IO connected:', wsRef.current.id);
      
      // Authenticate first
      wsRef.current.emit('authenticate', {
        token: token,
        userType: userType
      });
    });

    wsRef.current.on('authenticated', (data) => {
      console.log('Authentication successful:', data);
      
      // Join conversation after authentication
      wsRef.current.emit('join_conversation', {
        conversationId: parseInt(conversationId),
        userId: getUserIdFromToken(token), // Helper function to extract user ID
        userType: userType
      });
    });

    wsRef.current.on('new_message', (message) => {
      console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
      scrollToBottom();
      
      // Mark message as read if not from current user
      if (message.sender_type !== userType) {
        markAsRead([message.message_id]);
      }
    });

    wsRef.current.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    wsRef.current.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          messageType: 'text',
          userType: userType
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
        // Message will be added via WebSocket
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageIds) => {
    try {
      await fetch(`/api/messages/conversations/${conversationId}/messages/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messageIds })
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);
    formData.append('senderType', userType);

    try {
      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!data.success) {
        alert(data.message);
      }
      // File message will be added via WebSocket
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map(message => (
          <div 
            key={message.message_id}
            className={`message ${message.sender_type === userType ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              {message.message_type === 'image' && message.attachment_url ? (
                <img 
                  src={message.attachment_url} 
                  alt="Message attachment"
                  className="message-image"
                />
              ) : null}
              <p>{message.content}</p>
              {message.replied_to && (
                <div className="reply-to">
                  Reply to: {message.replied_to.content}
                </div>
              )}
            </div>
            <div className="message-meta">
              <span className="timestamp">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
              {message.sender_type === userType && (
                <span className={`read-status ${message.is_read ? 'read' : 'unread'}`}>
                  {message.is_read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-input-container">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files[0])}
          style={{ display: 'none' }}
          id="file-input"
        />
        <label htmlFor="file-input" className="file-upload-btn">
          📎
        </label>
        
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
          disabled={loading}
        />
        
        <button 
          type="submit" 
          disabled={loading || !newMessage.trim()}
          className="send-button"
        >
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatComponent;
```

### Conversation List Component
```jsx
const ConversationList = ({ userType, token }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch(`/api/messages/conversations?userType=${userType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (customerId, providerId) => {
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId,
          providerId,
          userType
        })
      });

      const data = await response.json();
      
      if (data.success) {
        loadConversations(); // Refresh list
        return data.data.conversation_id;
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  if (loading) return <div>Loading conversations...</div>;

  return (
    <div className="conversation-list">
      {conversations.map(conv => (
        <div 
          key={conv.conversation_id}
          className="conversation-item"
          onClick={() => openConversation(conv.conversation_id)}
        >
          <img 
            src={conv.participant.profile_photo || '/default-avatar.png'}
            alt="Profile"
            className="participant-avatar"
          />
          
          <div className="conversation-info">
            <div className="participant-name">
              {userType === 'customer' 
                ? `${conv.participant.provider_first_name} ${conv.participant.provider_last_name}`
                : `${conv.participant.first_name} ${conv.participant.last_name}`
              }
            </div>
            
            <div className="last-message">
              {conv.last_message?.content || 'No messages yet'}
            </div>
            
            <div className="conversation-meta">
              <span className="warranty-status">
                {conv.is_warranty_active ? '🛡️ Warranty Active' : '❌ Expired'}
              </span>
              {conv.unread_count > 0 && (
                <span className="unread-badge">{conv.unread_count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### React Native Integration Example
```jsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { io } from 'socket.io-client';

const ChatScreen = ({ conversationId, userType, token, serverIP }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  
  // Use your computer's IP address for React Native development
  const API_BASE_URL = `http://${serverIP}:3000/api`;
  const SOCKET_URL = `http://${serverIP}:3000`; // Socket.IO URL (not ws://)

  useEffect(() => {
    setupWebSocket();
    loadMessages();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const setupWebSocket = () => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Allow fallback to polling
      upgrade: true,
      forceNew: true
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      
      // STEP 1: Authenticate immediately after connection
      socketRef.current.emit('authenticate', {
        token: token,
        userType: userType
      });
    });

    socketRef.current.on('authenticated', (data) => {
      console.log('Authentication successful:', data);
      // STEP 2: Join conversation after authentication success
      socketRef.current.emit('join_conversation', {
        conversationId: parseInt(conversationId)
        // userId and userType are extracted from authenticated socket
      });
    });

    socketRef.current.on('authentication_failed', (error) => {
      console.error('Authentication failed:', error);
      Alert.alert('Authentication Failed', error.message || 'Failed to authenticate');
    });

    socketRef.current.on('joined_conversation', (data) => {
      console.log('Successfully joined conversation:', data);
    });

    socketRef.current.on('join_conversation_failed', (error) => {
      console.error('Failed to join conversation:', error);
      Alert.alert('Connection Error', error.message || 'Failed to join conversation');
    });

    socketRef.current.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          messageType: 'text',
          userType: userType
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderMessage = ({ item }) => (
    <View style={{
      alignSelf: item.sender_type === userType ? 'flex-end' : 'flex-start',
      backgroundColor: item.sender_type === userType ? '#007AFF' : '#E5E5EA',
      padding: 10,
      borderRadius: 15,
      margin: 5,
      maxWidth: '80%'
    }}>
      <Text style={{
        color: item.sender_type === userType ? 'white' : 'black'
      }}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <View style={{ flex: 1 }}>
        <Text>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</Text>
        
        <FlatList
          data={messages}
          keyExtractor={(item) => item.message_id.toString()}
          renderItem={renderMessage}
          style={{ flex: 1, marginVertical: 10 }}
        />
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 10,
            marginRight: 10
          }}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!newMessage.trim()}
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20
          }}
        >
          <Text style={{ color: 'white' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Helper function to extract user ID from JWT token
const getUserIdFromToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

export default ChatScreen;
```

### JavaScript API Client
```javascript
class MessageAPI {
  constructor(baseUrl, token, wsUrl = null) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.wsUrl = wsUrl;
  }

  async getConversations(userType, page = 1, limit = 20) {
    const response = await fetch(
      `${this.baseUrl}/messages/conversations?userType=${userType}&page=${page}&limit=${limit}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return await response.json();
  }

  async createConversation(customerId, providerId, userType) {
    const response = await fetch(`${this.baseUrl}/messages/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ customerId, providerId, userType })
    });
    return await response.json();
  }

  async getMessages(conversationId, page = 1, limit = 50) {
    const response = await fetch(
      `${this.baseUrl}/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return await response.json();
  }

  async sendMessage(conversationId, content, messageType = 'text', replyToId = null, attachment = null) {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('messageType', messageType);
    
    if (replyToId) {
      formData.append('replyToId', replyToId);
    }
    
    if (attachment) {
      formData.append('attachment', attachment);
    }

    const response = await fetch(
      `${this.baseUrl}/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      }
    );
    return await response.json();
  }

  async markAsRead(conversationId, messageIds) {
    const response = await fetch(
      `${this.baseUrl}/messages/conversations/${conversationId}/messages/read`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ messageIds })
      }
    );
    return await response.json();
  }

  async uploadFile(conversationId, file, senderType) {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('file', file);
    formData.append('senderType', senderType);

    const response = await fetch(`${this.baseUrl}/messages/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });
    return await response.json();
  }

  async searchMessages(query, conversationId = null, page = 1, limit = 20) {
    let url = `${this.baseUrl}/messages/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
    
    if (conversationId) {
      url += `&conversationId=${conversationId}`;
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async archiveConversation(conversationId) {
    const response = await fetch(
      `${this.baseUrl}/messages/conversations/${conversationId}/archive`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    return await response.json();
  }
}
```

## Best Practices

### Appointment-Based Messaging
1. **Check appointment status** before allowing messaging
2. **Auto-close conversations** when appointments are completed or cancelled
3. **Show clear appointment status indicators** in the UI
4. **Enable messaging immediately** after booking

### Real-time Features
1. **Use WebSocket** for instant message delivery
2. **Implement proper reconnection logic** for WebSocket
3. **Fall back to HTTP** if WebSocket fails

### File Handling
1. **Validate file types** on both frontend and backend
2. **Show upload progress** for better UX
3. **Compress images** before upload if needed
4. **Handle upload failures** gracefully

### Performance
1. **Implement pagination** for message lists
2. **Cache conversation lists** locally
3. **Use lazy loading** for older messages
4. **Optimize image sizes** with Cloudinary transformations

### Security
1. **Always validate user access** to conversations
2. **Sanitize message content** to prevent XSS
3. **Rate limit message sending** to prevent spam
4. **Validate file uploads** thoroughly

## Quick Setup Guide

### Step 0: Install Socket.IO Client

**For React/Web Apps:**
```bash
npm install socket.io-client
```

**For React Native:**
```bash
npm install socket.io-client
# Additional for React Native
npm install react-native-get-random-values
```

### Step 1: Find Your Computer's IP Address

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" address (e.g., 192.168.1.100)

### Step 2: Configure Your Frontend

**For React/Web Apps:**
```javascript
// Set environment variables in .env file
REACT_APP_API_BASE_URL=http://192.168.1.100:3000
REACT_APP_SOCKET_URL=http://192.168.1.100:3000

// Use in code
import { io } from 'socket.io-client';

const apiUrl = process.env.REACT_APP_API_BASE_URL + '/api/messages';
const socketUrl = process.env.REACT_APP_SOCKET_URL;
const socket = io(socketUrl);
```

**For React Native:**
```javascript
// config/api.js
export const API_CONFIG = {
  // Replace with your computer's IP address
  SERVER_IP: '192.168.1.100',
  PORT: '3000',
  get BASE_URL() { return `http://${this.SERVER_IP}:${this.PORT}/api/messages`; },
  get SOCKET_URL() { return `http://${this.SERVER_IP}:${this.PORT}`; } // Note: http://, not ws://
};

// Usage
import { io } from 'socket.io-client';
import { API_CONFIG } from './config/api';

const socket = io(API_CONFIG.SOCKET_URL, {
  transports: ['websocket', 'polling'],
  upgrade: true
});
```

### Step 3: Test Connection

```javascript
import { io } from 'socket.io-client';

// Test HTTP API
fetch('http://192.168.1.100:3000/api/messages/conversations', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => response.json())
.then(data => console.log('API works:', data))
.catch(error => console.error('API error:', error));

// Test Socket.IO connection
const socket = io('http://192.168.1.100:3000'); // Note: http://, not ws://
socket.on('connect', () => {
  console.log('Socket.IO connected!', socket.id);
});
socket.on('connect_error', (error) => {
  console.error('Socket.IO connection failed:', error);
});
```

### Step 4: Production Deployment

When deploying to production, replace IP addresses with your domain:
- HTTP API: `https://your-domain.com/api/messages`  
- Socket.IO: `https://your-domain.com` (will use WSS automatically)

**Production Socket.IO Example:**
```javascript
// Production configuration
const socket = io('https://your-domain.com', {
  transports: ['websocket', 'polling'],
  upgrade: true
});
```

This comprehensive documentation provides everything needed to integrate with the Message API, including real-time WebSocket functionality, file handling, and appointment-based messaging restrictions.