import { query } from '../db.js';
import { DEFAULT_CRM_KEY, normalizeCrmKey } from '../utils/crm.js';

const ACTIVE_CRM_KEYS = ['active_crm_key', 'whatsapp_active_crm_key'];
const ACTIVE_CRM_STARTED_AT_KEY = 'whatsapp_active_crm_started_at';

export async function setActiveWhatsappCrm(crmKey, client = null) {
  const activeCrmKey = normalizeCrmKey(crmKey);
  const executor = client || { query };

  for (const key of ACTIVE_CRM_KEYS) {
    await executor.query(
      `INSERT INTO bot_settings (key, value, value_type, updated_at)
       VALUES ($1, $2, 'string', NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, value_type = EXCLUDED.value_type, updated_at = NOW()`,
      [key, activeCrmKey]
    );
  }

  await executor.query(
    `INSERT INTO bot_settings (key, value, value_type, updated_at)
     VALUES ($1, NOW()::TEXT, 'datetime', NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = NOW()::TEXT, value_type = EXCLUDED.value_type, updated_at = NOW()`,
    [ACTIVE_CRM_STARTED_AT_KEY]
  );

  return activeCrmKey;
}

export async function getActiveWhatsappCrm() {
  const setting = await query(
    `SELECT value
     FROM bot_settings
     WHERE key = ANY($1)
     ORDER BY CASE key WHEN 'whatsapp_active_crm_key' THEN 0 ELSE 1 END
     LIMIT 1`,
    [ACTIVE_CRM_KEYS]
  );

  const fromSettings = setting.rows[0]?.value;
  if (fromSettings) return normalizeCrmKey(fromSettings);

  const session = await query(
    `SELECT crm_key
     FROM whatsapp_sessions
     WHERE crm_key IS NOT NULL AND crm_key <> ''
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`
  );

  return normalizeCrmKey(session.rows[0]?.crm_key || DEFAULT_CRM_KEY);
}

export async function getActiveWhatsappCrmDetails() {
  const setting = await query(
    `SELECT key, value, updated_at
     FROM bot_settings
     WHERE key = ANY($1)
     ORDER BY CASE key WHEN 'whatsapp_active_crm_key' THEN 0 ELSE 1 END
     LIMIT 1`,
    [ACTIVE_CRM_KEYS]
  );
  const row = setting.rows[0] || null;
  const crmKey = normalizeCrmKey(row?.value || DEFAULT_CRM_KEY);

  const started = await query('SELECT value, updated_at FROM bot_settings WHERE key = $1 LIMIT 1', [ACTIVE_CRM_STARTED_AT_KEY]);
  const startedAt = started.rows[0]?.value || row?.updated_at || null;

  return {
    crmKey,
    startedAt,
    settingUpdatedAt: row?.updated_at || null
  };
}

export function activeCrmPayload(crmKey) {
  const activeCrmKey = normalizeCrmKey(crmKey);
  return {
    crm_key: activeCrmKey,
    crmKey: activeCrmKey,
    active_crm_key: activeCrmKey,
    whatsapp_active_crm_key: activeCrmKey
  };
}
