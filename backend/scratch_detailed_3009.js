require('dotenv').config();
const { pool } = require('./config/db');
const INCENTIVE_CONFIG = require('./config/AttendenceIncentiveConfig');
const { calculateIncentive } = require('./controllers/AttendanceIncentiveController');

(async () => {
  try {
    const [empRows] = await pool.query(`
      SELECT e.*, d.name as departmentName, des.name as designationName, c.name as categoryName
      FROM employees e
      LEFT JOIN departments d ON e.departmentId = d.id
      LEFT JOIN designations des ON e.designationId = des.id
      LEFT JOIN category c ON e.categoryId = c.id
      WHERE e.employeeCode = '3009'
    `);
    const emp = empRows[0];

    const [attList] = await pool.query(`
      SELECT attendanceDate, shiftName, status
      FROM attendances
      WHERE employeeId = ? AND attendanceDate BETWEEN '2026-07-01' AND '2026-07-31'
      ORDER BY attendanceDate ASC
    `, [emp.id]);

    console.log("=== Employee 3009 Info ===");
    console.log({
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      designation: emp.designationName,
      category: emp.categoryName,
      weeklyOff: emp.weeklyOff,
      employeeType: emp.employeeType,
      workingType: emp.workingType,
      providentFundNumber: emp.providentFundNumber
    });

    console.log("\n=== Salary Master ===");
    const [salMaster] = await pool.query(`
      SELECT * FROM employee_salary_masters WHERE employeeId = ?
    `, [emp.id]);
    console.log(salMaster[0]);

    console.log("\n=== Salary Components in Master ===");
    const [comps] = await pool.query(`
      SELECT * FROM employee_salary_components WHERE employeeSalaryMasterId = ?
    `, [salMaster[0].id]);
    console.log(comps);

    console.log("\n=== July 2026 Attendances Day-by-Day ===");
    let rawPresentDays = 0;
    let workedOnWeeklyOffDays = 0;
    const shiftMapAll = {};
    const shiftMapExclWO = {};

    attList.forEach(a => {
      const dateStr = a.attendanceDate.toISOString().slice(0, 10);
      const dayName = new Date(a.attendanceDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const isWO = dayName.toLowerCase() === (emp.weeklyOff || '').toLowerCase();
      const isPresent = a.status === 'Present';
      if (isPresent) {
        rawPresentDays++;
        shiftMapAll[a.shiftName || 'I'] = (shiftMapAll[a.shiftName || 'I'] || 0) + 1;
        if (isWO) {
          workedOnWeeklyOffDays++;
        } else {
          shiftMapExclWO[a.shiftName || 'I'] = (shiftMapExclWO[a.shiftName || 'I'] || 0) + 1;
        }
      }
      console.log(`${dateStr} (${dayName}): ${a.status} | shift: ${a.shiftName || '-'} | isWeeklyOff: ${isWO}`);
    });

    console.log("\nAttendance Summary:");
    console.log(`Total Present Days (rawDays): ${rawPresentDays}`);
    console.log(`Worked on Weekly Off (${emp.weeklyOff}) Days: ${workedOnWeeklyOffDays}`);
    console.log(`Shifts All:`, shiftMapAll);
    console.log(`Shifts Excluding Weekly Off:`, shiftMapExclWO);

    // Let's check saved attendance_incentives table for 3009
    const [savedIncentive] = await pool.query(`
      SELECT * FROM attendance_incentives WHERE employeeId = ?
    `, [emp.id]);
    console.log("\n=== Saved in attendance_incentives table ===");
    console.log(savedIncentive);

    // Let's calculate using Attendance Incentive Report logic (which subtracts weeklyOff):
    const calculatedDaysReport = rawPresentDays - workedOnWeeklyOffDays;
    console.log(`\nIncentive Report calculatedDays = ${rawPresentDays} - ${workedOnWeeklyOffDays} = ${calculatedDaysReport}`);

    const [dbConditions] = await pool.query(`SELECT * FROM attendance_incentive_conditions WHERE status = 'Active'`);

    const resultReport = calculateIncentive(
      emp,
      shiftMapAll,
      emp.categoryName,
      calculatedDaysReport, // adjustedDays
      null,
      0,
      rawPresentDays,
      dbConditions
    );
    console.log("\n=== Result from Attendance Incentive Report Formula ===");
    console.log(resultReport);

    // Let's calculate using Salary Generation logic (which doesn't subtract weeklyOff if calculating from rawDays):
    const resultSalGen = calculateIncentive(
      emp,
      shiftMapAll,
      emp.categoryName,
      null,
      null,
      0,
      rawPresentDays, // 27 (or 26)
      dbConditions
    );
    console.log("\n=== Result from Salary Generation Fallback Formula ===");
    console.log(resultSalGen);

    // Let's check what Salary Generation table currently has:
    const [salGen] = await pool.query(`
      SELECT * FROM salary_generations WHERE employeeId = ?
    `, [emp.id]);
    console.log("\n=== Generated Salary in salary_generations ===");
    console.log(salGen[0]);

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
})();
