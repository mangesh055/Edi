const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://piuqsfvczobwfviktgzv.supabase.co';
const supabaseAnonKey = 'sb_publishable_3TZrjzN6e4SR0siSg_ja-A_rIrkrNBp';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('recent_projects').select('*').limit(1);
  console.log('recent_projects check:', { data, error });
}

check();
