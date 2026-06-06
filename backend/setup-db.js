// ─── Kaana Predictions — Supabase Schema Setup Script ─────────────────────────
// Run once: node setup-db.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env
// Get service_role key from: Supabase Dashboard → Project Settings → API → service_role (secret)

require('dotenv').config();
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const SQL = `
-- Predictions table
create table if not exists predictions (
  id              uuid primary key default gen_random_uuid(),
  match           text not null,
  league          text default 'Football',
  odds            text not null,
  odds_category   text not null check (odds_category in ('2+','5+','10+','20+')),
  price           numeric not null,
  content         text default '',
  booking_code    text default '',
  tips            text[] default '{}',
  image_url       text default '',
  proof_image_url text default '',
  start_day       text default '',
  end_day         text default '',
  date            timestamptz not null,
  status          text not null default 'active' check (status in ('active','completed')),
  result          text check (result in ('win','loss') or result is null),
  created_at      timestamptz default now()
);

-- Payments table
create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  prediction_id    uuid references predictions(id),
  prediction_title text default '',
  reference        text not null unique,
  email            text not null,
  amount           numeric not null,
  currency         text default 'GHS',
  status           text not null default 'pending' check (status in ('success','failed','pending')),
  access_token     text not null default gen_random_uuid()::text,
  expires_at       timestamptz default (now() + interval '30 days'),
  created_at       timestamptz default now()
);

-- Indexes
create index if not exists idx_predictions_status        on predictions(status);
create index if not exists idx_payments_reference        on payments(reference);
create index if not exists idx_payments_email            on payments(email);
create index if not exists idx_payments_access_token     on payments(access_token);
`;

const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
console.log(`\n🔗 Project: ${projectRef}`);
console.log(`📡 Running schema setup against Supabase Management API...\n`);

const payload = JSON.stringify({ query: SQL });
const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${projectRef}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅  Schema created successfully!\n');
      console.log('Next steps:');
      console.log('  1. Create a storage bucket named "kaana-tips" in Supabase → Storage');
      console.log('  2. Set the bucket to PUBLIC');
      console.log('  3. Start backend: cd backend && node server.js\n');
    } else {
      console.error(`❌  HTTP ${res.statusCode}: ${body}`);
      console.log('\n💡 If you see "JWT could not be decoded", your SUPABASE_SERVICE_KEY is wrong.');
      console.log('   Go to: Supabase Dashboard → Project Settings → API → service_role (secret key)');
      console.log('   It should start with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');
    }
  });
});

req.on('error', e => console.error('❌ Request error:', e.message));
req.write(payload);
req.end();
