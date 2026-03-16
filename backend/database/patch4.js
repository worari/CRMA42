const pool = require('./db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const applyPatch = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                military_id VARCHAR(50),
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check if admin exists
        const adminCheck = await client.query("SELECT * FROM users WHERE email = 'admin@crma42.rta.mi.th'");
        if (adminCheck.rows.length === 0) {
            const adminId = crypto.randomUUID();
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            
            await client.query(`
                INSERT INTO users (id, email, password_hash, first_name, last_name, role, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [adminId, 'admin@crma42.rta.mi.th', hashedPassword, 'Admin', 'SuperUser', 'admin', 'approved']);
            console.log('Created default admin user (admin@crma42.rta.mi.th / admin123)');
        }

        await client.query('COMMIT');
        console.log('Patch 4 applied successfully: Users table created.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Patch 4 failed', e);
    } finally {
        client.release();
        pool.end();
    }
};

applyPatch();
