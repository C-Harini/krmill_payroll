require('dotenv').config();
const { sequelize, Attendance, Employee, Department, EmployeeShift } = require('./models');
const xlsx = require('xlsx');
const path = require('path');

const TARGET_COMPANY_ID = 1;
const EXCEL_FILE_PATH = path.join(__dirname, '..', 'IN OUT AUG 2026.xls');

/**
 * Parses time string like "7:43:35 AM", "5:16:04 PM", "12:42:36 AM", "17:16:04", "07:43" into HH:MM:SS
 */
function parseTimeToTimeString(timeVal) {
  if (!timeVal) return null;
  const str = String(timeVal).trim();
  if (!str) return null;

  // 12-hour AM/PM format
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let [_, h, m, s, period] = match12;
    let hours = parseInt(h, 10);
    const minutes = m;
    const seconds = s || '00';
    period = period.toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  }

  // 24-hour format
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const [_, h, m, s] = match24;
    return `${String(h).padStart(2, '0')}:${m}:${s || '00'}`;
  }

  return null;
}

/**
 * Converts "HH:MM" (e.g. "09:33") into decimal hours (e.g. 9.55)
 */
function parseHoursToDecimal(hoursStr) {
  if (!hoursStr) return 0;
  const str = String(hoursStr).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return parseFloat((h + m / 60).toFixed(2));
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Adds N days to YYYY-MM-DD string
 */
function addDaysToDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function cleanStr(s) {
  return String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function runImport() {
  console.log('======================================================');
  console.log('  STARTING AUGUST 2026 ATTENDANCE IMPORT FROM EXCEL');
  console.log('======================================================\n');
  console.log(`Excel file: ${EXCEL_FILE_PATH}`);
  console.log(`Target Company ID: ${TARGET_COMPANY_ID}`);

  // 1. Load active employees from DB
  const dbEmployees = await Employee.findAll({
    where: { companyId: TARGET_COMPANY_ID, status: 'Active' },
    attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'departmentId', 'shiftTypeId', 'biometricEnrollmentId', 'companyId']
  });

  const empByCode = new Map();
  const empByCodeInt = new Map();
  const empByBio = new Map();
  const empByName = new Map();
  const empByFirstName = new Map();

  dbEmployees.forEach(emp => {
    const code = String(emp.employeeCode).trim();
    empByCode.set(code, emp);
    empByCodeInt.set(String(parseInt(code, 10)), emp);

    if (emp.biometricEnrollmentId) {
      empByBio.set(String(emp.biometricEnrollmentId).trim(), emp);
    }

    const fullName = cleanStr(`${emp.firstName} ${emp.lastName}`);
    const fName = cleanStr(emp.firstName);
    if (fullName) empByName.set(fullName, emp);
    if (fName) empByFirstName.set(fName, emp);
  });

  console.log(`Loaded ${dbEmployees.length} active employees from DB for Company ${TARGET_COMPANY_ID}`);

  // 2. Read Excel file
  const wb = xlsx.readFile(EXCEL_FILE_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

  console.log(`Total rows in Excel sheet: ${rawRows.length}`);

  let currentDate = null;
  let currentShift = 'A';
  const presentAttendanceMap = new Map(); // key: `${employeeId}_${date}` -> attendance record
  const skippedEmployees = new Map();
  let totalExcelDataRows = 0;
  let matchedCount = 0;

  const allProcessedDates = new Set();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();

    // Check date header: e.g. "01/08/2026"
    const dateMatch = col0.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dateMatch && row.length <= 2) {
      const [_, d, m, y] = dateMatch;
      currentDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      allProcessedDates.add(currentDate);
      currentShift = 'A';
      continue;
    }

    // Check shift header: e.g. "A", "B", "C", "GENERAL"
    if (row.length <= 3 && isNaN(col0) && !col0.includes('/') && !col0.includes('-') && (row[1] === undefined || row[1] === null || String(row[1]).trim() === '')) {
      const shiftUpper = col0.toUpperCase();
      if (['A', 'B', 'C', 'G', 'GENERAL'].includes(shiftUpper)) {
        currentShift = shiftUpper === 'GENERAL' ? 'G' : shiftUpper;
      }
      continue;
    }

    // Check data row
    if (row.length >= 5 && col0.toLowerCase() !== 'sl.no' && col0.toLowerCase() !== 'sl. no' && col0.toLowerCase() !== 'sl no') {
      const tktNo = String(row[1] || '').trim();
      const empName = String(row[2] || '').trim();
      const deptCode = String(row[3] || '').trim();
      const statusRaw = String(row[4] || '').trim().toUpperCase();
      const inTimeRaw = String(row[5] || '').trim();
      const outTimeRaw = String(row[6] || '').trim();
      const hoursRaw = String(row[7] || '').trim();

      if (!tktNo || !currentDate) continue;
      totalExcelDataRows++;

      // Match employee: Code -> Int Code -> Bio ID -> Full Name -> First Name
      let matchedEmp = empByCode.get(tktNo);
      if (!matchedEmp) matchedEmp = empByCodeInt.get(String(parseInt(tktNo, 10)));
      if (!matchedEmp) matchedEmp = empByBio.get(tktNo);
      if (!matchedEmp) matchedEmp = empByName.get(cleanStr(empName));
      if (!matchedEmp) matchedEmp = empByFirstName.get(cleanStr(empName));

      if (!matchedEmp) {
        const key = `${tktNo} - ${empName}`;
        skippedEmployees.set(key, (skippedEmployees.get(key) || 0) + 1);
        continue;
      }

      matchedCount++;

      // Parse IN & OUT times
      const inTimeStr = parseTimeToTimeString(inTimeRaw);
      const outTimeStr = parseTimeToTimeString(outTimeRaw);

      let firstCheckIn = null;
      let lastCheckOut = null;

      if (inTimeStr) {
        firstCheckIn = new Date(`${currentDate}T${inTimeStr}`);
      }

      if (outTimeStr) {
        let outDate = currentDate;
        if (inTimeStr && outTimeStr < inTimeStr) {
          outDate = addDaysToDate(currentDate, 1);
        } else if (currentShift === 'B' && outTimeStr < '06:00:00') {
          outDate = addDaysToDate(currentDate, 1);
        } else if (currentShift === 'C' && inTimeStr >= '18:00:00' && outTimeStr < '14:00:00') {
          outDate = addDaysToDate(currentDate, 1);
        }
        lastCheckOut = new Date(`${outDate}T${outTimeStr}`);
      }

      // Calculate working hours & OT
      const workingHours = parseHoursToDecimal(hoursRaw);
      const overtimeHours = workingHours > 8 ? parseFloat((workingHours - 8).toFixed(2)) : 0.00;

      // Status mapping
      let status = 'Present';
      if (statusRaw === 'WP') {
        status = 'Present with Permission';
      } else if (statusRaw === 'P' || statusRaw === 'P/L' || statusRaw === 'NHP') {
        status = 'Present';
      } else if (statusRaw === 'A' || statusRaw === 'P/A') {
        status = 'Absent';
      }

      // Shift timings
      let shiftTypeId = 1;
      let scheduledStartTime = '08:00:00';
      let scheduledEndTime = '16:30:00';

      if (currentShift === 'B') {
        shiftTypeId = 2;
        scheduledStartTime = '16:30:00';
        scheduledEndTime = '01:00:00';
      } else if (currentShift === 'C') {
        shiftTypeId = 3;
        scheduledStartTime = '01:00:00';
        scheduledEndTime = '08:00:00';
      }

      const key = `${matchedEmp.id}_${currentDate}`;
      presentAttendanceMap.set(key, {
        employeeId: matchedEmp.id,
        companyId: TARGET_COMPANY_ID,
        departmentId: matchedEmp.departmentId || null,
        workedDeptId: matchedEmp.departmentId || null,
        shiftTypeId,
        shiftName: currentShift,
        scheduledStartTime,
        scheduledEndTime,
        attendanceDate: currentDate,
        firstCheckIn,
        lastCheckOut,
        totalCheckIns: firstCheckIn ? 1 : 0,
        totalCheckOuts: lastCheckOut ? 1 : 0,
        workingHours,
        overtimeHours,
        status,
        isFinalized: 1,
        autoGenerated: 0,
        remarks: `Imported from AUGUST 2026 IN OUT (Tkt: ${tktNo}, Dept: ${deptCode})`
      });
    }
  }

  console.log(`\n--- EXCEL PARSING SUMMARY ---`);
  console.log(`Total Excel Data Rows: ${totalExcelDataRows}`);
  console.log(`Matched with Database: ${matchedCount} (${presentAttendanceMap.size} unique employee-date present records)`);
  console.log(`Skipped (Unmatched): ${totalExcelDataRows - matchedCount} records across ${skippedEmployees.size} unique employee names`);
  console.log(`Distinct Dates in August (${allProcessedDates.size}):`, Array.from(allProcessedDates).sort());

  // 3. Generate Complete Attendance List (Present + Absent for all active employees for all 31 days)
  const finalAttendanceRecords = [];
  const sortedDates = Array.from(allProcessedDates).sort();

  for (const dateStr of sortedDates) {
    for (const emp of dbEmployees) {
      const key = `${emp.id}_${dateStr}`;
      const presentRec = presentAttendanceMap.get(key);

      if (presentRec) {
        finalAttendanceRecords.push(presentRec);
      } else {
        // Absent Record
        finalAttendanceRecords.push({
          employeeId: emp.id,
          companyId: TARGET_COMPANY_ID,
          departmentId: emp.departmentId || null,
          workedDeptId: null,
          shiftTypeId: null,
          shiftName: 'Unknown',
          scheduledStartTime: null,
          scheduledEndTime: null,
          attendanceDate: dateStr,
          firstCheckIn: null,
          lastCheckOut: null,
          totalCheckIns: 0,
          totalCheckOuts: 0,
          workingHours: '0.00',
          overtimeHours: '0.00',
          status: 'Absent',
          isFinalized: 1,
          autoGenerated: 1,
          remarks: 'No IN punch found'
        });
      }
    }
  }

  console.log(`\nTotal Attendance Records to push into DB: ${finalAttendanceRecords.length}`);
  const presentCount = finalAttendanceRecords.filter(r => r.status === 'Present').length;
  const permissionCount = finalAttendanceRecords.filter(r => r.status === 'Present with Permission').length;
  const absentCount = finalAttendanceRecords.filter(r => r.status === 'Absent').length;

  console.log(`  - Present: ${presentCount}`);
  console.log(`  - Present with Permission: ${permissionCount}`);
  console.log(`  - Absent: ${absentCount}`);

  // 4. Clean up any existing August attendance first & push in batches
  console.log(`\nExecuting DB Transaction to clean and insert fresh August attendance...`);
  const transaction = await sequelize.transaction();

  try {
    await sequelize.query(
      `DELETE FROM attendances WHERE companyId = ${TARGET_COMPANY_ID} AND MONTH(attendanceDate) = 8 AND YEAR(attendanceDate) = 2026`,
      { transaction }
    );

    const BATCH_SIZE = 1000;
    for (let i = 0; i < finalAttendanceRecords.length; i += BATCH_SIZE) {
      const batch = finalAttendanceRecords.slice(i, i + BATCH_SIZE);
      await Attendance.bulkCreate(batch, { transaction });
      process.stdout.write(`Inserted ${Math.min(i + BATCH_SIZE, finalAttendanceRecords.length)}/${finalAttendanceRecords.length} records...\r`);
    }

    // 5. Aggregate Employee Shifts for August 2026
    console.log(`\n\nAggregating August 2026 Shift Summaries into employee_shifts table...`);
    await sequelize.query(
      `DELETE FROM employee_shifts WHERE companyId = ${TARGET_COMPANY_ID} AND month = 8 AND year = 2026`,
      { transaction }
    );

    const insertShiftSummarySql = `
      INSERT INTO employee_shifts (
        employeeId, companyId, shiftName, month, year,
        totalDays, presentDays, presentWithPermissionDays, absentDays, leaveDays,
        lateDays, earlyExitDays, totalWorkingHours, totalOvertimeHours,
        totalPermissionMinutes, firstSeenDate, lastSeenDate, createdAt, updatedAt
      )
      SELECT 
        employeeId,
        companyId,
        shiftName,
        8 AS month,
        2026 AS year,
        COUNT(*) AS totalDays,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS presentDays,
        SUM(CASE WHEN status = 'Present with Permission' THEN 1 ELSE 0 END) AS presentWithPermissionDays,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absentDays,
        SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) AS leaveDays,
        SUM(CASE WHEN isLate = 1 THEN 1 ELSE 0 END) AS lateDays,
        SUM(CASE WHEN isEarlyExit = 1 THEN 1 ELSE 0 END) AS earlyExitDays,
        COALESCE(SUM(workingHours), 0) AS totalWorkingHours,
        COALESCE(SUM(overtimeHours), 0) AS totalOvertimeHours,
        COALESCE(SUM(permissionMinutes), 0) AS totalPermissionMinutes,
        MIN(attendanceDate) AS firstSeenDate,
        MAX(attendanceDate) AS lastSeenDate,
        NOW() AS createdAt,
        NOW() AS updatedAt
      FROM attendances
      WHERE companyId = ${TARGET_COMPANY_ID}
        AND attendanceDate BETWEEN '2026-08-01' AND '2026-08-31'
        AND autoGenerated = false
        AND shiftName IS NOT NULL
        AND shiftName != ''
      GROUP BY employeeId, companyId, shiftName;
    `;

    await sequelize.query(insertShiftSummarySql, { transaction });

    await transaction.commit();
    console.log('✅ Transaction committed successfully!');

    // 6. Verify final DB state
    const [[attCount]] = await sequelize.query(`SELECT COUNT(*) as total FROM attendances WHERE MONTH(attendanceDate) = 8 AND YEAR(attendanceDate) = 2026`);
    const [[shiftSummaryCount]] = await sequelize.query(`SELECT COUNT(*) as total FROM employee_shifts WHERE month = 8 AND year = 2026`);

    console.log('\n======================================================');
    console.log('  AUGUST 2026 ATTENDANCE IMPORT COMPLETED!');
    console.log('======================================================');
    console.log(`Total August 2026 Attendance records in DB: ${attCount.total}`);
    console.log(`Total August 2026 Employee Shift summaries in DB: ${shiftSummaryCount.total}`);

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error during import, transaction rolled back:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runImport();
