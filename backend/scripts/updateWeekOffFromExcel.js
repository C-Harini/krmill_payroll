const ExcelJS = require('../node_modules/exceljs');
const mysql = require('../node_modules/mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function updateWeeklyOff() {
  const excelPath = path.join(__dirname, '../../weekoff.xlsx');
  console.log('Reading Excel from:', excelPath);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const ws = wb.getWorksheet(1);

  const fileMap = {};
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const tNo = row.getCell(1).value;
    const wOff = row.getCell(2).value;
    if (tNo !== null && tNo !== undefined && wOff && tNo !== 'T. No') {
      const code = String(tNo).trim();
      let off = String(wOff).trim();
      const u = off.toUpperCase();
      if (u === 'SUNDAY') off = 'Sunday';
      else if (u === 'MONDAY') off = 'Monday';
      else if (u === 'TUESDAY') off = 'Tuesday';
      else if (u === 'WEDNESDAY') off = 'Wednesday';
      else if (u === 'THURSDAY') off = 'Thursday';
      else if (u === 'FRIDAY') off = 'Friday';
      else if (u === 'SATURDAY') off = 'Saturday';
      else if (u === 'NO WEEKLY' || u === 'NOWEEKLY') off = 'NO WEEKLY';
      else if (u === '-') off = '-';
      fileMap[code] = off;
    }
  }

  console.log('Parsed', Object.keys(fileMap).length, 'distinct ticket numbers from weekoff.xlsx');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Karthi@2006',
    database: process.env.DB_NAME || 'pay_db'
  });

  const [emps] = await conn.execute('SELECT id, curEmployeeCode, newEmployeeCode, firstName, weeklyOff FROM employees');

  let updatedCount = 0;
  let alreadySameCount = 0;
  let notInFileCount = 0;

  for (const emp of emps) {
    const curCode = emp.curEmployeeCode ? String(emp.curEmployeeCode).trim() : '';
    const newCode = emp.newEmployeeCode ? String(emp.newEmployeeCode).trim() : '';
    const assignedOff = fileMap[curCode] || fileMap[newCode];

    if (assignedOff !== undefined) {
      if (emp.weeklyOff !== assignedOff) {
        await conn.execute('UPDATE employees SET weeklyOff = ? WHERE id = ?', [assignedOff, emp.id]);
        updatedCount++;
      } else {
        alreadySameCount++;
      }
    } else {
      notInFileCount++;
    }
  }

  console.log('\n=== EMPLOYEES WEEKLY OFF UPDATE SUMMARY ===');
  console.log('Total Employees in DB:', emps.length);
  console.log('Successfully Updated:', updatedCount);
  console.log('Already Up-to-date:', alreadySameCount);
  console.log('Not in weekoff.xlsx (kept as-is):', notInFileCount);

  // Update attendances.isWeekOff based on employees.weeklyOff
  const [res1] = await conn.execute(`
    UPDATE attendances a
    INNER JOIN employees e ON a.employeeId = e.id
    SET a.isWeekOff = 1
    WHERE e.weeklyOff IS NOT NULL
      AND e.weeklyOff != '-'
      AND e.weeklyOff != 'NO WEEKLY'
      AND UPPER(DAYNAME(a.attendanceDate)) = UPPER(e.weeklyOff)
      AND (a.isWeekOff = 0 OR a.isWeekOff IS NULL)
  `);
  console.log('\n=== ATTENDANCES UPDATE SUMMARY ===');
  console.log('Attendances set to isWeekOff = 1:', res1.affectedRows);

  const [res2] = await conn.execute(`
    UPDATE attendances a
    INNER JOIN employees e ON a.employeeId = e.id
    SET a.isWeekOff = 0
    WHERE e.weeklyOff IS NOT NULL
      AND e.weeklyOff != '-'
      AND e.weeklyOff != 'NO WEEKLY'
      AND UPPER(DAYNAME(a.attendanceDate)) != UPPER(e.weeklyOff)
      AND a.isWeekOff = 1
      AND a.status != 'Week Off'
  `);
  console.log('Attendances corrected to isWeekOff = 0:', res2.affectedRows);

  const [dist] = await conn.execute('SELECT weeklyOff, count(*) as count FROM employees GROUP BY weeklyOff ORDER BY count DESC');
  console.log('\n=== FINAL WEEKLY OFF DISTRIBUTION IN DB ===');
  console.table(dist);

  await conn.end();
  console.log('\nWeekly off update completed successfully.');
}

updateWeeklyOff().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
