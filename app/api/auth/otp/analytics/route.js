import pool from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const RANGE_CONFIG = {
  '15m': { interval: '15 minutes', label: '15 นาที' },
  '1h': { interval: '1 hour', label: '1 ชั่วโมง' },
  '24h': { interval: '24 hours', label: '24 ชั่วโมง' },
  '7d': { interval: '7 days', label: '7 วัน' },
};

function parseDateOnly(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getFilterSpec(req) {
  try {
    const url = new URL(req?.url || 'http://localhost/api/auth/otp/analytics');
    const requestedRange = String(url.searchParams.get('range') || '24h').toLowerCase();

    if (requestedRange === 'custom') {
      const fromDate = parseDateOnly(url.searchParams.get('from'));
      const toDate = parseDateOnly(url.searchParams.get('to'));

      if (!fromDate || !toDate) {
        return { error: 'invalid_custom_range' };
      }

      const start = new Date(`${url.searchParams.get('from')}T00:00:00.000Z`);
      const end = new Date(`${url.searchParams.get('to')}T23:59:59.999Z`);

      if (start.getTime() > end.getTime()) {
        return { error: 'invalid_custom_range_order' };
      }

      return {
        rangeKey: 'custom',
        label: `กำหนดเอง ${url.searchParams.get('from')} ถึง ${url.searchParams.get('to')}`,
        whereClause: 'created_at >= $1::timestamptz AND created_at <= $2::timestamptz',
        params: [start.toISOString(), end.toISOString()],
      };
    }

    const selectedRange = RANGE_CONFIG[requestedRange] ? requestedRange : '24h';
    const rangeConfig = RANGE_CONFIG[selectedRange];

    return {
      rangeKey: selectedRange,
      label: rangeConfig.label,
      whereClause: `created_at >= NOW() - INTERVAL '${rangeConfig.interval}'`,
      params: [],
    };
  } catch {
    return {
      rangeKey: '24h',
      label: RANGE_CONFIG['24h'].label,
      whereClause: `created_at >= NOW() - INTERVAL '${RANGE_CONFIG['24h'].interval}'`,
      params: [],
    };
  }
}

async function ensureOtpAuditTable() {
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
}

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json({ message: 'Unauthorized - Super Admin access required' }, { status: 403 });
    }

    await ensureOtpAuditTable();

    const filterSpec = getFilterSpec(req);
    if (filterSpec?.error === 'invalid_custom_range' || filterSpec?.error === 'invalid_custom_range_order') {
      return Response.json({ message: 'Invalid custom range. Please provide valid from/to dates.' }, { status: 400 });
    }

    const rangeParams = filterSpec.params || [];
    const whereClause = filterSpec.whereClause;

    const [summaryResult, topPhonesResult, topIpsResult, recentResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_in_range,
          COUNT(*) FILTER (WHERE outcome = 'sent')::int AS sent_in_range,
          COUNT(*) FILTER (WHERE outcome = 'blocked')::int AS blocked_in_range,
          COUNT(*) FILTER (WHERE outcome = 'failed')::int AS failed_in_range,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '15 minutes')::int AS total_15m,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS total_24h,
          COUNT(*) FILTER (WHERE outcome = 'sent' AND created_at >= NOW() - INTERVAL '24 hours')::int AS sent_24h,
          COUNT(*) FILTER (WHERE outcome = 'blocked' AND created_at >= NOW() - INTERVAL '24 hours')::int AS blocked_24h,
          COUNT(*) FILTER (WHERE outcome = 'failed' AND created_at >= NOW() - INTERVAL '24 hours')::int AS failed_24h
        FROM auth_otp_request_audit
        WHERE ${whereClause}
      `, rangeParams),
      pool.query(`
        SELECT
          phone_number,
          COUNT(*)::int AS total_in_range,
          COUNT(*) FILTER (WHERE outcome = 'blocked')::int AS blocked_in_range
        FROM auth_otp_request_audit
        WHERE ${whereClause}
        GROUP BY phone_number
        ORDER BY total_in_range DESC, blocked_in_range DESC, phone_number ASC
        LIMIT 10
      `, rangeParams),
      pool.query(`
        SELECT
          COALESCE(host(requester_ip), 'unknown') AS requester_ip,
          COUNT(*)::int AS total_in_range,
          COUNT(*) FILTER (WHERE outcome = 'blocked')::int AS blocked_in_range
        FROM auth_otp_request_audit
        WHERE ${whereClause}
        GROUP BY requester_ip
        ORDER BY total_in_range DESC, blocked_in_range DESC, requester_ip ASC
        LIMIT 10
      `, rangeParams),
      pool.query(`
        SELECT
          phone_number,
          COALESCE(host(requester_ip), 'unknown') AS requester_ip,
          outcome,
          reason_code,
          created_at
        FROM auth_otp_request_audit
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT 50
      `, rangeParams),
    ]);

    const summary = summaryResult.rows[0] || {
      total_in_range: 0,
      sent_in_range: 0,
      blocked_in_range: 0,
      failed_in_range: 0,
      total_24h: 0,
      total_15m: 0,
      sent_24h: 0,
      blocked_24h: 0,
      failed_24h: 0,
    };

    return Response.json({
      range: filterSpec.rangeKey,
      summary: {
        ...summary,
        range_key: filterSpec.rangeKey,
        range_label: filterSpec.label,
      },
      top_phones: topPhonesResult.rows || [],
      top_ips: topIpsResult.rows || [],
      // Keep legacy keys for compatibility with existing UI/tests.
      top_phones_15m: topPhonesResult.rows || [],
      top_ips_15m: topIpsResult.rows || [],
      recent_events: recentResult.rows || [],
    });
  } catch (error) {
    console.error('Error fetching OTP analytics:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
