import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/api-auth";

const schema = z.object({ name: z.string().trim().min(2).max(120), amount: z.coerce.number().positive(), dueDay: z.coerce.number().int().min(1).max(31), categoryId: z.string().uuid(), responsibleMemberId: z.string().uuid(), notes: z.string().max(500).optional().default("") });
const relation = (value: unknown) => (Array.isArray(value) ? value[0] : value) as { name?: string; display_name?: string } | null;

export async function GET() {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!familyId) return NextResponse.json({ fixedExpenses: [] });
  const { data, error } = await supabase.from("fixed_expenses").select("id,name,reference_amount,due_day,status,categories(name),family_members(display_name)").eq("family_id", familyId).neq("status", "archived").order("due_day");
  if (error) return NextResponse.json({ message: "Não foi possível carregar as despesas fixas." }, { status: 500 });
  return NextResponse.json({ fixedExpenses: (data ?? []).map((row) => ({ id: row.id, name: row.name, amount: Number(row.reference_amount), dueDay: row.due_day, status: row.status, category: relation(row.categories)?.name, responsible: relation(row.family_members)?.display_name })) });
}

export async function POST(request: Request) {
  const { supabase, userId, familyId } = await getFamilyContext();
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (!familyId) return NextResponse.json({ message: "Família não encontrada." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Revise os dados da despesa fixa." }, { status: 400 });
  const input = parsed.data;
  const { error } = await supabase.from("fixed_expenses").insert({ family_id: familyId, name: input.name, reference_amount: input.amount, due_day: input.dueDay, category_id: input.categoryId, responsible_member_id: input.responsibleMemberId, notes: input.notes, created_by: userId });
  if (error) return NextResponse.json({ message: "Não foi possível salvar a despesa fixa." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
