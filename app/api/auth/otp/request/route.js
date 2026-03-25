import crypto from 'crypto';
import pool from '@/lib/db';
import { sendLineMessage } from '@/lib/lineMessaging';

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
          requester_ip INET,
          code_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          consumed_at TIMESTAMP,
          attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query('ALTER TABLE auth_otp_codes ADD COLUMN IF NOT EXISTS requester_ip INET');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_user_created ON auth_otp_codes(user_id, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_phone_created ON auth_otp_codes(phone_number, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_ip_created ON auth_otp_codes(requester_ip, created_at DESC)');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS auth_otp_request_audit (
          id UUID PRIMARY KEY,
          phone_number VARCHAR(10) NOT NULL,
          requester_ip INET,
          outcome VARCHAR(20) NOT NULL,
          reason_code VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_phone_created ON auth_otp_request_audit(phone_number, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_ip_created ON auth_otp_request_audit(requester_ip, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_otp_audit_outcome_created ON auth_otp_request_audit(outcome, created_at DESC)');
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

function getRequesterIp(req) {
  const forwardedFor = String(req.headers.get('x-forwarded-for') || '').trim();
  const realIp = String(req.headers.get('x-real-ip') || '').trim();
  const candidate = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp;
  return candidate || null;
}

async function logOtpAudit(phoneNumber, requesterIp, outcome, reasonCode = null) {
  try {
    await pool.query(
      `INSERT INTO auth_otp_request_audit (id, phone_number, requester_ip, outcome, reason_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), phoneNumber, requesterIp, outcome, reasonCode]
    );
  } catch (error) {
    console.error('Failed to write OTP audit log:', error);
  }
}

export async function POST(req) {
  try {
    await ensureOtpTable();

    const body = await req.json();
    const phoneNumber = normalizePhone(body?.phone_number);
    const requesterIp = getRequesterIp(req);

    if (!/^\d{10}$/.test(phoneNumber)) {
      return Response.json(
        { message: 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก' },
        { status: 400 }
      );
    }

    // Rate limit by phone in rolling 15-minute window.
    const phoneRateResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM auth_otp_codes
       WHERE phone_number = $1
         AND created_at >= NOW() - INTERVAL '15 minutes'`,
      [phoneNumber]
    );
    const phoneAttempts = Number(phoneRateResult.rows[0]?.count || 0);

    // Progressive cooldown by request volume.
    const resendCooldownSeconds = phoneAttempts >= 2 ? 300 : phoneAttempts >= 1 ? 120 : 60;

    // Enforce resend cooldown per phone for better UX and abuse mitigation.
    const recentPhoneRequest = await pool.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age_seconds
       FROM auth_otp_codes
       WHERE phone_number = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber]
    );

    if (recentPhoneRequest.rows.length > 0) {
      const ageSeconds = Number(recentPhoneRequest.rows[0].age_seconds || 0);
      if (ageSeconds < resendCooldownSeconds) {
        const retryAfter = Math.max(1, resendCooldownSeconds - ageSeconds);
        await logOtpAudit(phoneNumber, requesterIp, 'blocked', 'otp_resend_too_soon');
        return Response.json(
          {
            message: `กรุณารอ ${retryAfter} วินาทีก่อนขอ OTP ใหม่`,
            code: 'otp_resend_too_soon',
            retry_after_seconds: retryAfter,
          },
          { status: 429 }
        );
      }
    }

    if (phoneAttempts >= 3) {
      await logOtpAudit(phoneNumber, requesterIp, 'blocked', 'otp_phone_rate_limited');
      return Response.json(
        {
          message: 'ขอ OTP เกินจำนวนครั้งที่กำหนดในช่วงเวลา 15 นาที กรุณาลองใหม่ภายหลัง',
          code: 'otp_phone_rate_limited',
          retry_after_seconds: 900,
        },
        { status: 429 }
      );
    }

    // Rate limit by requester IP in rolling 15-minute window.
    if (requesterIp) {
      const ipRateResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM auth_otp_codes
         WHERE requester_ip = $1::inet
           AND created_at >= NOW() - INTERVAL '15 minutes'`,
        [requesterIp]
      );
      const ipAttempts = Number(ipRateResult.rows[0]?.count || 0);
      if (ipAttempts >= 10) {
        await logOtpAudit(phoneNumber, requesterIp, 'blocked', 'otp_ip_rate_limited');
        return Response.json(
          {
            message: 'มีการขอ OTP จากเครือข่ายนี้บ่อยเกินไป กรุณาลองใหม่ภายหลัง',
            code: 'otp_ip_rate_limited',
            retry_after_seconds: 900,
          },
          { status: 429 }
        );
      }
    }

    const userResult = await pool.query(
      `SELECT *
       FROM users
       WHERE (phone_number = $1 OR military_id = $1)
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber]
    );

    if (userResult.rows.length === 0) {
      await logOtpAudit(phoneNumber, requesterIp, 'blocked', 'otp_user_not_found');
      return Response.json(
        { message: 'ไม่พบบัญชีผู้ใช้ที่ผูกกับเบอร์โทรศัพท์นี้' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (user.status === 'pending') {
      await logOtpAudit(phoneNumber, requesterIp, 'blocked', 'otp_user_pending');
      return Response.json(
        { message: 'บัญชีของคุณกำลังรออนุมัติจากผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    if (user.status === 'rejected') {
      await logOtpAudit(phoneNumber, requesterIp, 'blocked', 'otp_user_rejected');
      return Response.json(
        { message: 'บัญชีของคุณถูกระงับการใช้งาน' },
        { status: 403 }
      );
    }

    if (!user.line_user_id) {
      await logOtpAudit(phoneNumber, requesterIp, 'blocked', 'line_not_linked');
      return Response.json(
        {
          message: 'เบอร์โทรนี้ยังไม่ได้ผูก LINE Login กรุณาเข้าสู่ระบบด้วย LINE ก่อนเพื่อเชื่อมบัญชี',
          code: 'line_not_linked',
        },
        { status: 400 }
      );
    }

    const otpCode = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const challengeId = crypto.randomUUID();
    const codeHash = hashOtpCode(challengeId, otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await pool.query(
      `UPDATE auth_otp_codes
       SET consumed_at = NOW()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );

    await pool.query(
      `INSERT INTO auth_otp_codes (id, user_id, phone_number, requester_ip, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [challengeId, user.id, phoneNumber, requesterIp, codeHash, expiresAt]
    );

    const lineResult = await sendLineMessage(
      user.line_user_id,
      `รหัส OTP สำหรับเข้าสู่ระบบ CRMA42 คือ ${otpCode}\nรหัสจะหมดอายุใน 5 นาที\nหากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยข้อความนี้`
    );

    if (!lineResult.success) {
      await logOtpAudit(phoneNumber, requesterIp, 'failed', 'otp_line_send_failed');
      return Response.json(
        { message: 'ไม่สามารถส่ง OTP ผ่าน LINE ได้ กรุณาลองใหม่อีกครั้ง' },
        { status: 502 }
      );
    }

    await logOtpAudit(phoneNumber, requesterIp, 'sent', null);

    return Response.json({
      challenge_id: challengeId,
      expires_in_seconds: 300,
      resend_after_seconds: resendCooldownSeconds,
      message: 'ส่งรหัส OTP ไปยัง LINE ที่ผูกกับเบอร์โทรศัพท์นี้แล้ว',
    });
  } catch (error) {
    console.error('OTP request error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
