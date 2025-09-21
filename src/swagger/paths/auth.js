/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Customer login
 *     description: Authenticate customer and receive JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   description: JWT token (expires in 1 hour)
 *                 userId:
 *                   type: integer
 *                   example: 123
 *                 userName:
 *                   type: string
 *                   example: johndoe
 *       400:
 *         description: Invalid credentials or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid email or password
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /auth/request-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Request OTP for customer registration
 *     description: Send OTP to email for customer registration (validates email uniqueness)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newcustomer@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP sent to email
 *       400:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User already exists
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Too many OTP requests. Please wait before trying again.
 * 
 * /auth/verify-register:
 *   post:
 *     tags: [Authentication]
 *     summary: Complete customer registration
 *     description: Verify OTP and complete customer registration with optional file uploads
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - userName
 *               - email
 *               - password
 *               - phone_number
 *               - otp
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               userName:
 *                 type: string
 *                 example: johndoe123
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: securepassword123
 *               phone_number:
 *                 type: string
 *                 example: +1234567890
 *               user_location:
 *                 type: string
 *                 example: New York, NY
 *               exact_location:
 *                 type: string
 *                 example: 123 Main St, New York, NY 10001
 *               birthday:
 *                 type: string
 *                 format: date
 *                 example: 1990-01-15
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               profile_photo:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo (JPG, PNG, GIF - max 5MB)
 *               valid_id:
 *                 type: string
 *                 format: binary
 *                 description: Valid ID document (JPG, PNG, PDF - max 5MB)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 userId:
 *                   type: integer
 *                   example: 123
 *                 profile_photo:
 *                   type: string
 *                   nullable: true
 *                   example: uploads/customer-profiles/profile_photo-1234567890.jpg
 *                 valid_id:
 *                   type: string
 *                   nullable: true
 *                   example: uploads/customer-ids/valid_id-1234567890.jpg
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /auth/provider-login:
 *   post:
 *     tags: [Authentication]
 *     summary: Service provider login
 *     description: Authenticate service provider and receive JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *               - provider_password
 *             properties:
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: provider@example.com
 *               provider_password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Provider login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 providerId:
 *                   type: integer
 *                   example: 456
 *                 providerUserName:
 *                   type: string
 *                   example: johnprovider
 * 
 * /auth/provider-request-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Request OTP for provider registration
 *     description: Send OTP to provider email for registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_email
 *             properties:
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: newprovider@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP sent to provider email
 * 
 * /auth/provider-verify-register:
 *   post:
 *     tags: [Authentication]
 *     summary: Complete provider registration
 *     description: Verify OTP and complete provider registration with optional file uploads
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - provider_first_name
 *               - provider_last_name
 *               - provider_email
 *               - provider_phone_number
 *               - provider_location
 *               - provider_uli
 *               - provider_userName
 *               - provider_password
 *               - otp
 *             properties:
 *               provider_first_name:
 *                 type: string
 *                 example: Jane
 *               provider_last_name:
 *                 type: string
 *                 example: Smith
 *               provider_email:
 *                 type: string
 *                 format: email
 *                 example: jane@servicecompany.com
 *               provider_phone_number:
 *                 type: string
 *                 example: +1234567890
 *               provider_location:
 *                 type: string
 *                 example: Los Angeles, CA
 *               provider_uli:
 *                 type: string
 *                 example: ULI123456789
 *                 description: Unique provider identifier
 *               provider_userName:
 *                 type: string
 *                 example: janesmith_plumber
 *               provider_password:
 *                 type: string
 *                 example: securepassword123
 *               provider_birthday:
 *                 type: string
 *                 format: date
 *                 example: 1985-05-20
 *               provider_exact_location:
 *                 type: string
 *                 example: 456 Service Ave, Los Angeles, CA 90001
 *               otp:
 *                 type: string
 *                 example: "654321"
 *               provider_profile_photo:
 *                 type: string
 *                 format: binary
 *                 description: Provider profile photo
 *               provider_valid_id:
 *                 type: string
 *                 format: binary
 *                 description: Provider valid ID document
 *               certificateNames:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Plumbing License", "Electrical Certification"]
 *               certificateNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["PL123456", "EC789012"]
 *               expiryDates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *                 example: ["2025-12-31", "2024-06-30"]
 *     responses:
 *       201:
 *         description: Provider registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 * 
 * /auth/service-listings:
 *   get:
 *     tags: [Customer Services]
 *     summary: Get service listings with optional date-based availability filtering
 *     description: |
 *       Retrieve service listings from verified and active providers with advanced filtering options.
 *       
 *       **🗓️ NEW: Date-Based Availability Filtering**
 *       - When `date` parameter is provided, only providers available on that specific date are returned
 *       - Checks provider's weekly availability schedule for the day of week
 *       - Excludes providers with existing appointments on the requested date
 *       - Handles past dates and times appropriately
 *       
 *       **Features:**
 *       - Pagination support
 *       - Search by service title, description, or provider name
 *       - Filter by category and location
 *       - Sort by rating, price, or newest
 *       - **NEW: Filter by availability on specific date**
 *       - **NEW: Includes availability details in response**
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of results per page
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for service title, description, or provider name
 *         example: "home repair"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by service category
 *         example: "Home Repair"
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by provider location
 *         example: "manila"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, price-low, price-high, newest]
 *           default: rating
 *         description: Sort order for results
 *         example: "rating"
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: |
 *           **NEW FEATURE** - Filter providers by availability on specific date (YYYY-MM-DD format).
 *           Only providers who are available and not booked on this date will be returned.
 *         example: "2025-09-25"
 *     responses:
 *       200:
 *         description: Service listings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service listings for 2025-09-25 (Thursday) retrieved successfully"
 *                 listings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Professional Home Repair Service"
 *                       description:
 *                         type: string
 *                         example: "Expert home repair and maintenance services"
 *                       startingPrice:
 *                         type: number
 *                         example: 500
 *                       service_picture:
 *                         type: string
 *                         example: "https://cloudinary.com/image.jpg"
 *                       provider:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           userName:
 *                             type: string
 *                             example: "johndoe_repair"
 *                           rating:
 *                             type: number
 *                             format: float
 *                             example: 4.5
 *                           location:
 *                             type: string
 *                             example: "Manila, Philippines"
 *                           profilePhoto:
 *                             type: string
 *                             example: "https://cloudinary.com/profile.jpg"
 *                       categories:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Home Repair", "Maintenance"]
 *                       specificServices:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             title:
 *                               type: string
 *                               example: "Plumbing Repair"
 *                             description:
 *                               type: string
 *                               example: "Fix leaks and install fixtures"
 *                       availability:
 *                         type: object
 *                         description: "Only present when date parameter is provided"
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2025-09-25"
 *                           dayOfWeek:
 *                             type: string
 *                             example: "Thursday"
 *                           hasAvailability:
 *                             type: boolean
 *                             example: true
 *                           totalSlots:
 *                             type: integer
 *                             example: 3
 *                           availableSlots:
 *                             type: integer
 *                             example: 2
 *                           bookedSlots:
 *                             type: integer
 *                             example: 1
 *                           reason:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     totalCount:
 *                       type: integer
 *                       example: 15
 *                     hasNext:
 *                       type: boolean
 *                       example: true
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *                 dateFilter:
 *                   type: object
 *                   description: "Only present when date parameter is provided"
 *                   properties:
 *                     requestedDate:
 *                       type: string
 *                       format: date
 *                       example: "2025-09-25"
 *                     dayOfWeek:
 *                       type: string
 *                       example: "Thursday"
 *                     totalProvidersBeforeFiltering:
 *                       type: integer
 *                       example: 50
 *                     availableProvidersAfterFiltering:
 *                       type: integer
 *                       example: 15
 *                     filteringApplied:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid parameters or date format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid date format. Please use YYYY-MM-DD format."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error retrieving service listings"
 */
