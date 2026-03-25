// app/api/events/[id]/register/route.js
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

function parseUuid(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(text) ? text : null;
}

// POST — ลงทะเบียนเข้าร่วมงาน
export async function POST(req, { params }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ message: 'Invalid token' }, { status: 401 });

    const { id: event_id } = await params;
    const body = await req.json().catch(() => ({}));
    const payloadAlumniId = parseUuid(body?.alumni_id);
    const resolvedAlumniId = payloadAlumniId || (await resolveAlumniIdFromUserId(decoded.id));

    if (!resolvedAlumniId) {
      return Response.json(
        { message: 'ไม่พบข้อมูลประวัติศิษย์เก่าที่เชื่อมกับบัญชีผู้ใช้นี้ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 400 }
      );
    }

    // Check event exists & capacity
    const eventQ = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
    if (eventQ.rows.length === 0) {
      return Response.json({ message: 'Event not found' }, { status: 404 });
    }

    const ev = eventQ.rows[0];
    if (ev.max_attendees) {
      const countQ = await pool.query(
        'SELECT COUNT(*)::INT as cnt FROM event_registrations WHERE event_id = $1', [event_id]
      );
      if (countQ.rows[0].cnt >= ev.max_attendees) {
        return Response.json({ message: 'งานนี้เต็มแล้ว ไม่สามารถลงทะเบียนได้' }, { status: 400 });
      }
    }

    // Check already registered
    const existQ = await pool.query(
      'SELECT id FROM event_registrations WHERE event_id=$1 AND alumni_id=$2',
      [event_id, resolvedAlumniId]
    );
    if (existQ.rows.length > 0) {
      return Response.json({ message: 'ท่านลงทะเบียนแล้ว' }, { status: 409 });
    }

    const reg_id = crypto.randomUUID();
    await pool.query(`
      INSERT INTO event_registrations (id, event_id, alumni_id)
      VALUES ($1, $2, $3)
    `, [reg_id, event_id, resolvedAlumniId]);

    return Response.json({ message: 'ลงทะเบียนสำเร็จ', id: reg_id }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: 'Failed to register' }, { status: 500 });
  }
}

// DELETE — ยกเลิกลงทะเบียน
export async function DELETE(req, { params }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return Response.json({ message: 'Invalid token' }, { status: 401 });

    const { id: event_id } = await params;
    const { searchParams } = new URL(req.url);
    const payloadAlumniId = parseUuid(searchParams.get('alumni_id'));
    const resolvedAlumniId = payloadAlumniId || (await resolveAlumniIdFromUserId(decoded.id));

    if (!resolvedAlumniId) {
      return Response.json(
        { message: 'ไม่พบข้อมูลประวัติศิษย์เก่าที่เชื่อมกับบัญชีผู้ใช้นี้ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 400 }
      );
    }

    const deleteResult = await pool.query(
      'DELETE FROM event_registrations WHERE event_id=$1 AND alumni_id=$2',
      [event_id, resolvedAlumniId]
    );

    if (deleteResult.rowCount === 0) {
      return Response.json({ message: 'ไม่พบรายการลงทะเบียนของท่านในกิจกรรมนี้' }, { status: 404 });
    }

    return Response.json({ message: 'ยกเลิกการลงทะเบียนสำเร็จ' });
  } catch (error) {
    console.error('Unregister error:', error);
    return Response.json({ error: 'Failed to unregister' }, { status: 500 });
  }
}