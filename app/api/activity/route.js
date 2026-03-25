import pool from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'super_admin') {
      return Response.json({ message: 'Unauthorized - Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 200), 1), 500);

    const result = await pool.query(
      `SELECT
         al.id,
         al.action,
         al.entity_type,
         al.entity_id,
         al.details,
         al.ip_address,
         al.user_agent,
         al.created_at,
         u.email AS actor_email,
         u.first_name AS actor_first_name,
         u.last_name AS actor_last_name,
         u.role AS actor_role
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return Response.json(result.rows);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const client = await pool.connect();

  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'super_admin') {
      return Response.json({ message: 'Unauthorized - Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target') || 'all';

    if (!['activity', 'pdpa', 'all'].includes(target)) {
      return Response.json({ message: 'Invalid clear target' }, { status: 400 });
    }

    await client.query('BEGIN');

    let deletedActivity = 0;
    let deletedPdpa = 0;

    if (target === 'activity' || target === 'all') {
      const result = await client.query('DELETE FROM activity_logs');
      deletedActivity = result.rowCount || 0;
    }

    if (target === 'pdpa' || target === 'all') {
      const result = await client.query('DELETE FROM pdpa_consent_logs');
      deletedPdpa = result.rowCount || 0;
    }

    await client.query('COMMIT');

    return Response.json({
      message: 'Logs cleared successfully',
      target,
      deleted: {
        activity: deletedActivity,
        pdpa: deletedPdpa,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing logs:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
