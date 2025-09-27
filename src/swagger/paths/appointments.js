/**
 * @swagger
 * /api/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Get all appointments with filtering and pagination
 *     description: Retrieve appointments with advanced filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, on-the-way, in-progress, in-warranty, finished, completed, cancelled, backjob]
 *         description: Filter by appointment status
 *       - in: query
 *         name: provider_id
 *         schema:
 *           type: integer
 *         description: Filter by provider ID
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter (ISO format)
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter (ISO format)
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           default: scheduled_date
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Appointment'
 *                       - type: object
 *                         properties:
 *                           customer:
 *                             type: object
 *                             properties:
 *                               user_id: { type: integer }
 *                               first_name: { type: string }
 *                               last_name: { type: string }
 *                               email: { type: string }
 *                               phone_number: { type: string }
 *                               user_location: { type: string }
 *                               profile_photo: { type: string, nullable: true }
 *                           serviceProvider:
 *                             type: object
 *                             properties:
 *                               provider_id: { type: integer }
 *                               provider_first_name: { type: string }
 *                               provider_last_name: { type: string }
 *                               provider_email: { type: string }
 *                               provider_phone_number: { type: string }
 *                               provider_location: { type: string }
 *                               provider_profile_photo: { type: string, nullable: true }
 *                               provider_rating: { type: number }
 *                           appointment_rating:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Rating'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 *   post:
 *     tags: [Appointments]
 *     summary: Create new appointment
 *     description: Create a new appointment with validation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - provider_id
 *               - scheduled_date
 *               - availability_id
 *               - service_id
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 123
 *                 description: ID of the customer booking the appointment
 *               provider_id:
 *                 type: integer
 *                 example: 456
 *                 description: ID of the service provider
 *               scheduled_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00.000Z"
 *                 description: Scheduled date and time for the appointment
 *               availability_id:
 *                 type: integer
 *                 example: 789
 *                 description: ID of the provider's availability slot (required; from service listings availability)
 *               service_id:
 *                 type: integer
 *                 example: 101
 *                 description: ID of the service listing being booked (required)
 *               appointment_status:
 *                 type: string
 *                 enum: [scheduled, on-the-way, in-progress, in-warranty, finished, completed, cancelled]
 *                 default: scheduled
 *                 description: Current status of the appointment
 *               final_price:
 *                 type: number
 *                 format: float
 *                 example: 150.00
 *                 description: Final agreed price for the service
 *               repairDescription:
 *                 type: string
 *                 example: Kitchen sink faucet needs repair
 *                 description: Detailed description of the repair needed
 *     responses:
 *       201:
 *         description: Appointment created successfully
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
 *                   example: Appointment created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/appointments/{appointmentId}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointment by ID
 *     description: Retrieve a specific appointment with full details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Appointments]
 *     summary: Update appointment
 *     description: Update appointment details with conflict checking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduled_date:
 *                 type: string
 *                 format: date-time
 *                 description: New scheduled date (checked for conflicts)
 *               appointment_status:
 *                 type: string
 *                 enum: [scheduled, on-the-way, in-progress, in-warranty, finished, completed, cancelled]
 *               final_price:
 *                 type: number
 *                 format: float
 *               repairDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Appointments]
 *     summary: Delete appointment
 *     description: Permanently delete appointment and related ratings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment deleted successfully
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
 *                   example: Appointment deleted successfully
 * 
 * /api/appointments/{appointmentId}/cancel:
 *   put:
 *     tags: [Appointments]
 *     summary: Cancel appointment
 *     description: Cancel appointment with required cancellation reason
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cancellation_reason
 *             properties:
 *               cancellation_reason:
 *                 type: string
 *                 example: Customer emergency - need to reschedule
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 * 
 * /api/appointments/stats:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointment statistics
 *     description: Get comprehensive appointment statistics with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider_id
 *         schema:
 *           type: integer
 *         description: Get stats for specific provider
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Get stats for specific customer
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_appointments:
 *                       type: integer
 *                       example: 250
 *                     pending_appointments:
 *                       type: integer
 *                       example: 15
 *                     confirmed_appointments:
 *                       type: integer
 *                       example: 30
 *                     completed_appointments:
 *                       type: integer
 *                       example: 180
 *                     cancelled_appointments:
 *                       type: integer
 *                       example: 25
 *                     monthly_appointments:
 *                       type: integer
 *                       example: 45
 *                     yearly_appointments:
 *                       type: integer
 *                       example: 250
 *                     total_revenue:
 *                       type: number
 *                       format: float
 *                       example: 25000.00
 *                     average_rating:
 *                       type: number
 *                       format: float
 *                       example: 4.5
 *                     completion_rate:
 *                       type: number
 *                       description: Completion rate percentage
 *                       example: 72
 * 
 * /api/appointments/provider/{providerId}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get provider appointments
 *     description: Get all appointments for a specific provider with filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Provider appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 * 
 * /api/appointments/customer/{customerId}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get customer appointments
 *     description: Get all appointments for a specific customer with filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Customer appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 */

