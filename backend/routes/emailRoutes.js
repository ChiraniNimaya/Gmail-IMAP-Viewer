const express = require('express');
const emailController = require('../controllers/emailController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Email routes
router.get('/sync', emailController.syncEmails);
router.get('/', emailController.getEmails);
router.get('/search', emailController.searchEmails);
router.get('/stats', emailController.getEmailStats);
router.get('/:id', emailController.getEmailById);
router.patch('/:id/read', emailController.toggleReadStatus);
router.delete('/:id', emailController.deleteEmail);

module.exports = router;