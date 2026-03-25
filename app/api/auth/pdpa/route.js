import pool from '@/lib/db';
import crypto from 'crypto';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { CURRENT_PDPA_VERSION, needsPdpaReconsent } from '@/lib/pdpa';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json({ message: 'Invalid token' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT id, pdpa_consent, pdpa_consent_at, pdpa_version FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0];
    return Response.json({
      ...user,
      current_pdpa_version: CURRENT_PDPA_VERSION,
      needs_reconsent: needsPdpaReconsent(user),
    });
  } catch (error) {
    console.error('PDPA GET error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const consent = !!body?.pdpa_consent;
    const version = body?.pdpa_version || CURRENT_PDPA_VERSION;

    if (!consent) {
      return Response.json({ message: 'PDPA consent is required' }, { status: 400 });
    }

    const consentAt = new Date();

    const update = await pool.query(
      `UPDATE users
       SET pdpa_consent = TRUE,
           pdpa_consent_at = $2,
           pdpa_version = $3
       WHERE id = $1
       RETURNING id, pdpa_consent, pdpa_consent_at, pdpa_version`,
      [decoded.id, consentAt, version]
    );

    if (update.rows.length === 0) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO pdpa_consent_logs (id, user_id, consent, pdpa_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        crypto.randomUUID(),
        decoded.id,
        true,
        version,
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null,
      ]
    );

    return Response.json(update.rows[0]);
  } catch (error) {
    console.error('PDPA PUT error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json({ message: 'Invalid token' }, { status: 401 });
    }

    const update = await pool.query(
      `UPDATE users
       SET pdpa_consent = FALSE,
           pdpa_consent_at = NULL,
           pdpa_version = NULL
       WHERE id = $1
       RETURNING id, pdpa_consent, pdpa_consent_at, pdpa_version`,
      [decoded.id]
    );

    if (update.rows.length === 0) {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO pdpa_consent_logs (id, user_id, consent, pdpa_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        crypto.randomUUID(),
        decoded.id,
        false,
        CURRENT_PDPA_VERSION,
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null,
      ]
    );

    return Response.json({
      ...update.rows[0],
      message: 'Revoked PDPA consent. Access to authenticated features is restricted until re-consent.',
    });
  } catch (error) {
    console.error('PDPA DELETE error:', error);
    return Response.json({ message: 'Server Error' }, { status: 500 });
  }
}
