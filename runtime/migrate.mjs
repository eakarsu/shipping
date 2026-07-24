import { query, sqlLiteral } from './db.mjs';
import { hashPassword } from './auth.mjs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

query(`
  CREATE TABLE IF NOT EXISTS runtime_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS runtime_ai_results (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES runtime_users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    prompt JSONB NOT NULL,
    response JSONB NOT NULL,
    provider_id TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

const email = String(process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.PROVISION_ADMIN_PASSWORD || '');
const name = String(process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator');
if (!email || password.length < 12) throw new Error('Acceptance administrator credentials are required');
const passwordHash = hashPassword(password);
query(`
  INSERT INTO runtime_users (email, password_hash, name, role)
  VALUES (${sqlLiteral(email)}, ${sqlLiteral(passwordHash)}, ${sqlLiteral(name)}, 'admin')
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = 'admin',
    updated_at = NOW();
`);
console.log(`Shipping runtime database ready for ${email}`);
