# 📱 React Native Integration Guide for Fixmo Messaging System

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install socket.io-client axios react-native-image-picker
# For iOS
cd ios && pod install
```

### 2. Setup Socket Service
Create `src/services/SocketService.js`:

```javascript
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token, userType, baseUrl = 'http://your-backend-url:3000') {
    this.socket = io(baseUrl, {
      autoConnect: false,
      timeout: 20000,
    });

    this.socket.connect();

    // Authentication
    this.socket.emit('authenticate', {
      token,
      userType
    });

    // Connection handlers
    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.isConnected = true;
    });

    this.socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✅ Authenticated successfully');
      } else {
        console.error('❌ Authentication failed');
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      this.isConnected = false;
    });

    return this.socket;
  }

  joinConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  leaveConversation(conversationId) {
    if (this.socket) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  sendTypingStart(conversationId) {
    if (this.socket) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  sendTypingStop(conversationId) {
    if (this.socket) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new SocketService();
```

### 3. Setup Message API Service
Create `src/services/MessageService.js`:

```javascript
import axios from 'axios';

const BASE_URL = 'http://your-backend-url:3000/api/messages';

class MessageService {
  constructor() {
    this.token = null;
  }

  setAuthToken(token) {
    this.token = token;
  }

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getConversations(userType, page = 1, limit = 20) {
    try {
      const response = await axios.get(`${BASE_URL}/conversations`, {
        headers: this.getAuthHeaders(),
        params: { userType, page, limit }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createConversation(appointmentId, userType) {
    try {
      const response = await axios.post(`${BASE_URL}/conversations`, {
        appointmentId,
        userType
      }, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getConversationDetails(conversationId, userType) {
    try {
      const response = await axios.get(`${BASE_URL}/conversations/${conversationId}`, {
        headers: this.getAuthHeaders(),
        params: { userType }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async sendMessage(conversationId, content, userType) {
    try {
      const response = await axios.post(`${BASE_URL}/conversations/${conversationId}/messages`, {
        content,
        userType
      }, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadImage(conversationId, imageUri, userType) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg'
      });
      formData.append('conversationId', conversationId);
      formData.append('senderType', userType);

      const response = await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMessages(conversationId, page = 1, limit = 50) {
    try {
      const response = await axios.get(`${BASE_URL}/conversations/${conversationId}/messages`, {
        headers: this.getAuthHeaders(),
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markMessagesAsRead(conversationId, messageIds) {
    try {
      const response = await axios.put(`${BASE_URL}/conversations/${conversationId}/messages/read`, {
        messageIds
      }, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return {
        message: error.response.data.message || 'Server error',
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      return {
        message: 'Network error - please check your connection',
        status: 0
      };
    } else {
      return {
        message: error.message,
        status: -1
      };
    }
  }
}

export default new MessageService();
```

### 4. Conversation List Screen
Create `src/screens/ConversationListScreen.js`:

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import MessageService from '../services/MessageService';
import SocketService from '../services/SocketService';

const ConversationListScreen = ({ navigation, route }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userToken, userType } = route.params;

  useEffect(() => {
    // Set auth token
    MessageService.setAuthToken(userToken);
    
    // Connect socket
    SocketService.connect(userToken, userType);
    
    // Load conversations
    loadConversations();

    // Listen for conversation updates
    SocketService.on('conversation_updated', loadConversations);
    SocketService.on('new_message', handleNewMessage);

    return () => {
      SocketService.off('conversation_updated', loadConversations);
      SocketService.off('new_message', handleNewMessage);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const response = await MessageService.getConversations(userType);
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNewMessage = (message) => {
    // Update conversation list with new message
    setConversations(prev => 
      prev.map(conv => 
        conv.conversation_id === message.conversation_id
          ? {
              ...conv,
              last_message: message.content,
              last_message_at: message.created_at,
              unread_count: conv.unread_count + 1
            }
          : conv
      )
    );
  };

  const openConversation = (conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.conversation_id,
      appointmentId: conversation.appointment.appointment_id,
      userType,
      participantName: getParticipantName(conversation)
    });
  };

  const getParticipantName = (conversation) => {
    const participant = conversation.participant;
    if (userType === 'customer') {
      return `${participant.provider_first_name} ${participant.provider_last_name}`;
    } else {
      return `${participant.first_name} ${participant.last_name}`;
    }
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => openConversation(item)}
    >
      <View style={styles.conversationHeader}>
        <Text style={styles.appointmentTitle}>
          Appointment #{item.appointment.appointment_id}
        </Text>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.participantName}>
        {getParticipantName(item)}
      </Text>
      
      <Text style={styles.lastMessage} numberOfLines={2}>
        {item.last_message || 'No messages yet'}
      </Text>
      
      <Text style={styles.timestamp}>
        {formatTimestamp(item.last_message_at)}
      </Text>
    </TouchableOpacity>
  );

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.conversation_id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadConversations} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  conversationItem: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  participantName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#aaa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});

export default ConversationListScreen;
```

### 5. Chat Screen
Create `src/screens/ChatScreen.js`:

```javascript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MessageService from '../services/MessageService';
import SocketService from '../services/SocketService';

const ChatScreen = ({ route }) => {
  const { conversationId, userType, participantName } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef();
  const typingTimeoutRef = useRef();

  useEffect(() => {
    // Join conversation
    SocketService.joinConversation(conversationId);
    
    // Load messages
    loadMessages();

    // Socket listeners
    SocketService.on('new_message', handleNewMessage);
    SocketService.on('user_typing', handleUserTyping);
    SocketService.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      SocketService.leaveConversation(conversationId);
      SocketService.off('new_message', handleNewMessage);
      SocketService.off('user_typing', handleUserTyping);
      SocketService.off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, []);

  const loadMessages = async () => {
    try {
      const response = await MessageService.getMessages(conversationId);
      if (response.success) {
        setMessages(response.data.reverse()); // Show newest at bottom
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    if (message.conversation_id === conversationId) {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    }
  };

  const handleUserTyping = (data) => {
    if (data.conversationId === conversationId) {
      setTypingUser(data.userName);
      setIsTyping(true);
    }
  };

  const handleUserStoppedTyping = (data) => {
    if (data.conversationId === conversationId) {
      setIsTyping(false);
      setTypingUser(null);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');

    try {
      await MessageService.sendMessage(conversationId, messageText, userType);
    } catch (error) {
      Alert.alert('Error', error.message);
      setInputText(messageText); // Restore text on error
    }
  };

  const sendImage = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) return;

      if (response.assets && response.assets[0]) {
        uploadImage(response.assets[0].uri);
      }
    });
  };

  const uploadImage = async (imageUri) => {
    try {
      await MessageService.uploadImage(conversationId, imageUri, userType);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);

    // Handle typing indicators
    if (text.length > 0 && !isTyping) {
      SocketService.sendTypingStart(conversationId);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      SocketService.sendTypingStop(conversationId);
    }, 1000);
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.sender_type === userType;
    
    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          {item.message_type === 'image' && item.attachment_url ? (
            <TouchableOpacity onPress={() => openImage(item.attachment_url)}>
              <Image
                source={{ uri: `http://your-backend-url:3000${item.attachment_url}` }}
                style={styles.messageImage}
              />
            </TouchableOpacity>
          ) : null}
          
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {item.content}
          </Text>
          
          <Text style={styles.timestamp}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openImage = (imageUrl) => {
    // Implement image viewer modal
    console.log('Open image:', imageUrl);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{participantName}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id.toString()}
        style={styles.messagesList}
        onContentSizeChange={scrollToBottom}
      />

      {/* Typing indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typingUser} is typing...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.imageButton} onPress={sendImage}>
          <Text style={styles.imageButtonText}>📷</Text>
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
  },
  otherBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
  },
  ownText: {
    color: 'white',
  },
  otherText: {
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  typingContainer: {
    padding: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  imageButton: {
    padding: 8,
    marginRight: 8,
  },
  imageButtonText: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ChatScreen;
```

### 6. Navigation Setup
In your main navigation file:

```javascript
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ConversationListScreen from './src/screens/ConversationListScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Conversations" 
          component={ConversationListScreen}
          options={{ title: 'Messages' }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## 🔧 Additional Features

### Push Notifications
```javascript
// Install: npm install @react-native-firebase/messaging

import messaging from '@react-native-firebase/messaging';

// In your main App component
useEffect(() => {
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    // Handle foreground messages
    console.log('Foreground message:', remoteMessage);
  });

  return unsubscribe;
}, []);
```

### Offline Support
```javascript
// Install: npm install @react-native-async-storage/async-storage

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache messages locally
const cacheMessages = async (conversationId, messages) => {
  await AsyncStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));
};

// Load cached messages
const loadCachedMessages = async (conversationId) => {
  const cached = await AsyncStorage.getItem(`messages_${conversationId}`);
  return cached ? JSON.parse(cached) : [];
};
```

## 🚀 Performance Optimization

### Message Pagination
```javascript
const [messages, setMessages] = useState([]);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMoreMessages = async () => {
  if (!hasMore) return;
  
  try {
    const response = await MessageService.getMessages(conversationId, page + 1);
    if (response.success && response.data.length > 0) {
      setMessages(prev => [...response.data.reverse(), ...prev]);
      setPage(prev => prev + 1);
    } else {
      setHasMore(false);
    }
  } catch (error) {
    console.error('Error loading more messages:', error);
  }
};
```

### Image Caching
```javascript
// Install: npm install react-native-fast-image

import FastImage from 'react-native-fast-image';

// Use instead of regular Image component
<FastImage
  source={{ uri: imageUrl }}
  style={styles.messageImage}
  resizeMode={FastImage.resizeMode.cover}
/>
```

## 📋 Testing

### Unit Tests
```javascript
// __tests__/MessageService.test.js
import MessageService from '../src/services/MessageService';

describe('MessageService', () => {
  beforeEach(() => {
    MessageService.setAuthToken('test-token');
  });

  test('should send message successfully', async () => {
    const result = await MessageService.sendMessage(1, 'Hello', 'customer');
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests
```javascript
// __tests__/ChatScreen.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChatScreen from '../src/screens/ChatScreen';

test('should send message when button pressed', async () => {
  const { getByPlaceholderText, getByText } = render(<ChatScreen />);
  
  const input = getByPlaceholderText('Type a message...');
  const sendButton = getByText('Send');
  
  fireEvent.changeText(input, 'Test message');
  fireEvent.press(sendButton);
  
  // Assert message was sent
});
```

---

*Ready to integrate with your React Native app! 🚀*
