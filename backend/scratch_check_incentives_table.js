require('dotenv').config();
const { pool } = require('./config/db');

(async () => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM attendance_incentives");
    console.log("attendance_incentives count:", rows[0].count);

    const [monthlyRows] = await pool.query("SELECT COUNT(*) as count FROM attendance_incentives WHERE month IS NOT NULL");
    console.log("attendance_incentives monthly saved count:", monthlyRows[0].count);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
