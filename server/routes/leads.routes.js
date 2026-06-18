import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { createAdminAction } from '../services/adminActions.js';
import { chatbotRequest, optionalChatbotRequest } from '../services/chatbotClient.js';
import { getSettings } from '../services/settingsService.js';

const router = Router();

const VALID_LEAD_STATUSES = ['frio', 'tibio', 'caliente', 'comprador', 'perdido'];
const VALID_PAYMENT_STATUSES = ['pendiente', 'pending', 'reported', 'reportado', 'pagado', 'confirmed', 'failed', 'cancelled'];
const VALID_FUNNEL_STAGES = [
  'inicio',
  'captacion',
  'diagnostico',
  'landing_enviada',
  'video_visto',
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
    const { whereSql, values } = buildLeadFilters(req.query);
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
    const leadId = String(req.params.id);
    const lead = await query('SELECT * FROM leads WHERE id::TEXT = $1 LIMIT 1', [leadId]);

    if (lead.rowCount === 0) {
      return res.status(404).json({ error: 'LEAD_NOT_FOUND' });
    }

    const [messages, memory, payments, followups] = await Promise.all([
      query(
        `SELECT id, lead_id, conversation_id, direction, role,
                COALESCE(body, message_text, content, '') AS body,
                from_me, metadata, created_at
         FROM messages
         WHERE lead_id::TEXT = $1
            OR conversation_id IN (SELECT id::TEXT FROM conversations WHERE lead_id::TEXT = $1)
         ORDER BY created_at ASC
         LIMIT 500`,
        [leadId]
      ),
      query('SELECT * FROM conversation_memory WHERE lead_id::TEXT = $1 LIMIT 1', [leadId]),
      query('SELECT * FROM payments WHERE lead_id::TEXT = $1 ORDER BY created_at DESC NULLS LAST, id DESC', [leadId]),
      query('SELECT * FROM followups WHERE lead_id::TEXT = $1 ORDER BY scheduled_for ASC NULLS LAST, id DESC LIMIT 100', [leadId])
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

    values.push(String(req.params.id));
    const result = await query(
      `UPDATE leads
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id::TEXT = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'LEAD_NOT_FOUND' });
    }

    await createAdminAction({
      leadId: req.params.id,
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
    const result = await updateLeadFlags(req.params.id, { bot_paused: true, funnel_stage: 'pausado' });
    const chatbot = await optionalChatbotRequest(`/api/leads/${req.params.id}/pause-bot`, { method: 'POST' });
    await createAdminAction({ leadId: req.params.id, action: 'bot_paused', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resume-bot', async (req, res, next) => {
  try {
    const result = await updateLeadFlags(req.params.id, { bot_paused: false });
    const chatbot = await optionalChatbotRequest(`/api/leads/${req.params.id}/resume-bot`, { method: 'POST' });
    await createAdminAction({ leadId: req.params.id, action: 'bot_resumed', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/takeover', async (req, res, next) => {
  try {
    const result = await updateLeadFlags(req.params.id, { human_takeover: true, funnel_stage: 'humano' });
    const chatbot = await optionalChatbotRequest(`/api/leads/${req.params.id}/takeover`, { method: 'POST' });
    await createAdminAction({ leadId: req.params.id, action: 'human_takeover_enabled', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/release-takeover', async (req, res, next) => {
  try {
    const result = await updateLeadFlags(req.params.id, { human_takeover: false });
    const chatbot = await optionalChatbotRequest(`/api/leads/${req.params.id}/release-takeover`, { method: 'POST' });
    await createAdminAction({ leadId: req.params.id, action: 'human_takeover_released', adminEmail: req.admin?.email });
    res.json({ lead: result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/delete-memory', async (req, res, next) => {
  try {
    await query('DELETE FROM conversation_memory WHERE lead_id::TEXT = $1', [String(req.params.id)]);
    const chatbot = await optionalChatbotRequest(`/api/leads/${req.params.id}/delete-memory`, { method: 'POST' });
    await createAdminAction({ leadId: req.params.id, action: 'memory_deleted', adminEmail: req.admin?.email });
    res.json({ ok: true, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/mark-paid', async (req, res, next) => {
  try {
    const result = await markLeadPaid(req.params.id, req.admin?.email);
    const chatbot = await optionalChatbotRequest(`/api/leads/${req.params.id}/mark-paid`, { method: 'POST' });
    res.json({ ...result, chatbot });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/send-hotmart-link', async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings.hotmart_link) {
      return res.status(400).json({ error: 'HOTMART_LINK_REQUIRED' });
    }

    const chatbot = await chatbotRequest(`/api/leads/${req.params.id}/send-hotmart-link`, {
      method: 'POST',
      body: { hotmart_link: settings.hotmart_link }
    });

    const lead = await updateLeadFlags(req.params.id, {
      hotmart_link_sent: true,
      hotmart_link_sent_at: new Date().toISOString(),
      funnel_stage: 'link_pago_enviado'
    });

    await createAdminAction({
      leadId: req.params.id,
      action: 'hotmart_link_sent',
      details: { hotmart_link: settings.hotmart_link },
      adminEmail: req.admin?.email
    });

    res.json({ lead, chatbot });
  } catch (error) {
    next(error);
  }
});

async function updateLeadFlags(leadId, updates) {
  const entries = Object.entries(updates);
  const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(String(leadId));

  const result = await query(
    `UPDATE leads
     SET ${assignments.join(', ')}, updated_at = NOW()
     WHERE id::TEXT = $${values.length}
     RETURNING *`,
    values
  );

  if (result.rowCount === 0) {
    const error = new Error('LEAD_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function markLeadPaid(leadId, adminEmail) {
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
         WHERE lead_id::TEXT = $1
         ORDER BY created_at DESC NULLS LAST, id DESC
         LIMIT 1
       )
       RETURNING *`,
      [String(leadId)]
    );

    let payment = paymentUpdate.rows[0];
    if (!payment) {
      const inserted = await client.query(
        `INSERT INTO payments (lead_id, status, manually_confirmed, confirmed_at, created_at, updated_at)
         VALUES ($1, 'confirmed', TRUE, NOW(), NOW(), NOW())
         RETURNING *`,
        [String(leadId)]
      );
      payment = inserted.rows[0];
    }

    const leadUpdate = await client.query(
      `UPDATE leads
       SET payment_status = 'pagado',
           lead_status = 'comprador',
           funnel_stage = 'onboarding',
           updated_at = NOW()
       WHERE id::TEXT = $1
       RETURNING *`,
      [String(leadId)]
    );

    if (leadUpdate.rowCount === 0) {
      const error = new Error('LEAD_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    await client.query(
      `INSERT INTO admin_actions (lead_id, action, details, admin_email, created_at)
       VALUES ($1, 'payment_confirmed', $2, $3, NOW())`,
      [String(leadId), { payment_id: payment.id }, adminEmail]
    );

    return { lead: leadUpdate.rows[0], payment };
  });
}

function buildLeadFilters(filters) {
  const where = [];
  const values = [];
  const add = (sql, value) => {
    values.push(value);
    where.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.q) {
    values.push(`%${String(filters.q).trim()}%`);
    where.push(`(name ILIKE $${values.length} OR phone ILIKE $${values.length} OR email ILIKE $${values.length} OR username ILIKE $${values.length})`);
  }
  if (filters.name) add('name ILIKE ?', `%${String(filters.name).trim()}%`);
  if (filters.phone) add('phone ILIKE ?', `%${String(filters.phone).trim()}%`);
  if (filters.email) add('email ILIKE ?', `%${String(filters.email).trim()}%`);
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

  if (updates.phone !== undefined && String(updates.phone).trim() === '') {
    const error = new Error('PHONE_REQUIRED');
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
