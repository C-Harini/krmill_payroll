require('dotenv').config();
const { pool } = require('./config/db');
const moment = require('moment');

(async () => {
  try {
    // 1. Employee Info
    const [empRows] = await pool.query(`
      SELECT * FROM employees WHERE employeeCode = '771' OR firstName LIKE '%SUDALAIMUTHU%'
    `);
    console.log("=== Employee Info ===");
    console.log(empRows);

    if (empRows.length === 0) {
      console.log("Employee not found!");
      return;
    }

    const emp = empRows[0];

    // 2. Day-by-Day Attendance for July 2026
    const [attRows] = await pool.query(`
      SELECT attendanceDate, status, shiftName, isWeekOff, isHoliday
      FROM attendances
      WHERE employeeId = ? AND attendanceDate BETWEEN '2026-07-01' AND '2026-07-31'
      ORDER BY attendanceDate ASC
    `, [emp.id]);

    console.log(`\n=== July 2026 Day-by-Day Attendance (${attRows.length} records) ===`);
    let presentCount = 0;
    let absentCount = 0;
    let weekOffCount = 0;
    let workedOnWeeklyOffCount = 0;
    let restedOnWeeklyOffCount = 0;

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    attRows.forEach(a => {
      const d = moment(a.attendanceDate);
      const dateStr = d.format("YYYY-MM-DD");
      const dayName = d.format("dddd");
      const isAssignedWO = emp.weeklyOff && dayName.toLowerCase() === emp.weeklyOff.toLowerCase();

      if (a.status === "Present" || a.status === "Present with Permission" || a.status === "Late Present") {
        presentCount++;
        if (isAssignedWO) workedOnWeeklyOffCount++;
      } else if (a.status === "Absent") {
        absentCount++;
      } else if (a.status === "Week Off") {
        weekOffCount++;
        if (isAssignedWO) restedOnWeeklyOffCount++;
      }

      console.log(`${dateStr} (${dayName.padEnd(9)}): status=${(a.status || 'N/A').padEnd(10)} | isAssignedWO=${isAssignedWO}`);
    });

    console.log("\n=== Attendance Analysis ===");
    console.log(`Employee Weekly Off setting: ${emp.weeklyOff}`);
    console.log(`Total Present Days: ${presentCount}`);
    console.log(`Total Absent Days in DB: ${absentCount}`);
    console.log(`Total 'Week Off' status in DB: ${weekOffCount}`);
    console.log(`Worked on Weekly-Off (${emp.weeklyOff}): ${workedOnWeeklyOffCount}`);
    console.log(`Rested on Weekly-Off (${emp.weeklyOff}): ${restedOnWeeklyOffCount}`);

    // 3. Salary Generation Row
    const [salGen] = await pool.query(`
      SELECT * FROM salary_generations WHERE employeeId = ? AND salaryMonth = 7 AND salaryYear = 2026
    `, [emp.id]);
    console.log("\n=== Salary Generation Record ===");
    console.log(salGen[0]);

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
