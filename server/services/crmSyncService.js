import { withTransaction } from '../db.js';
import { getActiveWhatsappCrmDetails } from './activeCrmService.js';
import { normalizeCrmKey } from '../utils/crm.js';

const DEFAULT_SYNC_HOURS = 168;
const LEGACY_SOURCE_CRM_KEY = 'neurotraumas';

export async function syncRecentWhatsappRowsToActiveCrm({ requestedCrmKey } = {}) {
  const active = await getActiveWhatsappCrmDetails();
  const activeCrmKey = normalizeCrmKey(active.crmKey);
  const requested = requestedCrmKey ? normalizeCrmKey(requestedCrmKey) : activeCrmKey;

  if (activeCrmKey === LEGACY_SOURCE_CRM_KEY || requested !== activeCrmKey) {
    return { skipped: true, active_crm_key: activeCrmKey, requested_crm_key: requested };
  }

  const syncHours = clampSyncHours(process.env.CRM_ACTIVE_SYNC_HOURS);

  return withTransaction(async (client) => {
    const candidates = await client.query(
      `WITH candidate_leads AS (
         SELECT DISTINCT l.id::TEXT AS lead_id
         FROM leads l
         WHERE COALESCE(l.crm_key, $2) = $2
           AND (
             l.created_at >= NOW() - ($3::INT * INTERVAL '1 hour')
             OR l.first_contact_at >= NOW() - ($3::INT * INTERVAL '1 hour')
             OR l.last_contact_at >= NOW() - ($3::INT * INTERVAL '1 hour')
             OR EXISTS (
               SELECT 1
               FROM messages m
               WHERE m.lead_id::TEXT = l.id::TEXT
                 AND COALESCE(m.crm_key, $2) = $2
                 AND m.created_at >= NOW() - ($3::INT * INTERVAL '1 hour')
             )
             OR EXISTS (
               SELECT 1
               FROM conversations c
               WHERE c.lead_id::TEXT = l.id::TEXT
                 AND COALESCE(c.crm_key, $2) = $2
                 AND COALESCE(c.updated_at, c.last_activity_at, c.created_at) >= NOW() - ($3::INT * INTERVAL '1 hour')
             )
           )
           AND (
             NULLIF(l.whatsapp_id, '') IS NOT NULL
             OR NULLIF(l.whatsapp_lid, '') IS NOT NULL
             OR NULLIF(l.display_phone, '') IS NOT NULL
             OR NULLIF(l.phone, '') IS NOT NULL
             OR NULLIF(l.last_user_message, '') IS NOT NULL
             OR NULLIF(l.last_bot_message, '') IS NOT NULL
           )
       ),
       updated_leads AS (
         UPDATE leads
         SET crm_key = $1, updated_at = NOW()
         WHERE id::TEXT IN (SELECT lead_id FROM candidate_leads)
         RETURNING id::TEXT AS lead_id
       )
       SELECT COALESCE(ARRAY_AGG(lead_id), ARRAY[]::TEXT[]) AS lead_ids, COUNT(*)::INT AS total
       FROM updated_leads`,
      [activeCrmKey, LEGACY_SOURCE_CRM_KEY, syncHours]
    );

    const leadIds = candidates.rows[0]?.lead_ids || [];
    if (leadIds.length === 0) {
      return { skipped: false, active_crm_key: activeCrmKey, moved: { leads: 0 }, sync_hours: syncHours };
    }

    const messages = await client.query(
      `UPDATE messages
       SET crm_key = $1
       WHERE COALESCE(crm_key, $2) = $2
         AND (
           lead_id::TEXT = ANY($3::TEXT[])
           OR conversation_id::TEXT IN (
             SELECT id::TEXT FROM conversations WHERE lead_id::TEXT = ANY($3::TEXT[])
           )
         )`,
      [activeCrmKey, LEGACY_SOURCE_CRM_KEY, leadIds]
    );
    const conversations = await client.query(
      `UPDATE conversations
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, LEGACY_SOURCE_CRM_KEY, leadIds]
    );
    const memory = await client.query(
      `UPDATE conversation_memory
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, LEGACY_SOURCE_CRM_KEY, leadIds]
    );
    const payments = await client.query(
      `UPDATE payments
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, LEGACY_SOURCE_CRM_KEY, leadIds]
    );
    const followups = await client.query(
      `UPDATE followups
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, LEGACY_SOURCE_CRM_KEY, leadIds]
    );
    const actions = await client.query(
      `UPDATE admin_actions
       SET crm_key = $1
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, LEGACY_SOURCE_CRM_KEY, leadIds]
    );

    return {
      skipped: false,
      active_crm_key: activeCrmKey,
      sync_hours: syncHours,
      moved: {
        leads: leadIds.length,
        messages: messages.rowCount,
        conversations: conversations.rowCount,
        memory: memory.rowCount,
        payments: payments.rowCount,
        followups: followups.rowCount,
        admin_actions: actions.rowCount
      }
    };
  });
}

function clampSyncHours(value) {
  const parsed = Number(value || DEFAULT_SYNC_HOURS);
  if (!Number.isFinite(parsed)) return DEFAULT_SYNC_HOURS;
  return Math.min(720, Math.max(1, Math.floor(parsed)));
}
