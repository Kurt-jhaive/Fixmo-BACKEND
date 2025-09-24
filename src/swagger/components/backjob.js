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
 *           enum: [pending, approved, disputed, cancelled-by-admin, cancelled-by-user]
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
 *         admin_notes:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
