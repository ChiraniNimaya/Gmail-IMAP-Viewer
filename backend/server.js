const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/oauth');
const { testConnection, syncDatabase } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Gmail IMAP Viewer API',
    version: '1.0.0'
  });
});

app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database models
    await syncDatabase(false); // Set to true to drop and recreate tables

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║   Gmail IMAP Viewer Server Started   ║
╠═══════════════════════════════════════╣
║  Environment: ${process.env.NODE_ENV?.padEnd(23) || 'development'.padEnd(23)} ║
║  Port: ${PORT.toString().padEnd(30)} ║
║  Database: Connected                  ║
╚═══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();