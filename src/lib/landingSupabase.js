import { createClient } from '@supabase/supabase-js';

const landingSupabaseUrl = import.meta.env.VITE_SUPABASE_URL_LANDING;

// Ordem de preferência de chave:
// 1. service_role → bypassa RLS, ideal para o painel admin
// 2. anon key JWT → funciona se houver policy SELECT liberada
// 3. publishable key → fallback
const landingSupabaseKey =
  import.meta.env.VITE_SUPABASE_SERVICE_KEY_LANDING ||
  import.meta.env.VITE_SUPABASE_ANON_KEY_LANDING ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_LANDING;

export const hasLandingSupabaseConfig = Boolean(landingSupabaseUrl && landingSupabaseKey);

export const landingSupabase = hasLandingSupabaseConfig
  ? createClient(landingSupabaseUrl, landingSupabaseKey)
  : null;
