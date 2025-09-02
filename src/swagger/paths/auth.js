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
 */
