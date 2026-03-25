import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQueryMock, sendLineMessageMock } = vi.hoisted(() => ({
  poolQueryMock: vi.fn(),
  sendLineMessageMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: {
    query: poolQueryMock,
  },
}));

vi.mock('@/lib/lineMessaging', () => ({
  sendLineMessage: sendLineMessageMock,
}));

import { POST } from '@/app/api/auth/otp/request/route';

function createReq(phoneNumber, ip = '203.0.113.11') {
  return {
    json: async () => ({ phone_number: phoneNumber }),
    headers: {
      get: (key) => {
        const normalized = String(key || '').toLowerCase();
        if (normalized === 'x-forwarded-for') return ip;
        return null;
      },
    },
  };
}

describe('POST /api/auth/otp/request', () => {
  let scenario;

  beforeEach(() => {
    vi.clearAllMocks();

    scenario = {
      recentAgeSeconds: null,
      phoneAttempts15m: 0,
      ipAttempts15m: 0,
      user: {
        id: 'user-1',
        phone_number: '0912345678',
        line_user_id: 'U1234567890',
        status: 'approved',
      },
      lineSuccess: true,
    };

    sendLineMessageMock.mockImplementation(async () => ({ success: scenario.lineSuccess }));

    poolQueryMock.mockImplementation(async (sql) => {
      const query = String(sql || '');

      if (
        query.includes('CREATE TABLE IF NOT EXISTS auth_otp_codes') ||
        query.includes('ALTER TABLE auth_otp_codes') ||
        query.includes('CREATE INDEX IF NOT EXISTS idx_auth_otp_codes')
      ) {
        return { rows: [] };
      }

      if (query.includes('EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age_seconds')) {
        if (scenario.recentAgeSeconds === null) {
          return { rows: [] };
        }
        return { rows: [{ age_seconds: scenario.recentAgeSeconds }] };
      }

      if (query.includes('WHERE phone_number = $1') && query.includes("INTERVAL '15 minutes'")) {
        return { rows: [{ count: scenario.phoneAttempts15m }] };
      }

      if (query.includes('WHERE requester_ip = $1::inet') && query.includes("INTERVAL '15 minutes'")) {
        return { rows: [{ count: scenario.ipAttempts15m }] };
      }

      if (query.includes('FROM users') && query.includes('WHERE (phone_number = $1 OR military_id = $1)')) {
        return { rows: scenario.user ? [scenario.user] : [] };
      }

      if (query.includes('UPDATE auth_otp_codes') || query.includes('INSERT INTO auth_otp_codes')) {
        return { rows: [], rowCount: 1 };
      }

      return { rows: [] };
    });
  });

  it('returns 400 when phone number is invalid', async () => {
    const response = await POST(createReq('0899'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain('เบอร์โทรศัพท์ 10 หลัก');
  });

  it('returns 429 when resend cooldown has not elapsed', async () => {
    scenario.recentAgeSeconds = 15;

    const response = await POST(createReq('0912345678'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.code).toBe('otp_resend_too_soon');
    expect(body.retry_after_seconds).toBe(45);
  });

  it('applies longer cooldown when recent request volume is higher', async () => {
    scenario.phoneAttempts15m = 2;
    scenario.recentAgeSeconds = 200;

    const response = await POST(createReq('0912345678'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.code).toBe('otp_resend_too_soon');
    expect(body.retry_after_seconds).toBe(100);
  });

  it('returns 429 when phone rate limit is exceeded', async () => {
    scenario.recentAgeSeconds = 400;
    scenario.phoneAttempts15m = 3;

    const response = await POST(createReq('0912345678'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.code).toBe('otp_phone_rate_limited');
  });

  it('returns 429 when ip rate limit is exceeded', async () => {
    scenario.recentAgeSeconds = 120;
    scenario.phoneAttempts15m = 1;
    scenario.ipAttempts15m = 10;

    const response = await POST(createReq('0912345678', '203.0.113.77'));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.code).toBe('otp_ip_rate_limited');
  });

  it('returns challenge details when request succeeds', async () => {
    scenario.recentAgeSeconds = 120;
    scenario.phoneAttempts15m = 0;
    scenario.ipAttempts15m = 2;

    const response = await POST(createReq('0912345678'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.challenge_id).toBeTruthy();
    expect(body.expires_in_seconds).toBe(300);
    expect(body.resend_after_seconds).toBe(60);
    expect(sendLineMessageMock).toHaveBeenCalledTimes(1);
  });
});
