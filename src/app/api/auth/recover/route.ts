import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { normalizePersonName, normalizeUsername } from "@/lib/format";
import { hashCpf, isValidCpf } from "@/lib/validation";

export const runtime = "nodejs";
const schema = z.object({ fullName: z.string().min(3).max(160).transform(normalizePersonName), cpf: z.string().refine(isValidCpf), action: z.enum(["username", "password"]), value: z.string().min(3).max(72) });

export async function POST(request: Request) {
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SECRET_KEY) return NextResponse.json({ message: "Integração ainda não configurada." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Confira o nome completo, CPF e novo acesso." }, { status: 400 });
  const input = parsed.data;
  if (input.action === "password" && input.value.length < 8) return NextResponse.json({ message: "A senha deve ter no mínimo 8 caracteres." }, { status: 400 });
  const username = normalizeUsername(input.value);
  if (input.action === "username" && !/^[a-z0-9._-]{3,32}$/.test(username)) return NextResponse.json({ message: "Use de 3 a 32 caracteres: letras, números, ponto, traço ou sublinhado." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: profile, error: lookupError } = await admin.from("profiles").select("id").eq("full_name", input.fullName).eq("cpf_lookup_hash", hashCpf(input.cpf)).maybeSingle();
  if (lookupError || !profile) return NextResponse.json({ message: "Cadastro não encontrado. Confira o nome completo e o CPF." }, { status: 404 });

  if (input.action === "username") {
    const { data: existing } = await admin.rpc("resolve_login_email", { p_username: username });
    if (existing) return NextResponse.json({ message: "Nome de usuário já está em uso." }, { status: 409 });
    const { error } = await admin.rpc("replace_login_username", { p_user_id: profile.id, p_new_username: username });
    if (error) return NextResponse.json({ message: "Não foi possível alterar o nome de usuário." }, { status: 400 });
    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    const updated = await admin.auth.admin.updateUserById(profile.id, { app_metadata: { ...authUser.user?.app_metadata, username } });
    if (updated.error) return NextResponse.json({ message: "O usuário foi alterado parcialmente. Procure o suporte." }, { status: 500 });
  } else {
    const { error } = await admin.auth.admin.updateUserById(profile.id, { password: input.value });
    if (error) return NextResponse.json({ message: "Não foi possível alterar a senha." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
