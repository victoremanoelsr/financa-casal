import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/api-auth";

const schema = z.object({
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.coerce.number().positive(),
  date: z.iso.date(),
  notes: z.string().max(500).optional().default(""),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!familyId || !parsed.success)
    return NextResponse.json(
      { message: "Revise os dados da movimentação." },
      { status: 400 },
    );
  const { id } = await context.params;
  const [{ data: goal }, { data: movements }] = await Promise.all([
    supabase
      .from("goals")
      .select("id")
      .eq("id", id)
      .eq("family_id", familyId)
      .neq("status", "archived")
      .maybeSingle(),
    supabase
      .from("goal_movements")
      .select("movement_type,amount")
      .eq("goal_id", id)
      .eq("family_id", familyId),
  ]);
  if (!goal)
    return NextResponse.json(
      { message: "Meta não encontrada." },
      { status: 404 },
    );
  const saved = (movements ?? []).reduce(
    (sum, item) =>
      sum +
      (item.movement_type === "withdrawal"
        ? -Number(item.amount)
        : Number(item.amount)),
    0,
  );
  if (parsed.data.type === "withdrawal" && parsed.data.amount > saved)
    return NextResponse.json(
      { message: "Não é possível retirar mais do que o valor guardado." },
      { status: 400 },
    );
  const { error } = await supabase
    .from("goal_movements")
    .insert({
      family_id: familyId,
      goal_id: id,
      movement_type: parsed.data.type,
      amount: parsed.data.amount,
      occurred_on: parsed.data.date,
      notes: parsed.data.notes,
      created_by: userId,
    });
  if (error)
    return NextResponse.json(
      { message: "Não foi possível salvar a movimentação." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true }, { status: 201 });
}
