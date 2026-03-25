import { beforeEach, describe, expect, it, vi } from 'vitest';

const { poolQueryMock, getTokenFromRequestMock, verifyTokenMock } = vi.hoisted(() => ({
  poolQueryMock: vi.fn(),
  getTokenFromRequestMock: vi.fn(),
  verifyTokenMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: {
    query: poolQueryMock,
  },
}));

vi.mock('@/lib/auth', () => ({
  getTokenFromRequest: getTokenFromRequestMock,
  verifyToken: verifyTokenMock,
}));

import { GET } from '@/app/api/auth/otp/analytics/route';

describe('GET /api/auth/otp/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    getTokenFromRequestMock.mockReturnValue(null);

    const response = await GET({ headers: {} });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toContain('No token');
  });

  it('returns 403 for non-super-admin users', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ role: 'user' });

    const response = await GET({ headers: {} });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toContain('Super Admin');
  });

  it('returns analytics payload for super admin', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ role: 'super_admin' });

    poolQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            total_in_range: 22,
            sent_in_range: 14,
            blocked_in_range: 7,
            failed_in_range: 1,
            total_24h: 22,
            total_15m: 5,
            sent_24h: 14,
            blocked_24h: 7,
            failed_24h: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ phone_number: '0912345678', total_in_range: 3, blocked_in_range: 2 }] })
      .mockResolvedValueOnce({ rows: [{ requester_ip: '203.0.113.10', total_in_range: 5, blocked_in_range: 3 }] })
      .mockResolvedValueOnce({ rows: [{ phone_number: '0912345678', outcome: 'blocked', reason_code: 'otp_phone_rate_limited' }] });

    const response = await GET({ headers: {}, url: 'http://localhost/api/auth/otp/analytics?range=24h' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.range).toBe('24h');
    expect(body.summary.total_in_range).toBe(22);
    expect(body.summary.total_24h).toBe(22);
    expect(body.top_phones.length).toBe(1);
    expect(body.top_ips.length).toBe(1);
    expect(body.recent_events.length).toBe(1);
  });

  it('supports selecting custom range via query string', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ role: 'super_admin' });

    poolQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_in_range: 2, sent_in_range: 1, blocked_in_range: 1, failed_in_range: 0, total_15m: 0, total_24h: 2, sent_24h: 1, blocked_24h: 1, failed_24h: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await GET({ headers: {}, url: 'http://localhost/api/auth/otp/analytics?range=7d' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.range).toBe('7d');
    expect(body.summary.range_label).toBe('7 วัน');
    expect(poolQueryMock).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '7 days'"), []);
  });

  it('supports custom from-to date range', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ role: 'super_admin' });

    poolQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_in_range: 4, sent_in_range: 3, blocked_in_range: 1, failed_in_range: 0, total_15m: 0, total_24h: 4, sent_24h: 3, blocked_24h: 1, failed_24h: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await GET({ headers: {}, url: 'http://localhost/api/auth/otp/analytics?range=custom&from=2026-03-01&to=2026-03-21' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.range).toBe('custom');
    expect(body.summary.range_label).toContain('2026-03-01');
    expect(poolQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('created_at >= $1::timestamptz AND created_at <= $2::timestamptz'),
      ['2026-03-01T00:00:00.000Z', '2026-03-21T23:59:59.999Z']
    );
  });
});
