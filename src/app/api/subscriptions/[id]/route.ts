import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/api-auth";
const schema = z.object({
  action: z.enum(["activate", "deactivate"]).optional(),
  name: z.string().min(2).max(120).optional(),
  amount: z.coerce.number().positive().optional(),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  frequency: z.enum(["weekly", "monthly", "yearly"]).optional(),
  paymentMethod: z
    .enum(["pix", "card", "cash", "bank_transfer", "other"])
    .optional(),
  cardId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().max(700000).nullable().optional(),
});
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!familyId || !parsed.success)
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  const { id } = await context.params;
  const input = parsed.data;
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.action) {
    updates.status = input.action === "activate" ? "active" : "paused";
    updates.ends_on =
      input.action === "activate"
        ? null
        : new Date().toISOString().slice(0, 10);
  }
  if (input.name) updates.name = input.name;
  if (input.categoryId !== undefined) updates.category_id = input.categoryId;
  if (input.dueDay) updates.due_day = input.dueDay;
  if (input.frequency) updates.frequency = input.frequency;
  if (input.paymentMethod) {
    updates.payment_method = input.paymentMethod;
    updates.card_id = input.paymentMethod === "card" ? input.cardId : null;
  }
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;
  const { error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", id)
    .eq("family_id", familyId);
  if (error)
    return NextResponse.json(
      { message: "Não foi possível atualizar a assinatura." },
      { status: 400 },
    );
  if (input.action) {
    const { error: historyError } = await supabase
      .from("subscription_status_history")
      .upsert(
        {
          family_id: familyId,
          subscription_id: id,
          status: input.action === "activate" ? "active" : "paused",
          valid_from: `${new Date().toISOString().slice(0, 7)}-01`,
          created_by: userId,
        },
        { onConflict: "subscription_id,valid_from" },
      );
    if (historyError)
      return NextResponse.json(
        { message: "Não foi possível registrar o histórico do status." },
        { status: 400 },
      );
  }
  if (input.amount) {
    const month = `${new Date().toISOString().slice(0, 7)}-01`;
    await supabase
      .from("subscriptions")
      .update({ amount: input.amount })
      .eq("id", id)
      .eq("family_id", familyId);
    const { error: priceError } = await supabase
      .from("subscription_price_history")
      .upsert(
        {
          family_id: familyId,
          subscription_id: id,
          amount: input.amount,
          valid_from: month,
          created_by: userId,
        },
        { onConflict: "subscription_id,valid_from" },
      );
    if (priceError)
      return NextResponse.json(
        { message: "Não foi possível salvar o novo valor." },
        { status: 400 },
      );
  }
  return NextResponse.json({ ok: true });
}
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!familyId)
    return NextResponse.json(
      { message: "Família não encontrada." },
      { status: 404 },
    );
  const { id } = await context.params;
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "archived",
      ends_on: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error)
    return NextResponse.json(
      { message: "Não foi possível excluir a assinatura." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
