const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const files = fs.readdirSync(projectRoot).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));

console.log("Excel / CSV files in root:", files);

files.forEach(file => {
  try {
    const filePath = path.join(projectRoot, file);
    const workbook = xlsx.readFile(filePath);
    console.log(`\n================== FILE: ${file} ==================`);
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      // Find rows mentioning 3009 or Thangaraj
      const matchingRows = [];
      data.forEach((row, idx) => {
        const rowStr = JSON.stringify(row);
        if (rowStr.includes('3009') || rowStr.toLowerCase().includes('thangaraj')) {
          matchingRows.push({ rowIndex: idx + 1, row });
        }
      });
      if (matchingRows.length > 0) {
        console.log(`--- Sheet: ${sheetName} (Found ${matchingRows.length} rows) ---`);
        // print headers (row 0 or 1 or 2)
        console.log("Header (first 3 rows):", data.slice(0, 3));
        matchingRows.forEach(m => {
          console.log(`Row ${m.rowIndex}:`, m.row);
        });
      }
    });
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
});
