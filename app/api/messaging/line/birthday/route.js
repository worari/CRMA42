import pool from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { sendLineMessage } from '@/lib/lineMessaging';

export const dynamic = 'force-dynamic';

async function ensureBirthdayLogTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS birthday_message_logs (
      log_date DATE NOT NULL,
      alumni_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL,
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (log_date, alumni_id)
    );
  `);
}

async function sendBirthdayGreetingsForDate(targetDate) {
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const dateIso = targetDate.toISOString().slice(0, 10);

  await ensureBirthdayLogTable();

  const birthdaysResult = await pool.query(`
    SELECT
      alumni_profiles.id,
      alumni_profiles.rank,
      alumni_profiles.first_name,
      alumni_profiles.last_name,
      contacts.line_id
    FROM alumni_profiles
    JOIN contacts ON contacts.alumni_id = alumni_profiles.id
    WHERE contacts.line_id IS NOT NULL
      AND contacts.line_id != ''
      AND EXTRACT(MONTH FROM alumni_profiles.date_of_birth) = $1
      AND EXTRACT(DAY FROM alumni_profiles.date_of_birth) = $2
  `, [month, day]);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const person of birthdaysResult.rows) {
    const logResult = await pool.query(
      `SELECT status FROM birthday_message_logs WHERE log_date = $1 AND alumni_id = $2`,
      [dateIso, person.id]
    );

    if (logResult.rows.length > 0 && logResult.rows[0].status === 'success') {
      skipped += 1;
      continue;
    }

    const message = `สุขสันต์วันเกิดครับ/ค่ะ ${person.rank || ''} ${person.first_name || ''} ${person.last_name || ''}\n\nขอให้มีสุขภาพแข็งแรง มีความสุข และประสบความสำเร็จในทุกด้าน\n\nจากระบบทำเนียบรุ่น CRMA42`;

    const result = await sendLineMessage(person.line_id, message);

    if (result.success) {
      sent += 1;
      await pool.query(
        `
        INSERT INTO birthday_message_logs (log_date, alumni_id, status, error_message)
        VALUES ($1, $2, 'success', NULL)
        ON CONFLICT (log_date, alumni_id)
        DO UPDATE SET status = 'success', error_message = NULL, sent_at = CURRENT_TIMESTAMP
      `,
        [dateIso, person.id]
      );
    } else {
      failed += 1;
      await pool.query(
        `
        INSERT INTO birthday_message_logs (log_date, alumni_id, status, error_message)
        VALUES ($1, $2, 'failed', $3)
        ON CONFLICT (log_date, alumni_id)
        DO UPDATE SET status = 'failed', error_message = $3, sent_at = CURRENT_TIMESTAMP
      `,
        [dateIso, person.id, result.error || 'Unknown error']
      );
    }
  }

  return {
    totalBirthdayWithLineId: birthdaysResult.rows.length,
    sent,
    skipped,
    failed,
    date: dateIso,
  };
}

function buildBirthdayMessage(person, customTemplate) {
  const fallback = `สุขสันต์วันเกิดครับ/ค่ะ ${person.rank || ''} ${person.first_name || ''} ${person.last_name || ''}\n\nขอให้มีสุขภาพแข็งแรง มีความสุข และประสบความสำเร็จในทุกด้าน\n\nจากระบบทำเนียบรุ่น CRMA42`;
  if (!customTemplate || !String(customTemplate).trim()) {
    return fallback;
  }

  return String(customTemplate)
    .replace(/\{rank\}/g, person.rank || '')
    .replace(/\{first_name\}/g, person.first_name || '')
    .replace(/\{last_name\}/g, person.last_name || '');
}

async function sendToPeople(people, customTemplate, dateIso) {
  await ensureBirthdayLogTable();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const person of people) {
    if (!person?.line_id) {
      skipped += 1;
      continue;
    }

    const logResult = await pool.query(
      `SELECT status FROM birthday_message_logs WHERE log_date = $1 AND alumni_id = $2`,
      [dateIso, person.id]
    );

    if (logResult.rows.length > 0 && logResult.rows[0].status === 'success') {
      skipped += 1;
      continue;
    }

    const message = buildBirthdayMessage(person, customTemplate);
    const result = await sendLineMessage(person.line_id, message);

    if (result.success) {
      sent += 1;
      await pool.query(
        `
        INSERT INTO birthday_message_logs (log_date, alumni_id, status, error_message)
        VALUES ($1, $2, 'success', NULL)
        ON CONFLICT (log_date, alumni_id)
        DO UPDATE SET status = 'success', error_message = NULL, sent_at = CURRENT_TIMESTAMP
      `,
        [dateIso, person.id]
      );
    } else {
      failed += 1;
      await pool.query(
        `
        INSERT INTO birthday_message_logs (log_date, alumni_id, status, error_message)
        VALUES ($1, $2, 'failed', $3)
        ON CONFLICT (log_date, alumni_id)
        DO UPDATE SET status = 'failed', error_message = $3, sent_at = CURRENT_TIMESTAMP
      `,
        [dateIso, person.id, result.error || 'Unknown error']
      );
    }
  }

  return {
    totalBirthdayWithLineId: people.filter((person) => !!person.line_id).length,
    sent,
    skipped,
    failed,
    date: dateIso,
  };
}

async function getBirthdayPeopleInMonth(month) {
  const result = await pool.query(`
    SELECT
      alumni_profiles.id,
      alumni_profiles.rank,
      alumni_profiles.first_name,
      alumni_profiles.last_name,
      contacts.line_id
    FROM alumni_profiles
    LEFT JOIN contacts ON contacts.alumni_id = alumni_profiles.id
    WHERE EXTRACT(MONTH FROM alumni_profiles.date_of_birth) = $1
    ORDER BY EXTRACT(DAY FROM alumni_profiles.date_of_birth) ASC, alumni_profiles.first_name ASC
  `, [month]);

  return result.rows;
}

async function getBirthdayPeopleByIds(alumniIds) {
  const result = await pool.query(`
    SELECT
      alumni_profiles.id,
      alumni_profiles.rank,
      alumni_profiles.first_name,
      alumni_profiles.last_name,
      contacts.line_id
    FROM alumni_profiles
    LEFT JOIN contacts ON contacts.alumni_id = alumni_profiles.id
    WHERE alumni_profiles.id = ANY($1::uuid[])
  `, [alumniIds]);

  return result.rows;
}

function isValidCronCall(req) {
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  const cronSecret = process.env.CRON_SECRET || '';
  const userAgent = (req.headers.get('user-agent') || '').toLowerCase();

  if (cronSecret && bearer && bearer === cronSecret) {
    return true;
  }

  return userAgent.includes('vercel-cron');
}

export async function GET(req) {
  try {
    if (!isValidCronCall(req)) {
      return Response.json({ success: false, message: 'Unauthorized cron request' }, { status: 401 });
    }

    const result = await sendBirthdayGreetingsForDate(new Date());
    return Response.json({ success: true, mode: 'cron', ...result });
  } catch (error) {
    console.error('Birthday cron error:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return Response.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'editor' && decoded.role !== 'super_admin')) {
      return Response.json({ success: false, message: 'Insufficient permissions - Editor or Super Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || 'today');
    const customMessage = body?.message || '';
    const today = new Date();
    const dateIso = today.toISOString().slice(0, 10);

    if (mode === 'today') {
      const result = await sendBirthdayGreetingsForDate(today);
      return Response.json({ success: true, mode: 'manual_today', ...result });
    }

    if (mode === 'single') {
      const alumniId = String(body?.alumni_id || '').trim();
      if (!alumniId) {
        return Response.json({ success: false, message: 'alumni_id is required for single mode' }, { status: 400 });
      }

      const people = await getBirthdayPeopleByIds([alumniId]);
      if (!people.length) {
        return Response.json({ success: false, message: 'ไม่พบข้อมูลผู้รับ' }, { status: 404 });
      }

      const result = await sendToPeople(people, customMessage, dateIso);
      return Response.json({ success: true, mode: 'single', ...result });
    }

    if (mode === 'selected') {
      const alumniIds = Array.isArray(body?.alumni_ids)
        ? body.alumni_ids.map((id) => String(id || '').trim()).filter(Boolean)
        : [];

      if (!alumniIds.length) {
        return Response.json({ success: false, message: 'alumni_ids is required for selected mode' }, { status: 400 });
      }

      const people = await getBirthdayPeopleByIds(alumniIds);
      const result = await sendToPeople(people, customMessage, dateIso);
      return Response.json({ success: true, mode: 'selected', ...result });
    }

    if (mode === 'all_in_month') {
      const month = Number(body?.month);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        return Response.json({ success: false, message: 'month must be between 1 and 12' }, { status: 400 });
      }

      const people = await getBirthdayPeopleInMonth(month);
      const result = await sendToPeople(people, customMessage, dateIso);
      return Response.json({ success: true, mode: 'all_in_month', month, ...result });
    }

    return Response.json({ success: false, message: 'Unsupported mode' }, { status: 400 });
  } catch (error) {
    console.error('Birthday manual send error:', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
