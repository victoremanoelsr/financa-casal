import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/api-auth";

const schema = z.object({
  amount: z.coerce.number().positive(),
  date: z.iso.date(),
  notes: z.string().max(500).optional().default(""),
});

export async function POST(
  request: Request,
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
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "Revise os dados do depósito." },
      { status: 400 },
    );
  const { id } = await context.params;
  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("id", id)
    .eq("family_id", familyId)
    .neq("status", "archived")
    .maybeSingle();
  if (!goal)
    return NextResponse.json(
      { message: "Meta não encontrada." },
      { status: 404 },
    );
  const input = parsed.data;
  const { error } = await supabase
    .from("goal_movements")
    .insert({
      family_id: familyId,
      goal_id: id,
      movement_type: "deposit",
      amount: input.amount,
      occurred_on: input.date,
      notes: input.notes,
      created_by: userId,
    });
  if (error)
    return NextResponse.json(
      { message: "Não foi possível concluir o depósito." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true }, { status: 201 });
}
