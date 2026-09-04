import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  target: z.coerce.number().positive(),
  deadline: z.union([z.iso.date(), z.literal("")]).optional(),
  description: z.string().max(500).optional().default(""),
  icon: z.string().trim().max(40).optional().default("target"),
});

export async function GET() {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!familyId) return NextResponse.json({ goals: [] });
  const [goals, movements] = await Promise.all([
    supabase
      .from("goals")
      .select("id,name,target_amount,deadline,description,icon,color,status")
      .eq("family_id", familyId)
      .neq("status", "archived")
      .order("created_at"),
    supabase
      .from("goal_movements")
      .select("goal_id,movement_type,amount")
      .eq("family_id", familyId),
  ]);
  if (goals.error || movements.error)
    return NextResponse.json(
      {
        message:
          "Não foi possível carregar as metas. Aplique a migration mais recente do Supabase.",
      },
      { status: 500 },
    );
  const saved = (movements.data ?? []).reduce<Record<string, number>>(
    (map, row) => ({
      ...map,
      [row.goal_id]:
        (map[row.goal_id] ?? 0) +
        (row.movement_type === "withdrawal"
          ? -Number(row.amount)
          : Number(row.amount)),
    }),
    {},
  );
  return NextResponse.json({
    goals: (goals.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      target: Number(row.target_amount),
      saved: Math.max(0, saved[row.id] ?? 0),
      deadline: row.deadline,
      description: row.description,
      icon: row.icon || "target",
      color: row.color || "#16A085",
      status: row.status,
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
  if (!parsed.success)
    return NextResponse.json(
      { message: "Revise os dados da meta." },
      { status: 400 },
    );
  const { name, target, deadline, description, icon } = parsed.data;
  const { error } = await supabase
    .from("goals")
    .insert({
      family_id: familyId,
      name,
      target_amount: target,
      deadline: deadline || null,
      description,
      icon,
      color: "#16A085",
      created_by: userId,
    });
  if (error)
    return NextResponse.json(
      { message: "Não foi possível criar a meta." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true }, { status: 201 });
}
