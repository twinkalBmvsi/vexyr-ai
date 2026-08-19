const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: subData, error: subErr } = await supabase.from('subscriptions').select('*').limit(1);
  console.log('--- SUBSCRIPTIONS TABLE ---');
  if (subErr) console.error(subErr);
  else console.log('Columns:', subData.length ? Object.keys(subData[0]) : 'Table is empty, cannot infer columns.');

  const { data: tenData, error: tenErr } = await supabase.from('tenants').select('*').limit(1);
  console.log('\n--- TENANTS TABLE ---');
  if (tenErr) console.error(tenErr);
  else console.log('Columns:', tenData.length ? Object.keys(tenData[0]) : 'Table is empty, cannot infer columns.');
}

checkSchema();
