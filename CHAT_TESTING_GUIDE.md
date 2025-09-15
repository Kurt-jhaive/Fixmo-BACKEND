# 🧪 Chat Testing Guide

## 🚀 How to Test the Chat Feature

### 1. **Start Your Server**
```bash
npm start
```

### 2. **Access the Chat Test Interface**
Open your browser and go to:
```
http://localhost:3000/chat-test
```

### 3. **Test Steps**

#### Step 1: Create Test Users (if needed)
You can create test users via your existing registration endpoints or use existing ones.

#### Step 2: Login Both User Types
1. **Customer Login:**
   - Enter customer email and password
   - Click "Login as Customer"
   - Status should show "Connected as [Name]"

2. **Provider Login:**
   - Enter provider email and password  
   - Click "Login as Provider"
   - Status should show "Connected as [Name]"

#### Step 3: Create a Conversation
1. Enter an existing **Appointment ID** (from your database)
2. Click "**Create Conversation**"
3. The conversation should appear in the conversations list

#### Step 4: Test Real-time Messaging
1. **Select the conversation** from the list
2. **Type messages** in the input field
3. **Send messages** by clicking Send or pressing Enter
4. **Switch between users** to see real-time message delivery
5. **Test file uploads** using the 📎 button

### 4. **Testing Features**

#### ✅ Real-time Messaging
- Messages appear instantly for both users
- Typing indicators show when someone is typing
- Message status tracking (sent, delivered, read)

#### ✅ File Uploads
- Click the 📎 button to upload images or documents
- Supported formats: JPG, PNG, PDF, DOC, DOCX
- Files are stored and accessible via links

#### ✅ Conversation Management
- Multiple conversations support
- Unread message counts
- Conversation history persistence

#### ✅ Authentication & Security
- JWT token authentication
- User role verification
- Booking-based access control

### 5. **Test Scenarios**

#### Scenario 1: Basic Chat
1. Login as customer
2. Create conversation with appointment ID
3. Send message: "Hello, I have a question about my booking"
4. Login as provider (in another tab/window)
5. See the message and reply

#### Scenario 2: File Sharing
1. In an active conversation
2. Click 📎 and upload an image
3. See the file link in the chat
4. Other user can view the file

#### Scenario 3: Multiple Conversations
1. Create multiple conversations with different appointment IDs
2. Switch between conversations
3. See unread counts and message history

### 6. **Troubleshooting**

#### Common Issues:
- **"Conversation creation failed"** → Check if appointment ID exists in database
- **"Login failed"** → Verify user credentials and endpoints
- **"WebSocket connection failed"** → Check server is running and CORS settings
- **"Messages not appearing"** → Check browser console for errors

#### Debug Tips:
- Open browser developer tools (F12) to see console logs
- Check Network tab for failed API calls
- Verify WebSocket connection in developer tools

### 7. **Advanced Testing**

#### Multiple Browser Windows
1. Open chat-test in multiple browser windows
2. Login as different users in each window
3. Test real-time message synchronization

#### Mobile Testing
1. Open chat-test on mobile browser
2. Test responsive design
3. Verify touch interactions work

#### Load Testing
1. Create multiple conversations
2. Send many messages rapidly
3. Test system performance

---

## 🎯 Expected Results

### ✅ Successful Test Checklist:
- [ ] Both customer and provider can login
- [ ] WebSocket connections established
- [ ] Conversations can be created from appointment IDs
- [ ] Messages send and receive in real-time
- [ ] File uploads work correctly
- [ ] Typing indicators appear
- [ ] Message status updates properly
- [ ] Unread counts are accurate
- [ ] Multiple conversations work
- [ ] Interface is responsive

### 🎉 When Everything Works:
You should see:
- ✅ Green "Connected" status indicators
- ✅ Real-time message delivery between users
- ✅ Smooth conversation switching
- ✅ File upload and sharing
- ✅ Professional chat interface

---

**Happy Testing! 🚀**

If you encounter any issues, check the browser console and server logs for error messages.
