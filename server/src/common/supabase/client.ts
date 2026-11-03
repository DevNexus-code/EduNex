import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://txvvfvztdqjhkfbtlbfg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_Mb0oiTGB5QfCsqHiHpvoMg_wmoPOkKB';

export const supabase = createClient(supabaseUrl, supabaseKey);
