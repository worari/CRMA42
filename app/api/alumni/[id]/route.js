import pool from '@/lib/db';
import crypto from 'crypto';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { normalizeControlledPayload } from '@/lib/dictionaries';
import { getBooleanSetting, PERMISSION_KEYS } from '@/lib/permissions';

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

export async function GET(req, { params }) {
  const { id } = params;
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

    const alumni = await pool.query('SELECT * FROM alumni_profiles WHERE id = $1', [id]);
    if (alumni.rows.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    
    const contact = await pool.query('SELECT * FROM contacts WHERE alumni_id = $1', [id]);
    const family = await pool.query('SELECT * FROM family_data WHERE alumni_id = $1', [id]);
    const address = await pool.query('SELECT * FROM addresses WHERE alumni_id = $1', [id]);
    const children = await pool.query('SELECT * FROM children WHERE alumni_id = $1 ORDER BY birth_date ASC', [id]);
    const position_history = await pool.query('SELECT * FROM position_history WHERE alumni_id = $1 ORDER BY start_date ASC', [id]);
    const rank_history = await pool.query('SELECT * FROM rank_history WHERE alumni_id = $1 ORDER BY start_date ASC', [id]);
    const education_history = await pool.query('SELECT * FROM education_history WHERE alumni_id = $1 ORDER BY graduated_year ASC', [id]);
    
    return Response.json({
      ...alumni.rows[0],
      contacts: contact.rows[0] || {},
      family: family.rows[0] || {},
      address: address.rows[0] || {},
      children: children.rows || [],
      position_history: position_history.rows || [],
      rank_history: rank_history.rows || [],
      education_history: education_history.rows || []
    });
  } catch (error) {
    console.error('Error fetching alumni:', error);
    return Response.json(
      { error: 'Failed to retrieve profile' },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  const { id } = params;
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

    // Check permissions
    let canEdit = false;
    if (decoded.role === 'super_admin' || decoded.role === 'editor' || decoded.role === 'admin') {
      canEdit = true;
    } else if (decoded.role === 'user') {
      const allowUserProfileEdit = await getBooleanSetting(PERMISSION_KEYS.allowUserProfileEdit, true);
      if (!allowUserProfileEdit) {
        return Response.json(
          { message: 'Profile editing for general users is currently disabled by administrator policy' },
          { status: 403 }
        );
      }

      // User can edit only their own profile (match by account email or linked phone/military id)
      const alumniRecord = await pool.query(
        `SELECT ap.military_id, c.email AS contact_email
         FROM alumni_profiles ap
         LEFT JOIN contacts c ON c.alumni_id = ap.id
         WHERE ap.id = $1`,
        [id]
      );
      if (alumniRecord.rows.length > 0) {
        const contactEmail = String(alumniRecord.rows[0].contact_email || '').trim().toLowerCase();
        const militaryId = String(alumniRecord.rows[0].military_id || '').trim();
        const tokenEmail = String(decoded.email || '').trim().toLowerCase();
        const tokenPhone = String(decoded.phone_number || decoded.military_id || '').trim();

        if ((contactEmail && tokenEmail && contactEmail === tokenEmail) || (militaryId && tokenPhone && militaryId === tokenPhone)) {
          canEdit = true;
        }
      }
    }

    if (!canEdit) {
      return Response.json(
        { message: 'Insufficient permissions to edit this profile' },
        { status: 403 }
      );
    }

    const body = normalizeControlledPayload(await req.json());
    
    await client.query('BEGIN');
    await ensureRuntimeSchema(client);

    await client.query(`
      UPDATE alumni_profiles 
      SET profile_photo=$2, military_id=$3, rank=$4, custom_rank=$5, first_name=$6, last_name=$7, 
          nickname=$8, position=$9, branch=$10, custom_branch=$11, affiliation=$12, custom_affiliation=$13, 
          blood_group=$14, religion=$15, custom_religion=$16, marital_status=$17, custom_marital_status=$18,
          status=$19, date_of_birth=$20, retirement_year=$21, signature_image=$22
      WHERE id = $1
    `, [id, body.profile_photo, body.military_id, body.rank, body.custom_rank, body.first_name, body.last_name, body.nickname, body.position, body.branch, body.custom_branch, body.affiliation, body.custom_affiliation, body.blood_group, body.religion, body.custom_religion, body.marital_status, body.custom_marital_status, body.status, body.date_of_birth, body.retirement_year, body.signature_image]);

    if (body.contacts) {
      await client.query(`
        UPDATE contacts 
        SET phone_primary=$2, phone_secondary=$3, email=$4, line_id=$5
        WHERE alumni_id = $1
      `, [id, body.contacts.phone_primary, body.contacts.phone_secondary, body.contacts.email, body.contacts.line_id]);
    }

    if (body.family) {
      await client.query(`
        UPDATE family_data 
        SET sons_count=$2, daughters_count=$3
        WHERE alumni_id = $1
      `, [id, body.family.sons_count || 0, body.family.daughters_count || 0]);
    }

    if (body.address) {
      await client.query(`
        UPDATE addresses 
        SET house_number=$2, alley=$3, road=$4, subdistrict=$5, district=$6, province=$7, postal_code=$8
        WHERE alumni_id = $1
      `, [id, body.address.house_number, body.address.alley, body.address.road, body.address.subdistrict, body.address.district, body.address.province, body.address.postal_code]);
    }

    if (body.children && Array.isArray(body.children)) {
      await client.query('DELETE FROM children WHERE alumni_id = $1', [id]);
      for (const child of body.children) {
        if (!child.first_name) continue;
        await client.query(`
          INSERT INTO children (id, alumni_id, title, first_name, last_name, nickname, birth_date, occupation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [crypto.randomUUID(), id, child.title, child.first_name, child.last_name, child.nickname, child.birth_date || null, child.occupation || null]);
      }
    }

    if (body.position_history && Array.isArray(body.position_history)) {
      await client.query('DELETE FROM position_history WHERE alumni_id = $1', [id]);
      for (const ph of body.position_history) {
        if (!ph.position_name) continue;
        await client.query(`
          INSERT INTO position_history (id, alumni_id, position_name, order_number, start_date, end_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), id, ph.position_name, ph.order_number || null, ph.start_date || null, ph.end_date || null]);
      }
    }

    if (body.rank_history && Array.isArray(body.rank_history)) {
      await client.query('DELETE FROM rank_history WHERE alumni_id = $1', [id]);
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
      await client.query('DELETE FROM education_history WHERE alumni_id = $1', [id]);
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
    await logActivity(decoded.id, 'UPDATE', 'alumni', id, {
      military_id: body.military_id,
      first_name: body.first_name,
      last_name: body.last_name
    }, req);

    return Response.json({ message: 'Alumni profile updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating alumni:', error);
    return Response.json(
      {
        error: 'Failed to update alumni profile',
        ...(process.env.NODE_ENV !== 'production' ? { detail: error.message } : {}),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
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

    // Check role - only editor/admin/super_admin can delete
    if (decoded.role !== 'editor' && decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return Response.json(
        { message: 'Insufficient permissions - Manager or Super Admin access required' },
        { status: 403 }
      );
    }

    const result = await pool.query('DELETE FROM alumni_profiles WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Log activity
    await logActivity(decoded.id, 'DELETE', 'alumni', id, {
      deleted: true
    }, req);

    return Response.json({ message: 'Alumni profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting alumni:', error);
    return Response.json(
      { error: 'Failed to delete alumni profile' },
      { status: 500 }
    );
  }
}
