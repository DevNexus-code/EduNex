import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://txvvfvztdqjhkfbtlbfg.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Mb0oiTGB5QfCsqHiHpvoMg_wmoPOkKB';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseKey
);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

export const createSupabaseClient = () => supabase;
