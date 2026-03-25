import pool from '@/lib/db';

export const PERMISSION_KEYS = {
  allowUserProfileEdit: 'allow_user_profile_edit',
};

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

export async function ensureSystemSettingsTable(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_by UUID,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return TRUE_VALUES.has(normalized);
}

export async function getBooleanSetting(key, fallback = false, client = pool) {
  await ensureSystemSettingsTable(client);

  const existing = await client.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  if (existing.rows.length > 0) {
    return toBoolean(existing.rows[0].value, fallback);
  }

  const defaultValue = fallback ? 'true' : 'false';
  await client.query(
    `INSERT INTO system_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO NOTHING`,
    [key, defaultValue]
  );

  return fallback;
}

export async function setBooleanSetting(key, value, updatedBy = null, client = pool) {
  await ensureSystemSettingsTable(client);

  const normalized = value ? 'true' : 'false';
  const result = await client.query(
    `INSERT INTO system_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
     RETURNING key, value, updated_by, updated_at`,
    [key, normalized, updatedBy]
  );

  const row = result.rows[0];
  return {
    key: row.key,
    value: toBoolean(row.value, false),
    updated_by: row.updated_by,
    updated_at: row.updated_at,
  };
}