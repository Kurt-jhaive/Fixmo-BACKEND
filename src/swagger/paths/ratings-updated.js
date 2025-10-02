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
 *     summary: Get Customer's Rateable Appointments
 *     description: |
 *       Get completed appointments that the authenticated customer can rate.
 *       Only shows appointments that are completed and haven't been rated yet by the customer.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rateable appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateableAppointmentsResponse'
 *       401:
 *         description: Unauthorized - Customer authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/create:
 *   post:
 *     tags: [Ratings]
 *     summary: Create Customer Rating
 *     description: |
 *       Create a new rating for a completed appointment (Customer rates provider).
 *       Supports optional photo upload as evidence. Only one rating per appointment per customer.
 *       Photos are automatically uploaded to Cloudinary with optimization.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/RatingCreateRequest'
 *               - type: object
 *                 properties:
 *                   rating_photo:
 *                     type: string
 *                     format: binary
 *                     description: Optional rating photo (max 3MB, JPG/PNG/WebP)
 *           example:
 *             appointment_id: 456
 *             provider_id: 101
 *             rating_value: 5
 *             rating_comment: "Excellent service! Very professional and on time."
 *     responses:
 *       201:
 *         description: Rating created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingResponse'
 *       400:
 *         description: Bad request - Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *             examples:
 *               invalid_rating:
 *                 summary: Invalid rating value
 *                 value:
 *                   success: false
 *                   message: "Rating value must be between 1 and 5"
 *               already_rated:
 *                 summary: Already rated
 *                 value:
 *                   success: false
 *                   message: "You have already rated this appointment"
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   success: false
 *                   message: "Appointment ID, Provider ID, and rating value are required"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       404:
 *         description: Appointment not found or not completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       413:
 *         description: File too large (>3MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       422:
 *         description: Invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/update/{ratingId}:
 *   put:
 *     tags: [Ratings]
 *     summary: Update Customer Rating
 *     description: |
 *       Update an existing rating created by the authenticated customer.
 *       Can update rating value, comment, and/or photo. New photos replace existing ones.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Rating ID to update
 *         example: 123
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/RatingUpdateRequest'
 *               - type: object
 *                 properties:
 *                   rating_photo:
 *                     type: string
 *                     format: binary
 *                     description: Optional new rating photo (max 3MB, JPG/PNG/WebP)
 *     responses:
 *       200:
 *         description: Rating updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingResponse'
 *       400:
 *         description: Bad request - Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       403:
 *         description: Forbidden - Can only update own ratings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       404:
 *         description: Rating not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/delete/{ratingId}:
 *   delete:
 *     tags: [Ratings]
 *     summary: Delete Customer Rating
 *     description: |
 *       Delete a rating created by the authenticated customer.
 *       This also updates the provider's average rating automatically.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Rating ID to delete
 *         example: 123
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
 *                   example: "Rating deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       403:
 *         description: Forbidden - Can only delete own ratings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       404:
 *         description: Rating not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/customer/{customerId}:
 *   get:
 *     tags: [Ratings]
 *     summary: Get Customer's Given Ratings
 *     description: |
 *       Get all ratings that a specific customer has given to providers.
 *       Supports pagination for better performance with large datasets.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *         example: 789
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
 *           maximum: 50
 *           default: 10
 *         description: Number of ratings per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Customer ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingsListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/provider/{providerId}:
 *   get:
 *     tags: [Ratings]
 *     summary: Get Provider Ratings (Public)
 *     description: |
 *       Get all ratings received by a specific provider from customers.
 *       This is a public endpoint that doesn't require authentication.
 *       Includes rating statistics and distribution for comprehensive provider overview.
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *         example: 101
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
 *           maximum: 50
 *           default: 10
 *         description: Number of ratings per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Provider ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingsListResponse'
 *       404:
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/provider/rateable-appointments:
 *   get:
 *     tags: [Provider Ratings]
 *     summary: Get Provider's Rateable Appointments
 *     description: |
 *       Get finished appointments where the authenticated provider can rate customers.
 *       Only shows appointments that are finished but not completed, and haven't been rated yet by the provider.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider's rateable appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateableAppointmentsResponse'
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/provider/rate-customer:
 *   post:
 *     tags: [Provider Ratings]
 *     summary: Provider Rate Customer
 *     description: |
 *       Create a new rating for a customer after finished appointment (Provider rates customer).
 *       Supports optional photo upload as evidence. Only one rating per appointment per provider.
 *       Photos are automatically uploaded to Cloudinary with optimization.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/ProviderRatingCreateRequest'
 *               - type: object
 *                 properties:
 *                   rating_photo:
 *                     type: string
 *                     format: binary
 *                     description: Optional rating photo (max 3MB, JPG/PNG/WebP)
 *           example:
 *             appointment_id: 456
 *             customer_id: 789
 *             rating_value: 5
 *             rating_comment: "Great customer! Very cooperative and understanding."
 *     responses:
 *       201:
 *         description: Provider rating for customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingResponse'
 *       400:
 *         description: Bad request - Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *             examples:
 *               invalid_rating:
 *                 summary: Invalid rating value
 *                 value:
 *                   success: false
 *                   message: "Rating value must be between 1 and 5"
 *               already_rated:
 *                 summary: Already rated
 *                 value:
 *                   success: false
 *                   message: "You have already rated this customer for this appointment"
 *               wrong_status:
 *                 summary: Appointment not finished
 *                 value:
 *                   success: false
 *                   message: "Appointment not found or not finished, or you are not authorized to rate this appointment"
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       404:
 *         description: Appointment not found or not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       413:
 *         description: File too large (>3MB)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       422:
 *         description: Invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/provider/given-ratings:
 *   get:
 *     tags: [Provider Ratings]
 *     summary: Get Provider's Given Ratings
 *     description: |
 *       Get all ratings that the authenticated provider has given to customers.
 *       Supports pagination for better performance.
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
 *           maximum: 50
 *           default: 10
 *         description: Number of ratings per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Provider's given ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingsListResponse'
 *       401:
 *         description: Unauthorized - Provider authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/customer/{customerId}/received-ratings:
 *   get:
 *     tags: [Provider Ratings]
 *     summary: Get Customer's Received Ratings
 *     description: |
 *       Get all ratings received by a specific customer from providers.
 *       This endpoint shows how providers have rated a particular customer.
 *       Includes basic statistics about the customer's ratings.
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *         example: 789
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
 *           maximum: 50
 *           default: 10
 *         description: Number of ratings per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Customer's received ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/RatingsListResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         statistics:
 *                           type: object
 *                           properties:
 *                             average_rating:
 *                               type: number
 *                               format: float
 *                               example: 4.75
 *                             total_ratings:
 *                               type: integer
 *                               example: 8
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/test/customer-ratings:
 *   get:
 *     tags: [Testing]
 *     summary: Get Current Customer's Ratings (Test)
 *     description: |
 *       Development endpoint to get the authenticated customer's ratings.
 *       This is a convenience endpoint for testing that redirects to the standard customer ratings endpoint.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingsListResponse'
 *       401:
 *         description: Unauthorized - Customer authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */

/**
 * @swagger
 * /api/ratings/test/quick-rating:
 *   post:
 *     tags: [Testing]
 *     summary: Quick Rating Creation (Test)
 *     description: |
 *       Development endpoint for quick rating creation without file upload.
 *       Useful for testing the rating system with JSON data only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RatingCreateRequest'
 *           example:
 *             appointment_id: 456
 *             provider_id: 101
 *             rating_value: 5
 *             rating_comment: "Test rating for development"
 *     responses:
 *       201:
 *         description: Test rating created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *             example:
 *               success: false
 *               message: "appointment_id, provider_id, and rating_value are required"
 *       401:
 *         description: Unauthorized - Customer authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RatingErrorResponse'
 */