import { createClient } from '@supabase/supabase-js';

const landingSupabaseUrl = import.meta.env.VITE_SUPABASE_URL_LANDING;

// Prefere a anon key JWT (eyJ...) — tem permissão de leitura via RLS.
// Fallback para a publishable key caso só ela exista.
const landingSupabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY_LANDING ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY_LANDING;

export const hasLandingSupabaseConfig = Boolean(landingSupabaseUrl && landingSupabaseKey);

export const landingSupabase = hasLandingSupabaseConfig
  ? createClient(landingSupabaseUrl, landingSupabaseKey)
  : null;
