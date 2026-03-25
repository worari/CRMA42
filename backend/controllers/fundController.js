// controllers/fundController.js
const pool = require('../database/db');
const crypto = require('crypto');

// GET /api/fund — ยอดรวม + รายการทั้งหมด
exports.getSummary = async (req, res) => {
  try {
    const totalQ = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::FLOAT AS total
      FROM fund_contributions WHERE status = 'approved'
    `);

    const pendingQ = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::FLOAT AS total
      FROM fund_contributions WHERE status = 'pending'
    `);

    const contributions = await pool.query(`
      SELECT fc.*, ap.rank, ap.first_name AS alumni_first, ap.last_name AS alumni_last
      FROM fund_contributions fc
      LEFT JOIN alumni_profiles ap ON fc.alumni_id = ap.id
      ORDER BY fc.contribution_date DESC
    `);

    const purposes = await pool.query(
      'SELECT * FROM fund_purposes WHERE is_active = TRUE ORDER BY created_at'
    );

    res.json({
      total_approved: totalQ.rows[0].total,
      total_pending: pendingQ.rows[0].total,
      contributions: contributions.rows,
      purposes: purposes.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve fund data' });
  }
};

// POST /api/fund — บันทึกการสมทบ
exports.contribute = async (req, res) => {
  try {
    const { alumni_id, alumni_name, amount, purpose, note, payment_method, slip_image } = req.body;
    if (!amount || !alumni_name)
      return res.status(400).json({ error: 'Amount and alumni_name are required' });

    const id = crypto.randomUUID();
    await pool.query(`
      INSERT INTO fund_contributions 
        (id, alumni_id, alumni_name, amount, purpose, note, payment_method, slip_image, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
    `, [id, alumni_id || null, alumni_name, amount, purpose, note, payment_method || 'โอนเงิน', slip_image || null]);

    const io = req.app.get('io');
    if (io) io.emit('FUND_CONTRIBUTED', { id, alumni_name, amount });

    res.status(201).json({ message: 'บันทึกการสมทบสำเร็จ รอการอนุมัติจาก Admin', id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record contribution' });
  }
};

// PUT /api/fund/:id/approve — อนุมัติการสมทบ (editor/super_admin)
exports.approve = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`
      UPDATE fund_contributions 
      SET status='approved', approved_by=$2, approved_at=NOW()
      WHERE id=$1
    `, [id, req.user?.id || null]);

    const io = req.app.get('io');
    if (io) io.emit('FUND_APPROVED', { id });

    res.json({ message: 'อนุมัติสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve contribution' });
  }
};

// PUT /api/fund/:id/reject — ปฏิเสธ
exports.reject = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE fund_contributions SET status='rejected' WHERE id=$1", [id]
    );
    res.json({ message: 'ปฏิเสธสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject' });
  }
};

// DELETE /api/fund/:id — ลบรายการ (super_admin เท่านั้น)
exports.deleteContribution = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM fund_contributions WHERE id=$1', [id]);
    res.json({ message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};

// GET /api/fund/purposes — รายการวัตถุประสงค์
exports.getPurposes = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fund_purposes WHERE is_active = TRUE ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get purposes' });
  }
};
