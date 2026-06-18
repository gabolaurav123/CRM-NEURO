import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool;

export const DEFAULT_SETTINGS = {
  product_name: process.env.PRODUCT_NAME || 'Neurotraumas(TM)',
  product_price: '360',
  hotmart_link: '',
  landing_link: '',
  gemini_model: 'gemini-1.5-flash',
  gemini_temperature: '0.7',
  gemini_max_output_tokens: '800',
  memory_expiration_hours: '24',
  followup_1_hours: '12',
  followup_payment_1_hours: '6',
  followup_payment_2_hours: '24',
  followup_payment_3_hours: '48',
  followup_4_days: '7',
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
       ON CONFLICT (key) DO NOTHING`,
      [key, value, inferValueType(value)]
    );
  }
}

function inferValueType(value) {
  if (value === 'true' || value === 'false') return 'boolean';
  if (!Number.isNaN(Number(value)) && value !== '') return 'number';
  return 'string';
}
