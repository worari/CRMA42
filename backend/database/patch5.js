// patch5.js — สร้างตาราง events, event_registrations, fund_contributions
const pool = require('./db');

const applyPatch = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Events Table ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(300),
        max_attendees INTEGER,
        cover_image TEXT,
        status VARCHAR(20) DEFAULT 'upcoming',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Event Registrations Table ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id UUID PRIMARY KEY,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'registered',
        UNIQUE(event_id, alumni_id)
      );
    `);

    // ── Fund Contributions Table ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS fund_contributions (
        id UUID PRIMARY KEY,
        alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE SET NULL,
        alumni_name VARCHAR(200) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        purpose VARCHAR(200),
        note TEXT,
        payment_method VARCHAR(50) DEFAULT 'โอนเงิน',
        slip_image TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by UUID REFERENCES users(id),
        contribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP
      );
    `);

    // ── Fund Summary Table ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS fund_purposes (
        id UUID PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        target_amount NUMERIC(12, 2),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default fund purposes
    await client.query(`
      INSERT INTO fund_purposes (id, name, target_amount, description)
      VALUES 
        (gen_random_uuid(), 'กองทุนทั่วไป', NULL, 'สนับสนุนกิจกรรมรุ่นทั่วไป'),
        (gen_random_uuid(), 'งานเลี้ยงรุ่น', 500000, 'สำหรับจัดงานเลี้ยงรุ่นประจำปี'),
        (gen_random_uuid(), 'ช่วยเหลือสมาชิก', 200000, 'ช่วยเหลือสมาชิกที่ประสบปัญหา')
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Patch 5 complete: events, event_registrations, fund_contributions, fund_purposes tables created.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Patch 5 failed:', e.message);
  } finally {
    client.release();
    pool.end();
  }
};

applyPatch();
