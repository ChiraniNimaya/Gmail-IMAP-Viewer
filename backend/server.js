require('./config/env'); 

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/oauth');

const { testConnection, syncDatabase } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { printServerBanner } = require('./utils/serverBanner');

const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, 
      httpOnly: true,
      secure: isProduction
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Gmail IMAP Viewer API',
    version: '1.0.0'
  });
});

app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await testConnection();
    await syncDatabase(false);

    app.listen(PORT, () => {
      printServerBanner({
        environment: process.env.NODE_ENV,
        port: PORT
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();
