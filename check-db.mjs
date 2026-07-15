import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsoynwjjbxfvldmyrpwn.supabase.co/';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzb3lud2pqYnhmdmxkbXlycHduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAyNTc0OSwiZXhwIjoyMDkyNjAxNzQ5fQ.pf7vavAbZ0glQ3PhbrRItIK-FXzHbPQ35PgrxRb3Y4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: subs, error: subError } = await supabase.from('subscriptions').select('*');
  console.log('Subscriptions:', subs);
  if (subError) console.error(subError);

  const { data: users, error: userError } = await supabase.from('users').select('*');
  console.log('Users:', users);
  
  const { error: insertError } = await supabase.from('subscriptions').insert({
    tenant_id: 'a618e247-5e03-487f-a909-c90d76aa73dd', // RajaStudio
    plan_id: 'starter',
    status: 'active',
    billing_interval: 'month'
  });
  console.log('Insert Error:', insertError);
}
check();
