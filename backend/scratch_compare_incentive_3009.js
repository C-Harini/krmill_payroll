require('dotenv').config();
const { pool } = require('./config/db');
const attendanceIncentiveController = require('./controllers/AttendanceIncentiveController');
const salaryGenerationController = require('./controllers/salaryGenerationController');

(async () => {
  try {
    // Let's check employee 3009's attendances and shifts for July 2026
    const [empRows] = await pool.query(`
      SELECT e.*, d.name as departmentName, des.name as designationName, c.name as categoryName
      FROM employees e
      LEFT JOIN departments d ON e.departmentId = d.id
      LEFT JOIN designations des ON e.designationId = des.id
      LEFT JOIN category c ON e.categoryId = c.id
      WHERE e.employeeCode = '3009'
    `);
    const emp = empRows[0];
    console.log("Employee Info:", {
      id: emp.id,
      code: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.departmentName,
      designation: emp.designationName,
      category: emp.categoryName,
      gender: emp.gender,
      doj: emp.dateOfJoining
    });

    const [shifts] = await pool.query(`
      SELECT shiftName, status, COUNT(*) as count
      FROM attendances
      WHERE employeeId = ? AND attendanceDate BETWEEN '2026-07-01' AND '2026-07-31'
      GROUP BY shiftName, status
    `, [emp.id]);
    console.log("Shifts worked in July 2026:", shifts);

    const [allAtt] = await pool.query(`
      SELECT attendanceDate, shiftName, status, firstCheckIn, lastCheckOut
      FROM attendances
      WHERE employeeId = ? AND attendanceDate BETWEEN '2026-07-01' AND '2026-07-31'
      ORDER BY attendanceDate ASC
    `, [emp.id]);
    console.log("All Attendance records count:", allAtt.length);
    console.log("Shift names list:", allAtt.map(a => `${a.attendanceDate.toISOString().slice(0,10)}: ${a.shiftName} (${a.status})`));

    // Let's test the mock request to getMonthlyIncentiveReport
    const req = {
      query: {
        month: 7,
        year: 2026,
        companyId: 1
      }
    };
    let incentiveReportResult = null;
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { incentiveReportResult = data; return this; }
    };

    if (attendanceIncentiveController.getMonthlyIncentiveReport) {
      await attendanceIncentiveController.getMonthlyIncentiveReport(req, res);
      if (incentiveReportResult && incentiveReportResult.data) {
        const empIncentive = incentiveReportResult.data.find(d => d.employeeCode === '3009' || d.employeeId === emp.id);
        console.log("\n=== Incentive Report Result for 3009 ===");
        console.log(empIncentive);
      } else {
        console.log("Incentive Report Result:", incentiveReportResult?.success, incentiveReportResult?.message);
      }
    }

    // Let's check salary_generations for 3009
    const [salGen] = await pool.query(`
      SELECT * FROM salary_generations WHERE employeeId = ? AND salaryMonth = 7 AND salaryYear = 2026
    `, [emp.id]);
    console.log("\n=== Final Salary Record for 3009 ===");
    console.log(salGen[0]);

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
})();
