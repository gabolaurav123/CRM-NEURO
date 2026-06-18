import { DEFAULT_SETTINGS, query, withTransaction } from '../db.js';

export const ALLOWED_SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

export async function getSettings() {
  const result = await query('SELECT key, value FROM bot_settings WHERE key = ANY($1)', [ALLOWED_SETTING_KEYS]);
  const settings = { ...DEFAULT_SETTINGS };

  for (const row of result.rows) {
    settings[row.key] = row.value;
  }

  return settings;
}

export async function updateSettings(values) {
  const entries = Object.entries(values).filter(([key]) => ALLOWED_SETTING_KEYS.includes(key));
  if (entries.length === 0) return getSettings();

  await withTransaction(async (client) => {
    for (const [key, value] of entries) {
      await client.query(
        `INSERT INTO bot_settings (key, value, value_type, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, value_type = EXCLUDED.value_type, updated_at = NOW()`,
        [key, stringifySettingValue(value), inferValueType(value)]
      );
    }
  });

  return getSettings();
}

export function assertNoSensitiveSettings(values) {
  const keys = Object.keys(values).map((key) => key.toLowerCase());
  if (keys.some((key) => key.includes('api_key') || key.includes('gemini_key') || key.includes('database_url'))) {
    const error = new Error('Sensitive settings cannot be managed from the CRM');
    error.status = 400;
    throw error;
  }
}

function stringifySettingValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function inferValueType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  const text = String(value);
  if (text === 'true' || text === 'false') return 'boolean';
  if (text !== '' && !Number.isNaN(Number(text))) return 'number';
  return 'string';
}
