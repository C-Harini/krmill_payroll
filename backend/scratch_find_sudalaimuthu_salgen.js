require('dotenv').config();
const { pool } = require('./config/db');

(async () => {
  try {
    const [salGens] = await pool.query(`
      SELECT sg.*, e.employeeCode, e.firstName
      FROM salary_generations sg
      JOIN employees e ON sg.employeeId = e.id
      WHERE e.employeeCode = '771' OR e.firstName LIKE '%SUDALAI%'
    `);
    console.log("=== salary_generations for SUDALAIMUTHU ===");
    console.log(salGens);

    // Let's check employee 17 (SUBBULAKSHMI.R) and 772 (PONNUTHAI K) from the user's screenshot
    const [otherEmps] = await pool.query(`
      SELECT sg.*, e.employeeCode, e.firstName, e.weeklyOff
      FROM salary_generations sg
      JOIN employees e ON sg.employeeId = e.id
      WHERE e.employeeCode IN ('17', '771', '772')
    `);
    console.log("=== salary_generations for 17, 771, 772 ===");
    console.log(otherEmps);

    // Let's check all attendances for 771 across all months
    const [attMonths] = await pool.query(`
      SELECT DATE_FORMAT(attendanceDate, '%Y-%m') as m, status, COUNT(*) as count
      FROM attendances
      WHERE employeeId = 16
      GROUP BY m, status
    `);
    console.log("=== Attendance Summary for 771 by month ===");
    console.log(attMonths);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
