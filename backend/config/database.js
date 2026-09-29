module.exports = {
    // Database Name
    database: process.env.DB_NAME || 'pay_db',
    // Database User
    username: process.env.DB_USER || 'root',
    // Database Password
    password: process.env.DB_PASSWORD || 'Karthi@2006',
    // Database Host
    host: process.env.DB_HOST || '127.0.0.1',
    // Database Dialect
    dialect: 'mysql'
};