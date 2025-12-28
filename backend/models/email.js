const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Email = sequelize.define('Email', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gmailId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  threadId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subject: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: '(No Subject)'
  },
  fromAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fromName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  toAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ccAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bccAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receivedDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  bodyPreview: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bodyHtml: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  bodyText: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  hasAttachments: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attachmentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isStarred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  labels: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'emails',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['message_id']
    },
    {
      fields: ['received_date']
    },
    {
      fields: ['from_address']
    },
    {
      fields: ['subject']
    },
    {
      unique: true,
      fields: ['user_id', 'message_id']
    }
  ]
});

// Define associations
User.hasMany(Email, { foreignKey: 'userId', as: 'emails' });
Email.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Email;