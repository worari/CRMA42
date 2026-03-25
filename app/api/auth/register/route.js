import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import crypto from 'crypto';
import { CURRENT_PDPA_VERSION } from '@/lib/pdpa';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, password, phone_number, line_user_id, first_name, last_name, pdpa_consent, pdpa_version } = await req.json();
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const normalizedPhone = String(phone_number ?? '').replace(/\D/g, '');
    const normalizedLineUserId = String(line_user_id ?? '').trim();
    
    const isLineRegistration = Boolean(normalizedLineUserId);
    if (!normalizedEmail || !first_name || !last_name) {
      return Response.json(
        { message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ นามสกุล และอีเมล)' },
        { status: 400 }
      );
    }
    if (!isLineRegistration && !password) {
      return Response.json(
        { message: 'กรุณากรอกรหัสผ่าน' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return Response.json(
        { message: 'กรุณากรอกอีเมลให้ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return Response.json(
        { message: 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก (ตัวเลขเท่านั้น)' },
        { status: 400 }
      );
    }

    if (normalizedLineUserId && !/^U[0-9a-fA-F]{10,}$/.test(normalizedLineUserId)) {
      return Response.json(
        { message: 'LINE User ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (!pdpa_consent) {
      return Response.json(
        { message: 'กรุณายินยอมการใช้ข้อมูลส่วนบุคคล (PDPA) ก่อนสมัครสมาชิก' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (userExists.rows.length > 0) {
      return Response.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password — LINE registrations get a random unguessable password (auth is via LINE)
    const salt = await bcrypt.genSalt(10);
    const passwordToHash = password || crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(passwordToHash, salt);

    const id = crypto.randomUUID();
    const role = 'user';
    const status = 'pending';
    const consentAt = new Date();
    const consentVersion = pdpa_version || CURRENT_PDPA_VERSION;

    const newUser = await pool.query(
      `INSERT INTO users (id, email, password_hash, phone_number, line_user_id, military_id, first_name, last_name, pdpa_consent, pdpa_consent_at, pdpa_version, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, email, phone_number, line_user_id, first_name, last_name, role, status, pdpa_consent, pdpa_consent_at, pdpa_version`,
      [id, normalizedEmail, hashedPassword, normalizedPhone, normalizedLineUserId || null, normalizedPhone, first_name, last_name, true, consentAt, consentVersion, role, status]
    );

    await pool.query(
      `INSERT INTO pdpa_consent_logs (id, user_id, consent, pdpa_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        crypto.randomUUID(),
        id,
        true,
        consentVersion,
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null,
      ]
    );

    return Response.json(
      {
        message: 'Registration successful! Please wait for admin approval.',
        user: newUser.rows[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error during registration:', error);

    if (error?.code === '28P01') {
      return Response.json(
        { message: 'Database authentication failed. Please check DB credentials in .env.local' },
        { status: 500 }
      );
    }

    if (error?.code === '42P01') {
      return Response.json(
        { message: 'Database tables not found. Please run: npm run init-db' },
        { status: 500 }
      );
    }

    return Response.json(
      { message: 'Server Error' },
      { status: 500 }
    );
  }
}
