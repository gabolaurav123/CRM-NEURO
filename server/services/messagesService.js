import { query, withTransaction } from '../db.js';
import { assertChatbotSuccess, chatbotRequest } from './chatbotClient.js';
import { requireUuid } from '../utils/ids.js';

export async function sendManualLeadMessage({ leadId, message, adminEmail }) {
  const id = requireUuid(leadId);
  const text = String(message || '').trim();

  if (!text) {
    const error = new Error('MESSAGE_REQUIRED');
    error.status = 400;
    throw error;
  }

  const lead = await query('SELECT * FROM leads WHERE id::TEXT = $1 LIMIT 1', [id]);
  if (lead.rowCount === 0) {
    const error = new Error('LEAD_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const chatbot = await chatbotRequest(`/api/leads/${id}/send-message`, {
    method: 'POST',
    body: { message: text }
  });
  assertChatbotSuccess(chatbot, 'Manual message was not sent by chatbot');

  const result = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO messages (lead_id, direction, role, body, from_me, metadata, created_at)
       VALUES ($1, 'outbound', 'admin', $2, TRUE, $3, NOW())
       RETURNING id, lead_id, conversation_id, direction, role, body, from_me, metadata, created_at`,
      [id, text, { source: 'crm' }]
    );

    const updatedLead = await client.query(
      `UPDATE leads
       SET last_bot_message = $2,
           last_contact_at = NOW(),
           updated_at = NOW()
       WHERE id::TEXT = $1
       RETURNING *`,
      [id, text]
    );

    await client.query(
      `INSERT INTO admin_actions (lead_id, action, details, admin_email, created_at)
       VALUES ($1, 'manual_message_sent', $2, $3, NOW())`,
      [id, { message: text }, adminEmail]
    );

    return { message: inserted.rows[0], lead: updatedLead.rows[0] };
  });

  return { ...result, chatbot };
}
