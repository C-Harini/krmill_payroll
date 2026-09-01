require("dotenv").config();
const { pool } = require('./config/db');

(async () => {
  try {
    const [tables] = await pool.query("SHOW TABLES");
    console.log("=== ALL TABLES in DB ===");
    console.log(tables.map(t => Object.values(t)[0]));

    const empId = 53;

    const [masters] = await pool.query("SELECT * FROM employee_salary_masters WHERE employeeId = ?", [empId]);
    console.log("=== employee_salary_masters for 53 ===");
    console.log(masters);

    if (masters.length > 0) {
      const masterId = masters[0].id;
      const [masterComps] = await pool.query("SELECT * FROM employee_salary_components WHERE employeeSalaryMasterId = ?", [masterId]);
      console.log("=== employee_salary_components for 53 ===");
      console.log(masterComps);
    }

    const [salGen] = await pool.query("SELECT * FROM salary_generations WHERE employeeId = ?", [empId]);
    console.log("=== salary_generations for 53 ===");
    console.log(salGen);

    if (salGen.length > 0) {
      const salGenId = salGen[0].id;
      const [salGenDetails] = await pool.query("SELECT * FROM salary_generation_details WHERE salaryGenerationId = ?", [salGenId]);
      console.log("=== salary_generation_details for 53 ===");
      console.log(salGenDetails);
    }

  } catch (e) {
    console.error("Error executing query:", e);
  } finally {
    await pool.end();
  }
})();
