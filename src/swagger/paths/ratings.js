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
 */
