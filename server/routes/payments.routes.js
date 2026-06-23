import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { optionalChatbotRequest } from '../services/chatbotClient.js';
import { crmWhere, getCrmKey } from '../utils/crm.js';

const router = Router();
const VALID_PAYMENT_STATUSES = ['pending', 'reported', 'confirmed', 'failed', 'cancelled', 'pendiente', 'reportado', 'pagado'];

router.get('/', async (req, res, next) => {
  try {
    const crmKey = getCrmKey(req);
    const { whereSql, values } = buildPaymentFilters(req.query, crmKey);
    const result = await query(
      `SELECT
         p.*,
         COALESCE(NULLIF(p.provider, ''), 'Hotmart') AS provider,
         l.name AS lead_name,
         l.phone AS lead_phone,
         l.whatsapp_id AS lead_whatsapp_id,
         l.whatsapp_lid AS lead_whatsapp_lid,
         l.display_phone AS lead_display_phone,
         l.email AS lead_email,
         l.lead_status,
         l.payment_status AS lead_payment_status
       FROM payments p
       LEFT JOIN leads l ON p.lead_id::TEXT = l.id::TEXT
       ${whereSql}
       ORDER BY COALESCE(p.updated_at, p.created_at) DESC NULLS LAST, p.id DESC
       LIMIT 200`,
      values
    );

    res.json({ payments: result.rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (status && !VALID_PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'INVALID_PAYMENT_STATUS' });
    }

    const result = await updatePayment(req.params.id, req.body || {}, req.admin?.email, getCrmKey(req));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

async function updatePayment(paymentId, body, adminEmail, crmKey = 'neurotraumas') {
  return withTransaction(async (client) => {
    const editable = ['status', 'amount', 'currency', 'provider', 'link', 'reported_by_user', 'manually_confirmed'];
    const updates = Object.fromEntries(Object.entries(body).filter(([key]) => editable.includes(key)));
    const status = updates.status;

    if (status === 'confirmed' || status === 'pagado') {
      updates.status = 'confirmed';
      updates.manually_confirmed = true;
    }

    if (Object.keys(updates).length === 0) {
      const current = await client.query(`SELECT * FROM payments WHERE id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [String(paymentId), crmKey]);
      if (current.rowCount === 0) {
        const error = new Error('PAYMENT_NOT_FOUND');
        error.status = 404;
        throw error;
      }
      return { payment: current.rows[0] };
    }

    const assignments = [];
    const values = [];
    Object.entries(updates).forEach(([key, value], index) => {
      assignments.push(`${key} = $${index + 1}`);
      values.push(value);
    });

    if (updates.status === 'confirmed') {
      assignments.push('confirmed_at = NOW()');
    }

    values.push(String(paymentId));

    const paymentUpdate = await client.query(
      `UPDATE payments
       SET ${assignments.join(', ')}, updated_at = NOW()
       WHERE id::TEXT = $${values.length} AND ${crmWhere()} = $${values.length + 1}
       RETURNING *`,
      [...values, crmKey]
    );

    if (paymentUpdate.rowCount === 0) {
      const error = new Error('PAYMENT_NOT_FOUND');
      error.status = 404;
      throw error;
    }

    const payment = paymentUpdate.rows[0];
    let lead = null;

    if (updates.status === 'confirmed') {
      const leadUpdate = await client.query(
        `UPDATE leads
         SET payment_status = 'pagado',
             lead_status = 'comprador',
             funnel_stage = 'onboarding',
             updated_at = NOW()
         WHERE id::TEXT = $1 AND ${crmWhere()} = $2
         RETURNING *`,
        [String(payment.lead_id), crmKey]
      );
      lead = leadUpdate.rows[0] || null;
    } else if (updates.status === 'pending' || updates.status === 'pendiente') {
      const leadUpdate = await client.query(
        `UPDATE leads
         SET payment_status = 'pendiente',
             updated_at = NOW()
         WHERE id::TEXT = $1 AND ${crmWhere()} = $2
         RETURNING *`,
        [String(payment.lead_id), crmKey]
      );
      lead = leadUpdate.rows[0] || null;
    } else if (updates.status === 'reported' || updates.status === 'reportado') {
      const leadUpdate = await client.query(
        `UPDATE leads
         SET payment_status = 'reportado',
             funnel_stage = 'pago_reportado',
             updated_at = NOW()
         WHERE id::TEXT = $1 AND ${crmWhere()} = $2
         RETURNING *`,
        [String(payment.lead_id), crmKey]
      );
      lead = leadUpdate.rows[0] || null;
    }

    await client.query(
      `INSERT INTO admin_actions (lead_id, crm_key, action, details, admin_email, created_at)
       VALUES ($1, $2, 'payment_updated', $3, $4, NOW())`,
      [payment.lead_id ? String(payment.lead_id) : null, crmKey, { payment_id: payment.id, updates }, adminEmail]
    );

    let chatbot = null;
    if (updates.status === 'confirmed') {
      const programName = getProgramName(crmKey);
      chatbot = await optionalChatbotRequest(`/api/payments/${payment.id}/confirm`, {
        method: 'POST',
        crmKey,
        body: {
          message:
            `Tu inscripcion fue confirmada. Bienvenido(a) a ${programName}. En breve recibiras las instrucciones de acceso, comunidad y primeros pasos.`
        }
      });
    }

    return { payment, lead, chatbot };
  });
}

function getProgramName(crmKey) {
  return crmKey === 'holograficas' ? 'Holograficas' : 'Neurotraumas(TM)';
}

function buildPaymentFilters(filters, crmKey) {
  const where = [`${crmWhere('l')} = $1`];
  const values = [crmKey];

  if (filters.status) {
    values.push(String(filters.status));
    where.push(`p.status = $${values.length}`);
  }

  if (filters.q) {
    values.push(`%${String(filters.q).trim()}%`);
    where.push(`(l.name ILIKE $${values.length} OR l.phone ILIKE $${values.length} OR l.whatsapp_id ILIKE $${values.length} OR l.whatsapp_lid ILIKE $${values.length} OR l.display_phone ILIKE $${values.length} OR p.provider ILIKE $${values.length})`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    values
  };
}

export default router;
