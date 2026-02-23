#!/usr/bin/env node

/**
 * Runtime Database Connection Test
 *
 * This script verifies that the SQLite database connection works at runtime,
 * not just at compile time. Added after the better-sqlite3 migration failure
 * to prevent similar issues in the future.
 */

const { sequelize } = require('./dist');

console.log('Testing database connection...');

sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection: OK');
    console.log(`   Driver: sqlite3`);
    console.log(`   Location: ${sequelize.options.storage}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection: FAILED');
    console.error(`   Error: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
    process.exit(1);
  });
