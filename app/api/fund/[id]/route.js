// app/api/fund/[id]/route.js
import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT /api/fund/:id  — อนุมัติ หรือ ปฏิเสธ (ใช้ ?action=approve|reject)
export async function PUT(req, { params }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'editor' && decoded.role !== 'super_admin')) {
      return Response.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const { action } = await req.json();

    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ message: 'Invalid action. Use approve or reject' }, { status: 400 });
    }

    if (action === 'approve') {
      await pool.query(`
        UPDATE fund_contributions 
        SET status='approved', approved_by=$2, approved_at=NOW()
        WHERE id=$1
      `, [id, decoded.id]);
      return Response.json({ message: 'อนุมัติสำเร็จ' });
    } else {
      await pool.query(`
        UPDATE fund_contributions SET status='rejected' WHERE id=$1
      `, [id]);
      return Response.json({ message: 'ปฏิเสธสำเร็จ' });
    }
  } catch (error) {
    console.error('Fund PUT error:', error);
    return Response.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE /api/fund/:id — ลบ (super_admin เท่านั้น)
export async function DELETE(req, { params }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return Response.json({ message: 'Authentication required' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json({ message: 'Super Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    await pool.query('DELETE FROM fund_contributions WHERE id=$1', [id]);

    return Response.json({ message: 'ลบสำเร็จ' });
  } catch (error) {
    console.error('Fund DELETE error:', error);
    return Response.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
