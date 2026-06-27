import { query } from '../db.js';

export async function createAdminAction({ leadId = null, crmKey = 'holograficas', action, details = {}, adminEmail = null }) {
  await query(
    `INSERT INTO admin_actions (lead_id, crm_key, action, details, admin_email, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [leadId ? String(leadId) : null, crmKey, action, details, adminEmail]
  );
}
