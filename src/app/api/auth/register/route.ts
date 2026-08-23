import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { hashCpf, registrationSchema } from "@/lib/validation";
import { onlyDigits } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSupabaseConfig() || !process.env.SUPABASE_SECRET_KEY) return NextResponse.json({ message: "Integração ainda não configurada." }, { status: 503 });
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Revise os campos do cadastro.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const input = parsed.data;
  if (input.familyMode === "create" && !input.familyName?.trim()) return NextResponse.json({ message: "Informe o nome da família." }, { status: 400 });
  if (input.familyMode === "join" && !/^FAM-[A-Z0-9]{6}$/.test(input.joinCode?.toUpperCase() ?? "")) return NextResponse.json({ message: "Código de família inválido." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.rpc("resolve_login_email", { p_username: input.username });
  if (existing) return NextResponse.json({ message: "Nome de usuário já está em uso." }, { status: 409 });

  const authEmail = `user-${randomUUID()}@auth.financa.invalid`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email: authEmail, password: input.password, email_confirm: true, app_metadata: { username: input.username } });
  if (createError || !created.user) return NextResponse.json({ message: "Não foi possível criar sua conta. Tente novamente." }, { status: 400 });

  const cpfDigits = onlyDigits(input.cpf);
  const { error: profileError } = await admin.rpc("finish_registration", {
    p_user_id: created.user.id, p_username: input.username, p_auth_email: authEmail, p_full_name: input.fullName,
    p_phone: input.phone, p_contact_email: input.contactEmail.toLowerCase(), p_cpf_lookup_hash: hashCpf(input.cpf), p_cpf_last4: cpfDigits.slice(-4),
    p_birth_date: input.birthDate, p_country_code: input.address.countryCode, p_postal_code: input.address.postalCode,
    p_state_code: input.address.stateCode, p_city: input.address.city, p_district: input.address.district,
    p_street: input.address.street, p_number: input.address.number, p_complement: input.address.complement,
    p_family_mode: input.familyMode, p_family_name: input.familyName ?? null, p_join_code: input.joinCode?.toUpperCase() ?? null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    const message = profileError.message.includes("unique") ? "Nome de usuário ou CPF já cadastrado." : "Não foi possível concluir o cadastro.";
    return NextResponse.json({ message }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
