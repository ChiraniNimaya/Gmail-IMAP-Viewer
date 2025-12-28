const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {
      emailsPerPage: 20,
      theme: 'light'
    }
  },
  lastSync: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['google_id']
    }
  ]
});

// Instance methods
User.prototype.updateTokens = async function(accessToken, refreshToken, expiresIn) {
  this.accessToken = accessToken;
  this.refreshToken = refreshToken;
  this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
  await this.save();
};

User.prototype.isTokenExpired = function() {
  if (!this.tokenExpiry) return true;
  return new Date() >= new Date(this.tokenExpiry);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.accessToken;
  delete values.refreshToken;
  return values;
};

module.exports = User;