import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { assertChatbotSuccess, chatbotRequest } from '../services/chatbotClient.js';
import { crmWhere, getCrmKey } from '../utils/crm.js';

const router = Router();
const VALID_FOLLOWUP_STATUSES = ['pending', 'sent', 'cancelled', 'failed'];

router.get('/', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    const { whereSql, values } = buildFollowupFilters(req.query, crmKey);
    const result = await query(
      `SELECT
         f.*,
         COALESCE(f.scheduled_for, f.scheduled_at) AS scheduled_for,
         COALESCE(f.scheduled_at, f.scheduled_for) AS scheduled_at,
         l.name AS lead_name,
         l.phone AS lead_phone,
         l.whatsapp_id AS lead_whatsapp_id,
         l.whatsapp_lid AS lead_whatsapp_lid,
         l.display_phone AS lead_display_phone,
         l.email AS lead_email,
         l.country AS lead_country,
         l.city AS lead_city,
         l.lead_status
       FROM followups f
       LEFT JOIN leads l ON f.lead_id::TEXT = l.id::TEXT
       ${whereSql}
       ORDER BY COALESCE(f.scheduled_for, f.scheduled_at, f.created_at) ASC NULLS LAST, f.id DESC
       LIMIT 250`,
      values
    );

    res.json({ followups: result.rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await updateFollowup(req.params.id, req.body || {}, req.admin?.email, getCrmKey(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/send-now', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    const followup = await query(`SELECT * FROM followups WHERE id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [String(req.params.id), crmKey]);
    if (followup.rowCount === 0) {
      return res.status(404).json({ error: 'FOLLOWUP_NOT_FOUND' });
    }

    const chatbot = await chatbotRequest(`/api/followups/${req.params.id}/send-now`, { method: 'POST', crmKey });
    assertChatbotSuccess(chatbot, 'Follow-up was not sent by chatbot');
    const result = await updateFollowup(req.params.id, { status: 'sent', sent_at: new Date().toISOString() }, req.admin?.email, crmKey);

    res.json({ ...result, chatbot });
  } catch (error) {
    next(error);
  }
});

async function updateFollowup(followupId, body, adminEmail, crmKey = 'neurotraumas') {
  const editable = ['status', 'scheduled_for', 'scheduled_at', 'sent_at', 'message', 'type'];
  const updates = Object.fromEntries(Object.entries(body).filter(([key]) => editable.includes(key)));

  if (updates.scheduled_at !== undefined && updates.scheduled_for === undefined) {
    updates.scheduled_for = updates.scheduled_at;
  }
  if (updates.scheduled_for !== undefined && updates.scheduled_at === undefined) {
    updates.scheduled_at = updates.scheduled_for;
  }

  if (updates.status && !VALID_FOLLOWUP_STATUSES.includes(updates.status)) {
    const error = new Error('INVALID_FOLLOWUP_STATUS');
    error.status = 400;
    throw error;
  }

  if (Object.keys(updates).length === 0) {
    const current = await query(`SELECT * FROM followups WHERE id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [String(followupId), crmKey]);
    if (current.rowCount === 0) {
      const error = new Error('FOLLOWUP_NOT_FOUND');
      error.status = 404;
      throw error;
    }
    return { followup: current.rows[0] };
  }

  return withTransaction(async (client) => {
    const assignments = [];
    const values = [];
    Object.entries(updates).forEach(([key, value], index) => {
      assignments.push(`${key} = $${index + 1}`);
      values.push(value);
    });
    values.push(String(followupId));

    const result = await client.query(
      `UPDATE followups
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id::TEXT = $${values.length} AND ${crmWhere()} = $${values.length + 1}
       RETURNING *`,
      [...values, crmKey]
    );

    if (result.rowCount === 0) {
      const error = new Error('FOLLOWUP_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    const followup = result.rows[0];
    await client.query(
      `INSERT INTO admin_actions (lead_id, crm_key, action, details, admin_email, created_at)
       VALUES ($1, $2, 'followup_updated', $3, $4, NOW())`,
      [followup.lead_id ? String(followup.lead_id) : null, crmKey, { followup_id: followup.id, updates }, adminEmail]
    );

    return { followup };
  });
}

function buildFollowupFilters(filters, crmKey) {
  const where = [`${crmWhere('l')} = $1`];
  const values = [crmKey];

  if (filters.status) {
    values.push(String(filters.status));
    where.push(`f.status = $${values.length}`);
  }

  if (filters.type) {
    values.push(String(filters.type));
    where.push(`f.type = $${values.length}`);
  }

  if (filters.date_from) {
    values.push(String(filters.date_from));
    where.push(`COALESCE(f.scheduled_for, f.scheduled_at) >= $${values.length}`);
  }

  if (filters.date_to) {
    values.push(String(filters.date_to));
    where.push(`COALESCE(f.scheduled_for, f.scheduled_at) <= $${values.length}`);
  }

  if (filters.q) {
    values.push(`%${String(filters.q).trim()}%`);
    where.push(`(l.name ILIKE $${values.length} OR l.phone ILIKE $${values.length} OR l.email ILIKE $${values.length} OR l.country ILIKE $${values.length} OR l.city ILIKE $${values.length} OR l.whatsapp_id ILIKE $${values.length} OR l.whatsapp_lid ILIKE $${values.length} OR l.display_phone ILIKE $${values.length} OR f.message ILIKE $${values.length})`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values
  };
}

export default router;
