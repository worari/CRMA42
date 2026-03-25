// app/api/events/[id]/route.js
import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function normalizeEventDate(rawDate) {
  if (!rawDate) return null;
  const text = String(rawDate).trim();
  if (!text) return null;
  return text.slice(0, 10);
}

async function ensureEventsSchema() {
  await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image TEXT');
  await pool.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'upcoming'");
  await pool.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP');
}

export async function GET(req, { params }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ message: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    const eventQ = await pool.query(`
      SELECT e.*, 
             u.first_name AS creator_first_name, u.last_name AS creator_last_name,
             COUNT(er.id)::INT AS registered_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_registrations er ON e.id = er.event_id
      WHERE e.id = $1
      GROUP BY e.id, u.first_name, u.last_name
    `, [id]);

    if (eventQ.rows.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const registrations = await pool.query(`
      SELECT er.*, ap.rank, ap.first_name, ap.last_name, ap.military_id
      FROM event_registrations er
      JOIN alumni_profiles ap ON er.alumni_id = ap.id
      WHERE er.event_id = $1
      ORDER BY er.registered_at ASC
    `, [id]);

    return Response.json({ ...eventQ.rows[0], registrations: registrations.rows });
  } catch (error) {
    console.error('Event GET [id] error:', error);
    return Response.json({ error: 'Failed to retrieve event' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'editor' && decoded.role !== 'super_admin')) {
      return Response.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const { title, description, event_date, location, max_attendees, cover_image, status } = await req.json();
    const normalizedEventDate = normalizeEventDate(event_date);

    await ensureEventsSchema();

    await pool.query(`
      UPDATE events SET
        title=$2, description=$3, event_date=$4, location=$5,
        max_attendees=$6, cover_image=$7, status=$8, updated_at=NOW()
      WHERE id=$1
    `, [id, title, description, normalizedEventDate, location, max_attendees || null, cover_image || null, status]);

    return Response.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Event PUT error:', error);
    return Response.json(
      {
        error: 'Failed to update event',
        ...(process.env.NODE_ENV !== 'production' ? { detail: error.message } : {}),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'editor' && decoded.role !== 'super_admin')) {
      return Response.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    return Response.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Event DELETE error:', error);
    return Response.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
