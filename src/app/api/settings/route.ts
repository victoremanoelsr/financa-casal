import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizePersonName, normalizeUsername } from "@/lib/format";

async function authenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ? String(data.claims.sub) : null };
}

export async function GET(request: Request) {
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) {
    return NextResponse.json({
      profile: {
        fullName: "VICTOR EMANOEL SILVA RODRIGUES",
        phone: "(86) 99933-0525",
        contactEmail: "victoremanoelsr@gmail.com",
        cpfLast4: "1394",
        birthDate: "2002-12-06",
      },
      address: {
        postalCode: "64378-000",
        stateCode: "PI",
        city: "São Miguel da Baixa Grande",
        district: "centro",
        street: "Rua João do Vale",
        number: "299",
        complement: "",
      },
      username: "victor",
      family: {
        id: "fam-demo",
        name: "Família",
        joinCode: "FAM-F94A7F",
        role: "admin",
      },
      members: [
        {
          id: "m-1",
          displayName: "VICTOR EMANOEL SILVA RODRIGUES",
          role: "admin",
          isCurrentUser: true,
        },
        {
          id: "m-2",
          displayName: "EMILLY ANDRADE",
          role: "member",
          isCurrentUser: false,
        },
        {
          id: "m-3",
          displayName: "LUCAS SILVA",
          role: "member",
          isCurrentUser: false,
        },
        {
          id: "m-4",
          displayName: "MARIA SILVA",
          role: "member",
          isCurrentUser: false,
        },
      ],
      categories: [
        { id: "c1", name: "Casa", kind: "expense", isSystem: true },
        { id: "c2", name: "Mercado", kind: "expense", isSystem: true },
        { id: "c3", name: "Alimentação", kind: "expense", isSystem: true },
        { id: "c4", name: "Transporte", kind: "expense", isSystem: true },
        { id: "c5", name: "Saúde", kind: "expense", isSystem: true },
        { id: "c6", name: "Educação", kind: "expense", isSystem: true },
        { id: "c7", name: "Lazer", kind: "expense", isSystem: true },
        { id: "c8", name: "Outros", kind: "expense", isSystem: true },
        { id: "c9", name: "Salário", kind: "income", isSystem: true },
        { id: "c10", name: "Renda extra", kind: "income", isSystem: true },
        { id: "c11", name: "Investimentos", kind: "income", isSystem: true },
        { id: "c12", name: "Outros", kind: "income", isSystem: true },
      ],
      preferences: {
        theme: "light",
        notifications: {
          dueSoon: true,
          overdue: true,
          cards: true,
          goals: false,
          news: true,
        },
        listOrder: "newest",
        dailySummaryTime: "20:00",
      },
    });
  }

  const { supabase, userId } = await authenticatedUser();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const [profileResult, addressResult, membershipResult, preferencesResult] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,contact_email,cpf_last4,birth_date").eq("id", userId).maybeSingle(),
    supabase.from("profile_addresses").select("postal_code,state_code,city,district,street,number,complement").eq("user_id", userId).maybeSingle(),
    supabase.from("family_members").select("id,family_id,display_name,role,families(id,name,join_code)").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle(),
    supabase.from("user_preferences").select("theme,notifications,list_order,daily_summary_time").eq("user_id", userId).maybeSingle(),
  ]);

  if (profileResult.error) return NextResponse.json({ message: "Não foi possível carregar seu cadastro." }, { status: 500 });
  const membership = membershipResult.data as null | { id: string; family_id: string; display_name: string; role: "admin" | "member"; families: { id: string; name: string; join_code: string } | { id: string; name: string; join_code: string }[] | null };
  const family = Array.isArray(membership?.families) ? membership?.families[0] : membership?.families;
  const familyId = membership?.family_id ?? null;
  const [membersResult, categoriesResult] = familyId ? await Promise.all([
    supabase.from("family_members").select("id,user_id,display_name,role").eq("family_id", familyId).eq("status", "active").order("joined_at"),
    supabase.from("categories").select("id,name,kind,is_system").or(`family_id.is.null,family_id.eq.${familyId}`).eq("status", "active").order("name"),
  ]) : [{ data: [] }, { data: [] }];

  const profile = profileResult.data;
  const address = addressResult.data;
  const admin = createAdminSupabaseClient();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const username = String(authUser.user?.app_metadata?.username ?? "");

  return NextResponse.json({
    profile: { fullName: profile?.full_name ?? "", phone: profile?.phone ?? "", contactEmail: profile?.contact_email ?? "", cpfLast4: profile?.cpf_last4 ?? "", birthDate: profile?.birth_date ?? "" },
    address: { postalCode: address?.postal_code ?? "", stateCode: address?.state_code ?? "PI", city: address?.city ?? "", district: address?.district ?? "", street: address?.street ?? "", number: address?.number ?? "", complement: address?.complement ?? "" },
    username,
    family: family && membership ? { id: family.id, name: family.name, joinCode: family.join_code, role: membership.role } : null,
    members: (membersResult.data ?? []).map((member) => ({ id: member.id, displayName: member.display_name, role: member.role, isCurrentUser: member.user_id === userId })),
    categories: (categoriesResult.data ?? []).map((category) => ({ id: category.id, name: category.name, kind: category.kind, isSystem: category.is_system })),
    preferences: {
      theme: preferencesResult.data?.theme ?? "light",
      notifications: preferencesResult.data?.notifications ?? { dueSoon: true, overdue: true, cards: true, goals: true, news: true },
      listOrder: preferencesResult.data?.list_order ?? "newest",
      dailySummaryTime: preferencesResult.data?.daily_summary_time?.slice(0, 5) ?? "20:00",
    },
  });
}

