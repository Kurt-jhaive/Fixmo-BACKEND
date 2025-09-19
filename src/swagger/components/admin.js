/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         admin_id:
 *           type: integer
 *           description: Admin unique identifier
 *           example: 1
 *         admin_username:
 *           type: string
 *           description: Admin username
 *           example: "superadmin"
 *         admin_email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *           example: "super@fixmo.local"
 *         admin_name:
 *           type: string
 *           description: Admin full name
 *           example: "Super Administrator"
 *         admin_role:
 *           type: string
 *           enum: [admin, super_admin]
 *           description: Admin role/permissions level
 *           example: "super_admin"
 *         is_active:
 *           type: boolean
 *           description: Admin account active status
 *           example: true
 *         must_change_password:
 *           type: boolean
 *           description: Whether admin must change password on next login
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *           example: "2024-01-15T08:30:00Z"
 *         last_login:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Last login timestamp
 *           example: "2024-12-01T14:25:00Z"
 * 
 *     AdminLoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Admin username or email
 *           example: "super@fixmo.local"
 *         password:
 *           type: string
 *           description: Admin password
 *           example: "SuperAdmin2024!"
 * 
 *     AdminLoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Login successful"
 *         token:
 *           type: string
 *           description: JWT access token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         admin:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             username:
 *               type: string
 *               example: "superadmin"
 *             email:
 *               type: string
 *               example: "super@fixmo.local"
 *             name:
 *               type: string
 *               example: "Super Administrator"
 *             role:
 *               type: string
 *               example: "super_admin"
 *             is_active:
 *               type: boolean
 *               example: true
 *         must_change_password:
 *           type: boolean
 *           description: Present if password change is required
 *           example: true
 * 
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - current_password
 *         - new_password
 *       properties:
 *         current_password:
 *           type: string
 *           description: Current password
 *           example: "SuperAdmin2024!"
 *         new_password:
 *           type: string
 *           description: New password (min 8 chars, uppercase, lowercase, number, special char)
 *           example: "NewSecurePassword2024!"
 * 
 *     InviteAdminRequest:
 *       type: object
 *       required:
 *         - email
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: New admin email address
 *           example: "new.admin@fixmo.local"
 *         name:
 *           type: string
 *           description: New admin full name
 *           example: "New Administrator"
 *         role:
 *           type: string
 *           enum: [admin, super_admin]
 *           description: Admin role (defaults to 'admin')
 *           example: "admin"
 * 
 *     InviteAdminResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Admin invited successfully"
 *         admin:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 2
 *             username:
 *               type: string
 *               example: "new.admin_1634567890"
 *             email:
 *               type: string
 *               example: "new.admin@fixmo.local"
 *             name:
 *               type: string
 *               example: "New Administrator"
 *             role:
 *               type: string
 *               example: "admin"
 *             is_active:
 *               type: boolean
 *               example: true
 *         temporary_password:
 *           type: string
 *           description: Auto-generated temporary password
 *           example: "TempPass123!"
 *         note:
 *           type: string
 *           example: "Please share this temporary password securely with the new admin"
 * 
 *     ToggleAdminStatusRequest:
 *       type: object
 *       required:
 *         - is_active
 *       properties:
 *         is_active:
 *           type: boolean
 *           description: New active status for the admin
 *           example: false
 * 
 *     AdminListResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Admins fetched successfully"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Admin'
 * 
 *     Pagination:
 *       type: object
 *       properties:
 *         currentPage:
 *           type: integer
 *           description: Current page number
 *           example: 1
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *           example: 10
 *         totalItems:
 *           type: integer
 *           description: Total number of items
 *           example: 200
 *         itemsPerPage:
 *           type: integer
 *           description: Number of items per page
 *           example: 20
 *         hasNextPage:
 *           type: boolean
 *           description: Whether there is a next page
 *           example: true
 *         hasPreviousPage:
 *           type: boolean
 *           description: Whether there is a previous page
 *           example: false
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: "Invalid credentials"
 *         error:
 *           type: string
 *           description: Error type or code
 *           example: "UNAUTHORIZED"
 */
