const sql = require('mssql');

const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function getPool() {
    try {
        if (!sql.pool) sql.pool = await sql.connect(config);
        return sql.pool;
    } catch (err) {
        console.error("❌ Error conectando a SQL:", err);
        throw err;
    }
}

module.exports = { sql, getPool };
