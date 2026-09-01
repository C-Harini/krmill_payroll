const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { pool } = require('./config/db');

const projectRoot = path.resolve(__dirname, '..');
const files = [
  '8to8 full july 2026.xls',
  'EPF and ESI july 2026.xls',
  'abs ot july 2026.xls',
  '11.08.2026 strength detailes.xlsx',
  'wages 27.08.2026 PF Worker.xlsx',
  'worker and staff salary.xlsx'
];

(async () => {
  try {
    console.log("=== Searching for 575 in Excel files ===");
    files.forEach(file => {
      try {
        const filePath = path.join(projectRoot, file);
        if (!fs.existsSync(filePath)) return;
        const workbook = xlsx.readFile(filePath);
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
          data.forEach((row, idx) => {
            const has575 = row.some(cell => cell === 575 || cell === '575');
            if (has575) {
              console.log(`[${file} -> ${sheetName}] Row ${idx + 1}:`, row);
            }
          });
        });
      } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
      }
    });

    console.log("\n=== Searching for 575 in Database ===");
    const [empSal] = await pool.query(`
      SELECT esm.*, e.employeeCode, e.firstName, e.lastName 
      FROM employee_salary_masters esm
      JOIN employees e ON esm.employeeId = e.id
      WHERE esm.basicSalary = 575 OR esm.grossSalary = 575 OR esm.netSalary = 575
    `);
    console.log("employee_salary_masters with 575:", empSal);

    const [empComps] = await pool.query(`
      SELECT esc.*, e.employeeCode, e.firstName 
      FROM employee_salary_components esc
      JOIN employee_salary_masters esm ON esc.employeeSalaryMasterId = esm.id
      JOIN employees e ON esm.employeeId = e.id
      WHERE esc.fixedAmount = 575 OR esc.calculatedAmount = 575
    `);
    console.log("employee_salary_components with 575:", empComps);

    const [salGen] = await pool.query(`
      SELECT sg.*, e.employeeCode, e.firstName 
      FROM salary_generations sg
      JOIN employees e ON sg.employeeId = e.id
      WHERE sg.basicSalary = 575 OR sg.grossSalary = 575 OR sg.netSalary = 575
    `);
    console.log("salary_generations with 575:", salGen);

    const [salGenDet] = await pool.query(`
      SELECT d.*, e.employeeCode, e.firstName 
      FROM salary_generation_details d
      JOIN salary_generations sg ON d.salaryGenerationId = sg.id
      JOIN employees e ON sg.employeeId = e.id
      WHERE d.baseAmount = 575 OR d.calculatedAmount = 575 OR d.proratedAmount = 575
    `);
    console.log("salary_generation_details with 575:", salGenDet);

  } catch (e) {
    console.error("DB error:", e);
  } finally {
    await pool.end();
  }
})();
