const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

supabase.from('gear_lists').select('id').limit(1).then(({data, error}) => {
  if (error) {
    console.log('SELECT error:', error.message, error.code);
  } else {
    console.log('SELECT OK, rows:', data.length);
  }
}).catch(e => console.log('Exception:', e.message));
