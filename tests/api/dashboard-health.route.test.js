import pool from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { GET } from '@/app/api/dashboard/health/route';

vi.mock('@/lib/db', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getTokenFromRequest: vi.fn(),
  verifyToken: vi.fn(),
}));

describe('GET /api/dashboard/health smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    getTokenFromRequest.mockReturnValue(null);

    const response = await GET({ headers: {} });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe('Authentication required');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns health payload for authenticated request', async () => {
    getTokenFromRequest.mockReturnValue('valid-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });

    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '10' }] })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const response = await GET({
      headers: { authorization: 'Bearer valid-token' },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalProfiles).toBe(10);
    expect(body.healthScore).toBe(90);
    expect(body.issues.length).toBe(4);
  });
});
