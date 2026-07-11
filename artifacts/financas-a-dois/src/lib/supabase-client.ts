import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
}

export function createClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createSupabaseClient(url, key);
}
