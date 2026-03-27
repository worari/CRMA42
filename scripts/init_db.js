const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

const CURRENT_PDPA_VERSION =
  process.env.NEXT_PUBLIC_PDPA_VERSION ||
  process.env.PDPA_VERSION ||
  'v1.0';

const DEFAULT_ADMIN = {
  id: '6a9f6c11-1111-4f1d-8ad1-0c5cc8be1001',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@crma42.local',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin1234!',
  phone_number: process.env.SEED_ADMIN_PHONE || '6500000099',
  military_id: process.env.SEED_ADMIN_MILITARY_ID || '6500000099',
  first_name: process.env.SEED_ADMIN_FIRST_NAME || 'System',
  last_name: process.env.SEED_ADMIN_LAST_NAME || 'Administrator',
};

const SEED_USERS = [
  {
    ...DEFAULT_ADMIN,
    line_user_id: 'Uaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    role: 'super_admin',
    status: 'approved',
  },
  {
    id: '6a9f6c11-1111-4f1d-8ad1-0c5cc8be1002',
    email: 'member1@crma42.local',
    password: 'Member1234!',
    phone_number: '6500000001',
    military_id: '6500000001',
    line_user_id: 'Ubbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    first_name: 'อนันต์',
    last_name: 'พร้อมมิตร',
    role: 'user',
    status: 'approved',
  },
  {
    id: '6a9f6c11-1111-4f1d-8ad1-0c5cc8be1003',
    email: 'pending1@crma42.local',
    password: 'Pending1234!',
    phone_number: '6500000004',
    military_id: '6500000004',
    line_user_id: null,
    first_name: 'ปรีชา',
    last_name: 'รอตรวจ',
    role: 'user',
    status: 'pending',
  },
];

const SEED_ALUMNI = [
  {
    id: '7baf7c22-2222-4e2a-9be2-1d6dd9cf2001',
    military_id: '6500000001',
    rank: 'พ.อ.',
    custom_rank: null,
    first_name: 'อนันต์',
    last_name: 'พร้อมมิตร',
    nickname: 'ตั้ม',
    position: 'ผู้อำนวยการโครงการ',
    branch: 'ร.',
    custom_branch: null,
    affiliation: 'ทบ.',
    custom_affiliation: null,
    blood_group: 'A',
    religion: 'พุทธ',
    custom_religion: null,
    marital_status: 'สมรส',
    custom_marital_status: null,
    status: 'active',
    date_of_birth: '1970-04-12',
    retirement_year: 2030,
    profile_photo: null,
    signature_image: null,
  },
  {
    id: '7baf7c22-2222-4e2a-9be2-1d6dd9cf2002',
    military_id: '6500000002',
    rank: 'พ.ท.',
    custom_rank: null,
    first_name: 'วิชัย',
    last_name: 'ศักดิ์สยาม',
    nickname: 'ชัย',
    position: 'หัวหน้าฝ่ายกำลังพล',
    branch: 'ม.',
    custom_branch: null,
    affiliation: 'บก.ทท.',
    custom_affiliation: null,
    blood_group: 'B',
    religion: 'พุทธ',
    custom_religion: null,
    marital_status: 'โสด',
    custom_marital_status: null,
    status: 'active',
    date_of_birth: '1974-09-03',
    retirement_year: 2034,
    profile_photo: null,
    signature_image: null,
  },
  {
    id: '7baf7c22-2222-4e2a-9be2-1d6dd9cf2003',
    military_id: '6500000003',
    rank: 'พ.ต.',
    custom_rank: null,
    first_name: 'สุรศักดิ์',
    last_name: 'ธำรงชัย',
    nickname: 'เอ',
    position: 'ผู้ประสานงานกิจกรรม',
    branch: 'ส.',
    custom_branch: null,
    affiliation: 'กห.สป.',
    custom_affiliation: null,
    blood_group: 'O',
    religion: 'พุทธ',
    custom_religion: null,
    marital_status: 'สมรส',
    custom_marital_status: null,
    status: 'active',
    date_of_birth: '1978-12-21',
    retirement_year: 2038,
    profile_photo: null,
    signature_image: null,
  },
];

const SEED_CONTACTS = [
  {
    alumni_id: SEED_ALUMNI[0].id,
    phone_primary: '6500000001',
    phone_secondary: '6500000101',
    email: 'member1@crma42.local',
    line_id: 'member1-line',
  },
  {
    alumni_id: SEED_ALUMNI[1].id,
    phone_primary: '6500000002',
    phone_secondary: null,
    email: 'member2@crma42.local',
    line_id: 'member2-line',
  },
  {
    alumni_id: SEED_ALUMNI[2].id,
    phone_primary: '6500000003',
    phone_secondary: null,
    email: 'member3@crma42.local',
    line_id: 'member3-line',
  },
];

