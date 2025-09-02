import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const port = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files for admin interface only
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files (needed for React Native to access images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration for React Native
app.use(cors({
  origin: '*', // Allow all origins for development - restrict in production
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
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fixmo Backend API is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
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

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    note: 'Route imports temporarily disabled for debugging'
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

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Fixmo Backend API Server is running on http://0.0.0.0:${port}`);
  console.log(`📱 Ready for React Native connections`);
  console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`⚠️  All API routes temporarily disabled for debugging`);
});
