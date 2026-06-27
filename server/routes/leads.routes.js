import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { createAdminAction } from '../services/adminActions.js';
import { assertChatbotSuccess, chatbotRequest, optionalChatbotRequest } from '../services/chatbotClient.js';
import { sendManualLeadMessage } from '../services/messagesService.js';
import { getSettings } from '../services/settingsService.js';
import { syncRecentWhatsappRowsToActiveCrm } from '../services/crmSyncService.js';
import { crmWhere, getCrmKey } from '../utils/crm.js';
import { requireUuid } from '../utils/ids.js';

const router = Router();

const VALID_LEAD_STATUSES = ['frio', 'tibio', 'caliente', 'comprador', 'perdido'];
const VALID_PAYMENT_STATUSES = ['pendiente', 'pending', 'reported', 'reportado', 'pagado', 'confirmed', 'failed', 'cancelled'];
const VALID_FUNNEL_STAGES = [
  'inicio',
  'captacion',
  'diagnostico',
  'datos_solicitados',
  'oferta_presentada',
  'objecion',
  'link_pago_enviado',
  'pago_reportado',
  'onboarding',
  'pausado',
  'humano',
  'crisis'
];

const EDITABLE_COLUMNS = [
  'phone',
  'name',
  'email',
  'country',
  'city',
  'username',
  'channel',
  'source_keyword',
  'main_pain',
  'emotional_response',
  'problem_duration',
  'tried_before',
  'urgency',
  'lead_score',
  'lead_status',
  'funnel_stage',
  'main_objection',
  'hotmart_link_sent',
  'hotmart_link_sent_at',
  'payment_status',
  'human_takeover',
  'bot_paused',
  'consent_24h',
  'memory_expires_at',
  'last_user_message',
  'last_bot_message',
  'notes'
];

