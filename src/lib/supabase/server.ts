import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseConfig } from "./config";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = publicSupabaseConfig();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o proxy cuida da renovação.
        }
      },
    },
  });
}
