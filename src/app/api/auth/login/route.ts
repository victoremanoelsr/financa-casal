import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SECRET_KEY) return NextResponse.json({ message: "Integração ainda não configurada." }, { status: 503 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Confira seu usuário e sua senha." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: authEmail, error: lookupError } = await admin.rpc("resolve_login_email", { p_username: parsed.data.username });
  if (lookupError || !authEmail) return NextResponse.json({ message: "Usuário ou senha incorretos." }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email: String(authEmail), password: parsed.data.password });
  if (error) return NextResponse.json({ message: "Usuário ou senha incorretos." }, { status: 401 });
  if (signedIn.user) {
    await admin.auth.admin.updateUserById(signedIn.user.id, {
      app_metadata: { ...signedIn.user.app_metadata, username: parsed.data.username },
    });
  }
  return NextResponse.json({ ok: true });
}
