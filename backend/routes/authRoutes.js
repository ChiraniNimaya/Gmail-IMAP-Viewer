const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://mail.google.com/'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`
  }),
  authController.googleCallback
);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);
router.post('/logout', verifyToken, authController.logout);
router.put('/preferences', verifyToken, authController.updatePreferences);
router.get('/check', verifyToken, authController.checkAuth);

module.exports = router;