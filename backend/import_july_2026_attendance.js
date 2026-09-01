require('dotenv').config();
const { sequelize, Attendance, Employee, Department } = require('./models');
const xlsx = require('xlsx');
const path = require('path');

const TARGET_COMPANY_ID = 1;
const EXCEL_FILE_PATH = path.join(__dirname, '..', 'JULY 2026 IN OUT.xlsx');

/**
 * Parses time string like "7:43:35 AM", "5:16:04 PM", "12:42:36 AM" or raw decimal/date into HH:MM:SS
 */
function parseTimeToTimeString(timeVal) {
  if (!timeVal) return null;
  const str = String(timeVal).trim();
  if (!str) return null;

  // Check 12-hour AM/PM format (e.g. "7:43:35 AM", "5:16:04 PM")
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

  // Check 24-hour format (e.g. "17:16:04" or "07:43")
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

async function runImport() {
  console.log('--- Starting Attendance Import from July 2026 IN OUT.xlsx ---');
  console.log(`Target Company ID: ${TARGET_COMPANY_ID}`);

  // 1. Load employees from DB
  const dbEmployees = await Employee.findAll({
    where: { companyId: TARGET_COMPANY_ID },
    attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'departmentId', 'companyId']
  });

  const empByCode = new Map();
  const empByName = new Map();

  dbEmployees.forEach(emp => {
    const code = String(emp.employeeCode).trim();
    empByCode.set(code, emp);

    const fName = String(emp.firstName || '').trim().toUpperCase();
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toUpperCase();
    if (fName) empByName.set(fName, emp);
    if (fullName) empByName.set(fullName, emp);
  });

  console.log(`Loaded ${dbEmployees.length} employees from DB for Company ${TARGET_COMPANY_ID}`);

  // 2. Read and parse Excel file
  const wb = xlsx.readFile(EXCEL_FILE_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

  let currentDate = null;
  let currentShift = 'A';
  const attendanceToUpsert = [];
  const skippedEmployees = new Map(); // code/name -> count
  let totalExcelRows = 0;
  let matchedByCodeCount = 0;
  let matchedByNameCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();

    // Check date header: e.g. "01/07/2026"
    const dateMatch = col0.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      const [_, d, m, y] = dateMatch;
      currentDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      currentShift = 'A';
      continue;
    }

    // Check shift header: e.g. "A", "B", "C"
    if (row.length === 1 && ['A', 'B', 'C', 'G'].includes(col0.toUpperCase())) {
      currentShift = col0.toUpperCase();
      continue;
    }

    // Check attendance record row
    if (row.length >= 5 && col0 !== 'Sl.NO') {
      const tktNo = String(row[1] || '').trim();
      const empName = String(row[2] || '').trim();
      const deptCode = String(row[3] || '').trim();
      const statusRaw = String(row[4] || '').trim().toUpperCase();
      const inTimeRaw = String(row[5] || '').trim();
      const outTimeRaw = String(row[6] || '').trim();
      const hoursRaw = String(row[7] || '').trim();

      if (!tktNo || !currentDate) continue;
      totalExcelRows++;

      // Match employee: Code first, then Name
      let matchedEmp = empByCode.get(tktNo);
      let matchType = 'CODE';

      if (!matchedEmp) {
        matchedEmp = empByName.get(empName.toUpperCase());
        if (matchedEmp) matchType = 'NAME';
      }

      if (!matchedEmp) {
        // Not in DB -> Skip as requested
        const key = `${tktNo} - ${empName}`;
        skippedEmployees.set(key, (skippedEmployees.get(key) || 0) + 1);
        continue;
      }

      if (matchType === 'CODE') matchedByCodeCount++;
      else matchedByNameCount++;

      // Parse IN & OUT times
      const inTimeStr = parseTimeToTimeString(inTimeRaw);
      const outTimeStr = parseTimeToTimeString(outTimeRaw);

      let firstCheckIn = null;
      let lastCheckOut = null;

      if (inTimeStr) {
        firstCheckIn = new Date(`${currentDate}T${inTimeStr}`);
      }

      if (outTimeStr) {
        // Check if out time is overnight (e.g. outTime < inTime, or shift B/C past midnight)
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
      } else if (statusRaw === 'P' || statusRaw === 'P/L') {
        status = 'Present';
      } else if (statusRaw === 'A') {
        status = 'Absent';
      }

      attendanceToUpsert.push({
        employeeId: matchedEmp.id,
        companyId: TARGET_COMPANY_ID,
        departmentId: matchedEmp.departmentId || null,
        attendanceDate: currentDate,
        shiftName: currentShift,
        firstCheckIn,
        lastCheckOut,
        totalCheckIns: firstCheckIn ? 1 : 0,
        totalCheckOuts: lastCheckOut ? 1 : 0,
        workingHours,
        overtimeHours,
        status,
        isFinalized: true,
        autoGenerated: false,
        remarks: `Imported from July 2026 IN OUT (Tkt: ${tktNo}, Dept: ${deptCode})`
      });
    }
  }

  console.log(`\n--- Summary of Parsed Records ---`);
  console.log(`Total Attendance Records in Excel: ${totalExcelRows}`);
  console.log(`Matched with Database: ${attendanceToUpsert.length} (By Code: ${matchedByCodeCount}, By Name: ${matchedByNameCount})`);
  console.log(`Skipped (Not in DB): ${totalExcelRows - attendanceToUpsert.length} records across ${skippedEmployees.size} unique employee names`);

  // 3. Upsert into database in batches
  console.log(`\nPushing ${attendanceToUpsert.length} records into the Attendance table...`);

  const BATCH_SIZE = 500;
  let insertedOrUpdated = 0;

  for (let i = 0; i < attendanceToUpsert.length; i += BATCH_SIZE) {
    const batch = attendanceToUpsert.slice(i, i + BATCH_SIZE);
    
    // Using bulkCreate with updateOnDuplicate
    await Attendance.bulkCreate(batch, {
      updateOnDuplicate: [
        'shiftName',
        'firstCheckIn',
        'lastCheckOut',
        'totalCheckIns',
        'totalCheckOuts',
        'workingHours',
        'overtimeHours',
        'status',
        'isFinalized',
        'autoGenerated',
        'remarks',
        'updatedAt'
      ]
    });

    insertedOrUpdated += batch.length;
    process.stdout.write(`Processed ${insertedOrUpdated}/${attendanceToUpsert.length} records...\r`);
  }

  console.log(`\n\n✅ SUCCESS! Pushed ${attendanceToUpsert.length} attendance records into the database.`);
  process.exit(0);
}

runImport().catch(err => {
  console.error('\n❌ Error importing attendance:', err);
  process.exit(1);
});
