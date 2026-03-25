import pool from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { CURRENT_PDPA_VERSION, needsPdpaReconsent } from '@/lib/pdpa';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const LINE_AUTH_BASE = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_USERINFO_URL = 'https://api.line.me/oauth2/v2.1/userinfo';

function getPublicOrigin(fallbackOrigin) {
  const configuredOrigin = String(
    process.env.LINE_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL || ''
  )
    .trim()
    .replace(/\/+$/, '');

  if (/^https?:\/\//i.test(configuredOrigin)) {
    return configuredOrigin;
  }

  return fallbackOrigin;
}

function buildLoginErrorRedirect(origin, code) {
  return Response.redirect(`${origin}/login?error=${encodeURIComponent(code)}`);
}

function decodeStatePayload(rawState) {
  if (!rawState) return null;

  try {
    const base64 = rawState.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const parsed = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const { searchParams, origin: requestOrigin } = url;
  const origin = getPublicOrigin(requestOrigin);
  const channelId = process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const redirectUri = `${origin}/api/auth/line`;

  // Start LINE login flow from the app without exposing env wiring to the client.
  if (searchParams.get('start') === '1') {
    if (!channelId || !channelSecret) {
      return buildLoginErrorRedirect(origin, 'line_config_missing');
    }

    const normalizedPhoneHint = String(searchParams.get('phone_hint') || '').replace(/\D/g, '').slice(0, 10);
    const statePayload = {
      nonce: crypto.randomUUID(),
      ...(normalizedPhoneHint ? { phone_hint: normalizedPhoneHint } : {}),
    };
    const state = Buffer.from(JSON.stringify(statePayload), 'utf8').toString('base64url');
    const authorizeUrl = `${LINE_AUTH_BASE}?response_type=code&client_id=${encodeURIComponent(channelId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent('profile openid email')}`;
    return Response.redirect(authorizeUrl);
  }

  // LINE Login callback handler
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const oauthState = searchParams.get('state');
  const statePayload = decodeStatePayload(oauthState);
  const phoneHint = String(statePayload?.phone_hint || '').replace(/\D/g, '').slice(0, 10);

  if (oauthError) {
    return buildLoginErrorRedirect(origin, `line_oauth_${oauthError}`);
  }

  if (!code) {
    return buildLoginErrorRedirect(origin, 'line_login_failed');
  }

  if (!channelId || !channelSecret) {
    return buildLoginErrorRedirect(origin, 'line_config_missing');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(LINE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return buildLoginErrorRedirect(origin, 'line_token_failed');
    }

    // Get user info from LINE OpenID endpoint (contains email when scope includes email)
    const profileResponse = await fetch(LINE_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      return buildLoginErrorRedirect(origin, 'line_profile_failed');
    }

    const profile = await profileResponse.json();
    const lineUserId = String(profile?.sub || profile?.userId || '').trim();
    const email = String(profile?.email || '').trim().toLowerCase();

    if (!lineUserId) {
      return buildLoginErrorRedirect(origin, 'line_userid_missing');
    }

    let userResult = await pool.query('SELECT * FROM users WHERE line_user_id = $1', [lineUserId]);

    // First-time LINE login for existing email account: attach line_user_id for future logins.
    if (userResult.rows.length === 0 && email) {
      userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (userResult.rows.length > 0) {
        const linkedUser = userResult.rows[0];
        const bindResult = await pool.query(
          `UPDATE users
           SET line_user_id = $1
           WHERE id = $2 AND (line_user_id IS NULL OR line_user_id = '' OR line_user_id = $1)
           RETURNING *`,
          [lineUserId, linkedUser.id]
        );

        if (bindResult.rows.length === 0) {
          return buildLoginErrorRedirect(origin, 'line_account_mismatch');
        }

        userResult = bindResult;
      }
    }

    // Optional phone-based linking when account email is unavailable or differs.
    if (userResult.rows.length === 0 && phoneHint) {
      const byPhoneResult = await pool.query(
        `SELECT * FROM users
         WHERE phone_number = $1 OR military_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [phoneHint]
      );

      if (byPhoneResult.rows.length > 0) {
        const linkedByPhone = byPhoneResult.rows[0];
        const bindByPhoneResult = await pool.query(
          `UPDATE users
           SET line_user_id = $1
           WHERE id = $2 AND (line_user_id IS NULL OR line_user_id = '' OR line_user_id = $1)
           RETURNING *`,
          [lineUserId, linkedByPhone.id]
        );

        if (bindByPhoneResult.rows.length === 0) {
          return buildLoginErrorRedirect(origin, 'line_phone_mismatch');
        }

        userResult = bindByPhoneResult;
      }
    }

    // New user: redirect to register with all available LINE info pre-filled.
    if (userResult.rows.length === 0) {
      const registerParams = new URLSearchParams({ line_user_id: lineUserId, line_hint: 'not_registered' });
      if (email) registerParams.set('line_email', email);
      const lineName = String(profile?.name || '').trim();
      if (lineName) registerParams.set('line_name', lineName);
      return Response.redirect(`${origin}/register?${registerParams.toString()}`);
    }

    const user = userResult.rows[0];
    if (user.status === 'pending') {
      return buildLoginErrorRedirect(origin, 'line_pending_approval');
    }
    if (user.status === 'rejected') {
      return buildLoginErrorRedirect(origin, 'line_rejected');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number || user.military_id,
    });

    const authPayload = Buffer.from(
      JSON.stringify({
        token,
        user: {
          id: user.id,
          email: user.email,
          phone_number: user.phone_number || user.military_id,
          line_user_id: user.line_user_id || lineUserId,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          status: user.status,
          pdpa_consent: !!user.pdpa_consent,
          pdpa_consent_at: user.pdpa_consent_at,
          pdpa_version: user.pdpa_version,
          pdpa_needs_reconsent: needsPdpaReconsent(user),
          current_pdpa_version: CURRENT_PDPA_VERSION,
        },
      }),
      'utf8'
    ).toString('base64url');

    return Response.redirect(`${origin}/login?line_auth=${encodeURIComponent(authPayload)}`);

  } catch (error) {
    console.error('LINE Login error:', error);
    return buildLoginErrorRedirect(origin, 'line_login_error');
  }
}