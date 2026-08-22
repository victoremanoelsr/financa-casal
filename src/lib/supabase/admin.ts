import { createClient } from "@supabase/supabase-js";
import { serverSupabaseConfig } from "./config";

export function createAdminSupabaseClient() {
  const { url, secretKey } = serverSupabaseConfig();
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
