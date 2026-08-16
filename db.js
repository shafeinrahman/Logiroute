require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3310,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'LogiRoute',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Verify connectivity on initial load
pool.getConnection((err, conn) => {
    if (err) {
        console.error('⚠️ [Database Notice] MySQL connection not detected on port ' + (process.env.DB_PORT || 3310) + ' (' + err.message + ')');
        console.log('💡 [In-Memory Mode Active] LogiRoute is running seamlessly in Standalone/Demo mode with seed data from logiroute.sql.');
        console.log('ℹ️ To connect a live MySQL instance, ensure MySQL is running on port ' + (process.env.DB_PORT || 3310) + ' and import logiroute.sql.');
    } else {
        console.log('✅ Connected to MySQL database [' + (process.env.DB_NAME || 'LogiRoute') + '] on port ' + (process.env.DB_PORT || 3310));
        conn.release();
    }
});

module.exports = pool;
