const { sequelize } = require('./models');

async function syncDB() {
    try {
        console.log("Authenticating database connection...");
        await sequelize.authenticate();
        console.log("Database connection successful. Syncing models...");
        await sequelize.sync({ alter: true });
        console.log("Database synced successfully! Table hr_department_attendance created/updated.");
        process.exit(0);
    } catch (err) {
        console.error("Database sync failed:", err.message);
        process.exit(1);
    }
}

syncDB();