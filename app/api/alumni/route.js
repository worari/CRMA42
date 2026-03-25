import pool from '@/lib/db';
import crypto from 'crypto';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { normalizeControlledPayload } from '@/lib/dictionaries';

export const dynamic = 'force-dynamic';

async function ensureRuntimeSchema(client) {
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_affiliation VARCHAR(50)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS religion VARCHAR(50)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_religion VARCHAR(100)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50)');
  await client.query('ALTER TABLE alumni_profiles ADD COLUMN IF NOT EXISTS custom_marital_status VARCHAR(100)');
  await client.query('ALTER TABLE children ADD COLUMN IF NOT EXISTS nickname VARCHAR(50)');
  await client.query('ALTER TABLE children ADD COLUMN IF NOT EXISTS occupation VARCHAR(100)');
  await client.query('ALTER TABLE position_history ADD COLUMN IF NOT EXISTS order_number VARCHAR(100)');
  await client.query('ALTER TABLE rank_history ADD COLUMN IF NOT EXISTS order_number VARCHAR(100)');
  await client.query('ALTER TABLE rank_history ADD COLUMN IF NOT EXISTS rank_name VARCHAR(100)');
}

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

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const affiliation = searchParams.get('affiliation');

    let query = `
      SELECT
        ap.id,
        ap.military_id,
        ap.rank,
        ap.first_name,
        ap.last_name,
        ap.nickname,
        ap.position,
        ap.branch,
        ap.affiliation,
        ap.custom_affiliation,
        ap.status,
        ap.profile_photo,
        ap.date_of_birth,
        ap.retirement_year,
        c.phone_primary,
        c.phone_secondary,
        COALESCE(ed.education_summary, '') AS education_summary
      FROM alumni_profiles ap
      LEFT JOIN contacts c ON c.alumni_id = ap.id
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(
          TRIM(
            COALESCE(eh.course_name, '') ||
            CASE WHEN COALESCE(eh.class_no, '') <> '' THEN ' รุ่น ' || eh.class_no ELSE '' END ||
            CASE WHEN eh.graduated_year IS NOT NULL THEN ' (' || eh.graduated_year::text || ')' ELSE '' END
          ),
          ' | ' ORDER BY COALESCE(eh.graduated_year, 0) DESC, eh.course_name ASC
        ) AS education_summary
        FROM education_history eh
        WHERE eh.alumni_id = ap.id
      ) ed ON TRUE
      WHERE 1=1
    `;
    const params = [];
    
    if (name) {
      params.push(`%${name}%`);
      query += ` AND (ap.first_name ILIKE $${params.length} OR ap.last_name ILIKE $${params.length} OR ap.nickname ILIKE $${params.length})`;
    }
    
    if (affiliation) {
      params.push(affiliation);
      query += ` AND ap.affiliation = $${params.length}`;
    }
    
    query += ` ORDER BY 
      ap.affiliation ASC,
      CASE ap.rank 
        WHEN 'พล.อ.' THEN 1
        WHEN 'พล.ท.' THEN 2
        WHEN 'พล.ต.' THEN 3
        WHEN 'พ.อ.(พ.)' THEN 4
        WHEN 'พ.อ.' THEN 5
        WHEN 'พ.ท.' THEN 6
        WHEN 'พ.ต.' THEN 7
        WHEN 'ร.อ.' THEN 8
        WHEN 'ร.ท.' THEN 9
        WHEN 'ร.ต.' THEN 10
        ELSE 99 
      END ASC, 
      ap.created_at DESC
    `;

    const result = await pool.query(query, params);
    return Response.json(result.rows);
  } catch (error) {
    console.error('Alumni error:', error);
    return Response.json(
      { error: 'Failed to retrieve alumni list' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const client = await pool.connect();
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

    // Check role - manager and super_admin can create
    if (decoded.role !== 'editor' && decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return Response.json(
        { message: 'Insufficient permissions - Manager or Super Admin access required' },
        { status: 403 }
      );
    }

    const body = normalizeControlledPayload(await req.json());
    const id = crypto.randomUUID();
    
    await client.query('BEGIN');
    await ensureRuntimeSchema(client);
    
    await client.query(`
      INSERT INTO alumni_profiles 
      (id, profile_photo, military_id, rank, custom_rank, first_name, last_name, nickname, position, branch, custom_branch, affiliation, custom_affiliation, blood_group, religion, custom_religion, marital_status, custom_marital_status, status, date_of_birth, retirement_year, signature_image) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `, [id, body.profile_photo, body.military_id, body.rank, body.custom_rank, body.first_name, body.last_name, body.nickname, body.position, body.branch, body.custom_branch, body.affiliation, body.custom_affiliation, body.blood_group, body.religion, body.custom_religion, body.marital_status, body.custom_marital_status, body.status, body.date_of_birth, body.retirement_year, body.signature_image]);

    await client.query(`
      INSERT INTO contacts (alumni_id, phone_primary, phone_secondary, email, line_id) 
      VALUES ($1, $2, $3, $4, $5)
    `, [id, body.contacts?.phone_primary, body.contacts?.phone_secondary, body.contacts?.email, body.contacts?.line_id]);

    await client.query(`
      INSERT INTO family_data (alumni_id, sons_count, daughters_count) 
      VALUES ($1, $2, $3)
    `, [id, body.family?.sons_count || 0, body.family?.daughters_count || 0]);

    await client.query(`
      INSERT INTO addresses (alumni_id, house_number, alley, road, subdistrict, district, province, postal_code) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, body.address?.house_number, body.address?.alley, body.address?.road, body.address?.subdistrict, body.address?.district, body.address?.province, body.address?.postal_code]);
    
    if (body.children && Array.isArray(body.children)) {
      for (const child of body.children) {
        if (!child.first_name) continue;
        await client.query(`
          INSERT INTO children (id, alumni_id, title, first_name, last_name, nickname, birth_date, occupation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [crypto.randomUUID(), id, child.title, child.first_name, child.last_name, child.nickname, child.birth_date || null, child.occupation || null]);
      }
    }

    if (body.position_history && Array.isArray(body.position_history)) {
      for (const ph of body.position_history) {
        if (!ph.position_name) continue;
        await client.query(`
          INSERT INTO position_history (id, alumni_id, position_name, order_number, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, ph.position_name, ph.order_number || null, ph.start_date || null, ph.end_date || null]);
      }
    }

    if (body.rank_history && Array.isArray(body.rank_history)) {
      for (const rh of body.rank_history) {
        const rankName = rh.rank || rh.rank_name;
        if (!rankName) continue;
        await client.query(`
          INSERT INTO rank_history (id, alumni_id, rank_name, order_number, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, rankName, rh.order_number || null, rh.start_date || null, rh.end_date || null]);
      }
    }

    if (body.education_history && Array.isArray(body.education_history)) {
      for (const education of body.education_history) {
        if (!education.course_name) continue;
        await client.query(`
          INSERT INTO education_history (id, alumni_id, institution_name, course_name, class_no, graduated_year)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, education.institution_name || null, education.course_name, education.class_no, education.graduated_year || null]);
      }
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(decoded.id, 'CREATE', 'alumni', id, {
      military_id: body.military_id,
      first_name: body.first_name,
      last_name: body.last_name
    }, req);

    return Response.json(
      { message: 'Alumni profile created successfully', id },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating alumni:', error);
    return Response.json(
      {
        error: 'Failed to create alumni profile',
        ...(process.env.NODE_ENV !== 'production' ? { detail: error.message } : {}),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
