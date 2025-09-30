/**
 * @swagger
 * components:
 *   schemas:
 *     Rating:
 *       type: object
 *       required:
 *         - id
 *         - rating_value
 *         - appointment_id
 *         - user_id
 *         - provider_id
 *         - rated_by
 *         - created_at
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique rating identifier
 *           example: 123
 *         rating_value:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating value (1-5 stars)
 *           example: 4
 *         rating_comment:
 *           type: string
 *           nullable: true
 *           description: Optional rating comment
 *           example: "Excellent service! Very professional and on time."
 *         rating_photo:
 *           type: string
 *           nullable: true
 *           description: Cloudinary URL of rating photo
 *           example: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/rating-photos/rating_123_456_1696089600000.jpg"
 *         appointment_id:
 *           type: integer
 *           description: Related appointment ID
 *           example: 456
 *         user_id:
 *           type: integer
 *           description: Customer ID who received/gave the rating
 *           example: 789
 *         provider_id:
 *           type: integer
 *           description: Provider ID who received/gave the rating
 *           example: 101
 *         rated_by:
 *           type: string
 *           enum: [customer, provider]
 *           description: Who submitted the rating
 *           example: "customer"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Rating creation timestamp
 *           example: "2025-09-30T10:00:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Rating last update timestamp
 *           example: "2025-09-30T10:00:00.000Z"
 * 
 *     RatingWithUser:
 *       allOf:
 *         - $ref: '#/components/schemas/Rating'
 *         - type: object
 *           properties:
 *             user:
 *               type: object
 *               description: Customer who gave/received the rating
 *               properties:
 *                 user_id:
 *                   type: integer
 *                   example: 789
 *                 first_name:
 *                   type: string
 *                   example: "John"
 *                 last_name:
 *                   type: string
 *                   example: "Doe"
 *                 profile_photo:
 *                   type: string
 *                   nullable: true
 *                   example: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/profiles/profile_789.jpg"
 *             serviceProvider:
 *               type: object
 *               description: Provider who gave/received the rating
 *               properties:
 *                 provider_id:
 *                   type: integer
 *                   example: 101
 *                 provider_first_name:
 *                   type: string
 *                   example: "Jane"
 *                 provider_last_name:
 *                   type: string
 *                   example: "Smith"
 *                 provider_profile_photo:
 *                   type: string
 *                   nullable: true
 *                   example: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/profiles/provider_101.jpg"
 *             appointment:
 *               type: object
 *               description: Related appointment details
 *               properties:
 *                 appointment_id:
 *                   type: integer
 *                   example: 456
 *                 scheduled_date:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-25T14:00:00.000Z"
 *                 service:
 *                   type: object
 *                   properties:
 *                     service_title:
 *                       type: string
 *                       example: "Air Conditioning Repair"
 * 
 *     RatingStatistics:
 *       type: object
 *       properties:
 *         average_rating:
 *           type: number
 *           format: float
 *           description: Average rating value
 *           example: 4.65
 *         total_ratings:
 *           type: integer
 *           description: Total number of ratings
 *           example: 76
 *         rating_distribution:
 *           type: array
 *           description: Distribution of ratings by star count
 *           items:
 *             type: object
 *             properties:
 *               star:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               count:
 *                 type: integer
 *                 example: 40
 * 
 *     RatingPagination:
 *       type: object
 *       properties:
 *         current_page:
 *           type: integer
 *           example: 1
 *         total_pages:
 *           type: integer
 *           example: 8
 *         total_ratings:
 *           type: integer
 *           example: 76
 *         has_next:
 *           type: boolean
 *           example: true
 *         has_prev:
 *           type: boolean
 *           example: false
 * 
 *     RateableAppointment:
 *       type: object
 *       properties:
 *         appointment_id:
 *           type: integer
 *           example: 456
 *         scheduled_date:
 *           type: string
 *           format: date-time
 *           example: "2025-09-25T14:00:00.000Z"
 *         appointment_status:
 *           type: string
 *           example: "completed"
 *         can_rate:
 *           type: boolean
 *           example: true
 *         serviceProvider:
 *           type: object
 *           properties:
 *             provider_id:
 *               type: integer
 *               example: 101
 *             provider_first_name:
 *               type: string
 *               example: "Jane"
 *             provider_last_name:
 *               type: string
 *               example: "Smith"
 *             provider_profile_photo:
 *               type: string
 *               nullable: true
 *               example: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/profiles/provider_101.jpg"
 *         customer:
 *           type: object
 *           properties:
 *             user_id:
 *               type: integer
 *               example: 789
 *             first_name:
 *               type: string
 *               example: "John"
 *             last_name:
 *               type: string
 *               example: "Doe"
 *             profile_photo:
 *               type: string
 *               nullable: true
 *               example: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/fixmo/profiles/profile_789.jpg"
 *         service:
 *           type: object
 *           properties:
 *             service_id:
 *               type: integer
 *               example: 123
 *             service_title:
 *               type: string
 *               example: "Air Conditioning Repair"
 *             service_startingprice:
 *               type: number
 *               format: float
 *               example: 150.00
 * 
 *     RatingCreateRequest:
 *       type: object
 *       required:
 *         - appointment_id
 *         - provider_id
 *         - rating_value
 *       properties:
 *         appointment_id:
 *           type: integer
 *           description: ID of the completed appointment
 *           example: 456
 *         provider_id:
 *           type: integer
 *           description: ID of the provider being rated
 *           example: 101
 *         rating_value:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating value (1-5 stars)
 *           example: 5
 *         rating_comment:
 *           type: string
 *           description: Optional comment about the service
 *           example: "Excellent service! Very professional and on time."
 * 
 *     ProviderRatingCreateRequest:
 *       type: object
 *       required:
 *         - appointment_id
 *         - customer_id
 *         - rating_value
 *       properties:
 *         appointment_id:
 *           type: integer
 *           description: ID of the finished appointment
 *           example: 456
 *         customer_id:
 *           type: integer
 *           description: ID of the customer being rated
 *           example: 789
 *         rating_value:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating value (1-5 stars)
 *           example: 5
 *         rating_comment:
 *           type: string
 *           description: Optional comment about the customer
 *           example: "Great customer! Very cooperative and understanding."
 * 
 *     RatingUpdateRequest:
 *       type: object
 *       properties:
 *         rating_value:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Updated rating value (1-5 stars)
 *           example: 4
 *         rating_comment:
 *           type: string
 *           description: Updated comment about the service
 *           example: "Updated: Good service, minor issues but overall satisfied."
 * 
 *     RatingsListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             ratings:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RatingWithUser'
 *             pagination:
 *               $ref: '#/components/schemas/RatingPagination'
 *             statistics:
 *               $ref: '#/components/schemas/RatingStatistics'
 * 
 *     RateableAppointmentsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             appointments:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RateableAppointment'
 *             total_count:
 *               type: integer
 *               example: 5
 * 
 *     RatingResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Rating created successfully"
 *         data:
 *           $ref: '#/components/schemas/RatingWithUser'
 * 
 *     RatingErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Rating value must be between 1 and 5"
 *
 *     RatingStatus:
 *       type: object
 *       description: Comprehensive rating status information for appointments
 *       properties:
 *         is_rated:
 *           type: boolean
 *           description: Main flag indicating if appointment is rated by customer
 *           example: true
 *         is_rated_by_customer:
 *           type: boolean
 *           description: Whether customer has rated the provider
 *           example: true
 *         is_rated_by_provider:
 *           type: boolean
 *           description: Whether provider has rated the customer
 *           example: false
 *         needs_rating:
 *           type: boolean
 *           description: Whether appointment needs customer rating
 *           example: false
 *         customer_rating_value:
 *           type: integer
 *           nullable: true
 *           minimum: 1
 *           maximum: 5
 *           description: Customer's rating value (1-5 stars)
 *           example: 5
 *         provider_rating_value:
 *           type: integer
 *           nullable: true
 *           minimum: 1
 *           maximum: 5
 *           description: Provider's rating value (1-5 stars)
 *           example: null
 *         provider_can_rate_customer:
 *           type: boolean
 *           description: Whether provider can rate the customer (provider view only)
 *           example: true
 *         provider_rated_me:
 *           type: boolean
 *           description: Whether provider has rated me (customer view only)
 *           example: false
 *
 *     AppointmentWithRatingStatus:
 *       allOf:
 *         - $ref: '#/components/schemas/Appointment'
 *         - type: object
 *           properties:
 *             is_rated:
 *               type: boolean
 *               description: Simple boolean indicating if appointment is rated
 *               example: true
 *             needs_rating:
 *               type: boolean
 *               description: Boolean indicating if appointment needs rating
 *               example: false
 *             rating_status:
 *               $ref: '#/components/schemas/RatingStatus'
 */