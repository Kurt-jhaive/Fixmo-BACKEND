/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     tags: [Messaging]
 *     summary: Get user's conversations
 *     description: Get all conversations for the authenticated user (customer or provider)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [customer, provider]
 *         description: User type for filtering conversations
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of conversations per page
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConversationSummary'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     tags: [Messaging]
 *     summary: Create new conversation
 *     description: Create a new conversation when an appointment is confirmed
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *             properties:
 *               appointmentId:
 *                 type: integer
 *                 description: ID of the confirmed appointment
 *                 example: 123
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Conversation created successfully"
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 * 
 * /api/messages/conversations/{conversationId}:
 *   get:
 *     tags: [Messaging]
 *     summary: Get conversation details
 *     description: Get detailed information about a specific conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 conversation:
 *                   $ref: '#/components/schemas/ConversationDetails'
 * 
 * /api/messages/conversations/{conversationId}/archive:
 *   put:
 *     tags: [Messaging]
 *     summary: Archive conversation
 *     description: Archive a conversation to hide it from active conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Conversation archived successfully"
 * 
 * /api/messages/conversations/{conversationId}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: Get conversation messages
 *     description: Get all messages in a specific conversation with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     has_more:
 *                       type: boolean
 *   post:
 *     tags: [Messaging]
 *     summary: Send message
 *     description: Send a new message in a conversation (HTTP backup to WebSocket)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - userType
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *                 example: "Hello, when can you start the service?"
 *               userType:
 *                 type: string
 *                 enum: [customer, provider]
 *                 description: Type of user sending the message
 *                 example: "customer"
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, location]
 *                 default: text
 *                 description: Type of message
 *               replyToId:
 *                 type: integer
 *                 description: ID of message being replied to
 *               attachment:
 *                 type: string
 *                 format: binary
 *                 description: File attachment (image, document, etc.)
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Message sent successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 * 
 * /api/messages/conversations/{conversationId}/messages/read:
 *   put:
 *     tags: [Messaging]
 *     summary: Mark messages as read
 *     description: Mark multiple messages as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of message IDs to mark as read
 *                 example: [1, 2, 3, 4]
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "4 messages marked as read"
 * 
 * /api/messages/search:
 *   get:
 *     tags: [Messaging]
 *     summary: Search messages
 *     description: Search for messages across conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query text
 *         example: "appointment time"
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: integer
 *         description: Limit search to specific conversation
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [customer, provider]
 *         description: User type for filtering
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MessageWithConversation'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     has_more:
 *                       type: boolean
 */
