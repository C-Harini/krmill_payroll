require('dotenv').config();
const { pool } = require('./config/db');
const INCENTIVE_CONFIG = require('./config/AttendenceIncentiveConfig');

(async () => {
  try {
    const [empRows] = await pool.query(`
      SELECT * FROM employees WHERE employeeCode = '3009'
    `);
    const emp = empRows[0];

    const [deptRows] = await pool.query(`SELECT * FROM departments WHERE id = ?`, [emp.departmentId]);
    const [desigRows] = await pool.query(`SELECT * FROM designations WHERE id = ?`, [emp.designationId]);
    const [catRows] = await pool.query(`SELECT * FROM category WHERE id = ?`, [emp.categoryId]);

    emp.departmentName = deptRows[0]?.departmentname || deptRows[0]?.name;
    emp.designationName = desigRows[0]?.designationName || desigRows[0]?.name;
    emp.categoryName = catRows[0]?.categoryName || catRows[0]?.name;

    const [attList] = await pool.query(`
      SELECT attendanceDate, shiftName, status
      FROM attendances
      WHERE employeeId = ? AND attendanceDate BETWEEN '2026-07-01' AND '2026-07-31'
      ORDER BY attendanceDate ASC
    `, [emp.id]);

    console.log("=== Employee 3009 Profile ===");
    console.log({
      id: emp.id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      designation: emp.designationName,
      category: emp.categoryName,
      weeklyOff: emp.weeklyOff,
      employeeType: emp.employeeType,
      workingType: emp.workingType,
      providentFundNumber: emp.providentFundNumber,
      basicSalaryInEmp: emp.basicSalary
    });

    console.log("\n=== Employee Salary Master ===");
    const [salMaster] = await pool.query(`
      SELECT * FROM employee_salary_masters WHERE employeeId = ?
    `, [emp.id]);
    console.log(salMaster[0]);

    console.log("\n=== Employee Salary Components ===");
    const [comps] = await pool.query(`
      SELECT * FROM employee_salary_components WHERE employeeSalaryMasterId = ?
    `, [salMaster[0].id]);
    console.log(comps.map(c => ({
      name: c.componentName,
      code: c.componentCode,
      type: c.componentType,
      fixedAmount: c.fixedAmount,
      calculatedAmount: c.calculatedAmount,
      annualAmount: c.annualAmount
    })));

    console.log("\n=== Attendances in July 2026 ===");
    let rawPresentDays = 0;
    let workedOnWeeklyOffDays = 0;
    const shiftCount = {};

    attList.forEach(a => {
      const d = new Date(a.attendanceDate);
      const dateStr = a.attendanceDate.toISOString().slice(0, 10);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = dayNames[d.getUTCDay()];
      const isWO = dayName.toLowerCase() === (emp.weeklyOff || '').toLowerCase();
      const isPresent = a.status === 'Present';
      if (isPresent) {
        rawPresentDays++;
        shiftCount[a.shiftName || 'I'] = (shiftCount[a.shiftName || 'I'] || 0) + 1;
        if (isWO) {
          workedOnWeeklyOffDays++;
        }
      }
      console.log(`${dateStr} (${dayName.padEnd(9)}): status=${a.status.padEnd(8)} | shift=${(a.shiftName || '-').padEnd(4)} | isWeeklyOff=${isWO}`);
    });

    console.log("\n--- Attendance Summary ---");
    console.log(`Total Present Days: ${rawPresentDays}`);
    console.log(`Worked on Weekly Off (${emp.weeklyOff}): ${workedOnWeeklyOffDays}`);
    console.log(`Present on regular working days: ${rawPresentDays - workedOnWeeklyOffDays}`);
    console.log(`Shift distribution:`, shiftCount);

    // Let's check what the Incentive Report page returns:
    // In AttendanceIncentiveController.js:
    // rawDays = 27 (or 26)
    // calculatedDays = rawDays - weekOffDays (27 - 4 = 23)
    // With adjustedDays = 23:
    // totalDays = 23
    // payableDays = 23
    // minDays for MAISTRY = 22
    // highTierDays = 24 (lowTierDays = 23)
    // Since totalDays = 23 (which is < 24): Tier is "low" tier!
    // Low tier rate for MAISTRY = 45 Rs/day!
    // Incentive = 23 days * 45 Rs/day = 1035.00 Rs!
    // (Or if 3009 was classified under OTHERS:
    //   If OTHERS grade and male override >=3 yrs: rate = 25 Rs/day -> 23 * 25 = 575 Rs!)
    // Let's check both!

    console.log("\n=== Generated Salary Record in salary_generations ===");
    const [salGen] = await pool.query(`
      SELECT * FROM salary_generations WHERE employeeId = ?
    `, [emp.id]);
    console.log(salGen[0]);

    console.log("\n=== Generated Salary Details in salary_generation_details ===");
    const [salDetails] = await pool.query(`
      SELECT * FROM salary_generation_details WHERE salaryGenerationId = ?
    `, [salGen[0]?.id]);
    console.log(salDetails.map(d => ({
      componentName: d.componentName,
      type: d.componentType,
      calcType: d.calculationType,
      baseAmount: d.baseAmount,
      calculatedAmount: d.calculatedAmount,
      formula: d.formula
    })));

    console.log("\n=== Active Attendance Incentive Conditions ===");
    const [conds] = await pool.query(`
      SELECT * FROM attendance_incentive_conditions WHERE status = 'Active'
    `);
    console.log(conds);

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
})();
