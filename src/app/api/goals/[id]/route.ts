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
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  const { id } = await context.params;

  if (demoMode) {
    const demoGoals: Record<string, { goal: any; movements: any[] }> = {
      "demo-g1": {
        goal: {
          id: "demo-g1",
          name: "Viagem de fim de ano",
          target: 5000,
          saved: 2000,
          deadline: "2026-12-20",
          description: "Economizar para férias em família",
          icon: "travel",
          color: "#2563eb",
          status: "active",
        },
        movements: [
          { id: "m-1", type: "deposit", amount: 1000, date: "2026-09-01", notes: "Depósito inicial" },
          { id: "m-2", type: "deposit", amount: 1000, date: "2026-09-05", notes: "Economia do mês" },
        ],
      },
      "demo-g2": {
        goal: {
          id: "demo-g2",
          name: "Reserva de emergência",
          target: 10000,
          saved: 2500,
          deadline: "2027-06-30",
          description: "Fundo de segurança equivalente a 6 meses",
          icon: "reserve",
          color: "#00ba78",
          status: "active",
        },
        movements: [
          { id: "m-3", type: "deposit", amount: 2500, date: "2026-08-15", notes: "Aporte de reserva" },
        ],
      },
      "demo-g3": {
        goal: {
          id: "demo-g3",
          name: "Reforma da casa",
          target: 8000,
          saved: 6000,
          deadline: "2026-11-15",
          description: "Pintura geral e novos móveis para a sala",
          icon: "home",
          color: "#8b5cf6",
          status: "active",
        },
        movements: [
          { id: "m-4", type: "deposit", amount: 6000, date: "2026-08-20", notes: "Poupança reforma" },
        ],
      },
      "demo-g4": {
        goal: {
          id: "demo-g4",
          name: "Comprar celular",
          target: 3000,
          saved: 1200,
          deadline: "2026-09-30",
          description: "Troca do aparelho para trabalho",
          icon: "device",
          color: "#f59e0b",
          status: "active",
        },
        movements: [
          { id: "m-5", type: "deposit", amount: 1200, date: "2026-09-02", notes: "Entrada" },
        ],
      },
    };

    const found = demoGoals[id] || {
      goal: {
        id,
        name: "Meta da família",
        target: 5000,
        saved: 2000,
        deadline: "2026-12-31",
        description: "Objetivo planejado",
        icon: "target",
        color: "#00ba78",
        status: "active",
      },
      movements: [],
    };
    return NextResponse.json(found);
  }

  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!familyId)
    return NextResponse.json(
      { message: "Família não encontrada." },
      { status: 404 },
    );
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
