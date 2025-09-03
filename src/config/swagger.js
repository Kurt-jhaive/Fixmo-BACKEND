import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fixmo Backend API',
      version: '1.0.0',
      description: `
        A comprehensive service management platform that connects customers with service providers
        
        ## Authentication Guide
        
        **🔐 How to use JWT Authentication:**
        
        1. **Get a JWT Token:**
           - For customers: Use \`POST /auth/login\` with email and password
           - For providers: Use \`POST /auth/provider-login\` with provider_email and provider_password
           
        2. **Authorize in Swagger:**
           - Click the **"Authorize"** button (🔒) at the top right
           - Enter your JWT token in the format: \`your-jwt-token-here\`
           - Do NOT include "Bearer " prefix - Swagger adds it automatically
           
        3. **Use Protected Endpoints:**
           - After authorization, you can access endpoints that require authentication
           - Look for the 🔒 icon next to endpoints that need authentication
           
        ## Endpoint Categories
        
        - **🟢 Public Endpoints**: No authentication required (login, registration, public ratings)
        - **🔒 Protected Endpoints**: Require JWT token (certificates, appointments, service management)
        
        ## Testing Flow
        
        1. Register or login to get a JWT token
        2. Click "Authorize" and paste your token
        3. Test protected endpoints like certificate upload
      `,
      contact: {
        name: 'Fixmo API Support',
        email: 'support@fixmo.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.fixmo.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint (e.g., from /auth/login or /auth/provider-login)'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            user_id: { type: 'integer', description: 'Unique user identifier' },
            first_name: { type: 'string', description: 'User first name' },
            last_name: { type: 'string', description: 'User last name' },
            email: { type: 'string', format: 'email', description: 'User email address' },
            phone_number: { type: 'string', description: 'User phone number' },
            profile_photo: { type: 'string', nullable: true, description: 'Profile photo file path' },
            valid_id: { type: 'string', nullable: true, description: 'Valid ID document file path' },
            user_location: { type: 'string', nullable: true, description: 'User location' },
            created_at: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
            is_verified: { type: 'boolean', description: 'User verification status' },
            userName: { type: 'string', description: 'Unique username' },
            is_activated: { type: 'boolean', description: 'Account activation status' },
            birthday: { type: 'string', format: 'date-time', nullable: true, description: 'User birthday' },
            exact_location: { type: 'string', nullable: true, description: 'Exact user location' }
          }
        },
        ServiceProvider: {
          type: 'object',
          properties: {
            provider_id: { type: 'integer', description: 'Unique provider identifier' },
            provider_first_name: { type: 'string', description: 'Provider first name' },
            provider_last_name: { type: 'string', description: 'Provider last name' },
            provider_email: { type: 'string', format: 'email', description: 'Provider email address' },
            provider_phone_number: { type: 'string', description: 'Provider phone number' },
            provider_profile_photo: { type: 'string', nullable: true, description: 'Provider profile photo' },
            provider_valid_id: { type: 'string', nullable: true, description: 'Provider valid ID document' },
            provider_isVerified: { type: 'boolean', description: 'Provider verification status' },
            created_at: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
            provider_rating: { type: 'number', format: 'float', description: 'Average provider rating' },
            provider_location: { type: 'string', nullable: true, description: 'Provider location' },
            provider_uli: { type: 'string', description: 'Unique provider identifier' },
            provider_userName: { type: 'string', description: 'Provider username' },
            provider_isActivated: { type: 'boolean', description: 'Provider activation status' },
            provider_birthday: { type: 'string', format: 'date-time', nullable: true, description: 'Provider birthday' },
            provider_exact_location: { type: 'string', nullable: true, description: 'Exact provider location' }
          }
        },
        ServiceListing: {
          type: 'object',
          properties: {
            service_id: { type: 'integer', description: 'Unique service identifier' },
            service_title: { type: 'string', description: 'Service title' },
            service_description: { type: 'string', description: 'Service description' },
            service_startingprice: { type: 'number', format: 'float', description: 'Starting price for service' },
            provider_id: { type: 'integer', description: 'Provider who offers this service' },
            servicelisting_isActive: { type: 'boolean', description: 'Service availability status' },
            service_picture: { type: 'string', nullable: true, description: 'Service image file path' }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            appointment_id: { type: 'integer', description: 'Unique appointment identifier' },
            customer_id: { type: 'integer', description: 'Customer who booked the appointment' },
            provider_id: { type: 'integer', description: 'Service provider for the appointment' },
            appointment_status: { 
              type: 'string', 
              enum: ['pending', 'approved', 'confirmed', 'in-progress', 'finished', 'completed', 'cancelled', 'no-show'],
              description: 'Current appointment status' 
            },
            scheduled_date: { type: 'string', format: 'date-time', description: 'Scheduled appointment date and time' },
            repairDescription: { type: 'string', nullable: true, description: 'Description of repair needed' },
            created_at: { type: 'string', format: 'date-time', description: 'Appointment creation timestamp' },
            final_price: { type: 'number', format: 'float', nullable: true, description: 'Final agreed price' },
            availability_id: { type: 'integer', description: 'Associated availability slot' },
            service_id: { type: 'integer', description: 'Service being requested' },
            cancellation_reason: { type: 'string', nullable: true, description: 'Reason for cancellation if cancelled' }
          }
        },
        Rating: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique rating identifier' },
            rating_value: { type: 'integer', minimum: 1, maximum: 5, description: 'Rating value (1-5 stars)' },
            rating_comment: { type: 'string', nullable: true, description: 'Optional rating comment' },
            rating_photo: { type: 'string', nullable: true, description: 'Optional rating photo file path' },
            appointment_id: { type: 'integer', description: 'Related appointment' },
            user_id: { type: 'integer', description: 'User who gave the rating' },
            provider_id: { type: 'integer', description: 'Provider being rated' },
            rated_by: { type: 'string', enum: ['customer', 'provider'], description: 'Who submitted the rating' },
            created_at: { type: 'string', format: 'date-time', description: 'Rating creation timestamp' }
          }
        },
        Certificate: {
          type: 'object',
          properties: {
            certificate_id: { type: 'integer', description: 'Unique certificate identifier' },
            certificate_name: { type: 'string', description: 'Certificate name' },
            certificate_file_path: { type: 'string', description: 'Certificate file path' },
            expiry_date: { type: 'string', format: 'date-time', nullable: true, description: 'Certificate expiry date' },
            provider_id: { type: 'integer', description: 'Provider who owns the certificate' },
            certificate_number: { type: 'string', description: 'Unique certificate number' },
            certificate_status: { 
              type: 'string', 
              enum: ['Pending', 'Approved', 'Rejected'],
              description: 'Certificate approval status' 
            },
            created_at: { type: 'string', format: 'date-time', description: 'Certificate upload timestamp' }
          }
        },
        Availability: {
          type: 'object',
          properties: {
            availability_id: { type: 'integer', description: 'Unique availability identifier' },
            dayOfWeek: { type: 'string', description: 'Day of the week' },
            startTime: { type: 'string', description: 'Start time (HH:MM format)' },
            endTime: { type: 'string', description: 'End time (HH:MM format)' },
            provider_id: { type: 'integer', description: 'Provider setting availability' },
            availability_isActive: { type: 'boolean', description: 'Availability status' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', description: 'Error message' },
            error: { type: 'string', description: 'Additional error details' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', description: 'Success message' },
            data: { type: 'object', description: 'Response data' }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            current_page: { type: 'integer', description: 'Current page number' },
            total_pages: { type: 'integer', description: 'Total number of pages' },
            total_count: { type: 'integer', description: 'Total number of items' },
            limit: { type: 'integer', description: 'Items per page' },
            has_next: { type: 'boolean', description: 'Whether there is a next page' },
            has_prev: { type: 'boolean', description: 'Whether there is a previous page' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Customer and Provider authentication endpoints'
      },
      {
        name: 'Services',
        description: 'Service management endpoints'
      },
      {
        name: 'Appointments',
        description: 'Appointment booking and management'
      },
      {
        name: 'Ratings',
        description: 'Rating and review system'
      },
      {
        name: 'Provider Ratings',
        description: 'Provider rating customers and related endpoints'
      },
      {
        name: 'Certificates',
        description: 'Certificate management for providers'
      },
      {
        name: 'Availability',
        description: 'Provider availability management'
      },
      {
        name: 'Admin',
        description: 'Administrative functions'
      },
      {
        name: 'System',
        description: 'System health and utility endpoints'
      }
    ]
  },
  apis: [
    './src/route/*.js',
    './src/controller/*.js',
    './src/swagger/paths/*.js'
  ],
};

const specs = swaggerJSDoc(options);

export { specs, swaggerUi };
