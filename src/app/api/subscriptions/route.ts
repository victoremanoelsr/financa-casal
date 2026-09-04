import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  amount: z.coerce.number().positive().max(999999999),
  dueDay: z.coerce.number().int().min(1).max(31),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  categoryId: z.string().uuid().nullable().optional(),
  paymentMethod: z.enum(["pix", "card", "cash", "bank_transfer", "other"]),
  cardId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().max(700000).nullable().optional(),
});
const relationName = (value: unknown) =>
  (Array.isArray(value) ? value[0] : value) as {
    id?: string;
    name?: string;
    last_four?: string;
  } | null;

export async function GET(request: Request) {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!familyId) return NextResponse.json({ subscriptions: [] });
  const requestedMonth =
    new URL(request.url).searchParams.get("month") ??
    new Date().toISOString().slice(0, 7);
  const periodEnd = `${requestedMonth}-${new Date(Number(requestedMonth.slice(0, 4)), Number(requestedMonth.slice(5, 7)), 0).getDate()}`;
  const [subscriptions, prices, statuses] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id,name,amount,due_day,frequency,payment_method,card_id,status,image_url,starts_on,ends_on,created_at,categories(id,name),cards(name,last_four)",
      )
      .eq("family_id", familyId)
      .neq("status", "archived")
      .order("name"),
    supabase
      .from("subscription_price_history")
      .select("subscription_id,amount,valid_from")
      .eq("family_id", familyId)
      .lte("valid_from", periodEnd)
      .order("valid_from", { ascending: false }),
    supabase
      .from("subscription_status_history")
      .select("subscription_id,status,valid_from")
      .eq("family_id", familyId)
      .lte("valid_from", periodEnd)
      .order("valid_from", { ascending: false }),
  ]);
  if (subscriptions.error || prices.error || statuses.error)
    return NextResponse.json(
      {
        message:
          "Não foi possível carregar as assinaturas. Aplique a migration mais recente do Supabase.",
      },
      { status: 500 },
    );
  const priceBySubscription = new Map<string, number>();
  for (const price of prices.data ?? [])
    if (!priceBySubscription.has(price.subscription_id))
      priceBySubscription.set(price.subscription_id, Number(price.amount));
  const statusBySubscription = new Map<string, string>();
  for (const status of statuses.data ?? [])
    if (!statusBySubscription.has(status.subscription_id))
      statusBySubscription.set(status.subscription_id, status.status);
  return NextResponse.json({
    subscriptions: (subscriptions.data ?? [])
      .filter(
        (row) =>
          row.starts_on <= periodEnd &&
          statusBySubscription.get(row.id) !== "paused",
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        amount: priceBySubscription.get(row.id) ?? Number(row.amount),
        dueDay: row.due_day,
        frequency: row.frequency,
        paymentMethod: row.payment_method,
        cardId: row.card_id,
        status: statusBySubscription.get(row.id) ?? row.status,
        category: relationName(row.categories)?.name,
        categoryId: relationName(row.categories)?.id,
        card: relationName(row.cards)?.name,
        cardLastFour: relationName(row.cards)?.last_four,
        imageUrl: row.image_url ?? null,
        createdAt: row.created_at,
      })),
  });
}

export async function POST(request: Request) {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!familyId)
    return NextResponse.json(
      { message: "Família não encontrada." },
      { status: 404 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (
    !parsed.success ||
    (parsed.data.paymentMethod === "card" && !parsed.data.cardId)
  )
    return NextResponse.json(
      { message: "Revise os dados da assinatura." },
      { status: 400 },
    );
  const input = parsed.data;
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert({
      family_id: familyId,
      name: input.name,
      amount: input.amount,
      due_day: input.dueDay,
      frequency: input.frequency,
      category_id: input.categoryId || null,
      payment_method: input.paymentMethod,
      card_id: input.paymentMethod === "card" ? input.cardId : null,
      image_url: input.imageUrl ?? null,
      starts_on: new Date().toISOString().slice(0, 10),
      created_by: userId,
    })
    .select("id,starts_on")
    .single();
  if (error || !subscription)
    return NextResponse.json(
      { message: "Não foi possível salvar a assinatura." },
      { status: 400 },
    );
  const [priceResult, statusResult] = await Promise.all([
    supabase.from("subscription_price_history").insert({
      family_id: familyId,
      subscription_id: subscription.id,
      amount: input.amount,
      valid_from: subscription.starts_on,
      created_by: userId,
    }),
    supabase.from("subscription_status_history").insert({
      family_id: familyId,
      subscription_id: subscription.id,
      status: "active",
      valid_from: subscription.starts_on,
      created_by: userId,
    }),
  ]);
  if (priceResult.error || statusResult.error)
    return NextResponse.json(
      {
        message:
          "Assinatura criada, mas o histórico de valor não pôde ser registrado.",
      },
      { status: 400 },
    );
  return NextResponse.json({ ok: true }, { status: 201 });
}
