const jwt = require('jsonwebtoken');
const { catchAsync, AppError } = require('../middleware/errorHandler');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Google OAuth callback handler
exports.googleCallback = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication failed', 401);
  }

  // Generate JWT token
  const token = generateToken(req.user.id);

  // Redirect to frontend with token
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});

// Get current user
exports.getCurrentUser = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
});

// Logout
exports.logout = catchAsync(async (req, res) => {
  req.logout((err) => {
    if (err) {
      throw new AppError('Error logging out', 500);
    }
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Update user preferences
exports.updatePreferences = catchAsync(async (req, res) => {
  const { preferences } = req.body;

  if (!preferences) {
    throw new AppError('Preferences data is required', 400);
  }

  req.user.preferences = {
    ...req.user.preferences,
    ...preferences
  };

  await req.user.save();

  res.status(200).json({
    success: true,
    data: {
      user: req.user
    },
    message: 'Preferences updated successfully'
  });
});

// Check authentication status
exports.checkAuth = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    authenticated: true,
    data: {
      user: req.user
    }
  });
});