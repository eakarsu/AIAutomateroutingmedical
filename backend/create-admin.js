import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
const email = String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.SEED_ADMIN_PASSWORD || '');
if (!email || password.length < 12) throw new Error('SEED_ADMIN_EMAIL and a password of at least 12 characters are required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users(email,password,full_name,role) VALUES($1,$2,$3,'admin')
     ON CONFLICT(email) DO UPDATE SET password=EXCLUDED.password,full_name=EXCLUDED.full_name,role='admin'`,
    [email, passwordHash, 'Runtime Administrator'],
  );
  console.log('administrator provisioned');
} finally { await pool.end(); }
