const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'crma42',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5433'),
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS alumni_profiles (
        id UUID PRIMARY KEY,
        profile_photo TEXT,
        military_id VARCHAR(10) UNIQUE NOT NULL,
        rank VARCHAR(50) NOT NULL,
        custom_rank VARCHAR(50),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        nickname VARCHAR(50),
        position VARCHAR(200),
        branch VARCHAR(50) NOT NULL,
        custom_branch VARCHAR(50),
        affiliation VARCHAR(50) NOT NULL,
        custom_affiliation VARCHAR(50),
        blood_group VARCHAR(5),
        religion VARCHAR(50),
        custom_religion VARCHAR(100),
        marital_status VARCHAR(50),
        custom_marital_status VARCHAR(100),
        status VARCHAR(50),
        date_of_birth DATE NOT NULL,
        retirement_year INTEGER NOT NULL,
        signature_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone_number VARCHAR(10),
        line_user_id VARCHAR(100),
        military_id VARCHAR(10),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        pdpa_consent BOOLEAN DEFAULT FALSE,
        pdpa_consent_at TIMESTAMP,
        pdpa_version VARCHAR(20),
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pdpa_consent_logs (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        consent BOOLEAN NOT NULL,
        consent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pdpa_version VARCHAR(20),
        ip_address INET,
        user_agent TEXT
      );
    `);

    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pdpa_consent BOOLEAN DEFAULT FALSE');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pdpa_consent_at TIMESTAMP');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pdpa_version VARCHAR(20)');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(10)');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(100)');
    await client.query('UPDATE users SET phone_number = military_id WHERE (phone_number IS NULL OR phone_number = \'\') AND military_id IS NOT NULL');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_phone_number_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);
        END IF;
      END $$;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_line_user_id_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_line_user_id_unique UNIQUE (line_user_id);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        phone_primary VARCHAR(10),
        phone_secondary VARCHAR(10),
        email VARCHAR(150),
        line_id VARCHAR(100)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_data (
        alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        sons_count INTEGER DEFAULT 0,
        daughters_count INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        house_number VARCHAR(50),
        alley VARCHAR(100),
        road VARCHAR(100),
        subdistrict VARCHAR(100),
        district VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(5)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS children (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        title VARCHAR(50),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        nickname VARCHAR(50),
        birth_date DATE,
        occupation VARCHAR(100)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS position_history (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        position_name VARCHAR(200),
        start_date DATE,
        end_date DATE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rank_history (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        rank VARCHAR(50),
        order_number VARCHAR(100),
        start_date DATE,
        end_date DATE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS education_history (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        institution_name VARCHAR(250),
        course_name VARCHAR(250),
        class_no VARCHAR(100),
        graduated_year INTEGER
      );
    `);

    // Backward-compatible alterations for existing databases
    await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5)');
    await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS religion VARCHAR(50)');
    await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_religion VARCHAR(100)');
    await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50)');
    await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_marital_status VARCHAR(100)');
    await client.query('ALTER TABLE children ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)');
    await client.query('ALTER TABLE position_history ADD COLUMN IF NOT EXISTS order_number VARCHAR(100)');
    await client.query('ALTER TABLE rank_history ADD COLUMN IF NOT EXISTS order_number VARCHAR(100)');
    await client.query('ALTER TABLE education_history ADD COLUMN IF NOT EXISTS institution_name VARCHAR(250)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS birthday_message_logs (
        log_date DATE NOT NULL,
        alumni_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (log_date, alumni_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_otp_codes (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        phone_number VARCHAR(10) NOT NULL,
        requester_ip INET,
        code_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('ALTER TABLE auth_otp_codes ADD COLUMN IF NOT EXISTS requester_ip INET');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_user_created ON auth_otp_codes(user_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_phone_created ON auth_otp_codes(phone_number, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_ip_created ON auth_otp_codes(requester_ip, created_at DESC)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_otp_request_audit (
        id UUID PRIMARY KEY,
        phone_number VARCHAR(10) NOT NULL,
        requester_ip INET,
        outcome VARCHAR(20) NOT NULL,
        reason_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_phone_created ON auth_otp_request_audit(phone_number, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_ip_created ON auth_otp_request_audit(requester_ip, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_outcome_created ON auth_otp_request_audit(outcome, created_at DESC)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        location VARCHAR(300),
        max_attendees INTEGER,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id UUID PRIMARY KEY,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        attendees_count INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'registered',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fund_contributions (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        contribution_date DATE NOT NULL,
        payment_method VARCHAR(100),
        receipt_image TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Tables created/verified successfully');

    // Seed sample data
    const checkData = await pool.query('SELECT COUNT(*) FROM alumni_profiles');
    if (parseInt(checkData.rows[0].count) === 0) {
      console.log('🌱 Seeding sample data...');
      
      const ranks = ["พล.อ.", "พล.ท.", "พล.ต.", "พ.อ.(พ.)", "พ.อ.", "พ.ท.", "พ.ต.", "ร.อ.", "ร.ท.", "ร.ต."];
      const branches = ["ร.", "ม.", "ป.", "ช.", "ส.", "สพ.", "ขส.", "พธ.", "สห.", "ผท."];
      const affiliations = ["ทบ.", "กห.สป.", "บก.ทท.", "ทม.รอ.", "สทป."];
      const firstNames = ["สมชาย", "วิชัย", "สุรศักดิ์", "ประยุทธ์", "ประวิทย์", "อนุพงษ์", "อภิรักษ์", "สมศักดิ์", "ณัฐพล", "ธนาธร"];
      const lastNames = ["ใจดี", "รักชาติ", "มุ่งมั่น", "เข้มแข็ง", "ปกป้อง"];

      for (let i = 0; i < 20; i++) {
        const id = crypto.randomUUID();
        const fname = firstNames[i % firstNames.length];
        const lname = lastNames[i % lastNames.length];
        const rank = ranks[i % ranks.length];
        const branch = branches[i % branches.length];
        const affiliation = affiliations[i % affiliations.length];
        
        const birthYear = 1960 + (i % 20);
        const birthDate = `${birthYear}-${String((i % 12) + 1).padStart(2, '0')}-15`;
        const retireYear = birthYear + 60;

        await pool.query(`
          INSERT INTO alumni_profiles 
          (id, military_id, rank, first_name, last_name, position, branch, affiliation, status, date_of_birth, retirement_year)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [id, `MID${String(i).padStart(5, '0')}`, rank, fname, lname, 'Officer', branch, affiliation, 'active', birthDate, retireYear]);

        await pool.query(`
          INSERT INTO contacts (alumni_id) VALUES ($1)
        `, [id]);

        await pool.query(`
          INSERT INTO family_data (alumni_id) VALUES ($1)
        `, [id]);

        await pool.query(`
          INSERT INTO addresses (alumni_id) VALUES ($1)
        `, [id]);
      }

      console.log('✅ Sample data seeded successfully');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

createTables();
