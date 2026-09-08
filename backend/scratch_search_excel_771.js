const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const rootDir = 'd:/5TH SEM/KR MILL PROJECT/PAYROLL AUG 30/payroll_22_aug_night';
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

for (const file of files) {
  try {
    const wb = XLSX.readFile(path.join(rootDir, file));
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      data.forEach((row, idx) => {
        const rowStr = JSON.stringify(row);
        if (rowStr.includes('771') || rowStr.includes('SUDALAIMUTHU')) {
          console.log(`Found in file: ${file}, sheet: ${sheetName}, row ${idx}:`, row);
        }
      });
    }
  } catch (e) {
    // ignore
  }
}
