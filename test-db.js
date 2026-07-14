const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => env.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim()

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE'))

async function test() {
  console.log('Testing users table columns...')
  const { data, error } = await supabase.from('users').insert({ id: '00000000-0000-0000-0000-000000000000', tenant_id: '00000000-0000-0000-0000-000000000000', role: 'owner', full_name: 'test' })
  console.log(error)
}

test()
