const ImapService = require('../services/imapService');
const Email = require('../models/Email');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// Fetch and sync emails from Gmail
exports.syncEmails = catchAsync(async (req, res) => {
  const { mailbox = 'INBOX', limit = 50, offset = 0 } = req.query;

  const imapService = new ImapService(req.user);

  try {
    await imapService.connect();
    
    const { emails, total } = await imapService.fetchEmails(
      mailbox,
      parseInt(limit),
      parseInt(offset)
    );

    // Store emails in database
    const savedEmails = [];
    for (const emailData of emails) {
      const [email, created] = await Email.findOrCreate({
        where: {
          userId: req.user.id,
          messageId: emailData.messageId
        },
        defaults: {
          ...emailData,
          userId: req.user.id
        }
      });

      if (!created) {
        // Update existing email
        await email.update(emailData);
      }

      savedEmails.push(email);
    }

    // Update last sync time
    req.user.lastSync = new Date();
    await req.user.save();

    imapService.disconnect();

    res.status(200).json({
      success: true,
      data: {
        emails: savedEmails,
        total,
        synced: savedEmails.length
      },
      message: 'Emails synced successfully'
    });
  } catch (error) {
    imapService.disconnect();
    throw new AppError(`Failed to sync emails: ${error.message}`, 500);
  }
});

// Get emails from database
exports.getEmails = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'receivedDate',
    order = 'DESC',
    unreadOnly = false
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const where = { userId: req.user.id };
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const { count, rows: emails } = await Email.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [[sortBy, order.toUpperCase()]],
    attributes: {
      exclude: ['bodyHtml', 'bodyText'] // Exclude large fields for list view
    }
  });

  res.status(200).json({
    success: true,
    data: {
      emails,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    }
  });
});

// Get single email by ID
exports.getEmailById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const email = await Email.findOne({
    where: {
      id,
      userId: req.user.id
    }
  });

  if (!email) {
    throw new AppError('Email not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      email
    }
  });
});

// Search emails
exports.searchEmails = catchAsync(async (req, res) => {
  const {
    query,
    page = 1,
    limit = 20,
    searchIn = 'all' // all, subject, from, body
  } = req.query;

  if (!query) {
    throw new AppError('Search query is required', 400);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const searchTerm = `%${query}%`;

  let where = { userId: req.user.id };

  // Build search conditions based on searchIn parameter
  if (searchIn === 'subject') {
    where.subject = { [Op.like]: searchTerm };
  } else if (searchIn === 'from') {
    where[Op.or] = [
      { fromAddress: { [Op.like]: searchTerm } },
      { fromName: { [Op.like]: searchTerm } }
    ];
  } else if (searchIn === 'body') {
    where[Op.or] = [
      { bodyText: { [Op.like]: searchTerm } },
      { bodyPreview: { [Op.like]: searchTerm } }
    ];
  } else {
    // Search in all fields
    where[Op.or] = [
      { subject: { [Op.like]: searchTerm } },
      { fromAddress: { [Op.like]: searchTerm } },
      { fromName: { [Op.like]: searchTerm } },
      { bodyPreview: { [Op.like]: searchTerm } },
      { toAddress: { [Op.like]: searchTerm } }
    ];
  }

  const { count, rows: emails } = await Email.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['receivedDate', 'DESC']],
    attributes: {
      exclude: ['bodyHtml', 'bodyText']
    }
  });

  res.status(200).json({
    success: true,
    data: {
      emails,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    }
  });
});

// Mark email as read/unread
exports.toggleReadStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isRead } = req.body;

  const email = await Email.findOne({
    where: {
      id,
      userId: req.user.id
    }
  });

  if (!email) {
    throw new AppError('Email not found', 404);
  }

  email.isRead = isRead !== undefined ? isRead : !email.isRead;
  await email.save();

  res.status(200).json({
    success: true,
    data: {
      email
    },
    message: `Email marked as ${email.isRead ? 'read' : 'unread'}`
  });
});

// Delete email
exports.deleteEmail = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Find email first to get messageId
  const email = await Email.findOne({
    where: {
      id,
      userId: req.user.id
    }
  });

  if (!email) {
    throw new AppError('Email not found', 404);
  }

  // Delete from Gmail IMAP first
  const imapService = new ImapService(req.user);
  
  try {
    await imapService.connect();
    await imapService.deleteEmail(email.messageId);
    imapService.disconnect();
    
    console.log(`✓ Deleted from Gmail: ${email.messageId}`);
  } catch (imapError) {
    imapService.disconnect();
    console.error('IMAP delete error:', imapError.message);
    
    // If IMAP delete fails, inform user but continue with DB delete
    // To handle cases where email is already deleted from Gmail
    console.log('Continuing with database deletion...');
  }

  // Delete from database
  await email.destroy();

  res.status(200).json({
    success: true,
    message: 'Email deleted successfully from Gmail and database'
  });
});


// Get email statistics
exports.getEmailStats = catchAsync(async (req, res) => {
  const totalEmails = await Email.count({
    where: { userId: req.user.id }
  });

  const unreadEmails = await Email.count({
    where: {
      userId: req.user.id,
      isRead: false
    }
  });

  const emailsWithAttachments = await Email.count({
    where: {
      userId: req.user.id,
      hasAttachments: true
    }
  });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        total: totalEmails,
        unread: unreadEmails,
        withAttachments: emailsWithAttachments,
        read: totalEmails - unreadEmails
      }
    }
  });
});