import { withTransaction } from '../db.js';
import { getActiveWhatsappCrmDetails } from './activeCrmService.js';
import { DEFAULT_CRM_KEY, LEGACY_CRM_KEY, normalizeCrmKey } from '../utils/crm.js';

const SOURCE_CRM_BY_ACTIVE = {
  [DEFAULT_CRM_KEY]: LEGACY_CRM_KEY,
  [LEGACY_CRM_KEY]: DEFAULT_CRM_KEY
};

export async function syncRecentWhatsappRowsToActiveCrm({ requestedCrmKey } = {}) {
  const active = await getActiveWhatsappCrmDetails();
  const activeCrmKey = normalizeCrmKey(active.crmKey);
  const requested = requestedCrmKey ? normalizeCrmKey(requestedCrmKey) : activeCrmKey;
  const sourceCrmKey = SOURCE_CRM_BY_ACTIVE[activeCrmKey];

  if (!sourceCrmKey || requested !== activeCrmKey) {
    return { skipped: true, active_crm_key: activeCrmKey, requested_crm_key: requested };
  }

  const activeSince = active.startedAt || active.settingUpdatedAt;
  if (!activeSince) {
    return { skipped: true, active_crm_key: activeCrmKey, requested_crm_key: requested, reason: 'missing_active_since' };
  }

  return withTransaction(async (client) => {
    const candidates = await client.query(
      `WITH candidate_leads AS (
         SELECT DISTINCT l.id::TEXT AS lead_id
         FROM leads l
         WHERE COALESCE(l.crm_key, $2) = $2
           AND (
             l.created_at >= $3::TIMESTAMPTZ
             OR l.first_contact_at >= $3::TIMESTAMPTZ
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
      [activeCrmKey, sourceCrmKey, activeSince]
    );

    const leadIds = candidates.rows[0]?.lead_ids || [];
    if (leadIds.length === 0) {
      return { skipped: false, active_crm_key: activeCrmKey, source_crm_key: sourceCrmKey, moved: { leads: 0 }, active_since: activeSince };
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
      [activeCrmKey, sourceCrmKey, leadIds]
    );
    const conversations = await client.query(
      `UPDATE conversations
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, sourceCrmKey, leadIds]
    );
    const memory = await client.query(
      `UPDATE conversation_memory
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, sourceCrmKey, leadIds]
    );
    const payments = await client.query(
      `UPDATE payments
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, sourceCrmKey, leadIds]
    );
    const followups = await client.query(
      `UPDATE followups
       SET crm_key = $1, updated_at = NOW()
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, sourceCrmKey, leadIds]
    );
    const actions = await client.query(
      `UPDATE admin_actions
       SET crm_key = $1
       WHERE COALESCE(crm_key, $2) = $2 AND lead_id::TEXT = ANY($3::TEXT[])`,
      [activeCrmKey, sourceCrmKey, leadIds]
    );

    return {
      skipped: false,
      active_crm_key: activeCrmKey,
      source_crm_key: sourceCrmKey,
      active_since: activeSince,
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
