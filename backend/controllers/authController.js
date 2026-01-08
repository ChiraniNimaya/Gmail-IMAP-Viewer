const jwt = require('jsonwebtoken');
const { catchAsync, AppError } = require('../middleware/errorHandler');

const JWT_EXPIRES_IN = '7d';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Return only safe user fields
const sanitizeUser = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    googleId: user.googleId,
    email: user.email,
    name: user.name,
    profilePicture: user.profilePicture,
    preferences: user.preferences,
    lastSync: user.lastSync,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const validatePreferences = (preferences) => {
  if (typeof preferences !== 'object' || Array.isArray(preferences)) {
    throw new AppError('Preferences must be an object', 400);
  }

  if (
    preferences.emailsPerPage &&
    (!Number.isInteger(preferences.emailsPerPage) ||
      preferences.emailsPerPage <= 0)
  ) {
    throw new AppError('emailsPerPage must be a positive integer', 400);
  }

  if (
    preferences.theme &&
    !['light', 'dark'].includes(preferences.theme)
  ) {
    throw new AppError('Invalid theme value', 400);
  }
};

exports.googleCallback = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError('Authentication failed', 401);
  }

  const token = generateToken(req.user.id);

  res.redirect(
    `${process.env.FRONTEND_URL}/auth/callback?token=${token}` 
  );
});

exports.getCurrentUser = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(req.user)
    }
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  req.logout((err) => {
    if (err) return next(new AppError('Error logging out', 500));

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

exports.updatePreferences = catchAsync(async (req, res) => {
  const { preferences } = req.body;

  if (!preferences) {
    throw new AppError('Preferences data is required', 400);
  }

  validatePreferences(preferences);

  req.user.preferences = {
    ...req.user.preferences,
    ...preferences
  };

  await req.user.save();

  res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(req.user)
    },
    message: 'Preferences updated successfully'
  });
});

exports.checkAuth = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    authenticated: true,
    data: {
      user: sanitizeUser(req.user)
    }
  });
});
