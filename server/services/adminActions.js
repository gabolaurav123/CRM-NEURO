import { query } from '../db.js';

export async function createAdminAction({ leadId = null, action, details = {}, adminEmail = null }) {
  await query(
    `INSERT INTO admin_actions (lead_id, action, details, admin_email, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [leadId ? String(leadId) : null, action, details, adminEmail]
  );
}
