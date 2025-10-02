/**
 * Rating API Documentation
 * 
 * This file contains comprehensive Swagger documentation for all rating-related endpoints.
 * The rating system allows customers and providers to rate each other after completed appointments.
 * Features include photo uploads, rating statistics, and comprehensive filtering.
 */

/**
 * @swagger
 * /api/ratings/rateable-appointments:
 *   get:
 *     tags: [Ratings]
 *     summary: Get rateable appointments
 *     description: Get completed appointments that the authenticated customer can rate
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rateable appointments retrieved successfully
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
 *       401:
 *         description: Unauthorized - Customer authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/ratings/create:
 *   post:
 *     tags: [Ratings]
 *     summary: Create rating
 *     description: Create a new rating for a completed appointment (Customer rates provider)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *               - provider_id
 *               - rating_value
 *             properties:
 *               appointment_id:
 *                 type: integer
 *                 example: 123
 *                 description: ID of the completed appointment
 *               provider_id:
 *                 type: integer
 *                 example: 456
 *                 description: ID of the provider being rated
 *               rating_value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *                 description: Rating value (1-5 stars)
 *               rating_comment:
 *                 type: string
 *                 example: Great service! Very professional and timely.
 *                 description: Optional comment about the service
 *               rating_photo:
 *                 type: string
 *                 format: binary
 *                 description: Optional photo as proof of completed work (JPG, PNG, GIF)
 *     responses:
 *       201:
 *         description: Rating created successfully
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
 *                   example: Rating submitted successfully
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Rating'
 *                     - type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             user_id: { type: integer }
 *                             first_name: { type: string }
 *                             last_name: { type: string }
 *                             profile_photo: { type: string, nullable: true }
 *                         serviceProvider:
 *                           type: object
 *                           properties:
 *                             provider_id: { type: integer }
 *                             provider_first_name: { type: string }
 *                             provider_last_name: { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_fields:
 *                       value: Appointment ID, Provider ID, and rating value are required
 *                     invalid_rating:
 *                       value: Rating value must be between 1 and 5
 *                     already_rated:
 *                       value: You have already rated this appointment
 *       404:
 *         description: Appointment not found or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Appointment not found or not completed, or you are not authorized to rate this appointment
 * 
 * /api/ratings/update/{ratingId}:
 *   put:
 *     tags: [Ratings]
 *     summary: Update rating
 *     description: Update an existing rating (only by the customer who created it)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Rating ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               rating_value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *                 description: New rating value (1-5 stars)
 *               rating_comment:
 *                 type: string
 *                 example: Updated comment - even better than expected!
 *                 description: Updated comment
 *               rating_photo:
 *                 type: string
 *                 format: binary
 *                 description: New photo (replaces existing photo if any)
 *     responses:
 *       200:
 *         description: Rating updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Rating not found or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Rating not found or you are not authorized to update this rating
 * 
 * /api/ratings/delete/{ratingId}:
 *   delete:
 *     tags: [Ratings]
 *     summary: Delete rating
 *     description: Delete a rating (only by the customer who created it)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Rating ID to delete
 *     responses:
 *       200:
 *         description: Rating deleted successfully
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
 *                   example: Rating deleted successfully
 *       404:
 *         description: Rating not found or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/ratings/customer/{customerId}:
 *   get:
 *     tags: [Ratings]
 *     summary: Get customer ratings
 *     description: Get all ratings submitted by a specific customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer ratings retrieved successfully
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
 *                     $ref: '#/components/schemas/Rating'
 * 
 * /api/ratings/provider/{providerId}:
 *   get:
 *     tags: [Ratings]
 *     summary: Get provider ratings (Public)
 *     description: Get all ratings for a specific provider (public endpoint)
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Provider ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provider_id:
 *                   type: integer
 *                   example: 456
 *                 average_rating:
 *                   type: number
 *                   format: float
 *                   example: 4.3
 *                 total_ratings:
 *                   type: integer
 *                   example: 27
 *                 ratings:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Rating'
 *                       - type: object
 *                         properties:
 *                           customer_name:
 *                             type: string
 *                             example: John D.
 *                             description: Customer name (anonymized)
 * 
 * /api/appointments/{appointmentId}/ratings:
 *   post:
 *     tags: [Ratings]
 *     summary: Submit rating for appointment (Alternative endpoint)
 *     description: Submit a rating for a completed appointment
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
 *               - rating_value
 *               - rater_type
 *             properties:
 *               rating_value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *                 description: Rating value (1-5 stars)
 *               rating_comment:
 *                 type: string
 *                 example: Excellent service quality
 *               rater_type:
 *                 type: string
 *                 enum: [customer, provider]
 *                 example: customer
 *                 description: Who is submitting the rating
 *     responses:
 *       201:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     not_completed:
 *                       value: Can only rate completed appointments
 *                     already_rated:
 *                       value: Rating already submitted for this appointment
 *                     invalid_rating:
 *                       value: Rating value must be between 1 and 5
 *   get:
 *     tags: [Ratings]
 *     summary: Get appointment ratings
 *     description: Get all ratings for a specific appointment
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
 *         description: Appointment ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 ratings:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Rating'
 *                       - type: object
 *                         properties:
 *                           user:
 *                             type: object
 *                             properties:
 *                               first_name: { type: string }
 *                               last_name: { type: string }
 *                               profile_photo: { type: string, nullable: true }
 *                           serviceProvider:
 *                             type: object
 *                             properties:
 *                               provider_first_name: { type: string }
 *                               provider_last_name: { type: string }
 *                               provider_profile_photo: { type: string, nullable: true }
 * 
 * /api/appointments/{appointmentId}/can-rate:
 *   get:
 *     tags: [Ratings]
 *     summary: Check if user can rate appointment
 *     description: Check if the authenticated user can rate a specific appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Appointment ID
 *       - in: query
 *         name: rater_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [customer, provider]
 *         description: Type of rater checking eligibility
 *     responses:
 *       200:
 *         description: Rating eligibility check successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 can_rate:
 *                   type: boolean
 *                   example: true
 *                   description: Whether the user can rate this appointment
 *                 reason:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                   description: Reason if cannot rate (e.g., "Appointment not completed", "Rating already submitted")
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/ratings/provider/rateable-appointments:
 *   get:
 *     tags: [Provider Ratings]
 *     summary: Get provider rateable appointments
 *     description: Get finished appointments that the authenticated provider can rate (customers)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider rateable appointments retrieved successfully
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
 *                   example: "Appointments that can be rated by provider"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       appointment_id:
 *                         type: integer
 *                         example: 123
 *                       customer_id:
 *                         type: integer
 *                         example: 456
 *                       scheduled_date:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:00:00Z"
 *                       appointment_status:
 *                         type: string
 *                         example: "finished"
 *                       customer:
 *                         type: object
 *                         properties:
 *                           user_id:
 *                             type: integer
 *                             example: 456
 *                           first_name:
 *                             type: string
 *                             example: "John"
 *                           last_name:
 *                             type: string
 *                             example: "Doe"
 *                           profile_photo:
 *                             type: string
 *                             nullable: true
 *                             example: "uploads/profiles/user456.jpg"
 *                       service:
 *                         type: object
 *                         properties:
 *                           service_id:
 *                             type: integer
 *                             example: 789
 *                           service_title:
 *                             type: string
 *                             example: "AC Repair"
 *                           service_description:
 *                             type: string
 *                             example: "Professional AC repair service"
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/ratings/provider/rate-customer:
 *   post:
 *     tags: [Provider Ratings]
 *     summary: Create provider rating for customer
 *     description: Create a new rating for a customer by provider (Provider rates customer after finished appointment)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *               - customer_id
 *               - rating_value
 *             properties:
 *               appointment_id:
 *                 type: integer
 *                 description: ID of the finished appointment
 *                 example: 123
 *               customer_id:
 *                 type: integer
 *                 description: ID of the customer to rate
 *                 example: 456
 *               rating_value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating value (1-5 stars)
 *                 example: 5
 *               rating_comment:
 *                 type: string
 *                 description: Optional comment about the customer
 *                 example: "Great customer, very cooperative and understanding"
 *               rating_photo:
 *                 type: string
 *                 format: binary
 *                 description: Optional photo for review proof
 *     responses:
 *       201:
 *         description: Customer rating created successfully
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
 *                   example: "Customer rating created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 789
 *                     rating_value:
 *                       type: integer
 *                       example: 5
 *                     rating_comment:
 *                       type: string
 *                       example: "Great customer, very cooperative and understanding"
 *                     rating_photo:
 *                       type: string
 *                       nullable: true
 *                       example: "uploads/rating-photos/rating789.jpg"
 *                     appointment_id:
 *                       type: integer
 *                       example: 123
 *                     user_id:
 *                       type: integer
 *                       example: 456
 *                     provider_id:
 *                       type: integer
 *                       example: 101
 *                     rated_by:
 *                       type: string
 *                       example: "provider"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T14:30:00Z"
 *                     user:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type: integer
 *                           example: 456
 *                         first_name:
 *                           type: string
 *                           example: "John"
 *                         last_name:
 *                           type: string
 *                           example: "Doe"
 *                         profile_photo:
 *                           type: string
 *                           nullable: true
 *                           example: "uploads/profiles/user456.jpg"
 *                     serviceProvider:
 *                       type: object
 *                       properties:
 *                         provider_id:
 *                           type: integer
 *                           example: 101
 *                         provider_first_name:
 *                           type: string
 *                           example: "Mike"
 *                         provider_last_name:
 *                           type: string
 *                           example: "Smith"
 *                     appointment:
 *                       type: object
 *                       properties:
 *                         appointment_id:
 *                           type: integer
 *                           example: 123
 *                         scheduled_date:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:00:00Z"
 *                         service:
 *                           type: object
 *                           properties:
 *                             service_title:
 *                               type: string
 *                               example: "AC Repair"
 *       400:
 *         description: Bad request - Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_fields: "Appointment ID, Customer ID, and rating value are required"
 *                     invalid_rating: "Rating value must be between 1 and 5"
 *                     already_rated: "You have already rated this customer for this appointment"
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Appointment not found or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Appointment not found or not finished, or you are not authorized to rate this appointment"
 * 
 * /api/ratings/provider/given-ratings:
 *   get:
 *     tags: [Provider Ratings]
 *     summary: Get provider given ratings
 *     description: Get all ratings given by the authenticated provider to customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of ratings per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Provider given ratings retrieved successfully
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
 *                     ratings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 789
 *                           rating_value:
 *                             type: integer
 *                             example: 5
 *                           rating_comment:
 *                             type: string
 *                             example: "Great customer, very cooperative"
 *                           rating_photo:
 *                             type: string
 *                             nullable: true
 *                             example: "uploads/rating-photos/rating789.jpg"
 *                           rated_by:
 *                             type: string
 *                             example: "provider"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T14:30:00Z"
 *                           user:
 *                             type: object
 *                             properties:
 *                               user_id:
 *                                 type: integer
 *                                 example: 456
 *                               first_name:
 *                                 type: string
 *                                 example: "John"
 *                               last_name:
 *                                 type: string
 *                                 example: "Doe"
 *                               profile_photo:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "uploads/profiles/user456.jpg"
 *                           appointment:
 *                             type: object
 *                             properties:
 *                               appointment_id:
 *                                 type: integer
 *                                 example: 123
 *                               scheduled_date:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2024-01-15T10:00:00Z"
 *                               service:
 *                                 type: object
 *                                 properties:
 *                                   service_title:
 *                                     type: string
 *                                     example: "AC Repair"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current_page:
 *                           type: integer
 *                           example: 1
 *                         total_pages:
 *                           type: integer
 *                           example: 5
 *                         total_ratings:
 *                           type: integer
 *                           example: 47
 *                         has_next:
 *                           type: boolean
 *                           example: true
 *                         has_prev:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/ratings/customer/{customerId}/received-ratings:
 *   get:
 *     tags: [Provider Ratings]
 *     summary: Get customer received ratings
 *     description: Get all ratings received by a customer from providers (public endpoint)
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *         example: 456
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of ratings per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Customer received ratings retrieved successfully
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
 *                     ratings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 789
 *                           rating_value:
 *                             type: integer
 *                             example: 5
 *                           rating_comment:
 *                             type: string
 *                             example: "Great customer, very cooperative"
 *                           rating_photo:
 *                             type: string
 *                             nullable: true
 *                             example: "uploads/rating-photos/rating789.jpg"
 *                           rated_by:
 *                             type: string
 *                             example: "provider"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T14:30:00Z"
 *                           serviceProvider:
 *                             type: object
 *                             properties:
 *                               provider_id:
 *                                 type: integer
 *                                 example: 101
 *                               provider_first_name:
 *                                 type: string
 *                                 example: "Mike"
 *                               provider_last_name:
 *                                 type: string
 *                                 example: "Smith"
 *                               provider_profile_photo:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "uploads/profiles/provider101.jpg"
 *                           appointment:
 *                             type: object
 *                             properties:
 *                               appointment_id:
 *                                 type: integer
 *                                 example: 123
 *                               scheduled_date:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2024-01-15T10:00:00Z"
 *                               service:
 *                                 type: object
 *                                 properties:
 *                                   service_title:
 *                                     type: string
 *                                     example: "AC Repair"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current_page:
 *                           type: integer
 *                           example: 1
 *                         total_pages:
 *                           type: integer
 *                           example: 3
 *                         total_ratings:
 *                           type: integer
 *                           example: 27
 *                         has_next:
 *                           type: boolean
 *                           example: true
 *                         has_prev:
 *                           type: boolean
 *                           example: false
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         average_rating:
 *                           type: number
 *                           format: float
 *                           example: 4.56
 *                         total_ratings:
 *                           type: integer
 *                           example: 27
 *                         rating_distribution:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               star:
 *                                 type: integer
 *                                 example: 5
 *                               count:
 *                                 type: integer
 *                                 example: 15
 */