const SEED_FAMILY = [
  { alumni_id: SEED_ALUMNI[0].id, sons_count: 1, daughters_count: 1 },
  { alumni_id: SEED_ALUMNI[1].id, sons_count: 0, daughters_count: 2 },
  { alumni_id: SEED_ALUMNI[2].id, sons_count: 1, daughters_count: 0 },
];

const SEED_ADDRESSES = [
  {
    alumni_id: SEED_ALUMNI[0].id,
    house_number: '99/1',
    alley: 'พหลโยธิน 8',
    road: 'พหลโยธิน',
    subdistrict: 'สามเสนใน',
    district: 'พญาไท',
    province: 'กรุงเทพมหานคร',
    postal_code: '10400',
  },
  {
    alumni_id: SEED_ALUMNI[1].id,
    house_number: '12/7',
    alley: 'ร่วมใจ',
    road: 'มิตรภาพ',
    subdistrict: 'ในเมือง',
    district: 'เมืองขอนแก่น',
    province: 'ขอนแก่น',
    postal_code: '40000',
  },
  {
    alumni_id: SEED_ALUMNI[2].id,
    house_number: '45',
    alley: null,
    road: 'นิมมานเหมินทร์',
    subdistrict: 'สุเทพ',
    district: 'เมืองเชียงใหม่',
    province: 'เชียงใหม่',
    postal_code: '50200',
  },
];

const SEED_CHILDREN = [
  {
    id: '8cb08d33-3333-4f3b-acf3-2e7eeadf3001',
    alumni_id: SEED_ALUMNI[0].id,
    title: 'ด.ช.',
    first_name: 'กฤต',
    last_name: 'พร้อมมิตร',
    nickname: 'ก้อง',
    birth_date: '2005-05-20',
    occupation: 'นักเรียน',
  },
  {
    id: '8cb08d33-3333-4f3b-acf3-2e7eeadf3002',
    alumni_id: SEED_ALUMNI[1].id,
    title: 'ด.ญ.',
    first_name: 'ณิชา',
    last_name: 'ศักดิ์สยาม',
    nickname: 'ณิ',
    birth_date: '2008-08-14',
    occupation: 'นักเรียน',
  },
  {
    id: '8cb08d33-3333-4f3b-acf3-2e7eeadf3003',
    alumni_id: SEED_ALUMNI[2].id,
    title: 'ด.ช.',
    first_name: 'ธีร์',
    last_name: 'ธำรงชัย',
    nickname: 'ที',
    birth_date: '2010-01-09',
    occupation: 'นักเรียน',
  },
];

const SEED_POSITIONS = [
  {
    id: '9dc19e44-4444-405c-bd04-3f8ffbe04001',
    alumni_id: SEED_ALUMNI[0].id,
    position_name: 'ผู้ช่วยเสนาธิการ',
    order_number: 'PO-001',
    start_date: '2018-10-01',
    end_date: '2020-09-30',
  },
  {
    id: '9dc19e44-4444-405c-bd04-3f8ffbe04002',
    alumni_id: SEED_ALUMNI[1].id,
    position_name: 'หัวหน้ากองยุทธการ',
    order_number: 'PO-002',
    start_date: '2019-01-01',
    end_date: '2021-12-31',
  },
  {
    id: '9dc19e44-4444-405c-bd04-3f8ffbe04003',
    alumni_id: SEED_ALUMNI[2].id,
    position_name: 'นายทหารประสานงาน',
    order_number: 'PO-003',
    start_date: '2020-01-01',
    end_date: null,
  },
];

const SEED_RANKS = [
  {
    id: 'ade2af55-5555-416d-8e15-40900cf15001',
    alumni_id: SEED_ALUMNI[0].id,
    rank: 'พ.อ.',
    rank_name: 'พันเอก',
    order_number: 'RK-001',
    start_date: '2017-04-01',
    end_date: null,
  },
  {
    id: 'ade2af55-5555-416d-8e15-40900cf15002',
    alumni_id: SEED_ALUMNI[1].id,
    rank: 'พ.ท.',
    rank_name: 'พันโท',
    order_number: 'RK-002',
    start_date: '2018-04-01',
    end_date: null,
  },
  {
    id: 'ade2af55-5555-416d-8e15-40900cf15003',
    alumni_id: SEED_ALUMNI[2].id,
    rank: 'พ.ต.',
    rank_name: 'พันตรี',
    order_number: 'RK-003',
    start_date: '2019-04-01',
    end_date: null,
  },
];

