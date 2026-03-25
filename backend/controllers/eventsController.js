// controllers/eventsController.js
const pool = require('../database/db');
const crypto = require('crypto');

// GET /api/events — ดึงรายการงานทั้งหมด
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        u.first_name AS creator_first_name,
        u.last_name  AS creator_last_name,
        COUNT(er.id)::INT AS registered_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN event_registrations er ON e.id = er.event_id
      GROUP BY e.id, u.first_name, u.last_name
      ORDER BY e.event_date ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
};

// GET /api/events/:id — ดึงงานเดียวพร้อมรายชื่อผู้ลงทะเบียน
exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
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

    if (eventQ.rows.length === 0)
      return res.status(404).json({ error: 'Event not found' });

    const registrations = await pool.query(`
      SELECT er.*, ap.rank, ap.first_name, ap.last_name, ap.military_id
      FROM event_registrations er
      JOIN alumni_profiles ap ON er.alumni_id = ap.id
      WHERE er.event_id = $1
      ORDER BY er.registered_at ASC
    `, [id]);

    res.json({ ...eventQ.rows[0], registrations: registrations.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
};

// POST /api/events — สร้างงานใหม่ (editor/super_admin เท่านั้น)
exports.create = async (req, res) => {
  try {
    const { title, description, event_date, location, max_attendees, cover_image, status } = req.body;
    if (!title || !event_date)
      return res.status(400).json({ error: 'Title and event_date are required' });

    const id = crypto.randomUUID();
    await pool.query(`
      INSERT INTO events (id, title, description, event_date, location, max_attendees, cover_image, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, title, description, event_date, location, max_attendees || null, cover_image || null, status || 'upcoming', req.user?.id || null]);

    const io = req.app.get('io');
    if (io) io.emit('EVENT_CREATED', { id, title });

    res.status(201).json({ message: 'Event created', id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// PUT /api/events/:id — แก้ไขงาน
exports.update = async (req, res) => {
  const { id } = req.params;
  try {
    const { title, description, event_date, location, max_attendees, cover_image, status } = req.body;

    await pool.query(`
      UPDATE events SET
        title=$2, description=$3, event_date=$4, location=$5,
        max_attendees=$6, cover_image=$7, status=$8, updated_at=NOW()
      WHERE id=$1
    `, [id, title, description, event_date, location, max_attendees || null, cover_image || null, status]);

    const io = req.app.get('io');
    if (io) io.emit('EVENT_UPDATED', { id, title });

    res.json({ message: 'Event updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// DELETE /api/events/:id — ลบงาน
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    const io = req.app.get('io');
    if (io) io.emit('EVENT_DELETED', id);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// POST /api/events/:id/register — ลงทะเบียนเข้าร่วมงาน
exports.register = async (req, res) => {
  const { id: event_id } = req.params;
  const { alumni_id } = req.body;
  try {
    // Check event exists & capacity
    const eventQ = await pool.query(
      'SELECT * FROM events WHERE id = $1', [event_id]
    );
    if (eventQ.rows.length === 0)
      return res.status(404).json({ error: 'Event not found' });

    const ev = eventQ.rows[0];
    if (ev.max_attendees) {
      const countQ = await pool.query(
        'SELECT COUNT(*)::INT as cnt FROM event_registrations WHERE event_id = $1', [event_id]
      );
      if (countQ.rows[0].cnt >= ev.max_attendees)
        return res.status(400).json({ error: 'งานนี้เต็มแล้ว' });
    }

    const reg_id = crypto.randomUUID();
    await pool.query(`
      INSERT INTO event_registrations (id, event_id, alumni_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (event_id, alumni_id) DO NOTHING
    `, [reg_id, event_id, alumni_id]);

    const io = req.app.get('io');
    if (io) io.emit('EVENT_REGISTERED', { event_id, alumni_id });

    res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register' });
  }
};

// DELETE /api/events/:id/register/:alumni_id — ยกเลิกลงทะเบียน
exports.unregister = async (req, res) => {
  const { id: event_id, alumni_id } = req.params;
  try {
    await pool.query(
      'DELETE FROM event_registrations WHERE event_id=$1 AND alumni_id=$2',
      [event_id, alumni_id]
    );
    res.json({ message: 'ยกเลิกการลงทะเบียนสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unregister' });
  }
};
