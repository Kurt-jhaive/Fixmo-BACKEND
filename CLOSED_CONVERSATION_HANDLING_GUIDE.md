# 🔒 Closed Conversation Handling Guide

## Overview
When conversations are marked as **closed** (due to completed appointments, expired warranties, etc.), users cannot join these conversations or send messages. This guide explains how the backend prevents this and how the frontend should handle it.

---

## 🛡️ Backend Protection

### WebSocket Join Validation

When a user attempts to join a conversation via WebSocket, the backend validates:

1. ✅ **Authentication** - User must be authenticated
2. ✅ **Authorization** - User must be a participant (customer or provider)
3. ✅ **Status Check** - Conversation must be 'active'
4. ✅ **Warranty Check** - Warranty period must not be expired

**Location:** `src/services/MessageWebSocketServer.js` → `joinConversation()` method

### Validation Code
```javascript
// Check if conversation is closed
if (conversation.status === 'closed') {
    throw new Error('This conversation has been closed and is no longer available for messaging');
}

// Check for other non-active statuses
if (conversation.status !== 'active') {
    throw new Error(`Conversation is ${conversation.status} and not available for messaging`);
}

// Check warranty expiration
if (conversation.warranty_expires && new Date() > conversation.warranty_expires) {
    throw new Error('Conversation warranty period has expired');
}
```

---

## 📱 Frontend Implementation Guide

### 1. **Display Closed Conversations in List (Read-Only)**

When fetching conversations with `includeCompleted=true`, you'll receive closed conversations. Display them differently:

```jsx
// React Native Example
const ConversationItem = ({ conversation }) => {
  const isClosed = conversation.status === 'closed';
  const isExpired = conversation.warranty_expires && 
                    new Date() > new Date(conversation.warranty_expires);

  return (
    <TouchableOpacity 
      onPress={() => handleConversationPress(conversation)}
      style={[
        styles.conversationItem,
        isClosed && styles.closedConversation
      ]}
    >
      <View style={styles.conversationInfo}>
        <Text style={styles.participantName}>
          {conversation.participant.provider_first_name}
        </Text>
        
        {/* Status Badge */}
        {isClosed && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedBadgeText}>🔒 Closed</Text>
          </View>
        )}
        
        {isExpired && !isClosed && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredBadgeText}>⏰ Expired</Text>
          </View>
        )}
        
        <Text style={styles.lastMessage}>
          {conversation.last_message?.content}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  closedConversation: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5'
  },
  closedBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  closedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  expiredBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  }
});
```

---

### 2. **Prevent Joining Closed Conversations**

Before attempting to join a conversation, check its status:

```jsx
const handleConversationPress = (conversation) => {
  // Check if conversation is closed
  if (conversation.status === 'closed') {
    Alert.alert(
      'Conversation Closed',
      'This conversation has been closed. You can view past messages but cannot send new ones.',
      [
        { text: 'View Messages', onPress: () => navigateToReadOnlyView(conversation) },
        { text: 'OK', style: 'cancel' }
      ]
    );
    return;
  }

  // Check if warranty expired
  if (conversation.warranty_expires && new Date() > new Date(conversation.warranty_expires)) {
    Alert.alert(
      'Warranty Expired',
      'The warranty period for this service has expired. Messaging is no longer available.',
      [{ text: 'OK', style: 'cancel' }]
    );
    return;
  }

  // Safe to join - proceed to chat screen
  navigation.navigate('ChatScreen', { 
    conversationId: conversation.conversation_id,
    participant: conversation.participant
  });
};
```

---

### 3. **Handle WebSocket Join Errors**

Listen for `join_conversation_failed` events and handle them appropriately:

```jsx
// In your WebSocket setup
useEffect(() => {
  // ... socket connection code ...

  // Handle join failures
  socket.on('join_conversation_failed', (data) => {
    console.log('Failed to join conversation:', data);
    
    const { error, conversationId, reason } = data;
    
    switch (reason) {
      case 'closed':
        Alert.alert(
          'Conversation Closed',
          'This conversation has been closed and is no longer available for messaging.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        break;
        
      case 'expired':
        Alert.alert(
          'Warranty Expired',
          'The warranty period has expired. You can no longer send messages in this conversation.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        break;
        
      default:
        Alert.alert(
          'Cannot Join Conversation',
          error || 'Unable to join this conversation.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
    }
  });

  return () => {
    socket.off('join_conversation_failed');
  };
}, [socket]);
```

---

### 4. **Disable Message Input for Closed Conversations**

If a user somehow enters a closed conversation view, disable the message input:

```jsx
const ChatScreen = ({ route }) => {
  const { conversationId } = route.params;
  const [conversation, setConversation] = useState(null);
  const [canMessage, setCanMessage] = useState(true);

  useEffect(() => {
    // Fetch conversation details
    fetchConversationDetails();
  }, [conversationId]);

  const fetchConversationDetails = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/messages/conversations/${conversationId}?userType=customer`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setConversation(data.conversation);
        
        // Check if messaging is allowed
        const isClosed = data.conversation.status === 'closed';
        const isExpired = data.conversation.warranty_expires && 
                         new Date() > new Date(data.conversation.warranty_expires);
        
        setCanMessage(!isClosed && !isExpired);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Message List */}
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageItem message={item} />}
      />
      
      {/* Message Input - Conditionally Rendered */}
      {canMessage ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text>Send</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedNotice}>
          <Text style={styles.closedNoticeText}>
            🔒 This conversation is closed. You can view past messages but cannot send new ones.
          </Text>
        </View>
      )}
    </View>
  );
};
```

---

### 5. **Complete React Native Example**

```jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  StyleSheet 
} from 'react-native';

