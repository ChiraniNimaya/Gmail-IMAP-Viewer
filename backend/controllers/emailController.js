const ImapService = require('../services/imapService');
const Email = require('../models/email');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { Op, Sequelize } = require('sequelize');

const parseNumber = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

const SORT_WHITELIST = ['receivedDate', 'subject', 'fromAddress', 'isRead'];
const ORDER_WHITELIST = ['ASC', 'DESC'];

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
        await email.update(emailData);
      }

      savedEmails.push(email);
    }

    req.user.lastSync = new Date();
    await req.user.save();

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
    throw new AppError(`Failed to sync emails: ${error.message}`, 500);
  } finally {
    imapService.disconnect?.();
  }
});

exports.getEmails = catchAsync(async (req, res) => {
  const page = parseNumber(req.query.page, 1);
  const limit = parseNumber(req.query.limit, 20);
  const offset = (page - 1) * limit;

  const sortBy = SORT_WHITELIST.includes(req.query.sortBy)
    ? req.query.sortBy
    : 'receivedDate';

  const order = ORDER_WHITELIST.includes(
    (req.query.order || '').toUpperCase()
  )
    ? req.query.order.toUpperCase()
    : 'DESC';

  const where = { userId: req.user.id };
  if (req.query.unreadOnly === 'true') {
    where.isRead = false;
  }

  const { count, rows: emails } = await Email.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortBy, order]],
    attributes: { exclude: ['bodyHtml', 'bodyText'] }
  });

  res.status(200).json({
    success: true,
    data: {
      emails,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    }
  });
});

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


exports.searchEmails = catchAsync(async (req, res) => {
  const {
    query,
    page = 1,
    limit = 20
  } = req.query;

  if (!query) {
    throw new AppError('Search query is required', 400);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { Sequelize } = require('sequelize');

  const { count, rows: emails } = await Email.findAndCountAll({
    where: {
      userId: req.user.id,
      [Sequelize.Op.and]: Sequelize.literal(
        `MATCH(subject, body_preview) AGAINST('${query}' IN NATURAL LANGUAGE MODE)`
      )
    },
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


exports.deleteEmail = catchAsync(async (req, res) => {
  const email = await Email.findOne({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!email) {
    throw new AppError('Email not found', 404);
  }

  const imapService = new ImapService(req.user);
  let deletedFromGmail = false;

  try {
    await imapService.connect();
    await imapService.deleteEmail(email.messageId);
    deletedFromGmail = true;
  } catch (err) {
    console.warn('IMAP delete failed:', err.message);
  } finally {
    imapService.disconnect?.();
  }

  await email.destroy();

  res.status(200).json({
    success: true,
    data: { deletedFromGmail },
    message: deletedFromGmail
      ? 'Email deleted from Gmail and database'
      : 'Email deleted from database (already removed from Gmail)'
  });
});