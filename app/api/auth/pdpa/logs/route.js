import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json({ message: 'Unauthorized - Super Admin access required' }, { status: 403 });
    }

    const result = await pool.query(`
      SELECT
        logs.id,
        logs.user_id,
        logs.consent,
        logs.consent_at,
        logs.pdpa_version,
        users.email,
        users.first_name,
        users.last_name
      FROM pdpa_consent_logs logs
      LEFT JOIN users ON users.id = logs.user_id
      ORDER BY logs.consent_at DESC
      LIMIT 200
    `);

    return Response.json(result.rows);
  } catch (error) {
    console.error('PDPA logs error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