export async function PATCH(request: Request) {
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) return NextResponse.json({ ok: true });

  const { supabase, userId } = await authenticatedUser();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const input = await request.json().catch(() => null);
  if (!input) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  const fullName = normalizePersonName(String(input.fullName ?? ""));
  const username = normalizeUsername(String(input.username ?? ""));
  if (fullName.length < 3 || username.length < 3) return NextResponse.json({ message: "Revise o nome e o usuário." }, { status: 400 });

  const [profileUpdate, addressUpdate] = await Promise.all([
    supabase.from("profiles").update({ full_name: fullName, phone: String(input.phone ?? ""), contact_email: String(input.contactEmail ?? "").toLowerCase(), birth_date: String(input.birthDate ?? "") }).eq("id", userId),
    supabase.from("profile_addresses").update({ postal_code: String(input.postalCode ?? ""), state_code: String(input.stateCode ?? "PI").toUpperCase(), city: String(input.city ?? ""), district: String(input.district ?? ""), street: String(input.street ?? ""), number: String(input.number ?? ""), complement: String(input.complement ?? "") }).eq("user_id", userId),
  ]);
  if (profileUpdate.error || addressUpdate.error) return NextResponse.json({ message: "Não foi possível salvar as alterações." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (username) {
    const { error } = await admin.rpc("replace_login_username", { p_user_id: userId, p_new_username: username });
    if (error) return NextResponse.json({ message: error.message.includes("unique") ? "Nome de usuário já está em uso." : "Não foi possível alterar o usuário." }, { status: 409 });
    await admin.auth.admin.updateUserById(userId, { app_metadata: { username } });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) return NextResponse.json({ ok: true });

  const { supabase, userId } = await authenticatedUser();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const input = await request.json().catch(() => null);
  if (input?.action === "join") {
    const { error } = await supabase.rpc("join_family_by_code", { requested_code: String(input.code ?? "").toUpperCase() });
    if (error) return NextResponse.json({ message: "Código de família inválido ou não encontrado." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (input?.action === "category") {
    const { data: membership } = await supabase.from("family_members").select("family_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
    if (!membership) return NextResponse.json({ message: "Família não encontrada." }, { status: 404 });
    const kind = ["income", "expense"].includes(String(input.kind)) ? String(input.kind) : "expense";
    const { error } = await supabase.from("categories").insert({ family_id: membership.family_id, name: String(input.name ?? "").trim(), kind, is_system: false, created_by: userId });
    if (error) return NextResponse.json({ message: "Não foi possível adicionar a categoria." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (input?.action === "preferences") {
    const theme = ["light", "dark", "system"].includes(String(input.theme)) ? input.theme : "light";
    const notifications = input.notifications && typeof input.notifications === "object" ? input.notifications : {};
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: userId,
      theme,
      notifications,
      list_order: input.listOrder === "oldest" ? "oldest" : "newest",
      daily_summary_time: /^\d{2}:\d{2}$/.test(String(input.dailySummaryTime)) ? input.dailySummaryTime : null,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ message: "Não foi possível salvar as preferências." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ message: "Ação inválida." }, { status: 400 });
}
