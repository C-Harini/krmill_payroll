const { Sequelize } = require('sequelize');
const dbConfig = require('./config/database');
const path = require('path');
const fs = require('fs');

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        dialect: dbConfig.dialect,
    }
);

async function runMigrations() {
    try {
        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationFiles = fs.readdirSync(migrationsDir).sort();

        console.log('Running migrations...');

        for (const file of migrationFiles) {
            if (file.endsWith('.js')) {
                const migration = require(path.join(migrationsDir, file));
                console.log(`Executing migration: ${file}`);
                await migration.up(sequelize.getQueryInterface(), Sequelize);
                console.log(`✓ Migration completed: ${file}`);
            }
        }

        console.log('All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

runMigrations();
