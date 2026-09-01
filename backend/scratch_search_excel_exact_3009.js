const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const files = [
  '8to8 full july 2026.xls',
  'EPF and ESI july 2026.xls',
  'abs ot july 2026.xls',
  '11.08.2026 strength detailes.xlsx',
  'wages 27.08.2026 PF Worker.xlsx',
  'worker and staff salary.xlsx'
];

files.forEach(file => {
  try {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) return;
    const workbook = xlsx.readFile(filePath);
    console.log(`\n================== FILE: ${file} ==================`);
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let found = false;
      data.forEach((row, idx) => {
        const has3009 = row.some(cell => cell === 3009 || cell === '3009' || (typeof cell === 'string' && cell.includes('3009')));
        if (has3009) {
          if (!found) {
            console.log(`\n--- Sheet: ${sheetName} ---`);
            console.log("Header (first 3 rows):", data.slice(0, 3));
            found = true;
          }
          console.log(`Row ${idx + 1}:`, row);
        }
      });
    });
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
});
