import { describe, it, expect, beforeEach, vi } from 'vitest';
import pool from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { GET } from '@/app/api/auth/line/route';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  generateToken: vi.fn(),
}));

vi.mock('@/lib/pdpa', () => ({
  CURRENT_PDPA_VERSION: 'v1.0',
  needsPdpaReconsent: vi.fn(() => false),
}));

describe('GET /api/auth/line', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINE_CHANNEL_ID = '1234567890';
    process.env.LINE_CHANNEL_SECRET = 'line-secret';
    delete process.env.LINE_PUBLIC_URL;
  });

  it('redirects to LINE authorize URL when start=1', async () => {
    const response = await GET({ url: 'http://localhost:3000/api/auth/line?start=1' });
    const location = response.headers.get('location');

    expect([302, 307]).toContain(response.status);
    expect(location).toContain('https://access.line.me/oauth2/v2.1/authorize');
    expect(location).toContain('client_id=1234567890');
  });

  it('uses configured LINE_PUBLIC_URL instead of request origin when starting login', async () => {
    process.env.LINE_PUBLIC_URL = 'https://public.example.com';

    const response = await GET({ url: 'http://localhost:3000/api/auth/line?start=1' });
    const location = response.headers.get('location');

    expect([302, 307]).toContain(response.status);
    expect(location).toContain(encodeURIComponent('https://public.example.com/api/auth/line'));
  });

  it('logs in using linked line_user_id even when LINE does not return email', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ access_token: 'line-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: 'U1234567890abcdef' }),
      });

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          email: 'user@example.com',
          phone_number: '0912345678',
          first_name: 'Line',
          last_name: 'User',
          role: 'user',
          status: 'approved',
          pdpa_consent: true,
          pdpa_consent_at: '2026-03-20T00:00:00.000Z',
          pdpa_version: 'v1.0',
          line_user_id: 'U1234567890abcdef',
        },
      ],
    });

    generateToken.mockReturnValue('jwt-token');

    const response = await GET({ url: 'http://localhost:3000/api/auth/line?code=abc123' });
    const location = response.headers.get('location');
    const lineAuthParam = new URL(location).searchParams.get('line_auth');
    const payload = JSON.parse(Buffer.from(lineAuthParam, 'base64url').toString('utf8'));

    expect([302, 307]).toContain(response.status);
    expect(location).toContain('/login?line_auth=');
    expect(payload.token).toBe('jwt-token');
    expect(payload.user.email).toBe('user@example.com');
    expect(payload.user.line_user_id).toBe('U1234567890abcdef');
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE line_user_id = $1', ['U1234567890abcdef']);
  });

  it('redirects unregistered LINE user to register with prefilled email and line_user_id', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ access_token: 'line-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: 'Uabcdef1234567890', email: 'new.user@example.com' }),
      });

    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await GET({ url: 'http://localhost:3000/api/auth/line?code=abc123' });
    const location = response.headers.get('location');

    expect([302, 307]).toContain(response.status);
    expect(location).toContain('/register?');
    expect(location).toContain('line_email=new.user%40example.com');
    expect(location).toContain('line_user_id=Uabcdef1234567890');
  });

  it('redirects new users to configured public register URL when LINE_PUBLIC_URL is set', async () => {
    process.env.LINE_PUBLIC_URL = 'https://public.example.com';

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ access_token: 'line-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: 'Uabcdef1234567890', email: 'new.user@example.com', name: 'Line User' }),
      });

    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await GET({ url: 'http://localhost:3000/api/auth/line?code=abc123' });
    const location = response.headers.get('location');

    expect([302, 307]).toContain(response.status);
    expect(location.startsWith('https://public.example.com/register?')).toBe(true);
    expect(location).toContain('line_name=Line+User');
  });

  it('links LINE account by registered phone hint when email is unavailable', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ access_token: 'line-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: 'Uline-by-phone-001' }),
      });

    const existingUser = {
      id: 'user-phone-1',
      email: 'phone.user@example.com',
      phone_number: '0911111111',
      first_name: 'Phone',
      last_name: 'Linked',
      role: 'user',
      status: 'approved',
      pdpa_consent: true,
      pdpa_consent_at: '2026-03-20T00:00:00.000Z',
      pdpa_version: 'v1.0',
      line_user_id: 'Uline-by-phone-001',
    };

    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [existingUser] })
      .mockResolvedValueOnce({ rows: [existingUser] });

    generateToken.mockReturnValue('jwt-token-phone');

    const state = Buffer.from(
      JSON.stringify({ nonce: 'nonce-1', phone_hint: '0911111111' }),
      'utf8'
    ).toString('base64url');

    const response = await GET({ url: `http://localhost:3000/api/auth/line?code=abc123&state=${state}` });
    const location = response.headers.get('location');

    expect([302, 307]).toContain(response.status);
    expect(location).toContain('/login?line_auth=');
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE line_user_id = $1', ['Uline-by-phone-001']);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE phone_number = $1 OR military_id = $1'),
      ['0911111111']
    );
  });
});
