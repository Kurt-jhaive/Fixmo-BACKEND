/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         conversation_id:
 *           type: integer
 *           description: Unique conversation identifier
 *           example: 1
 *         appointment_id:
 *           type: integer
 *           description: Related appointment ID
 *           example: 123
 *         customer_id:
 *           type: integer
 *           description: Customer user ID
 *           example: 456
 *         provider_id:
 *           type: integer
 *           description: Service provider ID
 *           example: 789
 *         status:
 *           type: string
 *           enum: [active, archived, closed]
 *           description: Conversation status
 *           example: "active"
 *         last_message_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last message
 *           example: "2024-12-01T14:30:00Z"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Conversation creation timestamp
 *           example: "2024-12-01T10:00:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-12-01T14:30:00Z"
 * 
 *     ConversationSummary:
 *       type: object
 *       properties:
 *         conversation_id:
 *           type: integer
 *           example: 1
 *         appointment:
 *           type: object
 *           properties:
 *             appointment_id:
 *               type: integer
 *               example: 123
 *             appointment_status:
 *               type: string
 *               example: "confirmed"
 *             scheduled_date:
 *               type: string
 *               format: date-time
 *               example: "2024-12-05T09:00:00Z"
 *             service:
 *               type: object
 *               properties:
 *                 service_title:
 *                   type: string
 *                   example: "Plumbing Repair"
 *                 service_description:
 *                   type: string
 *                   example: "Kitchen sink repair"
 *         participant:
 *           type: object
 *           description: The other participant in the conversation
 *           properties:
 *             user_id:
 *               type: integer
 *               example: 456
 *             first_name:
 *               type: string
 *               example: "John"
 *             last_name:
 *               type: string
 *               example: "Doe"
 *             profile_photo:
 *               type: string
 *               example: "/uploads/profiles/user_456.jpg"
 *         last_message:
 *           $ref: '#/components/schemas/MessagePreview'
 *         unread_count:
 *           type: integer
 *           description: Number of unread messages
 *           example: 3
 *         status:
 *           type: string
 *           example: "active"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T10:00:00Z"
 *         last_message_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T14:30:00Z"
 * 
 *     ConversationDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Conversation'
 *         - type: object
 *           properties:
 *             appointment:
 *               type: object
 *               properties:
 *                 appointment_id:
 *                   type: integer
 *                   example: 123
 *                 appointment_status:
 *                   type: string
 *                   example: "confirmed"
 *                 scheduled_date:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-12-05T09:00:00Z"
 *                 service:
 *                   type: object
 *                   properties:
 *                     service_title:
 *                       type: string
 *                       example: "Plumbing Repair"
 *                     service_description:
 *                       type: string
 *                       example: "Kitchen sink repair"
 *                     service_startingprice:
 *                       type: number
 *                       format: float
 *                       example: 150.00
 *             customer:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                   example: 456
 *                 first_name:
 *                   type: string
 *                   example: "John"
 *                 last_name:
 *                   type: string
 *                   example: "Doe"
 *                 profile_photo:
 *                   type: string
 *                   example: "/uploads/profiles/user_456.jpg"
 *                 phone_number:
 *                   type: string
 *                   example: "+1234567890"
 *             provider:
 *               type: object
 *               properties:
 *                 provider_id:
 *                   type: integer
 *                   example: 789
 *                 provider_first_name:
 *                   type: string
 *                   example: "Mike"
 *                 provider_last_name:
 *                   type: string
 *                   example: "Smith"
 *                 provider_profile_photo:
 *                   type: string
 *                   example: "/uploads/profiles/provider_789.jpg"
 *                 provider_phone_number:
 *                   type: string
 *                   example: "+1987654321"
 *                 provider_rating:
 *                   type: number
 *                   format: float
 *                   example: 4.8
 *             _count:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: integer
 *                   example: 25
 * 
 *     Message:
 *       type: object
 *       properties:
 *         message_id:
 *           type: integer
 *           description: Unique message identifier
 *           example: 1
 *         conversation_id:
 *           type: integer
 *           description: Conversation this message belongs to
 *           example: 1
 *         sender_id:
 *           type: integer
 *           description: ID of user who sent the message
 *           example: 456
 *         sender_type:
 *           type: string
 *           enum: [customer, provider]
 *           description: Type of user who sent the message
 *           example: "customer"
 *         message_type:
 *           type: string
 *           enum: [text, image, file, location]
 *           description: Type of message content
 *           example: "text"
 *         content:
 *           type: string
 *           description: Message content
 *           example: "Hello, when can you start the service?"
 *         attachment_url:
 *           type: string
 *           nullable: true
 *           description: URL to attached file (if any)
 *           example: "/uploads/message-attachments/msg_456_1638360000000.jpg"
 *         is_read:
 *           type: boolean
 *           description: Whether the message has been read
 *           example: false
 *         is_edited:
 *           type: boolean
 *           description: Whether the message has been edited
 *           example: false
 *         edited_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the message was last edited
 *           example: null
 *         replied_to_id:
 *           type: integer
 *           nullable: true
 *           description: ID of message this is replying to
 *           example: null
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Message creation timestamp
 *           example: "2024-12-01T14:30:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *           example: "2024-12-01T14:30:00Z"
 *         replied_to:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/MessagePreview'
 * 
 *     MessagePreview:
 *       type: object
 *       properties:
 *         message_id:
 *           type: integer
 *           example: 1
 *         content:
 *           type: string
 *           example: "Hello, when can you start the service?"
 *         message_type:
 *           type: string
 *           example: "text"
 *         sender_type:
 *           type: string
 *           example: "customer"
 *         is_read:
 *           type: boolean
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-12-01T14:30:00Z"
 * 
 *     MessageWithConversation:
 *       allOf:
 *         - $ref: '#/components/schemas/Message'
 *         - type: object
 *           properties:
 *             conversation:
 *               type: object
 *               properties:
 *                 conversation_id:
 *                   type: integer
 *                   example: 1
 *                 customer:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       example: 456
 *                     first_name:
 *                       type: string
 *                       example: "John"
 *                     last_name:
 *                       type: string
 *                       example: "Doe"
 *                 provider:
 *                   type: object
 *                   properties:
 *                     provider_id:
 *                       type: integer
 *                       example: 789
 *                     provider_first_name:
 *                       type: string
 *                       example: "Mike"
 *                     provider_last_name:
 *                       type: string
 *                       example: "Smith"
 * 
 *     WebSocketEvents:
 *       type: object
 *       description: WebSocket events for real-time messaging
 *       properties:
 *         authenticate:
 *           type: object
 *           description: Client authentication
 *           properties:
 *             token:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             userType:
 *               type: string
 *               enum: [customer, provider]
 *               example: "customer"
 *         join_conversation:
 *           type: object
 *           description: Join a conversation room
 *           properties:
 *             conversationId:
 *               type: integer
 *               example: 1
 *         send_message:
 *           type: object
 *           description: Send a message
 *           properties:
 *             conversationId:
 *               type: integer
 *               example: 1
 *             content:
 *               type: string
 *               example: "Hello, when can you start?"
 *             messageType:
 *               type: string
 *               enum: [text, image, file, location]
 *               example: "text"
 *             attachmentUrl:
 *               type: string
 *               nullable: true
 *               example: null
 *             replyToId:
 *               type: integer
 *               nullable: true
 *               example: null
 *         mark_as_read:
 *           type: object
 *           description: Mark messages as read
 *           properties:
 *             messageIds:
 *               type: array
 *               items:
 *                 type: integer
 *               example: [1, 2, 3]
 *             conversationId:
 *               type: integer
 *               example: 1
 *         typing_start:
 *           type: object
 *           description: User started typing
 *           properties:
 *             conversationId:
 *               type: integer
 *               example: 1
 *         typing_stop:
 *           type: object
 *           description: User stopped typing
 *           properties:
 *             conversationId:
 *               type: integer
 *               example: 1
 */
