// backend/config/db.js
const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// A simple function to check the connection
const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to the database.');
    connection.release(); // Release the connection back to the pool
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
};

module.exports = { pool, checkConnection };