const SEED_EDUCATION = [
  {
    id: 'bef3b066-6666-427e-8f26-51a11df26001',
    alumni_id: SEED_ALUMNI[0].id,
    institution_name: 'โรงเรียนนายร้อยพระจุลจอมเกล้า',
    course_name: 'หลักสูตรหลักประจำ',
    class_no: '42',
    graduated_year: 1992,
  },
  {
    id: 'bef3b066-6666-427e-8f26-51a11df26002',
    alumni_id: SEED_ALUMNI[1].id,
    institution_name: 'วิทยาลัยการทัพบก',
    course_name: 'หลักสูตรเสนาธิการ',
    class_no: '58',
    graduated_year: 2014,
  },
  {
    id: 'bef3b066-6666-427e-8f26-51a11df26003',
    alumni_id: SEED_ALUMNI[2].id,
    institution_name: 'โรงเรียนเสนาธิการทหารบก',
    course_name: 'หลักสูตรนายทหารชั้นผู้บังคับกองร้อย',
    class_no: '12',
    graduated_year: 2011,
  },
];

const SEED_PDPA_LOGS = [
  {
    id: 'cf04c177-7777-438f-8037-62b22ef37001',
    user_id: SEED_USERS[0].id,
    consent: true,
    consent_at: '2025-01-10T08:00:00.000Z',
    pdpa_version: CURRENT_PDPA_VERSION,
    ip_address: '127.0.0.1',
    user_agent: 'seed-script/admin',
  },
  {
    id: 'cf04c177-7777-438f-8037-62b22ef37002',
    user_id: SEED_USERS[1].id,
    consent: true,
    consent_at: '2025-01-10T08:05:00.000Z',
    pdpa_version: CURRENT_PDPA_VERSION,
    ip_address: '127.0.0.1',
    user_agent: 'seed-script/member',
  },
];

const SEED_ACTIVITY_LOGS = [
  {
    id: 'd015d288-8888-4490-8148-73c330048001',
    user_id: SEED_USERS[0].id,
    action: 'SEED',
    entity_type: 'database',
    entity_id: null,
    details: JSON.stringify({ source: 'scripts/init_db.js', role: 'super_admin' }),
    ip_address: '127.0.0.1',
    user_agent: 'seed-script',
  },
];

