const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('payroll_db', 'root', 'Karthi@2006', {
    host: 'localhost',
    dialect: 'postgres',
    logging: false
});

async function main() {
    try {
        await sequelize.authenticate();
        const [deductions] = await sequelize.query(`
            SELECT d.*, e.employee_name, e.ticket_no
            FROM employee_monthly_deductions d
            JOIN employees e ON d.employee_id = e.employee_id
            WHERE e.ticket_no = '1002' 
              AND d.salary_month = 7 
              AND d.salary_year = 2026
        `);
        console.log("Deductions for 1002:", deductions);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

main();
