import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json({ message: 'Unauthorized - Super Admin access required' }, { status: 403 });
    }

    // Most recent LOGIN event per user in the last 30 days
    const result = await pool.query(`
      SELECT DISTINCT ON (al.user_id)
        al.user_id,
        al.ip_address,
        al.user_agent,
        al.created_at AS last_login_at,
        al.details,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.phone_number,
        u.status AS user_status
      FROM activity_logs al
      JOIN users u ON u.id = al.user_id
      WHERE al.action = 'LOGIN'
        AND al.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY al.user_id, al.created_at DESC
    `);

    const onlineThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

    const sessions = result.rows
      .map((row) => ({
        ...row,
        is_online: new Date(row.last_login_at) > onlineThreshold,
      }))
      .sort((a, b) => new Date(b.last_login_at) - new Date(a.last_login_at));

    // Summary counts
    const onlineCount = sessions.filter((s) => s.is_online).length;

    return Response.json({ sessions, online_count: onlineCount, total: sessions.length });
  } catch (error) {
    console.error('Sessions GET error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
