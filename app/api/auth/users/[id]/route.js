import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return Response.json(
        { message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json(
        { message: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    const { status, role, first_name, last_name, email, phone_number } = await req.json();
    const updates = [];
    const values = [];

    if (status !== undefined) {
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return Response.json(
          { message: 'Invalid status' },
          { status: 400 }
        );
      }
      values.push(status);
      updates.push(`status = $${values.length}`);
    }

    if (role !== undefined) {
      if (!['user', 'editor', 'admin', 'super_admin'].includes(role)) {
        return Response.json(
          { message: 'Invalid role' },
          { status: 400 }
        );
      }
      if (decoded.id === id && role !== 'super_admin') {
        return Response.json(
          { message: 'Cannot remove your own super admin role' },
          { status: 400 }
        );
      }
      values.push(role);
      updates.push(`role = $${values.length}`);
    }

    if (first_name !== undefined) {
      values.push(String(first_name).trim());
      updates.push(`first_name = $${values.length}`);
    }
    if (last_name !== undefined) {
      values.push(String(last_name).trim());
      updates.push(`last_name = $${values.length}`);
    }
    if (email !== undefined) {
      const emailStr = String(email).trim().toLowerCase();
      if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        return Response.json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
      }
      values.push(emailStr || null);
      updates.push(`email = $${values.length}`);
    }
    if (phone_number !== undefined) {
      values.push(String(phone_number).replace(/\D/g, '').slice(0, 15) || null);
      updates.push(`phone_number = $${values.length}`);
    }

    if (!updates.length) {
      return Response.json(
        { message: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, email, status, role`,
      values
    );

    if (result.rows.length === 0) {
      return Response.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    await logActivity(decoded.id, 'UPDATE', 'user', id, {
      updated_fields: {
        ...(status !== undefined ? { status } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(first_name !== undefined ? { first_name } : {}),
        ...(last_name !== undefined ? { last_name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone_number !== undefined ? { phone_number } : {}),
      },
      target_email: result.rows[0].email,
    }, req);

    return Response.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return Response.json(
      { message: 'Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const token = getTokenFromRequest(req);

    if (!token) {
      return Response.json({ message: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'super_admin') {
      return Response.json({ message: 'Unauthorized - Super Admin access required' }, { status: 403 });
    }

    if (decoded.id === id) {
      return Response.json({ message: 'ไม่สามารถลบบัญชีตัวเองได้' }, { status: 400 });
    }

    const check = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return Response.json({ message: 'ไม่พบผู้ใช้งาน' }, { status: 404 });
    }

    const target = check.rows[0];

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    await logActivity(decoded.id, 'DELETE', 'user', id, {
      target_email: target.email,
      target_role: target.role,
    }, req);

    return Response.json({ message: 'ลบบัญชีผู้ใช้งานสำเร็จ' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
