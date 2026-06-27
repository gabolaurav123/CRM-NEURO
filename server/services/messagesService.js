import { query, withTransaction } from '../db.js';
import { assertChatbotSuccess, chatbotRequest } from './chatbotClient.js';
import { crmWhere } from '../utils/crm.js';
import { requireUuid } from '../utils/ids.js';

export async function sendManualLeadMessage({ leadId, message, crmKey = 'holograficas', adminEmail }) {
  const id = requireUuid(leadId);
  const text = String(message || '').trim();

  if (!text) {
    const error = new Error('MESSAGE_REQUIRED');
    error.status = 400;
    throw error;
  }

  const lead = await query(`SELECT * FROM leads WHERE id::TEXT = $1 AND ${crmWhere()} = $2 LIMIT 1`, [id, crmKey]);
  if (lead.rowCount === 0) {
    const error = new Error('LEAD_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const chatbot = await chatbotRequest(`/api/leads/${id}/send-message`, {
    method: 'POST',
    crmKey,
    body: { message: text }
  });
  assertChatbotSuccess(chatbot, 'Manual message was not sent by chatbot');

  const result = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO messages (lead_id, crm_key, direction, role, body, from_me, metadata, created_at)
       VALUES ($1, $2, 'outbound', 'admin', $3, TRUE, $4, NOW())
       RETURNING id, lead_id, conversation_id, direction, role, body, from_me, metadata, created_at`,
      [id, crmKey, text, { source: 'crm' }]
    );

    const updatedLead = await client.query(
      `UPDATE leads
       SET last_bot_message = $2,
           last_contact_at = NOW(),
           updated_at = NOW()
       WHERE id::TEXT = $1 AND ${crmWhere()} = $3
       RETURNING *`,
      [id, text, crmKey]
    );

    await client.query(
      `INSERT INTO admin_actions (lead_id, crm_key, action, details, admin_email, created_at)
       VALUES ($1, $2, 'manual_message_sent', $3, $4, NOW())`,
      [id, crmKey, { message: text }, adminEmail]
    );

    return { message: inserted.rows[0], lead: updatedLead.rows[0] };
  });

  return { ...result, chatbot };
}
