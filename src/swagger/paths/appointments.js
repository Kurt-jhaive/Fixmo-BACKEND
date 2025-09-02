/**
 * @swagger
 * /api/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Get all appointments with filtering and pagination
 *     description: Retrieve appointments with advanced filtering options
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
 *           enum: [pending, approved, confirmed, in-progress, finished, completed, cancelled, no-show]
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
 *             properties:
 *               customer_id:
 *                 type: integer
 *                 example: 123
 *               provider_id:
 *                 type: integer
 *                 example: 456
 *               scheduled_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00.000Z"
 *               appointment_status:
 *                 type: string
 *                 enum: [pending, approved, confirmed, in-progress, finished, completed, cancelled, no-show]
 *                 default: pending
 *               final_price:
 *                 type: number
 *                 format: float
 *                 example: 150.00
 *               repairDescription:
 *                 type: string
 *                 example: Kitchen sink faucet needs repair
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
 *                 enum: [pending, approved, confirmed, in-progress, finished, completed, cancelled, no-show]
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
