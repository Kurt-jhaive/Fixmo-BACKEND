import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import prisma from './prismaclient.js';
import authCustomerRoutes from './route/authCustomer.js';
import serviceProviderRoutes from './route/serviceProvider.js';
import serviceRoutes from './route/serviceRoutes.js';
import certificateRoutes from './route/certificateRoutes.js';
import availabilityRoutes from './route/availabilityRoutes.js';
import appointmentRoutes from './route/appointmentRoutes.js';
import adminRoutes from './route/adminRoutes.js';
import ratingRoutes from './route/ratingRoutes.js';
import messageRoutes from './route/messageRoutes.js';
import { setWebSocketServer } from './controller/messageController.js';
import cors from 'cors';
import { specs, swaggerUi } from './config/swagger.js';
import MessageWebSocketServer from './services/MessageWebSocketServer.js';


const port = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'))); // Serve uploaded files


// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse incoming requests with JSON payloads

app.use(cors({
  origin: '*', // 💡 for development only
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (extended from 24 hours)
  }
}));








// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fixmo Backend API is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    documentation: {
      swagger: `${req.protocol}://${req.get('host')}/api-docs`,
      description: 'Interactive API documentation with Swagger UI'
    },
    endpoints: {
      health: '/',
      docs: '/docs',
      documentation: '/api-docs',
      admin: '/admin',
      uploads: '/uploads/*'
    }
  });
});

// Admin Web Interface Routes (Keep for admin dashboard)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-access.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Chat Test Interface
app.get('/chat-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat-test.html'));
});

// API Landing Page
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api-landing.html'));
});

// Authentication Helper Page
app.get('/auth-helper', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth-helper.html'));
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 20px; }
    .swagger-ui .scheme-container { 
      background: #f7f7f7; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 5px; 
      border-left: 4px solid #007bff;
    }
  `,
  customSiteTitle: 'Fixmo Backend API Documentation',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    persistAuthorization: true,
    displayOperationId: false,
    displayRequestDuration: true
  }
}));

app.get("/api-docs.json", (req,res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// API Routes for React Native
app.use('/auth', authCustomerRoutes); // Customer authentication routes
app.use('/auth', serviceProviderRoutes); // Service provider authentication routes 
app.use('/api/admin', adminRoutes); // Admin management routes
app.use('/api/serviceProvider', serviceProviderRoutes); // Service provider API routes
app.use('/api/services', serviceRoutes); // Service management routes
app.use('/api/certificates', certificateRoutes); // Certificate management routes
app.use('/api/availability', availabilityRoutes); // Availability management routes
app.use('/api/appointments', appointmentRoutes); // Appointment management routes
app.use('/api/ratings', ratingRoutes); // Rating management routes
app.use('/api/messages', messageRoutes); // Message management routes

// 404 handler for undefined routes (without wildcard)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    availableRoutes: [
      '/auth/*',
      '/api/admin/*',
      '/api/serviceProvider/*',
      '/api/services/*',
      '/api/certificates/*',
      '/api/availability/*',
      '/api/appointments/*',
      '/api/ratings/*',
      '/api/messages/*',
      '/uploads/*'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end'
  });
});

// Initialize WebSocket server
const messageWebSocket = new MessageWebSocketServer(httpServer);

// Pass WebSocket server to message controller
setWebSocketServer(messageWebSocket);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Fixmo Backend API Server is running on http://0.0.0.0:${port}`);
  console.log(`📱 Ready for React Native connections`);
  console.log(`💬 WebSocket server initialized for real-time messaging`);
  console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});
