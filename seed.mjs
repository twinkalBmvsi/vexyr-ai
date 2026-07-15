import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gsoynwjjbxfvldmyrpwn.supabase.co/';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzb3lud2pqYnhmdmxkbXlycHduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAyNTc0OSwiZXhwIjoyMDkyNjAxNzQ5fQ.pf7vavAbZ0glQ3PhbrRItIK-FXzHbPQ35PgrxRb3Y4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  const plans = [
    { id: 'starter', name: 'Starter', monthly_price: 44, yearly_price: 427 },
    { id: 'growth', name: 'Growth', monthly_price: 112, yearly_price: 1064 },
    { id: 'enterprise', name: 'Enterprise', monthly_price: 224, yearly_price: 2144 }
  ];

  for (const plan of plans) {
    const { error } = await supabase.from('plans').upsert(plan);
    if (error) console.error('Error inserting plan:', plan.id, error);
    else console.log('Inserted plan:', plan.id);
  }
}

seed();