const SEED_OTP_CODES = [
  {
    id: 'e126e399-9999-45a1-8260-84d441159001',
    user_id: SEED_USERS[1].id,
    phone_number: SEED_USERS[1].phone_number,
    requester_ip: '127.0.0.1',
    code_hash: '$2b$10$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcd',
    expires_at: '2024-01-01T00:05:00.000Z',
    consumed_at: '2024-01-01T00:02:00.000Z',
    attempts: 1,
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

const SEED_OTP_AUDIT = [
  {
    id: 'f237f4aa-aaaa-46b2-9371-95e55226a001',
    phone_number: SEED_USERS[1].phone_number,
    requester_ip: '127.0.0.1',
    outcome: 'success',
    reason_code: 'seed_data',
    created_at: '2024-01-01T00:00:30.000Z',
  },
];

const SEED_EVENTS = [
  {
    id: '013804bb-bbbb-47c3-a482-a6f66337b001',
    title: 'ประชุมเตรียมงานคืนสู่เหย้า',
    description: 'ประชุมวางแผนกิจกรรมรุ่นประจำปี',
    event_date: '2026-06-15',
    location: 'สมาคมศิษย์เก่า',
    max_attendees: 120,
    cover_image: null,
    status: 'upcoming',
    created_by: SEED_USERS[0].id,
    updated_at: '2026-03-01T09:00:00.000Z',
  },
  {
    id: '013804bb-bbbb-47c3-a482-a6f66337b002',
    title: 'กิจกรรมสาธารณประโยชน์รุ่น 42',
    description: 'ร่วมบริจาคและลงพื้นที่ช่วยเหลือชุมชน',
    event_date: '2026-08-20',
    location: 'ศูนย์พัฒนาชุมชน',
    max_attendees: 80,
    cover_image: null,
    status: 'upcoming',
    created_by: SEED_USERS[0].id,
    updated_at: '2026-03-02T09:00:00.000Z',
  },
];

const SEED_EVENT_REGISTRATIONS = [
  {
    id: '124915cc-cccc-48d4-b593-b7a77448c001',
    event_id: SEED_EVENTS[0].id,
    alumni_id: SEED_ALUMNI[0].id,
    attendees_count: 2,
    status: 'registered',
    registered_at: '2026-03-03T10:00:00.000Z',
  },
];

const SEED_FUND_PURPOSES = [
  {
    id: '235a26dd-dddd-49e5-86a4-c8a88559d001',
    name: 'กองทุนทั่วไป',
    target_amount: null,
    description: 'สนับสนุนกิจกรรมรุ่นทั่วไป',
    is_active: true,
  },
  {
    id: '235a26dd-dddd-49e5-86a4-c8a88559d002',
    name: 'งานเลี้ยงรุ่น',
    target_amount: 500000,
    description: 'สำหรับจัดงานเลี้ยงรุ่นประจำปี',
    is_active: true,
  },
  {
    id: '235a26dd-dddd-49e5-86a4-c8a88559d003',
    name: 'ช่วยเหลือสมาชิก',
    target_amount: 200000,
    description: 'ช่วยเหลือสมาชิกที่ประสบปัญหา',
    is_active: true,
  },
];

const SEED_FUND_CONTRIBUTIONS = [
  {
    id: '346b37ee-eeee-4af6-87b5-d9a99660e001',
    alumni_id: SEED_ALUMNI[0].id,
    alumni_name: 'พ.อ. อนันต์ พร้อมมิตร',
    amount: 5000,
    purpose: 'กองทุนทั่วไป',
    note: 'สมทบกองทุนประจำปี',
    payment_method: 'โอนเงิน',
    slip_image: null,
    status: 'approved',
    approved_by: SEED_USERS[0].id,
    contribution_date: '2026-02-15',
    approved_at: '2026-02-16T09:00:00.000Z',
    transaction_type: 'income',
    expense_category: null,
    recorded_by: SEED_USERS[0].id,
  },
  {
    id: '346b37ee-eeee-4af6-87b5-d9a99660e002',
    alumni_id: null,
    alumni_name: 'ผู้ดูแลระบบ',
    amount: 1500,
    purpose: 'รายจ่ายกองทุน',
    note: 'ค่าจัดพิมพ์เอกสารประชุม',
    payment_method: 'จ่ายออก',
    slip_image: null,
    status: 'approved',
    approved_by: SEED_USERS[0].id,
    contribution_date: '2026-02-20',
    approved_at: '2026-02-20T16:00:00.000Z',
    transaction_type: 'expense',
    expense_category: 'เอกสาร',
    recorded_by: SEED_USERS[0].id,
  },
  {
    id: '346b37ee-eeee-4af6-87b5-d9a99660e003',
    alumni_id: SEED_ALUMNI[1].id,
    alumni_name: 'พ.ท. วิชัย ศักดิ์สยาม',
    amount: 3000,
    purpose: 'งานเลี้ยงรุ่น',
    note: 'รออนุมัติ',
    payment_method: 'โอนเงิน',
    slip_image: null,
    status: 'pending',
    approved_by: null,
    contribution_date: '2026-03-01',
    approved_at: null,
    transaction_type: 'income',
    expense_category: null,
    recorded_by: SEED_USERS[0].id,
  },
];

const SEED_BIRTHDAY_LOGS = [
  {
    log_date: '2026-04-12',
    alumni_id: SEED_ALUMNI[0].id,
    status: 'sent',
    error_message: null,
    sent_at: '2026-04-12T08:00:00.000Z',
  },
];

const SEED_SETTINGS = [
  {
    key: 'allow_user_profile_edit',
    value: 'true',
    updated_by: SEED_USERS[0].id,
    updated_at: '2026-03-01T08:00:00.000Z',
  },
];

async function assertSchemaPrivileges(client) {
  const privilegeCheck = await client.query(
    `
      SELECT
        current_user AS current_user,
        current_database() AS current_database,
        has_schema_privilege(current_user, 'public', 'USAGE') AS has_usage,
        has_schema_privilege(current_user, 'public', 'CREATE') AS has_create
    `
  );

  const privilege = privilegeCheck.rows[0];
  if (privilege.has_usage && privilege.has_create) {
    return;
  }

  const error = new Error(
    [
      `Database user "${privilege.current_user}" does not have enough privileges on schema public in database "${privilege.current_database}".`,
      'Required: USAGE, CREATE on schema public.',
      'Fix with a privileged PostgreSQL account:',
      `  GRANT USAGE, CREATE ON SCHEMA public TO ${privilege.current_user};`,
      `  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${privilege.current_user};`,
      `  GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${privilege.current_user};`,
      `  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${privilege.current_user};`,
      `  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${privilege.current_user};`,
    ].join('\n')
  );
  error.code = 'SCHEMA_PRIVILEGE_CHECK_FAILED';
  throw error;
}

async function ensureSchema(client) {
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
    )
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
    )
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
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      phone_primary VARCHAR(10),
      phone_secondary VARCHAR(10),
      email VARCHAR(150),
      line_id VARCHAR(100)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS family_data (
      alumni_id UUID PRIMARY KEY REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      sons_count INTEGER DEFAULT 0,
      daughters_count INTEGER DEFAULT 0
    )
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
    )
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
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS position_history (
      id UUID PRIMARY KEY,
      alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      position_name VARCHAR(200),
      order_number VARCHAR(100),
      start_date DATE,
      end_date DATE
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS rank_history (
      id UUID PRIMARY KEY,
      alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      rank VARCHAR(50),
      rank_name VARCHAR(100),
      order_number VARCHAR(100),
      start_date DATE,
      end_date DATE
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS education_history (
      id UUID PRIMARY KEY,
      alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      institution_name VARCHAR(250),
      course_name VARCHAR(250),
      class_no VARCHAR(100),
      graduated_year INTEGER
    )
  `);

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
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS birthday_message_logs (
      log_date DATE NOT NULL,
      alumni_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL,
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (log_date, alumni_id)
    )
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
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS auth_otp_request_audit (
      id UUID PRIMARY KEY,
      phone_number VARCHAR(10) NOT NULL,
      requester_ip INET,
      outcome VARCHAR(20) NOT NULL,
      reason_code VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      location VARCHAR(300),
      max_attendees INTEGER,
      cover_image TEXT,
      status VARCHAR(50) DEFAULT 'upcoming',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id UUID PRIMARY KEY,
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      alumni_id UUID REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      attendees_count INTEGER DEFAULT 1,
      status VARCHAR(50) DEFAULT 'registered',
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS fund_purposes (
      id UUID PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      target_amount NUMERIC(12, 2),
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      approved_at TIMESTAMP,
      transaction_type VARCHAR(20) DEFAULT 'income',
      expense_category VARCHAR(200),
      recorded_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by UUID,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pdpa_consent BOOLEAN DEFAULT FALSE');
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pdpa_consent_at TIMESTAMP');
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pdpa_version VARCHAR(20)');
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(10)');
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(100)');
  await client.query('UPDATE users SET phone_number = military_id WHERE (phone_number IS NULL OR phone_number = \'\') AND military_id IS NOT NULL');

  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_affiliation VARCHAR(50)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS religion VARCHAR(50)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_religion VARCHAR(100)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_marital_status VARCHAR(100)');
  await client.query('ALTER TABLE children ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)');
  await client.query('ALTER TABLE children ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)');
  await client.query('ALTER TABLE position_history ADD COLUMN IF NOT EXISTS order_number VARCHAR(100)');
  await client.query('ALTER TABLE rank_history ADD COLUMN IF NOT EXISTS order_number VARCHAR(100)');
  await client.query('ALTER TABLE rank_history ADD COLUMN IF NOT EXISTS rank_name VARCHAR(100)');
  await client.query('ALTER TABLE education_history ADD COLUMN IF NOT EXISTS institution_name VARCHAR(250)');
  await client.query('ALTER TABLE auth_otp_codes ADD COLUMN IF NOT EXISTS requester_ip INET');
  await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image TEXT');
  await client.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'upcoming'");
  await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS alumni_name VARCHAR(200)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS purpose VARCHAR(200)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS note TEXT');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS slip_image TEXT');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP');
  await client.query("ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'income'");
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS expense_category VARCHAR(200)');
  await client.query('ALTER TABLE fund_contributions ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id)');
  await client.query('ALTER TABLE fund_contributions ALTER COLUMN contribution_date SET DEFAULT CURRENT_DATE');
  await client.query("UPDATE fund_contributions SET transaction_type = 'income' WHERE transaction_type IS NULL OR transaction_type = ''");

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_number_unique'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_phone_number_unique UNIQUE (phone_number);
      END IF;
    END $$;
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_line_user_id_unique'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_line_user_id_unique UNIQUE (line_user_id);
      END IF;
    END $$;
  `);

  await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_user_created ON auth_otp_codes(user_id, created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_phone_created ON auth_otp_codes(phone_number, created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_ip_created ON auth_otp_codes(requester_ip, created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_phone_created ON auth_otp_request_audit(phone_number, created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_ip_created ON auth_otp_request_audit(requester_ip, created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_outcome_created ON auth_otp_request_audit(outcome, created_at DESC)');
}

async function seedUsers(client) {
  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await client.query(
      `
        INSERT INTO users (
          id, email, password_hash, phone_number, line_user_id, military_id,
          first_name, last_name, pdpa_consent, pdpa_consent_at, pdpa_version, role, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP, $9, $10, $11)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          phone_number = EXCLUDED.phone_number,
          line_user_id = EXCLUDED.line_user_id,
          military_id = EXCLUDED.military_id,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          pdpa_consent = TRUE,
          pdpa_consent_at = CURRENT_TIMESTAMP,
          pdpa_version = EXCLUDED.pdpa_version,
          role = EXCLUDED.role,
          status = EXCLUDED.status
      `,
      [
        user.id,
        user.email,
        passwordHash,
        user.phone_number,
        user.line_user_id,
        user.military_id,
        user.first_name,
        user.last_name,
        CURRENT_PDPA_VERSION,
        user.role,
        user.status,
      ]
    );
  }
}

async function seedAlumni(client) {
  for (const alumni of SEED_ALUMNI) {
    await client.query(
      `
        INSERT INTO alumni_profiles (
          id, profile_photo, military_id, rank, custom_rank, first_name, last_name, nickname,
          position, branch, custom_branch, affiliation, custom_affiliation, blood_group, religion,
          custom_religion, marital_status, custom_marital_status, status, date_of_birth,
          retirement_year, signature_image
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (military_id) DO UPDATE SET
          profile_photo = EXCLUDED.profile_photo,
          rank = EXCLUDED.rank,
          custom_rank = EXCLUDED.custom_rank,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          nickname = EXCLUDED.nickname,
          position = EXCLUDED.position,
          branch = EXCLUDED.branch,
          custom_branch = EXCLUDED.custom_branch,
          affiliation = EXCLUDED.affiliation,
          custom_affiliation = EXCLUDED.custom_affiliation,
          blood_group = EXCLUDED.blood_group,
          religion = EXCLUDED.religion,
          custom_religion = EXCLUDED.custom_religion,
          marital_status = EXCLUDED.marital_status,
          custom_marital_status = EXCLUDED.custom_marital_status,
          status = EXCLUDED.status,
          date_of_birth = EXCLUDED.date_of_birth,
          retirement_year = EXCLUDED.retirement_year,
          signature_image = EXCLUDED.signature_image
      `,
      [
        alumni.id,
        alumni.profile_photo,
        alumni.military_id,
        alumni.rank,
        alumni.custom_rank,
        alumni.first_name,
        alumni.last_name,
        alumni.nickname,
        alumni.position,
        alumni.branch,
        alumni.custom_branch,
        alumni.affiliation,
        alumni.custom_affiliation,
        alumni.blood_group,
        alumni.religion,
        alumni.custom_religion,
        alumni.marital_status,
        alumni.custom_marital_status,
        alumni.status,
        alumni.date_of_birth,
        alumni.retirement_year,
        alumni.signature_image,
      ]
    );
  }
}

async function seedContacts(client) {
  for (const contact of SEED_CONTACTS) {
    await client.query(
      `
        INSERT INTO contacts (alumni_id, phone_primary, phone_secondary, email, line_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (alumni_id) DO UPDATE SET
          phone_primary = EXCLUDED.phone_primary,
          phone_secondary = EXCLUDED.phone_secondary,
          email = EXCLUDED.email,
          line_id = EXCLUDED.line_id
      `,
      [contact.alumni_id, contact.phone_primary, contact.phone_secondary, contact.email, contact.line_id]
    );
  }
}

async function seedFamily(client) {
  for (const family of SEED_FAMILY) {
    await client.query(
      `
        INSERT INTO family_data (alumni_id, sons_count, daughters_count)
        VALUES ($1, $2, $3)
        ON CONFLICT (alumni_id) DO UPDATE SET
          sons_count = EXCLUDED.sons_count,
          daughters_count = EXCLUDED.daughters_count
      `,
      [family.alumni_id, family.sons_count, family.daughters_count]
    );
  }
}

async function seedAddresses(client) {
  for (const address of SEED_ADDRESSES) {
    await client.query(
      `
        INSERT INTO addresses (alumni_id, house_number, alley, road, subdistrict, district, province, postal_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (alumni_id) DO UPDATE SET
          house_number = EXCLUDED.house_number,
          alley = EXCLUDED.alley,
          road = EXCLUDED.road,
          subdistrict = EXCLUDED.subdistrict,
          district = EXCLUDED.district,
          province = EXCLUDED.province,
          postal_code = EXCLUDED.postal_code
      `,
      [
        address.alumni_id,
        address.house_number,
        address.alley,
        address.road,
        address.subdistrict,
        address.district,
        address.province,
        address.postal_code,
      ]
    );
  }
}

async function seedChildren(client) {
  for (const child of SEED_CHILDREN) {
    await client.query(
      `
        INSERT INTO children (id, alumni_id, title, first_name, last_name, nickname, birth_date, occupation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          alumni_id = EXCLUDED.alumni_id,
          title = EXCLUDED.title,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          nickname = EXCLUDED.nickname,
          birth_date = EXCLUDED.birth_date,
          occupation = EXCLUDED.occupation
      `,
      [child.id, child.alumni_id, child.title, child.first_name, child.last_name, child.nickname, child.birth_date, child.occupation]
    );
  }
}

async function seedPositionHistory(client) {
  for (const position of SEED_POSITIONS) {
    await client.query(
      `
        INSERT INTO position_history (id, alumni_id, position_name, order_number, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          alumni_id = EXCLUDED.alumni_id,
          position_name = EXCLUDED.position_name,
          order_number = EXCLUDED.order_number,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date
      `,
      [position.id, position.alumni_id, position.position_name, position.order_number, position.start_date, position.end_date]
    );
  }
}

async function seedRankHistory(client) {
  for (const rank of SEED_RANKS) {
    await client.query(
      `
        INSERT INTO rank_history (id, alumni_id, rank, rank_name, order_number, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          alumni_id = EXCLUDED.alumni_id,
          rank = EXCLUDED.rank,
          rank_name = EXCLUDED.rank_name,
          order_number = EXCLUDED.order_number,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date
      `,
      [rank.id, rank.alumni_id, rank.rank, rank.rank_name, rank.order_number, rank.start_date, rank.end_date]
    );
  }
}

async function seedEducationHistory(client) {
  for (const education of SEED_EDUCATION) {
    await client.query(
      `
        INSERT INTO education_history (id, alumni_id, institution_name, course_name, class_no, graduated_year)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          alumni_id = EXCLUDED.alumni_id,
          institution_name = EXCLUDED.institution_name,
          course_name = EXCLUDED.course_name,
          class_no = EXCLUDED.class_no,
          graduated_year = EXCLUDED.graduated_year
      `,
      [education.id, education.alumni_id, education.institution_name, education.course_name, education.class_no, education.graduated_year]
    );
  }
}

async function seedPdpaLogs(client) {
  for (const log of SEED_PDPA_LOGS) {
    await client.query(
      `
        INSERT INTO pdpa_consent_logs (id, user_id, consent, consent_at, pdpa_version, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          consent = EXCLUDED.consent,
          consent_at = EXCLUDED.consent_at,
          pdpa_version = EXCLUDED.pdpa_version,
          ip_address = EXCLUDED.ip_address,
          user_agent = EXCLUDED.user_agent
      `,
      [log.id, log.user_id, log.consent, log.consent_at, log.pdpa_version, log.ip_address, log.user_agent]
    );
  }
}

async function seedActivityLogs(client) {
  for (const log of SEED_ACTIVITY_LOGS) {
    await client.query(
      `
        INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          action = EXCLUDED.action,
          entity_type = EXCLUDED.entity_type,
          entity_id = EXCLUDED.entity_id,
          details = EXCLUDED.details,
          ip_address = EXCLUDED.ip_address,
          user_agent = EXCLUDED.user_agent
      `,
      [log.id, log.user_id, log.action, log.entity_type, log.entity_id, log.details, log.ip_address, log.user_agent]
    );
  }
}

async function seedOtpCodes(client) {
  for (const otp of SEED_OTP_CODES) {
    await client.query(
      `
        INSERT INTO auth_otp_codes (id, user_id, phone_number, requester_ip, code_hash, expires_at, consumed_at, attempts, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          phone_number = EXCLUDED.phone_number,
          requester_ip = EXCLUDED.requester_ip,
          code_hash = EXCLUDED.code_hash,
          expires_at = EXCLUDED.expires_at,
          consumed_at = EXCLUDED.consumed_at,
          attempts = EXCLUDED.attempts,
          created_at = EXCLUDED.created_at
      `,
      [
        otp.id,
        otp.user_id,
        otp.phone_number,
        otp.requester_ip,
        otp.code_hash,
        otp.expires_at,
        otp.consumed_at,
        otp.attempts,
        otp.created_at,
      ]
    );
  }
}

async function seedOtpAudit(client) {
  for (const audit of SEED_OTP_AUDIT) {
    await client.query(
      `
        INSERT INTO auth_otp_request_audit (id, phone_number, requester_ip, outcome, reason_code, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          phone_number = EXCLUDED.phone_number,
          requester_ip = EXCLUDED.requester_ip,
          outcome = EXCLUDED.outcome,
          reason_code = EXCLUDED.reason_code,
          created_at = EXCLUDED.created_at
      `,
      [audit.id, audit.phone_number, audit.requester_ip, audit.outcome, audit.reason_code, audit.created_at]
    );
  }
}

async function seedEvents(client) {
  for (const event of SEED_EVENTS) {
    await client.query(
      `
        INSERT INTO events (id, title, description, event_date, location, max_attendees, cover_image, status, created_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          event_date = EXCLUDED.event_date,
          location = EXCLUDED.location,
          max_attendees = EXCLUDED.max_attendees,
          cover_image = EXCLUDED.cover_image,
          status = EXCLUDED.status,
          created_by = EXCLUDED.created_by,
          updated_at = EXCLUDED.updated_at
      `,
      [
        event.id,
        event.title,
        event.description,
        event.event_date,
        event.location,
        event.max_attendees,
        event.cover_image,
        event.status,
        event.created_by,
        event.updated_at,
      ]
    );
  }
}

async function seedEventRegistrations(client) {
  for (const registration of SEED_EVENT_REGISTRATIONS) {
    await client.query(
      `
        INSERT INTO event_registrations (id, event_id, alumni_id, attendees_count, status, registered_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          event_id = EXCLUDED.event_id,
          alumni_id = EXCLUDED.alumni_id,
          attendees_count = EXCLUDED.attendees_count,
          status = EXCLUDED.status,
          registered_at = EXCLUDED.registered_at
      `,
      [
        registration.id,
        registration.event_id,
        registration.alumni_id,
        registration.attendees_count,
        registration.status,
        registration.registered_at,
      ]
    );
  }
}

async function seedFundPurposes(client) {
  for (const purpose of SEED_FUND_PURPOSES) {
    await client.query(
      `
        INSERT INTO fund_purposes (id, name, target_amount, description, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          target_amount = EXCLUDED.target_amount,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active
      `,
      [purpose.id, purpose.name, purpose.target_amount, purpose.description, purpose.is_active]
    );
  }
}

async function seedFundContributions(client) {
  for (const contribution of SEED_FUND_CONTRIBUTIONS) {
    await client.query(
      `
        INSERT INTO fund_contributions (
          id, alumni_id, alumni_name, amount, purpose, note, payment_method, slip_image,
          status, approved_by, contribution_date, approved_at, transaction_type, expense_category, recorded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          alumni_id = EXCLUDED.alumni_id,
          alumni_name = EXCLUDED.alumni_name,
          amount = EXCLUDED.amount,
          purpose = EXCLUDED.purpose,
          note = EXCLUDED.note,
          payment_method = EXCLUDED.payment_method,
          slip_image = EXCLUDED.slip_image,
          status = EXCLUDED.status,
          approved_by = EXCLUDED.approved_by,
          contribution_date = EXCLUDED.contribution_date,
          approved_at = EXCLUDED.approved_at,
          transaction_type = EXCLUDED.transaction_type,
          expense_category = EXCLUDED.expense_category,
          recorded_by = EXCLUDED.recorded_by
      `,
      [
        contribution.id,
        contribution.alumni_id,
        contribution.alumni_name,
        contribution.amount,
        contribution.purpose,
        contribution.note,
        contribution.payment_method,
        contribution.slip_image,
        contribution.status,
        contribution.approved_by,
        contribution.contribution_date,
        contribution.approved_at,
        contribution.transaction_type,
        contribution.expense_category,
        contribution.recorded_by,
      ]
    );
  }
}

async function seedBirthdayLogs(client) {
  for (const log of SEED_BIRTHDAY_LOGS) {
    await client.query(
      `
        INSERT INTO birthday_message_logs (log_date, alumni_id, status, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (log_date, alumni_id) DO UPDATE SET
          status = EXCLUDED.status,
          error_message = EXCLUDED.error_message,
          sent_at = EXCLUDED.sent_at
      `,
      [log.log_date, log.alumni_id, log.status, log.error_message, log.sent_at]
    );
  }
}

async function seedSettings(client) {
  for (const setting of SEED_SETTINGS) {
    await client.query(
      `
        INSERT INTO system_settings (key, value, updated_by, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at
      `,
      [setting.key, setting.value, setting.updated_by, setting.updated_at]
    );
  }
}

async function seedAll(client) {
  await seedUsers(client);
  await seedAlumni(client);
  await seedContacts(client);
  await seedFamily(client);
  await seedAddresses(client);
  await seedChildren(client);
  await seedPositionHistory(client);
  await seedRankHistory(client);
  await seedEducationHistory(client);
  await seedPdpaLogs(client);
  await seedActivityLogs(client);
  await seedOtpCodes(client);
  await seedOtpAudit(client);
  await seedEvents(client);
  await seedEventRegistrations(client);
  await seedFundPurposes(client);
  await seedFundContributions(client);
  await seedBirthdayLogs(client);
  await seedSettings(client);
}

async function initDatabase() {
  const client = await pool.connect();
  try {
    await assertSchemaPrivileges(client);
    await client.query('BEGIN');
    await ensureSchema(client);
    await seedAll(client);
    await client.query('COMMIT');

    console.log('✅ Database schema created/verified successfully');
    console.log('✅ Seed data applied for all tables');
    console.log(`✅ Default super admin: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`);
    console.log('ℹ️  Override admin credentials with SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '42501' || error?.code === 'SCHEMA_PRIVILEGE_CHECK_FAILED') {
      console.error('❌ Error setting up database:\n' + error.message);
    } else {
      console.error('❌ Error setting up database:', error);
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