const ConversationsScreen = () => {
  const [conversations, setConversations] = useState([]);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [showClosed]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/messages/conversations?userType=customer&includeCompleted=${showClosed}`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleConversationPress = (conversation) => {
    // Prevent joining closed conversations
    if (conversation.status === 'closed') {
      Alert.alert(
        'Conversation Closed',
        'This conversation has been closed. You can view messages but cannot send new ones.',
        [
          {
            text: 'View Messages',
            onPress: () => navigation.navigate('ChatScreen', {
              conversationId: conversation.conversation_id,
              readOnly: true
            })
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Check warranty expiration
    if (conversation.warranty_expires && new Date() > new Date(conversation.warranty_expires)) {
      Alert.alert(
        'Warranty Expired',
        'The warranty period has expired. Messaging is no longer available.'
      );
      return;
    }

    // Navigate to active conversation
    navigation.navigate('ChatScreen', {
      conversationId: conversation.conversation_id,
      readOnly: false
    });
  };

  const renderConversation = ({ item }) => {
    const isClosed = item.status === 'closed';
    const isExpired = item.warranty_expires && 
                     new Date() > new Date(item.warranty_expires);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isClosed && styles.closedItem
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.conversationContent}>
          <Text style={styles.participantName}>
            {item.participant.provider_first_name} {item.participant.provider_last_name}
          </Text>
          
          {isClosed && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>🔒 Closed</Text>
            </View>
          )}
          
          {isExpired && !isClosed && (
            <View style={[styles.statusBadge, styles.expiredBadge]}>
              <Text style={styles.statusText}>⏰ Expired</Text>
            </View>
          )}
          
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message?.content || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowClosed(!showClosed)}
        >
          <Text style={styles.toggleText}>
            {showClosed ? 'Hide Closed' : 'Show Closed'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.conversation_id.toString()}
        refreshing={false}
        onRefresh={fetchConversations}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  toggleButton: {
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  toggleText: {
    color: '#fff',
    fontSize: 14
  },
  conversationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  closedItem: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7
  },
  conversationContent: {
    flex: 1
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statusBadge: {
    backgroundColor: '#ff4444',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 4
  },
  expiredBadge: {
    backgroundColor: '#ff9800'
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  }
});

export default ConversationsScreen;
```

---

## 🔑 Key Points

### Backend (Already Implemented) ✅
- **Validation on join:** Prevents joining closed conversations
- **Clear error messages:** Indicates why join failed
- **Error reasons:** Includes 'closed', 'expired', or 'unknown'
- **WebSocket events:** Emits `join_conversation_failed` with details

### Frontend (Your Responsibility) 📱
- **Check status before joining:** Prevent unnecessary join attempts
- **Display closed conversations differently:** Visual indicators (opacity, badges)
- **Handle join errors gracefully:** Show user-friendly alerts
- **Disable message input:** For closed/expired conversations
- **Optional toggle:** Show/hide closed conversations

---

## 📊 Conversation Status Flow

```
Active Conversation
    ↓
User completes appointment
    ↓
Backend auto-closes conversation
    ↓
status = 'closed'
    ↓
Frontend shows as "Closed" (read-only)
    ↓
User can view messages but cannot join or send
```

---

## 🧪 Testing Checklist

### Frontend Tests:
- [ ] Closed conversations display with visual indicator
- [ ] Cannot join closed conversation via tap/click
- [ ] Alert shown when attempting to access closed conversation
- [ ] Message input disabled in closed conversations
- [ ] Can still view message history in closed conversations
- [ ] Toggle to show/hide closed conversations works
- [ ] WebSocket join errors handled gracefully

### Backend Tests (Already Working):
- [x] Join fails for closed conversations
- [x] Clear error message returned
- [x] Error includes reason code
- [x] Warranty expiry check works
- [x] Only participants can attempt join

---

## 🆘 Troubleshooting

### Issue: User can see closed conversation but gets error when tapping
**Solution:** Add status check before navigation (see code examples above)

### Issue: Message input shows in closed conversation
**Solution:** Check `conversation.status` and conditionally render input (see ChatScreen example)

### Issue: No visual indicator for closed conversations
**Solution:** Add styling based on `conversation.status === 'closed'` (see ConversationItem example)

---

## 📝 Summary

**Backend:** ✅ Already prevents joining closed conversations
**Frontend:** ⚠️ Should add UI checks to improve user experience

The backend validation is the **primary security layer**. Frontend checks are for **better UX** to prevent users from attempting to join conversations that will fail.

---

*Last Updated: October 1, 2025*
*For questions, check MESSAGE_API_DOCUMENTATION.md*
