import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { CURRENT_PDPA_VERSION, needsPdpaReconsent } from '@/lib/pdpa';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    
    if (!normalizedEmail || !password) {
      return Response.json(
        { message: 'Please provide email and password' },
        { status: 400 }
      );
    }

    // Find user by email
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
    if (result.rows.length === 0) {
      return Response.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return Response.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check status
    if (user.status === 'pending') {
      return Response.json(
        { message: 'Your account is pending admin approval' },
        { status: 403 }
      );
    }

    if (user.status === 'rejected') {
      return Response.json(
        { message: 'Your account has been rejected' },
        { status: 403 }
      );
    }

    // Log login activity
    await logActivity(user.id, 'LOGIN', 'user', user.id, { email: user.email, role: user.role, method: 'password' }, req);

    // Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number || user.military_id
    });

    return Response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number || user.military_id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        pdpa_consent: !!user.pdpa_consent,
        pdpa_consent_at: user.pdpa_consent_at,
        pdpa_version: user.pdpa_version,
        pdpa_needs_reconsent: needsPdpaReconsent(user),
        current_pdpa_version: CURRENT_PDPA_VERSION,
      }
    });
  } catch (error) {
    console.error('Error during login:', error);

    if (error?.code === '28P01') {
      return Response.json(
        { message: 'Database authentication failed. Please check DB credentials in .env.local' },
        { status: 500 }
      );
    }

    if (error?.code === '42P01') {
      return Response.json(
        { message: 'Database tables not found. Please run: npm run init-db' },
        { status: 500 }
      );
    }

    if (error?.code === '42501') {
      return Response.json(
        { message: 'Database permission denied. Grant the application user access to schema public and the users table.' },
        { status: 500 }
      );
    }

    return Response.json(
      { message: 'Server Error' },
      { status: 500 }
    );
  }
}
