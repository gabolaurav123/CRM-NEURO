import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool;

export const DEFAULT_SETTINGS = {
  active_crm_key: 'holograficas',
  whatsapp_active_crm_key: 'holograficas',
  product_name: process.env.PRODUCT_NAME || 'Neurotraumas(TM)',
  product_price: '360',
  hotmart_link: process.env.HOTMART_LINK || 'https://pay.hotmart.com/T103515864E',
  gemini_model: 'gemini-1.5-flash',
  gemini_temperature: '0.7',
  gemini_max_output_tokens: '800',
  memory_expiration_hours: '24',
  followup_1_hours: '12',
  followup_payment_1_hours: '6',
  followup_payment_2_hours: '24',
  followup_payment_3_hours: '48',
  followup_4_days: '7',
  followup_payment_1_message:
    'Hola [NOMBRE], paso por aqui para confirmar algo.\n\nPudiste revisar el enlace de inscripcion?\n\nSi tienes alguna duda antes de tomar la decision, puedo ayudarte a resolverla.',
  followup_payment_2_message:
    'Solo quiero preguntarte algo importante:\n\nQue es lo que mas te esta frenando para empezar ahora?',
  followup_payment_3_message:
    'A veces uno espera sentirse completamente listo para cambiar.\n\nPero muchas veces la claridad aparece cuando das el primer paso con acompanamiento.\n\nSi todavia quieres avanzar, te dejo nuevamente el acceso oficial:\n\nhttps://pay.hotmart.com/T103515864E',
  followup_4_message:
    'Hola [NOMBRE].\n\nNo quiero insistirte, solo cerrar bien esta conversacion.\n\nPor lo que me contaste, esto si parecia importante para ti.\n\nQuieres que dejemos tu proceso en pausa por ahora o todavia te interesa recibir orientacion para entrar a Neurotraumas(TM)?',
  bot_enabled: 'true',
  initial_message: '',
  memory_notice_message: '',
  offer_text: '',
  payment_link_text: ''
};

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not configured');
    error.status = 503;
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (error) => {
      console.error('[postgres] Unexpected idle client error:', error.message);
    });
  }

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureDatabaseSchema() {
  if (!hasDatabaseUrl()) {
    console.warn('[postgres] DATABASE_URL is not configured. API routes that require DB access will return 503.');
    return;
  }

  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  await query(schema);
  await seedDefaultSettings();
  console.log('[postgres] Schema check completed.');
}

async function seedDefaultSettings() {
  const entries = Object.entries(DEFAULT_SETTINGS);
  for (const [key, value] of entries) {
    await query(
      `INSERT INTO bot_settings (key, value, value_type, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key)
       DO UPDATE SET
         value = CASE
           WHEN bot_settings.value IS NULL OR bot_settings.value = '' THEN EXCLUDED.value
           ELSE bot_settings.value
         END,
         value_type = EXCLUDED.value_type,
         updated_at = NOW()`,
      [key, value, inferValueType(value)]
    );
  }
}

function inferValueType(value) {
  if (value === 'true' || value === 'false') return 'boolean';
  if (!Number.isNaN(Number(value)) && value !== '') return 'number';
  return 'string';
}
