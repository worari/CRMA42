const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'crma42',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };

const pool = new Pool(poolConfig);

const createTestAdmin = async () => {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    const id = crypto.randomUUID();

    // Check if test admin already exists
    const checkUser = await client.query('SELECT * FROM users WHERE email = $1', ['admin@test.com']);

    if (checkUser.rows.length > 0) {
      // Update existing admin password and status to be sure
      await client.query(`
        UPDATE users 
        SET password_hash = $1, status = 'approved', role = 'admin', pdpa_consent = TRUE, pdpa_consent_at = CURRENT_TIMESTAMP, pdpa_version = 'v1.0'
        WHERE email = 'admin@test.com'
      `, [passwordHash]);
      console.log('Test admin updated: admin@test.com / password123');
    } else {
      await client.query(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, pdpa_consent, pdpa_consent_at, pdpa_version)
        VALUES ($1, 'admin@test.com', $2, 'Admin', 'Test', 'admin', 'approved', TRUE, CURRENT_TIMESTAMP, 'v1.0')
      `, [id, passwordHash]);
      console.log('Test admin created: admin@test.com / password123');
    }
  } catch (err) {
    console.error('Error creating user', err);
  } finally {
    client.release();
    pool.end();
  }
};

createTestAdmin();