/**
 * @swagger
 * /api/appointments/{appointmentId}/complete:
 *   post:
 *     tags: [Appointments]
 *     summary: Customer marks appointment completed
 *     description: Marks the appointment as completed within warranty; triggers rating requirement.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Appointment marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Appointment' }
 *       403:
 *         description: Forbidden (not the owning customer)
 *       404:
 *         description: Appointment not found
 */

/**
 * @swagger
 * /api/appointments/{appointmentId}/backjob/apply:
 *   post:
 *     tags: [Appointments]
 *     summary: Apply for backjob during warranty (customer)
 *     description: Customer can raise a backjob request when the appointment is in warranty.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Issue reoccurred within warranty period
 *               evidence:
 *                 description: Optional JSON evidence payload (links, notes, etc.)
 *                 schema:
 *                   type: object
 *     responses:
 *       201:
 *         description: Backjob application submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Backjob application submitted }
 *                 data:
 *                   type: object
 *                   properties:
 *                     backjob:
 *                       $ref: '#/components/schemas/BackjobApplication'
 *                     appointment:
 *                       $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid state or payload
 *       403:
 *         description: Forbidden (not the owning customer)
 *       409:
 *         description: Duplicate active backjob
 */

/**
 * @swagger
 * /api/appointments/backjob/{backjobId}/dispute:
 *   post:
 *     tags: [Appointments]
 *     summary: Dispute a backjob (provider)
 *     description: Provider disputes a customer's backjob request with reason/evidence.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: backjobId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dispute_reason: { type: string, example: Work passed QA; likely misuse }
 *               dispute_evidence:
 *                 description: Optional JSON evidence payload
 *                 schema:
 *                   type: object
 *     responses:
 *       200:
 *         description: Backjob disputed
 *       403:
 *         description: Forbidden (not the assigned provider)
 *       404:
 *         description: Backjob not found
 */

/**
 * @swagger
 * /api/appointments/backjobs:
 *   get:
 *     tags: [Appointments]
 *     summary: List backjob applications (admin)
 *     description: Admin can list and filter backjob applications.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, disputed, cancelled-by-admin, cancelled-by-user]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Backjobs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BackjobApplication'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationResponse'
 */

/**
 * @swagger
 * /api/appointments/backjobs/{backjobId}:
 *   patch:
 *     tags: [Appointments]
 *     summary: Admin decision on backjob
 *     description: Approve backjob, cancel by admin, or mark cancelled by user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: backjobId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, cancel-by-admin, cancel-by-user]
 *               admin_notes:
 *                 type: string
 *                 example: Approved after reviewing evidence
 *     responses:
 *       200:
 *         description: Backjob updated
 *       400:
 *         description: Invalid action
 *       404:
 *         description: Backjob not found
 */

/**
 * @swagger
 * /api/appointments/{appointmentId}/backjob/reschedule:
 *   patch:
 *     tags: [Appointments]
 *     summary: Provider reschedules an approved backjob
 *     description: Reschedules appointment (same ID) and sets status to scheduled.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [new_scheduled_date, availability_id]
 *             properties:
 *               new_scheduled_date: { type: string, format: date-time }
 *               availability_id: { type: integer }
 *     responses:
 *       200:
 *         description: Appointment rescheduled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Appointment' }
 *       400:
 *         description: Invalid input or no approved backjob
 *       403:
 *         description: Forbidden (not the assigned provider)
 *       409:
 *         description: Conflict with existing appointment
 */