router.get('/', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    await syncRecentWhatsappRowsToActiveCrm({ requestedCrmKey: crmKey });
    const { whereSql, values } = buildLeadFilters(req.query, crmKey);
    const limit = clampNumber(req.query.limit, 1, 250, 100);
    const page = clampNumber(req.query.page, 1, 100000, 1);
    const offset = (page - 1) * limit;

    const list = await query(
      `SELECT *
       FROM leads
       ${whereSql}
       ORDER BY COALESCE(last_contact_at, updated_at, created_at) DESC NULLS LAST, id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    const count = await query(`SELECT COUNT(*)::INT AS total FROM leads ${whereSql}`, values);

    res.json({
      leads: list.rows,
      pagination: {
        page,
        limit,
        total: count.rows[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const lead = await query(`SELECT * FROM leads WHERE id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [leadId, crmKey]);

    if (lead.rowCount === 0) {
      return res.status(404).json({ error: 'LEAD_NOT_FOUND' });
    }

    const [messages, memory, payments, followups] = await Promise.all([
      query(
        `SELECT id, lead_id, conversation_id, direction, role,
                COALESCE(body, message_text, content, '') AS body,
                from_me, metadata, created_at
         FROM messages
         WHERE (lead_id::TEXT = $1 AND ${crmWhere()} = $2)
            OR conversation_id::TEXT IN (
              SELECT id::TEXT
              FROM conversations
              WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2
            )
         ORDER BY created_at ASC
         LIMIT 500`,
        [leadId, crmKey]
      ),
      query(`SELECT * FROM conversation_memory WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [leadId, crmKey]),
      query(`SELECT * FROM payments WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2 ORDER BY created_at DESC NULLS LAST, id DESC`, [leadId, crmKey]),
      query(
        `SELECT *, COALESCE(scheduled_for, scheduled_at) AS scheduled_for, COALESCE(scheduled_at, scheduled_for) AS scheduled_at
         FROM followups
         WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2
         ORDER BY COALESCE(scheduled_for, scheduled_at) ASC NULLS LAST, id DESC
         LIMIT 100`,
        [leadId, crmKey]
      )
    ]);

    res.json({
      lead: lead.rows[0],
      messages: messages.rows,
      memory: memory.rows[0] || null,
      payments: payments.rows,
      followups: followups.rows
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const updates = pickEditableLeadUpdates(req.body || {});
    validateLeadUpdates(updates);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'NO_VALID_FIELDS' });
    }

    const assignments = [];
    const values = [];

    Object.entries(updates).forEach(([key, value], index) => {
      assignments.push(`${key} = $${index + 1}`);
      values.push(value);
    });

    values.push(leadId);
    const result = await query(
      `UPDATE leads
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id::TEXT = $${values.length} AND ${crmWhere()} = $${values.length + 1}
       RETURNING *`,
      [...values, crmKey]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'LEAD_NOT_FOUND' });
    }

    await createAdminAction({
      leadId,
      crmKey,
      action: 'lead_updated',
      details: updates,
      adminEmail: req.admin?.email
    });

    res.json({ lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pause-bot', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const result = await updateLeadFlags(leadId, { bot_paused: true, funnel_stage: 'pausado' }, crmKey);
    const chatbot = await optionalChatbotRequest(`/api/leads/${leadId}/pause-bot`, { method: 'POST', crmKey });
    await createAdminAction({ leadId, crmKey, action: 'bot_paused', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resume-bot', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const result = await updateLeadFlags(leadId, { bot_paused: false }, crmKey);
    const chatbot = await optionalChatbotRequest(`/api/leads/${leadId}/resume-bot`, { method: 'POST', crmKey });
    await createAdminAction({ leadId, crmKey, action: 'bot_resumed', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/takeover', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const result = await updateLeadFlags(leadId, { human_takeover: true, funnel_stage: 'humano' }, crmKey);
    const chatbot = await optionalChatbotRequest(`/api/leads/${leadId}/takeover`, { method: 'POST', crmKey });
    await createAdminAction({ leadId, crmKey, action: 'human_takeover_enabled', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/release-takeover', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const result = await updateLeadFlags(leadId, { human_takeover: false }, crmKey);
    const chatbot = await optionalChatbotRequest(`/api/leads/${leadId}/release-takeover`, { method: 'POST', crmKey });
    await createAdminAction({ leadId, crmKey, action: 'human_takeover_released', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/delete-memory', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const lead = await query(`SELECT id FROM leads WHERE id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [leadId, crmKey]);
    if (lead.rowCount === 0) {
      return res.status(404).json({ error: 'LEAD_NOT_FOUND' });
    }
    const memoryDelete = await query(`DELETE FROM conversation_memory WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2`, [leadId, crmKey]);
    const leadUpdate = await query(
      `UPDATE leads
       SET memory_expires_at = NULL,
           consent_24h = FALSE,
           updated_at = NOW()
       WHERE id::TEXT = $1 AND ${crmWhere()} = $2
       RETURNING *`,
      [leadId, crmKey]
    );
    const chatbot = await optionalChatbotRequest(`/api/leads/${leadId}/delete-memory`, { method: 'POST', crmKey });
    await createAdminAction({ leadId, crmKey, action: 'memory_deleted', adminEmail: req.admin?.email });
    res.json({ ok: true, deleted: { memory: memoryDelete.rowCount }, lead: leadUpdate.rows[0], chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/delete-conversation', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const result = await resetLeadConversation(leadId, crmKey, req.admin?.email);
    const chatbot = await optionalChatbotRequest(`/api/leads/${leadId}/delete-memory`, { method: 'POST', crmKey });
    res.json({ ...result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/mark-paid', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const result = await markLeadPaid(leadId, crmKey, req.admin?.email);
    const chatbot = await optionalChatbotRequest(`/api/leads/${leadId}/mark-paid`, { method: 'POST', crmKey });
    res.json({ ...result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/send-hotmart-link', async (req, res, next) => {
  try {
    const leadId = requireUuid(req.params.id);
    const crmKey = getCrmKey(req);
    const settings = await getSettings();
    if (!settings.hotmart_link) {
      return res.status(400).json({ error: 'HOTMART_LINK_REQUIRED' });
    }

    const chatbot = await chatbotRequest(`/api/leads/${leadId}/send-hotmart-link`, {
      method: 'POST',
      crmKey,
      body: { hotmart_link: settings.hotmart_link }
    });
    assertChatbotSuccess(chatbot, 'Hotmart link was not sent by chatbot');

    const lead = await updateLeadFlags(leadId, {
      hotmart_link_sent: true,
      hotmart_link_sent_at: new Date().toISOString(),
      funnel_stage: 'link_pago_enviado'
    }, crmKey);

    await createAdminAction({
      leadId,
      crmKey,
      action: 'hotmart_link_sent',
      details: { hotmart_link: settings.hotmart_link },
      adminEmail: req.admin?.email
    });

    res.json({ lead, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/send-message', async (req, res, next) => {
  try {
    const result = await sendManualLeadMessage({
      leadId: req.params.id,
      message: req.body?.message,
      crmKey: getCrmKey(req),
      adminEmail: req.admin?.email
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

async function updateLeadFlags(leadId, updates, crmKey = 'neurotraumas') {
  const id = requireUuid(leadId);
  const entries = Object.entries(updates);
  const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(id);

  const result = await query(
    `UPDATE leads
     SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE id::TEXT = $${values.length} AND ${crmWhere()} = $${values.length + 1}
     RETURNING *`,
    [...values, crmKey]
  );

  if (result.rowCount === 0) {
    const error = new Error('LEAD_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function resetLeadConversation(leadId, crmKey, adminEmail) {
  const id = requireUuid(leadId);

  return withTransaction(async (client) => {
    const leadCheck = await client.query(`SELECT id FROM leads WHERE id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [id, crmKey]);
    if (leadCheck.rowCount === 0) {
      const error = new Error('LEAD_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    const memoryDelete = await client.query(`DELETE FROM conversation_memory WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2 RETURNING id`, [id, crmKey]);
    const messageDelete = await client.query(
      `DELETE FROM messages
       WHERE (lead_id::TEXT = $1 AND ${crmWhere()} = $2)
          OR conversation_id::TEXT IN (
            SELECT id::TEXT
            FROM conversations
            WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2
          )
       RETURNING id`,
      [id, crmKey]
    );
    const conversationDelete = await client.query(`DELETE FROM conversations WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2 RETURNING id`, [id, crmKey]);

    const leadUpdate = await client.query(
      `UPDATE leads
       SET last_user_message = NULL,
           last_bot_message = NULL,
           last_contact_at = NULL,
           memory_expires_at = NULL,
           consent_24h = FALSE,
           human_takeover = FALSE,
           bot_paused = FALSE,
           funnel_stage = 'inicio',
           updated_at = NOW()
       WHERE id::TEXT = $1 AND ${crmWhere()} = $2
       RETURNING *`,
      [id, crmKey]
    );

    await client.query(
      `INSERT INTO admin_actions (lead_id, crm_key, action, details, admin_email, created_at)
       VALUES ($1, $2, 'conversation_deleted', $3, $4, NOW())`,
      [
        id,
        crmKey,
        {
          deleted_messages: messageDelete.rowCount,
          deleted_conversations: conversationDelete.rowCount,
          deleted_memory_rows: memoryDelete.rowCount
        },
        adminEmail
      ]
    );

    return {
      lead: leadUpdate.rows[0],
      deleted: {
        messages: messageDelete.rowCount,
        conversations: conversationDelete.rowCount,
        memory: memoryDelete.rowCount
      }
    };
  });
}

async function markLeadPaid(leadId, crmKey, adminEmail) {
  const id = requireUuid(leadId);
  return withTransaction(async (client) => {
    const paymentUpdate = await client.query(
      `UPDATE payments
       SET status = 'confirmed',
           manually_confirmed = TRUE,
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE id::TEXT = (
         SELECT id::TEXT
         FROM payments
         WHERE lead_id::TEXT = $1 AND ${crmWhere()} = $2
         ORDER BY created_at DESC NULLS LAST, id DESC
         LIMIT 1
       )
       RETURNING *`,
      [id, crmKey]
    );

    let payment = paymentUpdate.rows[0];
    if (!payment) {
      const inserted = await client.query(
        `INSERT INTO payments (lead_id, crm_key, status, manually_confirmed, confirmed_at, created_at, updated_at)
         VALUES ($1, $2, 'confirmed', TRUE, NOW(), NOW(), NOW())
         RETURNING *`,
        [id, crmKey]
      );
      payment = inserted.rows[0];
    }

    const leadUpdate = await client.query(
      `UPDATE leads
       SET payment_status = 'pagado',
           lead_status = 'comprador',
           funnel_stage = 'onboarding',
           updated_at = NOW()
       WHERE id::TEXT = $1 AND ${crmWhere()} = $2
       RETURNING *`,
      [id, crmKey]
    );

    if (leadUpdate.rowCount === 0) {
      const error = new Error('LEAD_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    await client.query(
      `INSERT INTO admin_actions (lead_id, crm_key, action, details, admin_email, created_at)
       VALUES ($1, $2, 'payment_confirmed', $3, $4, NOW())`,
      [id, crmKey, { payment_id: payment.id }, adminEmail]
    );

    return { lead: leadUpdate.rows[0], payment };
  });
}

function buildLeadFilters(filters, crmKey) {
  const where = [`${crmWhere()} = $1`];
  const values = [crmKey];
  const add = (sql, value) => {
    values.push(value);
    where.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.q) {
    values.push(`%${String(filters.q).trim()}%`);
    where.push(`(name ILIKE $${values.length} OR phone ILIKE $${values.length} OR email ILIKE $${values.length} OR country ILIKE $${values.length} OR city ILIKE $${values.length} OR username ILIKE $${values.length} OR whatsapp_id ILIKE $${values.length} OR whatsapp_lid ILIKE $${values.length} OR display_phone ILIKE $${values.length})`);
  }
  if (filters.name) add('name ILIKE ?', `%${String(filters.name).trim()}%`);
  if (filters.phone) {
    values.push(`%${String(filters.phone).trim()}%`);
    where.push(`(phone ILIKE $${values.length} OR display_phone ILIKE $${values.length} OR whatsapp_id ILIKE $${values.length} OR whatsapp_lid ILIKE $${values.length})`);
  }
  if (filters.email) add('email ILIKE ?', `%${String(filters.email).trim()}%`);
  if (filters.country) add('country ILIKE ?', `%${String(filters.country).trim()}%`);
  if (filters.city) add('city ILIKE ?', `%${String(filters.city).trim()}%`);
  if (filters.username) add('username ILIKE ?', `%${String(filters.username).trim()}%`);
  if (filters.lead_status) add('lead_status = ?', String(filters.lead_status));
  if (filters.funnel_stage) add('funnel_stage = ?', String(filters.funnel_stage));
  if (filters.main_pain) add('main_pain ILIKE ?', `%${String(filters.main_pain).trim()}%`);
  if (filters.payment_status) add('payment_status = ?', String(filters.payment_status));
  if (filters.hotmart_link_sent !== undefined && filters.hotmart_link_sent !== '') add('hotmart_link_sent = ?', parseBoolean(filters.hotmart_link_sent));
  if (filters.bot_paused !== undefined && filters.bot_paused !== '') add('bot_paused = ?', parseBoolean(filters.bot_paused));
  if (filters.human_takeover !== undefined && filters.human_takeover !== '') add('human_takeover = ?', parseBoolean(filters.human_takeover));
  if (filters.date_from) add('created_at >= ?', String(filters.date_from));
  if (filters.date_to) add('created_at <= ?', String(filters.date_to));

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values
  };
}

function pickEditableLeadUpdates(body) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => EDITABLE_COLUMNS.includes(key)));
}

function validateLeadUpdates(updates) {
  if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(updates.email))) {
    const error = new Error('INVALID_EMAIL');
    error.status = 400;
    throw error;
  }

  if (updates.lead_score !== undefined && !isInRange(updates.lead_score, 0, 100)) {
    const error = new Error('INVALID_LEAD_SCORE');
    error.status = 400;
    throw error;
  }

  if (updates.urgency !== undefined && !isInRange(updates.urgency, 1, 10)) {
    const error = new Error('INVALID_URGENCY');
    error.status = 400;
    throw error;
  }

  if (updates.lead_status && !VALID_LEAD_STATUSES.includes(updates.lead_status)) {
    const error = new Error('INVALID_LEAD_STATUS');
    error.status = 400;
    throw error;
  }

  if (updates.payment_status && !VALID_PAYMENT_STATUSES.includes(updates.payment_status)) {
    const error = new Error('INVALID_PAYMENT_STATUS');
    error.status = 400;
    throw error;
  }

  if (updates.funnel_stage && !VALID_FUNNEL_STAGES.includes(updates.funnel_stage)) {
    const error = new Error('INVALID_FUNNEL_STAGE');
    error.status = 400;
    throw error;
  }
}

function isInRange(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

export default router;
