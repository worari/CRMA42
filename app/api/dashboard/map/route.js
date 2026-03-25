import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // Check authentication
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const mapResult = await pool.query(`
      SELECT
        TRIM(province) AS province,
        COALESCE(NULLIF(TRIM(alumni_profiles.affiliation), ''), 'ไม่ระบุ') AS affiliation,
        COALESCE(NULLIF(TRIM(alumni_profiles.branch), ''), 'ไม่ระบุ') AS branch,
        COUNT(alumni_profiles.id)::int AS count
      FROM addresses
      JOIN alumni_profiles ON addresses.alumni_id = alumni_profiles.id
      WHERE province IS NOT NULL
        AND TRIM(province) != ''
      GROUP BY TRIM(province), COALESCE(NULLIF(TRIM(alumni_profiles.affiliation), ''), 'ไม่ระบุ'), COALESCE(NULLIF(TRIM(alumni_profiles.branch), ''), 'ไม่ระบุ')
      ORDER BY province ASC
    `);

    const provinceMap = new Map();
    for (const row of mapResult.rows) {
      const province = row.province;
      const affiliation = row.affiliation;
      const branch = row.branch;
      const count = Number(row.count || 0);

      if (!provinceMap.has(province)) {
        provinceMap.set(province, {
          province,
          count: 0,
          affiliation_counts: {},
          branch_counts: {},
        });
      }

      const point = provinceMap.get(province);
      point.count += count;
      point.affiliation_counts[affiliation] = (point.affiliation_counts[affiliation] || 0) + count;
      point.branch_counts[branch] = (point.branch_counts[branch] || 0) + count;
    }

    const points = Array.from(provinceMap.values()).sort((a, b) => b.count - a.count || a.province.localeCompare(b.province, 'th'));
    const totalWithProvince = points.reduce((sum, item) => sum + Number(item.count || 0), 0);

    return Response.json({
      total_with_province: totalWithProvince,
      points,
    });
  } catch (error) {
    console.error('Dashboard map error:', error);
    return Response.json(
      { error: 'Failed to retrieve map data' },
      { status: 500 }
    );
  }
}
