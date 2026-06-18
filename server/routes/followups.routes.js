import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { chatbotRequest } from '../services/chatbotClient.js';

const router = Router();
const VALID_FOLLOWUP_STATUSES = ['pending', 'sent', 'cancelled', 'failed'];

router.get('/', async (req, res, next) => {
  try {
    const { whereSql, values } = buildFollowupFilters(req.query);
    const result = await query(
      `SELECT
         f.*,
         l.name AS lead_name,
         l.phone AS lead_phone,
         l.email AS lead_email,
         l.lead_status
       FROM followups f
       LEFT JOIN leads l ON f.lead_id::TEXT = l.id::TEXT
       ${whereSql}
       ORDER BY COALESCE(f.scheduled_for, f.created_at) ASC NULLS LAST, f.id DESC
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
    const result = await updateFollowup(req.params.id, req.body || {}, req.admin?.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/send-now', async (req, res, next) => {
  try {
    const followup = await query('SELECT * FROM followups WHERE id::TEXT = $1 LIMIT 1', [String(req.params.id)]);
    if (followup.rowCount === 0) {
      return res.status(404).json({ error: 'FOLLOWUP_NOT_FOUND' });
    }

    const chatbot = await chatbotRequest(`/api/followups/${req.params.id}/send-now`, { method: 'POST' });
    const result = await updateFollowup(req.params.id, { status: 'sent', sent_at: new Date().toISOString() }, req.admin?.email);

    res.json({ ...result, chatbot });
  } catch (error) {
    next(error);
  }
});

async function updateFollowup(followupId, body, adminEmail) {
  const editable = ['status', 'scheduled_for', 'sent_at', 'message', 'type'];
  const updates = Object.fromEntries(Object.entries(body).filter(([key]) => editable.includes(key)));

  if (updates.status && !VALID_FOLLOWUP_STATUSES.includes(updates.status)) {
    const error = new Error('INVALID_FOLLOWUP_STATUS');
    error.status = 400;
    throw error;
  }

  if (Object.keys(updates).length === 0) {
    const current = await query('SELECT * FROM followups WHERE id::TEXT = $1 LIMIT 1', [String(followupId)]);
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
       WHERE id::TEXT = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      const error = new Error('FOLLOWUP_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    const followup = result.rows[0];
    await client.query(
      `INSERT INTO admin_actions (lead_id, action, details, admin_email, created_at)
       VALUES ($1, 'followup_updated', $2, $3, NOW())`,
      [followup.lead_id ? String(followup.lead_id) : null, { followup_id: followup.id, updates }, adminEmail]
    );

    return { followup };
  });
}

function buildFollowupFilters(filters) {
  const where = [];
  const values = [];

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
    where.push(`f.scheduled_for >= $${values.length}`);
  }

  if (filters.date_to) {
    values.push(String(filters.date_to));
    where.push(`f.scheduled_for <= $${values.length}`);
  }

  if (filters.q) {
    values.push(`%${String(filters.q).trim()}%`);
    where.push(`(l.name ILIKE $${values.length} OR l.phone ILIKE $${values.length} OR f.message ILIKE $${values.length})`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values
  };
}

export default router;
