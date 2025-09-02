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
 *           example: "admin_user"
 *         admin_email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *           example: "admin@fixmo.com"
 *         admin_first_name:
 *           type: string
 *           description: Admin first name
 *           example: "John"
 *         admin_last_name:
 *           type: string
 *           description: Admin last name
 *           example: "Doe"
 *         admin_role:
 *           type: string
 *           description: Admin role/permissions level
 *           example: "super_admin"
 *         admin_created_at:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *           example: "2024-01-15T08:30:00Z"
 *         admin_last_login:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *           example: "2024-12-01T14:25:00Z"
 *         admin_is_active:
 *           type: boolean
 *           description: Admin account active status
 *           example: true
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
 */
