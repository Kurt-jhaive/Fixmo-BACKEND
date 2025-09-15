/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     tags: [Admin]
 *     summary: Admin login
 *     description: Authenticate admin user and get access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Admin username or email
 *                 example: "admin@fixmo.com"
 *               password:
 *                 type: string
 *                 description: Admin password
 *                 example: "adminpassword123"
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
 *                   example: "Login successful"
 *                 admin:
 *                   $ref: '#/components/schemas/Admin'
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/admin/logout:
 *   post:
 *     tags: [Admin]
 *     summary: Admin logout
 *     description: Logout admin user and invalidate session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 * 
 * /api/admin/dashboard-stats:
 *   get:
 *     tags: [Admin Dashboard]
 *     summary: Get dashboard statistics
 *     description: Get overall platform statistics for admin dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   example: 1250
 *                 totalProviders:
 *                   type: integer
 *                   example: 340
 *                 totalBookings:
 *                   type: integer
 *                   example: 2150
 *                 pendingCertificates:
 *                   type: integer
 *                   example: 25
 *                 verifiedProviders:
 *                   type: integer
 *                   example: 280
 *                 unverifiedProviders:
 *                   type: integer
 *                   example: 60
 *                 activeBookings:
 *                   type: integer
 *                   example: 45
 *                 completedBookings:
 *                   type: integer
 *                   example: 1950
 *                 cancelledBookings:
 *                   type: integer
 *                   example: 155
 *                 totalRevenue:
 *                   type: number
 *                   format: float
 *                   example: 125750.50
 * 
 * /api/admin/recent-activity:
 *   get:
 *     tags: [Admin Dashboard]
 *     summary: Get recent platform activity
 *     description: Get recent activities across the platform for admin monitoring
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of recent activities to retrieve
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recentUsers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 recentProviders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceProvider'
 *                 recentBookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 recentCertificates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certificate'
 * 
 * /api/admin/users:
 *   get:
 *     tags: [Admin User Management]
 *     summary: Get all users
 *     description: Get list of all registered users with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of users per page
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by user name, email, or phone
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 * 
 * /api/admin/users/{userId}:
 *   get:
 *     tags: [Admin User Management]
 *     summary: Get user by ID
 *     description: Get detailed information about a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 ratings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rating'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/admin/users/{userId}/verify:
 *   put:
 *     tags: [Admin User Management]
 *     summary: Verify user
 *     description: Update user verification status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isVerified
 *             properties:
 *               isVerified:
 *                 type: boolean
 *                 description: Verification status to set
 *               reason:
 *                 type: string
 *                 description: Reason for verification status change
 *     responses:
 *       200:
 *         description: User verification status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User verification status updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 * 
 * /api/admin/users/{userId}/activate:
 *   put:
 *     tags: [Admin User Management]
 *     summary: Activate user
 *     description: Activate a user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User activated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 * 
 * /api/admin/users/{userId}/deactivate:
 *   put:
 *     tags: [Admin User Management]
 *     summary: Deactivate user
 *     description: Deactivate a user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for deactivation
 *                 example: "Terms of service violation"
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deactivated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 * 
 * /api/admin/providers:
 *   get:
 *     tags: [Admin Provider Management]
 *     summary: Get all service providers
 *     description: Get list of all service providers with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of providers per page
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by provider name, business name, or email
 *     responses:
 *       200:
 *         description: Providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceProvider'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 * 
 * /api/admin/providers/{providerId}:
 *   get:
 *     tags: [Admin Provider Management]
 *     summary: Get provider by ID
 *     description: Get detailed information about a specific service provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Provider retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provider:
 *                   $ref: '#/components/schemas/ServiceProvider'
 *                 services:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 *                 certificates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certificate'
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 ratings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rating'
 *       404:
 *         description: Provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/admin/providers/{providerId}/verify:
 *   put:
 *     tags: [Admin Provider Management]
 *     summary: Verify service provider
 *     description: Update service provider verification status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isVerified
 *             properties:
 *               isVerified:
 *                 type: boolean
 *                 description: Verification status to set
 *               reason:
 *                 type: string
 *                 description: Reason for verification status change
 *     responses:
 *       200:
 *         description: Provider verification status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provider verification status updated successfully"
 *                 provider:
 *                   $ref: '#/components/schemas/ServiceProvider'
 * 
 * /api/admin/providers/{providerId}/activate:
 *   put:
 *     tags: [Admin Provider Management]
 *     summary: Activate service provider
 *     description: Activate a service provider account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *     responses:
 *       200:
 *         description: Provider activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provider activated successfully"
 *                 provider:
 *                   $ref: '#/components/schemas/ServiceProvider'
 * 
 * /api/admin/providers/{providerId}/deactivate:
 *   put:
 *     tags: [Admin Provider Management]
 *     summary: Deactivate service provider
 *     description: Deactivate a service provider account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Provider ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for deactivation
 *                 example: "Quality issues reported"
 *     responses:
 *       200:
 *         description: Provider deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Provider deactivated successfully"
 *                 provider:
 *                   $ref: '#/components/schemas/ServiceProvider'
 * 
 * /api/admin/certificates:
 *   get:
 *     tags: [Admin Certificate Management]
 *     summary: Get all certificates
 *     description: Get list of all certificates with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of certificates per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected]
 *         description: Filter by certificate status
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: integer
 *         description: Filter by provider ID
 *     responses:
 *       200:
 *         description: Certificates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certificates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certificate'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 * 
 * /api/admin/certificates/{certificateId}:
 *   get:
 *     tags: [Admin Certificate Management]
 *     summary: Get certificate by ID
 *     description: Get detailed information about a specific certificate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certificate:
 *                   $ref: '#/components/schemas/Certificate'
 *                 provider:
 *                   $ref: '#/components/schemas/ServiceProvider'
 *       404:
 *         description: Certificate not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/admin/certificates/{certificateId}/approve:
 *   put:
 *     tags: [Admin Certificate Management]
 *     summary: Approve certificate
 *     description: Approve a pending certificate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Certificate ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNotes:
 *                 type: string
 *                 description: Admin notes for approval
 *                 example: "Certificate verified and approved"
 *     responses:
 *       200:
 *         description: Certificate approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Certificate approved successfully"
 *                 certificate:
 *                   $ref: '#/components/schemas/Certificate'
 * 
 * /api/admin/certificates/{certificateId}/reject:
 *   put:
 *     tags: [Admin Certificate Management]
 *     summary: Reject certificate
 *     description: Reject a pending certificate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Certificate ID
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
 *                 description: Reason for rejection
 *                 example: "Certificate image is not clear enough"
 *               adminNotes:
 *                 type: string
 *                 description: Additional admin notes
 *     responses:
 *       200:
 *         description: Certificate rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Certificate rejected successfully"
 *                 certificate:
 *                   $ref: '#/components/schemas/Certificate'
 * 
 * /api/admin/bookings:
 *   get:
 *     tags: [Admin Booking Management]
 *     summary: Get all bookings
 *     description: Get list of all bookings with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of bookings per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         description: Filter by booking status
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: integer
 *         description: Filter by provider ID
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings until this date
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 * 
 * /api/admin/verify-service-provider:
 *   post:
 *     tags: [Admin Legacy]
 *     summary: Verify service provider (Legacy)
 *     description: Legacy endpoint for verifying service providers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_isVerified
 *               - provider_id
 *             properties:
 *               provider_isVerified:
 *                 type: boolean
 *                 description: Verification status
 *               provider_id:
 *                 type: integer
 *                 description: Provider ID
 *     responses:
 *       200:
 *         description: Provider verification status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service provider verification status updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ServiceProvider'
 * 
 * /api/admin/verify-customer:
 *   post:
 *     tags: [Admin Legacy]
 *     summary: Verify customer (Legacy)
 *     description: Legacy endpoint for verifying customers
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_isVerified
 *               - user_id
 *             properties:
 *               customer_isVerified:
 *                 type: boolean
 *                 description: Verification status
 *               user_id:
 *                 type: integer
 *                 description: User ID
 *     responses:
 *       200:
 *         description: Customer verification status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Customer verification status updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/User'
 * 
 * /api/admin/unverified-service-providers:
 *   get:
 *     tags: [Admin Legacy]
 *     summary: Get unverified service providers (Legacy)
 *     description: Legacy endpoint to get list of unverified service providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unverified providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fetched unverified service providers"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceProvider'
 * 
 * /api/admin/unverified-customers:
 *   get:
 *     tags: [Admin Legacy]
 *     summary: Get unverified customers (Legacy)
 *     description: Legacy endpoint to get list of unverified customers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unverified customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fetched unverified customers"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
