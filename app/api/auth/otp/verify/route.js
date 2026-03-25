import crypto from 'crypto';
import pool from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { CURRENT_PDPA_VERSION, needsPdpaReconsent } from '@/lib/pdpa';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

let otpTableReadyPromise;

function ensureOtpTable() {
  if (!otpTableReadyPromise) {
    otpTableReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_otp_codes (
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          phone_number VARCHAR(10) NOT NULL,
          code_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          consumed_at TIMESTAMP,
          attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_user_created ON auth_otp_codes(user_id, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_phone_created ON auth_otp_codes(phone_number, created_at DESC)');
    })();
  }

  return otpTableReadyPromise;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

function hashOtpCode(challengeId, code) {
  return crypto
    .createHash('sha256')
    .update(`${challengeId}:${code}`)
    .digest('hex');
}

export async function POST(req) {
  try {
    await ensureOtpTable();

    const body = await req.json();
    const challengeId = String(body?.challenge_id || '').trim();
    const phoneNumber = normalizePhone(body?.phone_number);
    const otpCode = String(body?.otp_code || '').replace(/\D/g, '').slice(0, 6);

    if (!challengeId || !/^\d{10}$/.test(phoneNumber) || !/^\d{6}$/.test(otpCode)) {
      return Response.json(
        { message: 'ข้อมูล OTP ไม่ครบถ้วนหรือไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const otpResult = await pool.query(
      `SELECT *
       FROM auth_otp_codes
       WHERE id = $1 AND phone_number = $2 AND consumed_at IS NULL
       LIMIT 1`,
      [challengeId, phoneNumber]
    );

    if (otpResult.rows.length === 0) {
      return Response.json(
        { message: 'ไม่พบรายการ OTP หรือ OTP ถูกใช้งานไปแล้ว' },
        { status: 400 }
      );
    }

    const otpRow = otpResult.rows[0];

    if (new Date(otpRow.expires_at).getTime() <= Date.now()) {
      await pool.query('UPDATE auth_otp_codes SET consumed_at = NOW() WHERE id = $1', [challengeId]);
      return Response.json(
        { message: 'OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' },
        { status: 400 }
      );
    }

    const incomingHash = hashOtpCode(challengeId, otpCode);
    if (incomingHash !== otpRow.code_hash) {
      const nextAttempts = Number(otpRow.attempts || 0) + 1;
      await pool.query(
        `UPDATE auth_otp_codes
         SET attempts = attempts + 1,
             consumed_at = CASE WHEN attempts + 1 >= 5 THEN NOW() ELSE consumed_at END
         WHERE id = $1`,
        [challengeId]
      );

      return Response.json(
        { message: nextAttempts >= 5 ? 'ใส่ OTP ผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่' : 'OTP ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    await pool.query('UPDATE auth_otp_codes SET consumed_at = NOW() WHERE id = $1', [challengeId]);

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [otpRow.user_id]);
    if (userResult.rows.length === 0) {
      return Response.json({ message: 'ไม่พบบัญชีผู้ใช้' }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (user.status === 'pending') {
      return Response.json(
        { message: 'บัญชีของคุณกำลังรออนุมัติจากผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    if (user.status === 'rejected') {
      return Response.json(
        { message: 'บัญชีของคุณถูกระงับการใช้งาน' },
        { status: 403 }
      );
    }

    await logActivity(user.id, 'LOGIN', 'user', user.id, { phone: user.phone_number || user.military_id, role: user.role, method: 'otp' }, req);

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number || user.military_id,
    });

    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number || user.military_id,
        line_user_id: user.line_user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        pdpa_consent: !!user.pdpa_consent,
        pdpa_consent_at: user.pdpa_consent_at,
        pdpa_version: user.pdpa_version,
        pdpa_needs_reconsent: needsPdpaReconsent(user),
        current_pdpa_version: CURRENT_PDPA_VERSION,
      },
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
