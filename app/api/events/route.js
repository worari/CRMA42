// app/api/events/route.js
import pool from '@/lib/db';
import crypto from 'crypto';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function resolveAlumniIdFromUserId(userId) {
  if (!userId) return null;

  const userResult = await pool.query(
    'SELECT id, email, military_id, phone_number FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  if (userResult.rows.length === 0) return null;

  const user = userResult.rows[0];
  const militaryId = String(user.military_id || '').trim();
  const phoneNumber = String(user.phone_number || '').trim();
  const email = String(user.email || '').trim();

  if (militaryId) {
    const byMilitary = await pool.query('SELECT id FROM alumni_profiles WHERE military_id = $1 LIMIT 1', [militaryId]);
    if (byMilitary.rows.length > 0) return byMilitary.rows[0].id;
  }

  if (phoneNumber) {
    const byPhone = await pool.query('SELECT id FROM alumni_profiles WHERE military_id = $1 LIMIT 1', [phoneNumber]);
    if (byPhone.rows.length > 0) return byPhone.rows[0].id;
  }

  if (email) {
    const byEmail = await pool.query(
      'SELECT alumni_id FROM contacts WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (byEmail.rows.length > 0) return byEmail.rows[0].alumni_id;
  }

  return null;
}

function normalizeEventDate(rawDate) {
  if (!rawDate) return null;
  const text = String(rawDate).trim();
  if (!text) return null;
  return text.slice(0, 10);
}

async function ensureEventsSchema(client) {
  await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image TEXT');
  await client.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'upcoming'");
  await client.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP');
}

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ message: 'Invalid token' }, { status: 401 });

    const currentAlumniId = await resolveAlumniIdFromUserId(decoded.id);
    const { searchParams } = new URL(req.url);
    const mineOnly = searchParams.get('mine') === '1';

    const result = await pool.query(`
      SELECT 
        e.*,
        u.first_name AS creator_first_name,
        u.last_name  AS creator_last_name,
        COUNT(er.id)::INT AS registered_count,
        BOOL_OR(er.alumni_id = $1::uuid) AS is_registered
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_registrations er ON e.id = er.event_id
      ${mineOnly ? 'WHERE EXISTS (SELECT 1 FROM event_registrations my_er WHERE my_er.event_id = e.id AND my_er.alumni_id = $1::uuid)' : ''}
      GROUP BY e.id, u.first_name, u.last_name
      ORDER BY e.event_date ASC
    `, [currentAlumniId]);

    return Response.json(
      result.rows.map((row) => ({
        ...row,
        is_registered: !!row.is_registered,
        current_alumni_id: currentAlumniId,
      }))
    );
  } catch (error) {
    console.error('Events GET error:', error);
    return Response.json({ error: 'Failed to retrieve events' }, { status: 500 });
  }
}

export async function POST(req) {
  const client = await pool.connect();
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'editor' && decoded.role !== 'super_admin')) {
      return Response.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const { title, description, event_date, location, max_attendees, cover_image, status } = await req.json();
    const normalizedEventDate = normalizeEventDate(event_date);
    if (!title || !event_date) {
      return Response.json({ message: 'Title and event date are required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await client.query('BEGIN');
    await ensureEventsSchema(client);
    await client.query(`
      INSERT INTO events (id, title, description, event_date, location, max_attendees, cover_image, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, title, description, normalizedEventDate, location, max_attendees || null, cover_image || null, status || 'upcoming', decoded.id]);
    await client.query('COMMIT');

    return Response.json({ message: 'Event created successfully', id }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Events POST error:', error);
    return Response.json(
      {
        error: 'Failed to create event',
        ...(process.env.NODE_ENV !== 'production' ? { detail: error.message } : {}),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}