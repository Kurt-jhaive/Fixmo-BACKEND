import express from 'express';
import messageController, { upload } from '../controller/messageController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Conversation routes
router.get('/conversations', messageController.getConversations);
router.post('/conversations', messageController.createConversation);
router.get('/conversations/:conversationId', messageController.getConversationDetails);
router.put('/conversations/:conversationId/archive', messageController.archiveConversation);

// Message routes
router.get('/conversations/:conversationId/messages', messageController.getMessages);
router.post('/conversations/:conversationId/messages', upload.single('attachment'), messageController.sendMessage);
router.post('/upload', upload.single('file'), messageController.uploadFileMessage);
router.put('/conversations/:conversationId/messages/read', messageController.markAsRead);

// Search routes
router.get('/search', messageController.searchMessages);

export default router;
