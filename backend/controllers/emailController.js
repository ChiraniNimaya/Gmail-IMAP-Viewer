const ImapService = require('../services/imapService');
const Email = require('../models/Email');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { Op, Sequelize } = require('sequelize');

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const parseNumber = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

const SORT_WHITELIST = ['receivedDate', 'subject', 'fromAddress', 'isRead'];
const ORDER_WHITELIST = ['ASC', 'DESC'];

/* -------------------------------------------------------------------------- */
/* Sync Emails                                                                */
/* -------------------------------------------------------------------------- */
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
    for (const emailData of emails) { //TODO: Improve performance with bulkCreate or batching with transactions
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

/* -------------------------------------------------------------------------- */
/* Get Emails                                                                 */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Get Email By ID                                                            */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Search Emails                                                              */
/* -------------------------------------------------------------------------- */
exports.searchEmails = catchAsync(async (req, res) => {
  const { query, searchIn = 'all' } = req.query;

  if (!query) {
    throw new AppError('Search query is required', 400);
  }

  const page = parseNumber(req.query.page, 1);
  const limit = parseNumber(req.query.limit, 20);
  const offset = (page - 1) * limit;
  const term = `%${query}%`;

  const where = { userId: req.user.id };

  // Build search conditions based on searchIn parameter
  switch (searchIn) {
    case 'subject':
      where.subject = { [Op.like]: term };
      break;
    case 'from':
      where[Op.or] = [
        { fromAddress: { [Op.like]: term } },
        { fromName: { [Op.like]: term } }
      ];
      break;
    case 'body':
      where[Op.or] = [
        { bodyText: { [Op.like]: term } },
        { bodyPreview: { [Op.like]: term } }
      ];
      break;
    default:
      where[Op.or] = [
        { subject: { [Op.like]: term } },
        { fromAddress: { [Op.like]: term } },
        { fromName: { [Op.like]: term } },
        { bodyPreview: { [Op.like]: term } },
        { toAddress: { [Op.like]: term } }
      ];
  }

  const { count, rows: emails } = await Email.findAndCountAll({
    where,
    limit,
    offset,
    order: [['receivedDate', 'DESC']],
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


/* -------------------------------------------------------------------------- */
/* Toggle Read Status                                                         */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Delete Email                                                               */
/* -------------------------------------------------------------------------- */
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