import { Router } from 'express';
import { query } from '../db.js';
import { getSettings } from '../services/settingsService.js';

const router = Router();

router.get('/metrics', async (req, res, next) => {
  try {
    const [metrics, commonObjection, commonPain, leadsByDay, leadsByStatus, leadsByPain, funnel, whatsapp, settings] =
      await Promise.all([
        query(`
          SELECT
            COUNT(*)::INT AS total_leads,
            COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW()))::INT AS leads_today,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::INT AS leads_last_7_days,
            COUNT(*) FILTER (WHERE lead_status = 'frio')::INT AS leads_frio,
            COUNT(*) FILTER (WHERE lead_status = 'tibio')::INT AS leads_tibio,
            COUNT(*) FILTER (WHERE lead_status = 'caliente')::INT AS leads_caliente,
            COUNT(*) FILTER (WHERE funnel_stage = 'oferta_presentada')::INT AS offers_presented,
            COUNT(*) FILTER (WHERE hotmart_link_sent = TRUE)::INT AS links_sent,
            COUNT(*) FILTER (WHERE payment_status IN ('pendiente', 'pending'))::INT AS payments_pending,
            COUNT(*) FILTER (WHERE payment_status IN ('pagado', 'confirmed'))::INT AS payments_confirmed,
            COUNT(*) FILTER (WHERE bot_paused = TRUE)::INT AS bot_paused,
            COUNT(*) FILTER (WHERE human_takeover = TRUE)::INT AS human_takeover,
            COALESCE(ROUND(AVG(NULLIF(urgency, 0))::NUMERIC, 1), 0)::FLOAT AS avg_urgency,
            COALESCE(ROUND(AVG(NULLIF(lead_score, 0))::NUMERIC, 1), 0)::FLOAT AS avg_lead_score,
            CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND((COUNT(*) FILTER (WHERE hotmart_link_sent = TRUE)::NUMERIC / COUNT(*)) * 100, 1) END::FLOAT AS payment_link_rate,
            CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND((COUNT(*) FILTER (WHERE payment_status IN ('pagado', 'confirmed'))::NUMERIC / COUNT(*)) * 100, 1) END::FLOAT AS payment_confirmed_rate
          FROM leads
        `),
        query(`
          SELECT main_objection AS label, COUNT(*)::INT AS total
          FROM leads
          WHERE COALESCE(main_objection, '') <> ''
          GROUP BY main_objection
          ORDER BY total DESC
          LIMIT 1
        `),
        query(`
          SELECT main_pain AS label, COUNT(*)::INT AS total
          FROM leads
          WHERE COALESCE(main_pain, '') <> ''
          GROUP BY main_pain
          ORDER BY total DESC
          LIMIT 1
        `),
        query(`
          SELECT series.day::DATE AS day, COUNT(l.id)::INT AS total
          FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS series(day)
          LEFT JOIN leads l ON l.created_at::DATE = series.day::DATE
          GROUP BY series.day
          ORDER BY series.day
        `),
        query(`
          SELECT COALESCE(lead_status, 'sin_estado') AS label, COUNT(*)::INT AS total
          FROM leads
          GROUP BY COALESCE(lead_status, 'sin_estado')
          ORDER BY total DESC
        `),
        query(`
          SELECT COALESCE(NULLIF(main_pain, ''), 'sin_dolor') AS label, COUNT(*)::INT AS total
          FROM leads
          GROUP BY COALESCE(NULLIF(main_pain, ''), 'sin_dolor')
          ORDER BY total DESC
          LIMIT 8
        `),
        query(`
          WITH stages(label, sort_order) AS (
            VALUES
              ('inicio', 1),
              ('captacion', 2),
              ('diagnostico', 3),
              ('datos_solicitados', 4),
              ('oferta_presentada', 5),
              ('objecion', 6),
              ('link_pago_enviado', 7),
              ('pago_reportado', 8),
              ('onboarding', 9)
          )
          SELECT stages.label, COUNT(leads.id)::INT AS total
          FROM stages
          LEFT JOIN leads ON leads.funnel_stage = stages.label
          GROUP BY stages.label, stages.sort_order
          ORDER BY stages.sort_order
        `),
        query(`
          SELECT status, phone, whatsapp_id, display_phone, last_connected_at, last_qr_at, updated_at
          FROM whatsapp_sessions
          ORDER BY updated_at DESC NULLS LAST, id DESC
          LIMIT 1
        `),
        getSettings()
      ]);

    const baseMetrics = metrics.rows[0] || {};
    const activeConversations = await query(`
      SELECT COUNT(*)::INT AS total
      FROM (
        SELECT DISTINCT lead_id
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      ) recent_messages
    `);

    res.json({
      metrics: {
        ...baseMetrics,
        active_conversations: activeConversations.rows[0]?.total || 0,
        common_objection: commonObjection.rows[0]?.label || 'Sin datos',
        common_pain: commonPain.rows[0]?.label || 'Sin datos',
        whatsapp_status: whatsapp.rows[0]?.status || 'disconnected',
        whatsapp_phone: whatsapp.rows[0]?.phone || '',
        whatsapp_id: whatsapp.rows[0]?.whatsapp_id || '',
        whatsapp_display_phone: whatsapp.rows[0]?.display_phone || '',
        bot_status: settings.bot_enabled === 'false' ? 'disabled' : 'enabled'
      },
      charts: {
        leads_by_day: leadsByDay.rows,
        leads_by_status: leadsByStatus.rows,
        leads_by_pain: leadsByPain.rows,
        funnel: funnel.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
