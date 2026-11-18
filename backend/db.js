// MySQL connection pool, shared by every route.
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fitlean',
  connectionLimit: 20,
  // Return DATE/DATETIME columns as plain strings ("2026-11-20 10:00:00").
  // All times are gym-local, so we never want JavaScript to shift time zones.
  dateStrings: true,
});

module.exports = pool;
