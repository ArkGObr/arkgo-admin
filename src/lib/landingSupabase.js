import { createClient } from '@supabase/supabase-js';

const landingSupabaseUrl = import.meta.env.VITE_SUPABASE_URL_LANDING;
const landingSupabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_LANDING;

export const hasLandingSupabaseConfig = Boolean(landingSupabaseUrl && landingSupabaseKey);

export const landingSupabase = hasLandingSupabaseConfig
  ? createClient(landingSupabaseUrl, landingSupabaseKey)
  : null;
