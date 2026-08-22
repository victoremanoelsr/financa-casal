import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "./config";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = publicSupabaseConfig();
  return createBrowserClient(url, publishableKey);
}
