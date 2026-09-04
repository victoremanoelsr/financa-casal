import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  target: z.coerce.number().positive(),
  deadline: z.union([z.iso.date(), z.literal("")]).optional(),
  description: z.string().max(500).optional().default(""),
  icon: z.string().max(40).optional().default("target"),
});

export async function GET(
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
  const [goal, movements] = await Promise.all([
    supabase
      .from("goals")
      .select("id,name,target_amount,deadline,description,icon,color,status")
      .eq("id", id)
      .eq("family_id", familyId)
      .neq("status", "archived")
      .maybeSingle(),
    supabase
      .from("goal_movements")
      .select("id,movement_type,amount,occurred_on,notes,created_at")
      .eq("goal_id", id)
      .eq("family_id", familyId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!goal.data)
    return NextResponse.json(
      { message: "Meta não encontrada." },
      { status: 404 },
    );
  if (movements.error)
    return NextResponse.json(
      { message: "Não foi possível carregar o histórico." },
      { status: 500 },
    );
  const saved = (movements.data ?? []).reduce(
    (sum, item) =>
      sum +
      (item.movement_type === "withdrawal"
        ? -Number(item.amount)
        : Number(item.amount)),
    0,
  );
  return NextResponse.json({
    goal: {
      id: goal.data.id,
      name: goal.data.name,
      target: Number(goal.data.target_amount),
      saved: Math.max(0, saved),
      deadline: goal.data.deadline,
      description: goal.data.description,
      icon: goal.data.icon || "target",
      color: goal.data.color || "#16A085",
      status: goal.data.status,
    },
    movements: (movements.data ?? []).map((item) => ({
      id: item.id,
      type: item.movement_type,
      amount: Number(item.amount),
      date: item.occurred_on,
      notes: item.notes,
    })),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!familyId || !parsed.success)
    return NextResponse.json(
      { message: "Revise os dados da meta." },
      { status: 400 },
    );
  const { id } = await context.params;
  const input = parsed.data;
  const { error } = await supabase
    .from("goals")
    .update({
      name: input.name,
      target_amount: input.target,
      deadline: input.deadline || null,
      description: input.description,
      icon: input.icon,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("family_id", familyId)
    .neq("status", "archived");
  if (error)
    return NextResponse.json(
      { message: "Não foi possível editar a meta." },
      { status: 400 },
    );
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
    .from("goals")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error)
    return NextResponse.json(
      { message: "Não foi possível excluir a meta." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
