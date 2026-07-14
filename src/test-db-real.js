import 'dotenv/config';
import { supabaseAdmin } from './config/supabase.js';

async function test() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Real database query failed:', error);
    } else {
      console.log('Real database query succeeded! Users data:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
