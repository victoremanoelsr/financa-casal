import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id: billKey, paymentId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const { data: membership } = await supabase.from("family_members").select("family_id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ message: "Família não encontrada." }, { status: 404 });
  const numericId = Number(paymentId);
  const { data: payment } = await supabase.from("audit_events").select("id,entity_id,entity_type,metadata").eq("id", numericId).eq("family_id", membership.family_id).eq("event_type", "bill_payment_recorded").maybeSingle();
  if (!payment || (payment.metadata as { billKey?: string }).billKey !== billKey) return NextResponse.json({ message: "Pagamento não encontrado." }, { status: 404 });
  const { data: reversal } = await supabase.from("audit_events").select("id").eq("family_id", membership.family_id).eq("event_type", "bill_payment_reversed").contains("metadata", { paymentEventId: numericId }).maybeSingle();
  if (reversal) return NextResponse.json({ message: "Este pagamento já foi estornado." }, { status: 400 });
  const input = await request.json().catch(() => null); const note = String(input?.note ?? "Estorno solicitado pelo usuário").trim().slice(0, 500);
  const { error } = await supabase.from("audit_events").insert({ family_id: membership.family_id, actor_id: userId, event_type: "bill_payment_reversed", entity_type: payment.entity_type, entity_id: payment.entity_id, metadata: { billKey, paymentEventId: numericId, note } });
  if (error) return NextResponse.json({ message: "Não foi possível estornar o pagamento." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
