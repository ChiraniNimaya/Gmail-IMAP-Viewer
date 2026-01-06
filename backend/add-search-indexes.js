/**
 * Add FULLTEXT index for fast email search
 * Run: node add-search-indexes.js
 */

const { sequelize } = require('./config/database');
require('dotenv').config();

async function addSearchIndexes() {
  console.log('Adding search indexes...\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');

    // Add FULLTEXT index on subject and body_preview for search
    console.log('Creating FULLTEXT index for search...');
    await sequelize.query(`
      ALTER TABLE emails 
      ADD FULLTEXT INDEX idx_email_search (subject, body_preview)
    `);
    
    console.log('✓ Search index created successfully!\n');
    console.log('Now searches in subject and body will be much faster.');

  } catch (error) {
    if (error.message.includes('Duplicate key name')) {
      console.log('⚠ Search index already exists. Skipping...');
    } else {
      console.error('✗ Error:', error.message);
    }
  } finally {
    await sequelize.close();
  }
}

addSearchIndexes();