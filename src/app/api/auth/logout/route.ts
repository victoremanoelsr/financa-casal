import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export async function POST() {
  if (hasSupabaseConfig()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}
