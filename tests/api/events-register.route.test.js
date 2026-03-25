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

import { POST, DELETE } from '@/app/api/events/[id]/register/route';

describe('Events register API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST returns 401 when token missing', async () => {
    getTokenFromRequestMock.mockReturnValue(null);

    const response = await POST({
      json: async () => ({}),
    }, { params: Promise.resolve({ id: 'event-1' }) });

    expect(response.status).toBe(401);
  });

  it('POST registers successfully using resolved alumni id from logged-in user', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ id: 'user-1', role: 'user' });

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'user@test.com', military_id: 'MID00001', phone_number: '0912345678' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'alumni-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'event-1', max_attendees: 50 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 10 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const response = await POST({
      json: async () => ({}),
    }, { params: Promise.resolve({ id: 'event-1' }) });

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.message).toContain('ลงทะเบียนสำเร็จ');
  });

  it('POST returns 409 when already registered', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ id: 'user-1', role: 'user' });

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'user@test.com', military_id: 'MID00001', phone_number: '0912345678' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'alumni-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'event-1', max_attendees: 50 }] })
      .mockResolvedValueOnce({ rows: [{ cnt: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'reg-1' }] });

    const response = await POST({
      json: async () => ({}),
    }, { params: Promise.resolve({ id: 'event-1' }) });

    expect(response.status).toBe(409);
  });

  it('DELETE unregisters successfully using resolved alumni id', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ id: 'user-1', role: 'user' });

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'user@test.com', military_id: 'MID00001', phone_number: '0912345678' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'alumni-1' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const response = await DELETE({
      url: 'http://localhost/api/events/event-1/register',
      headers: { get: () => null },
    }, { params: Promise.resolve({ id: 'event-1' }) });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.message).toContain('ยกเลิกการลงทะเบียนสำเร็จ');
  });

  it('DELETE returns 404 when no registration exists', async () => {
    getTokenFromRequestMock.mockReturnValue('token');
    verifyTokenMock.mockReturnValue({ id: 'user-1', role: 'user' });

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'user@test.com', military_id: 'MID00001', phone_number: '0912345678' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'alumni-1' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await DELETE({
      url: 'http://localhost/api/events/event-1/register',
      headers: { get: () => null },
    }, { params: Promise.resolve({ id: 'event-1' }) });

    expect(response.status).toBe(404);
  });
});
