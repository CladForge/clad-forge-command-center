const { Client } = require('pg');

// Password stored exactly as provided - special chars: % $ !
const password = 'Ajgpkq5Wgm6PgYgsHs';

const regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

const MIGRATION_SQL = [
  "ALTER TABLE sows ADD COLUMN IF NOT EXISTS proposal_number TEXT DEFAULT ''",
  "ALTER TABLE sows ADD COLUMN IF NOT EXISTS project_id TEXT",
  "ALTER TABLE sows ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb",
  "ALTER TABLE sows ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''",
  "ALTER TABLE sows ADD COLUMN IF NOT EXISTS valid_until TEXT DEFAULT ''",
  "ALTER TABLE sows ADD COLUMN IF NOT EXISTS sent_date TEXT DEFAULT ''",
  "ALTER TABLE sows ADD COLUMN IF NOT EXISTS accepted_date TEXT DEFAULT ''",
];

async function tryConnect(host, port) {
  const client = new Client({
    host,
    port,
    database: 'postgres',
    user: 'postgres.qbrcqkgkzcwgnsmdyegd',
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  return client;
}

async function main() {
  let client;

  // Try all regions and ports
  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      try {
        client = await tryConnect(host, port);
        console.log(`Connected: ${host}:${port}`);
        break;
      } catch (e) {
        console.log(`  ${host}:${port} -> ${e.message.slice(0, 80)}`)
      }
    }
    if (client) break;
  }

  if (!client) {
    console.error('Could not connect to any Supabase pooler region.');
    console.error('Please check your database password in Supabase Dashboard -> Settings -> Database');
    process.exit(1);
  }

  // Run migration
  console.log('\nRunning migration...');
  for (const sql of MIGRATION_SQL) {
    try {
      await client.query(sql);
      const col = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
      console.log(`  ✓ ${col}`);
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
    }
  }

  // Verify columns
  const res = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'sows' ORDER BY ordinal_position"
  );
  console.log('\nAll sows columns:', res.rows.map(r => r.column_name).join(', '));

  await client.end();
  console.log('\nDone!');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
