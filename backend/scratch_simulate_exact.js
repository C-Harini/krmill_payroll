require('dotenv').config();
const { pool } = require('./config/db');
const moment = require('moment');
const INCENTIVE_CONFIG = require('./config/AttendenceIncentiveConfig');

(async () => {
  try {
    const month = 7;
    const year = 2026;
    const companyId = 1;
    const startDate = `${year}-07-01`;
    const endDate = `${year}-07-31`;
    const lastDay = 31;

    // 1. Employee Info
    const [empRows] = await pool.query(`
      SELECT e.*, 
             c.categoryName,
             d.departmentName,
             des.name as designationName
      FROM employees e
      LEFT JOIN category c ON e.categoryId = c.id
      LEFT JOIN departments d ON e.departmentId = d.id
      LEFT JOIN designations des ON e.designationId = des.id
      WHERE e.employeeCode = '3009'
    `);
    const emp = empRows[0];

    // 2. Attendance Records
    const [attendances] = await pool.query(`
      SELECT * FROM attendances 
      WHERE employeeId = ? AND attendanceDate BETWEEN ? AND ?
      ORDER BY attendanceDate ASC
    `, [emp.id, startDate, endDate]);

    // 3. Shift Types
    const [allShiftTypes] = await pool.query(`SELECT * FROM shift_types WHERE companyId = ?`, [companyId]);
    const shiftTypeMap = {};
    for (const st of allShiftTypes) shiftTypeMap[st.id] = st.name;

    // 4. Daily Manual Incentive Records
    const [dailyRecords] = await pool.query(`
      SELECT * FROM attendance_incentives 
      WHERE employeeId = ? AND entryDate BETWEEN ? AND ? AND month IS NULL
    `, [emp.id, startDate, endDate]);

    // 5. Monthly Saved Record
    const [savedRecords] = await pool.query(`
      SELECT * FROM attendance_incentives 
      WHERE employeeId = ? AND month = ? AND year = ?
    `, [emp.id, month, year]);

    // 6. DB Conditions
    const [activeDbConditions] = await pool.query(`
      SELECT * FROM attendance_incentive_conditions WHERE status = 'Active'
    `);

    // Let's simulate AttendanceIncentiveController.getAttendanceIncentives logic:
    const empManualMap = {};
    for (const dr of dailyRecords) {
      const dateStr = moment(dr.entryDate).format("YYYY-MM-DD");
      empManualMap[dateStr] = dr;
    }

    const empAttendanceMap = {};
    for (const att of attendances) {
      const dateStr = moment(att.attendanceDate).format("YYYY-MM-DD");
      empAttendanceMap[dateStr] = att;
    }

    let rawDays = 0;
    let weekOffDays = 0;
    let slabDays = 0;
    let otDays = 0;
    let slotDays = 0;
    const shiftMap = {};

    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const manual = empManualMap[dateStr];
      const att = empAttendanceMap[dateStr];

      const isWeekOffDay = emp.weeklyOff &&
        emp.weeklyOff !== "-" &&
        emp.weeklyOff !== "NO WEEKLY" &&
        moment(dateStr).format("dddd").toLowerCase() === emp.weeklyOff.toLowerCase();

      if (manual) {
        const daysWorked = parseFloat(manual.days) || 0;
        rawDays += daysWorked;
        slabDays += parseFloat(manual.slabDays) || 0;
        otDays += parseFloat(manual.otDays) || 0;
        slotDays += parseFloat(manual.slot) || 0;

        if (daysWorked > 0) {
          const shiftName = shiftTypeMap[manual.shiftTypeId] || "I";
          shiftMap[shiftName] = (shiftMap[shiftName] || 0) + daysWorked;
          if (isWeekOffDay) {
            weekOffDays += 1;
          }
        }
      } else if (att) {
        let daysWorked = 0;
        if (att.status === "Present" || att.status === "Present with Permission") {
          daysWorked = 1;
        } else if (att.status === "Half Day") {
          daysWorked = 0.5;
        }

        if (daysWorked > 0) {
          rawDays += daysWorked;
          const shiftName = att.shiftName || shiftTypeMap[att.shiftId] || "I";
          shiftMap[shiftName] = (shiftMap[shiftName] || 0) + daysWorked;
          if (isWeekOffDay) {
            weekOffDays += 1;
          }
        }
      }
    }

    const calculatedDays = rawDays - weekOffDays + slabDays + otDays + slotDays;
    const saved = savedRecords[0];
    const adjustedDays = saved ? saved.adjustedDays : calculatedDays;

    console.log("=== INCENTIVE REPORT CALCULATION METRICS ===");
    console.log({
      rawDays,
      weekOffDays,
      slabDays,
      otDays,
      slotDays,
      calculatedDays,
      savedRecord: saved ? { adjustedDays: saved.adjustedDays, incentive: saved.incentive } : null,
      shiftMap
    });

    // Let's resolve gradeKey and conditions
    const designationName = emp.designationName || "";
    const categoryName = emp.categoryName || "";
    
    // Grade Key
    let gradeKey = "OTHERS";
    const dUpper = designationName.toUpperCase();
    const cUpper = categoryName.toUpperCase();
    if (dUpper.includes("MAISTRY")) gradeKey = "MAISTRY";
    else if (dUpper.includes("FITTER")) gradeKey = "FITTER";
    else if (dUpper.includes("ELECTRIC") || dUpper.includes("WIREMAN")) gradeKey = "ELECTRICAL";
    else if (dUpper.includes("PLANT")) gradeKey = "PLANT";
    else if (cUpper === "MIXING") gradeKey = "MIXING";
    else if (cUpper.includes("OTHERS")) gradeKey = "OTHERS";

    console.log("Resolved GradeKey:", gradeKey);

    // Shift Key
    const shiftI = (shiftMap["I"] || 0) + (shiftMap["A"] || 0) + (shiftMap["Staff"] || 0) + (shiftMap["SUP_A"] || 0);
    const shiftII = (shiftMap["II"] || 0) + (shiftMap["B"] || 0) + (shiftMap["SUP_B"] || 0);
    const shiftIII = (shiftMap["III"] || 0) + (shiftMap["C"] || 0) + (shiftMap["SUP_C"] || 0);

    console.log("Shift Counts:", { shiftI, shiftII, shiftIII });

    // Matching condition in DB
    const cond = activeDbConditions.find(c => c.gradeKey === gradeKey);
    console.log("Matching Condition from DB:", cond);

    // Calculate with calculatedDays (Incentive report):
    let tierReport = adjustedDays >= (cond ? cond.highTierDays : 24) ? "high" : "low";
    let rateReport = tierReport === "high" ? (cond ? parseFloat(cond.highTierRate) : 50) : (cond ? parseFloat(cond.lowTierRate) : 45);
    let isEligibleReport = adjustedDays >= (cond ? cond.minDays : 22);
    let incentiveReportValue = isEligibleReport ? Math.round(adjustedDays * rateReport * 100) / 100 : 0;

    console.log("\n=======================================================");
    console.log("1. IN INCENTIVE REPORT (AttendanceIncentiveManagement):");
    console.log(`- Total Present Days: ${rawDays}`);
    console.log(`- Weekly-Off Days Worked (Tuesdays): ${weekOffDays}`);
    console.log(`- Adjusted / Working Days for Incentive: ${rawDays} - ${weekOffDays} = ${adjustedDays} days`);
    console.log(`- Grade: ${gradeKey} (${designationName})`);
    console.log(`- Tier: ${tierReport} (Threshold: 24+ days for High, 23 days for Low)`);
    console.log(`- Rate applied: ₹${rateReport} / day (${tierReport} tier)`);
    console.log(`- Incentive in Report: ${adjustedDays} days × ₹${rateReport} = ₹${incentiveReportValue}`);
    console.log("=======================================================");

    // In Final Salary Generation:
    const [salGen] = await pool.query("SELECT * FROM salary_generations WHERE employeeId = ?", [emp.id]);
    console.log("\n=======================================================");
    console.log("2. IN FINAL SALARY REPORT (salary_generations):");
    console.log(`- Present Days counted for salary: ${salGen[0]?.presentDays}`);
    console.log(`- Incentive in Salary Generation: ₹${salGen[0]?.attnIncentive}`);
    console.log(`- Basic Wage Rate in Salary Master: ₹${emp.basicSalary} (Master basic: 385, gross: 875)`);
    console.log(`- Gross Salary / Day in Salary Master: ₹875.00`);
    console.log(`  (Breakdown: Basic ₹385 + Special Allowance ₹336 + HRA ₹154 = ₹875/day)`);
    console.log(`- In Salary Generation details: Basic Pay ₹525/day (60% of 875) + Spl Allowance ₹350/day (40% of 875) = ₹875/day`);
    console.log("=======================================================");

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
