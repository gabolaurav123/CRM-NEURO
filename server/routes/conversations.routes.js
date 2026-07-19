import { Router } from 'express';
import { query } from '../db.js';
import { sendManualLeadMessage } from '../services/messagesService.js';
import { requireUuid } from '../utils/ids.js';
import { normalizeProductInterest } from '../utils/products.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { whereSql, values } = buildConversationFilters(req.query);
    const result = await query(
      `WITH last_messages AS (
         SELECT DISTINCT ON (lead_id::TEXT)
           lead_id::TEXT AS lead_id,
           COALESCE(body, message_text, content, '') AS body,
           direction,
           from_me,
           created_at
         FROM messages
         WHERE lead_id IS NOT NULL
         ORDER BY lead_id::TEXT, created_at DESC
       ),
       conversation_leads AS (
         SELECT DISTINCT lead_id::TEXT AS lead_id
         FROM conversations
         WHERE lead_id IS NOT NULL
       )
       SELECT
         l.id AS lead_id,
         l.name,
         l.phone,
         l.whatsapp_id,
         l.whatsapp_lid,
         l.display_phone,
         l.email,
         l.product_interest,
         l.crm_key,
         l.lead_status,
         l.funnel_stage,
         l.bot_paused,
         l.human_takeover,
         l.memory_expires_at,
         COALESCE(lm.body, l.last_user_message, l.last_bot_message, '') AS last_message,
         COALESCE(lm.created_at, l.last_contact_at, l.updated_at, l.created_at) AS last_activity_at,
         lm.direction AS last_direction,
         lm.from_me AS last_from_me
       FROM leads l
       LEFT JOIN last_messages lm ON lm.lead_id = l.id::TEXT
       LEFT JOIN conversation_leads cl ON cl.lead_id = l.id::TEXT
       ${whereSql}
       ORDER BY COALESCE(lm.created_at, l.last_contact_at, l.updated_at, l.created_at) DESC NULLS LAST
       LIMIT 150`,
      values
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:leadId', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.leadId);
    const lead = await query(`SELECT * FROM leads WHERE id::TEXT = $1 LIMIT 1`, [leadId]);

    if (lead.rowCount === 0) return res.status(404).json({ error: 'LEAD_NOT_FOUND' });

    const messages = await query(
      `SELECT id, lead_id, conversation_id, direction, role,
              COALESCE(body, message_text, content, '') AS body,
              from_me, metadata, created_at
       FROM messages
       WHERE lead_id::TEXT = $1
          OR conversation_id::TEXT IN (SELECT id::TEXT FROM conversations WHERE lead_id::TEXT = $1)
       ORDER BY created_at ASC
       LIMIT 500`,
      [leadId]
    );

    res.json({ lead: lead.rows[0], messages: messages.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/:leadId/send-message', async (req, res, next) => {
  try {
    const result = await sendManualLeadMessage({
      leadId: req.params.leadId,
      message: req.body?.message,
      adminEmail: req.admin?.email
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

function buildConversationFilters(filters) {
  const where = ['(lm.lead_id IS NOT NULL OR cl.lead_id IS NOT NULL OR l.last_user_message IS NOT NULL OR l.last_bot_message IS NOT NULL OR l.last_contact_at IS NOT NULL)'];
  const values = [];

  if (filters.status === 'active') where.push(`COALESCE(lm.created_at, l.last_contact_at, l.updated_at, l.created_at) >= NOW() - INTERVAL '24 hours'`);
  if (filters.status === 'expired') where.push(`l.memory_expires_at IS NOT NULL AND l.memory_expires_at < NOW()`);
  if (filters.status === 'human') where.push('l.human_takeover = TRUE');
  if (filters.status === 'bot_paused') where.push('l.bot_paused = TRUE');
  if (filters.status === 'unanswered') where.push(`(lm.direction = 'inbound' OR lm.from_me = FALSE)`);

  if (filters.product_interest) {
    values.push(normalizeProductInterest(filters.product_interest));
    where.push(`l.product_interest = $${values.length}`);
  }

  if (filters.q) {
    values.push(`%${String(filters.q).trim()}%`);
    where.push(`(l.name ILIKE $${values.length} OR l.phone ILIKE $${values.length} OR l.email ILIKE $${values.length} OR l.country ILIKE $${values.length} OR l.city ILIKE $${values.length} OR l.username ILIKE $${values.length} OR l.whatsapp_id ILIKE $${values.length} OR l.whatsapp_lid ILIKE $${values.length} OR l.display_phone ILIKE $${values.length})`);
  }

  return { whereSql: `WHERE ${where.join(' AND ')}`, values };
}

export default router;
