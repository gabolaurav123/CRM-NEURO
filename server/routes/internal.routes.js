import { Router } from 'express';
import { activeCrmPayload, getActiveWhatsappCrm, setActiveWhatsappCrm } from '../services/activeCrmService.js';
import { withTransaction } from '../db.js';
import { syncRecentWhatsappRowsToActiveCrm } from '../services/crmSyncService.js';
import { LEGACY_CRM_KEY, normalizeCrmKey } from '../utils/crm.js';
import { normalizeProductInterest } from '../utils/products.js';

const router = Router();

router.get('/active-crm', async (req, res, next) => {
  try {
    const crmKey = await getActiveWhatsappCrm();
    res.json(activeCrmPayload(crmKey));
  } catch (error) {
    next(error);
  }
});

router.post('/active-crm', async (req, res, next) => {
  try {
    const crmKey = normalizeCrmKey(req.body?.crm_key || req.body?.crmKey || req.query?.crm_key);
    await setActiveWhatsappCrm(crmKey);
    res.json(activeCrmPayload(crmKey));
  } catch (error) {
    next(error);
  }
});

router.post('/sync-active-crm', async (req, res, next) => {
  try {
    const result = await syncRecentWhatsappRowsToActiveCrm({ requestedCrmKey: req.body?.crm_key || req.query?.crm_key });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/whatsapp/active-crm', async (req, res, next) => {
  try {
    const crmKey = await getActiveWhatsappCrm();
    res.json(activeCrmPayload(crmKey));
  } catch (error) {
    next(error);
  }
});

router.post('/leads/upsert', async (req, res, next) => {
  try {
    const crmKey = req.body?.crm_key || req.body?.crmKey || req.query?.crm_key
      ? normalizeCrmKey(req.body?.crm_key || req.body?.crmKey || req.query?.crm_key)
      : await getActiveWhatsappCrm();
    const lead = await upsertLead(crmKey, req.body || {});
    res.json({ lead, ...activeCrmPayload(crmKey) });
  } catch (error) {
    next(error);
  }
});

async function upsertLead(crmKey, body) {
  const payload = normalizeLeadPayload(body, crmKey);

  return withTransaction(async (client) => {
    const existing = await findExistingLead(client, crmKey, payload);
    const entries = Object.entries(payload).filter(([key, value]) => key !== 'id' && value !== undefined && value !== null && String(value).trim() !== '');

    if (existing) {
      if (entries.length === 0) return existing;
      const assignments = entries.map(([key], index) => `${key} = $${index + 1}`);
      const values = entries.map(([, value]) => value);
      values.push(existing.id, crmKey);

      const updated = await client.query(
        `UPDATE leads
         SET ${assignments.join(', ')},
             last_contact_at = NOW(),
             updated_at = NOW()
         WHERE id::TEXT = $${values.length - 1} AND COALESCE(crm_key, $${values.length + 1}) = $${values.length}
         RETURNING *`,
        [...values, LEGACY_CRM_KEY]
      );
      return updated.rows[0];
    }

    const insertEntries = entries.some(([key]) => key === 'product_interest')
      ? entries
      : [...entries, ['product_interest', normalizeProductInterest('', crmKey)]];
    const columns = ['crm_key', ...insertEntries.map(([key]) => key), 'created_at', 'updated_at', 'first_contact_at', 'last_contact_at'];
    const values = [crmKey, ...insertEntries.map(([, value]) => value)];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const inserted = await client.query(
      `INSERT INTO leads (${columns.join(', ')})
       VALUES (${[...placeholders, 'NOW()', 'NOW()', 'NOW()', 'NOW()'].join(', ')})
       RETURNING *`,
      values
    );
    return inserted.rows[0];
  });
}

async function findExistingLead(client, crmKey, payload) {
  const checks = [
    ['id::TEXT', isUuid(payload.id) ? payload.id : undefined],
    ['whatsapp_id', payload.whatsapp_id],
    ['whatsapp_lid', payload.whatsapp_lid],
    ['display_phone', payload.display_phone],
    ['phone', payload.phone],
    ['email', payload.email]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

  if (checks.length === 0) return null;

  const values = [crmKey, LEGACY_CRM_KEY];
  const clauses = checks.map(([column, value]) => {
    values.push(String(value).trim());
    return `${column} = $${values.length}`;
  });

  const result = await client.query(
    `SELECT *
     FROM leads
     WHERE COALESCE(crm_key, $2) = $1
       AND (${clauses.join(' OR ')})
     ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
     LIMIT 1`,
    values
  );
  return result.rows[0] || null;
}

function normalizeLeadPayload(body, crmKey) {
  const rawId = value(body.id || body.lead_id);
  const rawProductInterest = body.product_interest || body.productInterest || body.product || body.producto || body.interested_product;
  return {
    id: isUuid(rawId) ? rawId : undefined,
    phone: value(body.phone || body.telefono || body.celular || body.cellphone),
    whatsapp_id: value(body.whatsapp_id || body.whatsappId || body.from || body.sender),
    whatsapp_lid: value(body.whatsapp_lid || body.whatsappLid),
    display_phone: value(body.display_phone || body.displayPhone || body.numero || body.number),
    name: value(body.name || body.nombre),
    email: value(body.email || body.correo),
    country: value(body.country || body.pais),
    city: value(body.city || body.ciudad),
    username: value(body.username || body.usuario),
    channel: value(body.channel || body.canal || 'whatsapp'),
    source_keyword: value(body.source_keyword || body.sourceKeyword),
    product_interest: rawProductInterest
      ? normalizeProductInterest(rawProductInterest, body.crm_key || body.crmKey || crmKey)
      : undefined,
    main_pain: value(body.main_pain || body.mainPain || body.dolor),
    emotional_response: value(body.emotional_response || body.emotionalResponse),
    problem_duration: value(body.problem_duration || body.problemDuration),
    tried_before: value(body.tried_before || body.triedBefore),
    urgency: numberValue(body.urgency || body.urgencia),
    lead_score: numberValue(body.lead_score || body.leadScore),
    lead_status: value(body.lead_status || body.leadStatus),
    funnel_stage: value(body.funnel_stage || body.funnelStage),
    main_objection: value(body.main_objection || body.mainObjection),
    payment_status: value(body.payment_status || body.paymentStatus),
    last_user_message: value(body.last_user_message || body.lastUserMessage),
    last_bot_message: value(body.last_bot_message || body.lastBotMessage),
    notes: value(body.notes || body.notas)
  };
}

function value(input) {
  if (input === undefined || input === null) return undefined;
  const text = String(input).trim();
  return text || undefined;
}

function numberValue(input) {
  if (input === undefined || input === null || input === '') return undefined;
  const number = Number(input);
  return Number.isFinite(number) ? number : undefined;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default router;
