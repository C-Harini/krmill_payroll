const xlsx = require("xlsx");
const path = require("path");

const filePath = path.join(__dirname, "../worker and staff salary.xlsx");
console.log("Reading file:", filePath);

try {
  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log("Sheet names in workbook:", sheetNames);

  for (const sheetName of sheetNames) {
    console.log(`\n=== SHEET: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total rows: ${data.length}`);
    console.log("First 15 rows:");
    data.slice(0, 15).forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row);
    });
  }
} catch (e) {
  console.error("Failed to read excel file:", e.message);
}
