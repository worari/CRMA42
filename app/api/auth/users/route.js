import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return Response.json(
        { message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json(
        { message: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      'SELECT id, email, COALESCE(phone_number, military_id) AS phone_number, first_name, last_name, role, status, pdpa_consent, pdpa_consent_at, pdpa_version, created_at FROM users ORDER BY created_at DESC'
    );

    return Response.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json(
      { message: 'Server Error' },
      { status: 500 }
    );
  }
}
