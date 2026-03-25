import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { getControlledDictionary } from '@/lib/dictionaries';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { type } = params;
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

    let result = [];

    const controlledTypeMap = {
      ranks: 'rank',
      branches: 'branch',
      affiliations: 'affiliation',
      religions: 'religion',
      marital_statuses: 'marital_status',
      'marital-statuses': 'marital_status',
    };

    if (controlledTypeMap[type]) {
      result = getControlledDictionary(controlledTypeMap[type]);
      return Response.json(result);
    }
    
    if (type === 'positions') {
      const q1 = await pool.query('SELECT DISTINCT position FROM alumni_profiles WHERE position IS NOT NULL AND position != \'\'');
      const q2 = await pool.query('SELECT DISTINCT position_name as position FROM position_history WHERE position_name IS NOT NULL AND position_name != \'\'');
      const set = new Set([...q1.rows.map(r => r.position), ...q2.rows.map(r => r.position)]);
      result = Array.from(set).sort();
    } else if (type === 'occupations') {
      const q = await pool.query('SELECT DISTINCT occupation FROM children WHERE occupation IS NOT NULL AND occupation != \'\' ORDER BY occupation');
      result = q.rows.map(r => r.occupation);
    } else if (type === 'roads') {
      const q = await pool.query('SELECT DISTINCT road FROM addresses WHERE road IS NOT NULL AND road != \'\' ORDER BY road');
      result = q.rows.map(r => r.road);
    } else if (type === 'subdistricts') {
      const q = await pool.query('SELECT DISTINCT subdistrict FROM addresses WHERE subdistrict IS NOT NULL AND subdistrict != \'\' ORDER BY subdistrict');
      result = q.rows.map(r => r.subdistrict);
    } else if (type === 'districts') {
      const q = await pool.query('SELECT DISTINCT district FROM addresses WHERE district IS NOT NULL AND district != \'\' ORDER BY district');
      result = q.rows.map(r => r.district);
    } else if (type === 'provinces') {
      const q = await pool.query('SELECT DISTINCT province FROM addresses WHERE province IS NOT NULL AND province != \'\' ORDER BY province');
      result = q.rows.map(r => r.province);
    }
    
    return Response.json(result);
  } catch (error) {
    console.error('Dictionary error:', error);
    return Response.json(
      { error: 'Failed to retrieve dictionary' },
      { status: 500 }
    );
  }
}
