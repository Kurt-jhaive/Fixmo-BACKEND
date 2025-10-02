/**
 * @swagger
 * components:
 *   schemas:
 *     BackjobApplication:
 *       type: object
 *       properties:
 *         backjob_id:
 *           type: integer
 *         appointment_id:
 *           type: integer
 *         customer_id:
 *           type: integer
 *         provider_id:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [pending, approved, disputed, cancelled-by-admin, cancelled-by-user, cancelled-by-customer]
 *           description: Current backjob status
 *         reason:
 *           type: string
 *         evidence:
 *           nullable: true
 *           description: Arbitrary JSON evidence payload
 *         provider_dispute_reason:
 *           type: string
 *           nullable: true
 *         provider_dispute_evidence:
 *           nullable: true
 *           description: Arbitrary JSON evidence payload from provider
 *         customer_cancellation_reason:
 *           type: string
 *           nullable: true
 *           description: Reason provided by customer when cancelling backjob
 *         admin_notes:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     BackjobCancellationRequest:
 *       type: object
 *       required:
 *         - cancellation_reason
 *       properties:
 *         cancellation_reason:
 *           type: string
 *           description: Reason for cancelling the backjob application
 *           example: "Issue resolved itself after further inspection"
 * 
 *     BackjobDisputeRequest:
 *       type: object
 *       properties:
 *         dispute_reason:
 *           type: string
 *           description: Reason for disputing the backjob
 *           example: "Work passed QA; likely customer misuse"
 *         dispute_evidence:
 *           type: object
 *           description: Optional JSON evidence payload
 *           nullable: true
 *
 *     BackjobApplicationRequest:
 *       type: object
 *       required:
 *         - reason
 *         - evidence
 *       properties:
 *         reason:
 *           type: string
 *           description: Reason for the backjob application
 *           example: "Service didn't fix the original issue"
 *         evidence:
 *           type: object
 *           description: Evidence supporting the backjob claim
 *           properties:
 *             files:
 *               type: array
 *               items:
 *                 type: string
 *               description: URLs of uploaded evidence files
 *               example: ["https://res.cloudinary.com/fixmo/image/upload/evidence1.jpg"]
 *             description:
 *               type: string
 *               description: Detailed description of the issue
 *               example: "Problem persists after repair, photos show damage"
 */
