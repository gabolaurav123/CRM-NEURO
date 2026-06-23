CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_key TEXT DEFAULT 'neurotraumas',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  channel TEXT,
  phone TEXT,
  whatsapp_id TEXT,
  whatsapp_lid TEXT,
  display_phone TEXT,
  name TEXT,
  email TEXT,
  username TEXT,
  source_keyword TEXT,
  main_pain TEXT,
  emotional_response TEXT,
  problem_duration TEXT,
  tried_before TEXT,
  urgency INTEGER DEFAULT 0,
  lead_score INTEGER DEFAULT 0,
  lead_status TEXT DEFAULT 'frio',
  funnel_stage TEXT DEFAULT 'inicio',
  main_objection TEXT,
  hotmart_link_sent BOOLEAN DEFAULT FALSE,
  hotmart_link_sent_at TIMESTAMPTZ,
  payment_status TEXT DEFAULT 'pendiente',
  human_takeover BOOLEAN DEFAULT FALSE,
  bot_paused BOOLEAN DEFAULT FALSE,
  consent_24h BOOLEAN DEFAULT FALSE,
  memory_expires_at TIMESTAMPTZ,
  last_user_message TEXT,
  last_bot_message TEXT,
  notes TEXT
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_lid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS display_phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_keyword TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS main_pain TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS emotional_response TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS problem_duration TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tried_before TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgency INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'frio';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'inicio';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS main_objection TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hotmart_link_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hotmart_link_sent_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendiente';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bot_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_24h BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS memory_expires_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_user_message TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_bot_message TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  crm_key TEXT DEFAULT 'neurotraumas',
  lead_id TEXT,
  status TEXT DEFAULT 'active',
  last_message TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  crm_key TEXT DEFAULT 'neurotraumas',
  lead_id TEXT,
  conversation_id TEXT,
  direction TEXT,
  role TEXT,
  body TEXT,
  content TEXT,
  message_text TEXT,
  from_me BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_me BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS conversation_memory (
  id BIGSERIAL PRIMARY KEY,
  crm_key TEXT DEFAULT 'neurotraumas',
  lead_id TEXT UNIQUE,
  memory JSONB DEFAULT '{}'::JSONB,
  summary TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS memory JSONB DEFAULT '{}'::JSONB;
ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS bot_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  value_type TEXT DEFAULT 'string',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'string';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id BIGSERIAL PRIMARY KEY,
  crm_key TEXT DEFAULT 'neurotraumas',
  status TEXT DEFAULT 'disconnected',
  phone TEXT,
  whatsapp_id TEXT,
  display_phone TEXT,
  qr_code TEXT,
  last_qr_at TIMESTAMPTZ,
  last_connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS whatsapp_id TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS display_phone TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS last_qr_at TIMESTAMPTZ;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  crm_key TEXT DEFAULT 'neurotraumas',
  lead_id TEXT,
  status TEXT DEFAULT 'pending',
  amount NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  provider TEXT DEFAULT 'Hotmart',
  link TEXT,
  reported_by_user BOOLEAN DEFAULT FALSE,
  manually_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'Hotmart';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reported_by_user BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS manually_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS followups (
  id BIGSERIAL PRIMARY KEY,
  crm_key TEXT DEFAULT 'neurotraumas',
  lead_id TEXT,
  type TEXT,
  message TEXT,
  scheduled_for TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE followups ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE followups ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE followups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE followups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS admin_actions (
  id BIGSERIAL PRIMARY KEY,
  crm_key TEXT DEFAULT 'neurotraumas',
  lead_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::JSONB,
  admin_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS crm_key TEXT DEFAULT 'neurotraumas';
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::JSONB;
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE admin_actions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_crm_key ON leads (crm_key);
CREATE INDEX IF NOT EXISTS idx_leads_funnel ON leads (funnel_stage);
CREATE INDEX IF NOT EXISTS idx_leads_payment ON leads (payment_status);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads (last_contact_at);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments (lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups (status);
