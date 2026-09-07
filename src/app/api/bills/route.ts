import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  addCivilDays,
  calculateCardStatus,
  calculateStoreStatus,
  formatCivilDate,
  monthLabel,
} from "@/lib/bill-status";
import {
  activePaymentEvents,
  type PaymentMetadata,
} from "@/lib/finance-domain";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ? String(claims.claims.sub) : null;
  if (!userId)
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const demoMode = (request.headers.get("cookie") ?? "").includes("financa_demo=1");
  if (demoMode) {
    return NextResponse.json({
      bills: [],
      groups: {
        cards: 0,
        stores: 0,
        subscriptions: 0,
        fixed: 0,
      },
    });
  }

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership)
    return NextResponse.json({
      bills: [],
      groups: { cards: 0, stores: 0, subscriptions: 0, fixed: 0 },
    });
  const [
    cardsResult,
    storesResult,
    storePurchasesResult,
    storeInstallmentsResult,
    cardInstallmentsResult,
    fixedResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("cards")
      .select(
        "id,name,institution,closing_day,due_day,last_four,card_purchases(id,description,total_amount,purchase_date,status)",
      )
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("stores")
      .select("id,name")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("store_purchases")
      .select(
        "id,store_id,purchase_date,total_amount,status,purchase_items(name,quantity,unit_price,total_amount)",
      )
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("store_installments")
      .select(
        "id,purchase_id,amount,due_date,installment_number,installment_count",
      )
      .eq("family_id", membership.family_id),
    supabase
      .from("card_installments")
      .select(
        "id,purchase_id,amount,competence_date,installment_number,installment_count,card_purchases!inner(id,card_id,description,purchase_date,status,payment_type)",
      )
      .eq("family_id", membership.family_id)
      .eq("card_purchases.status", "active"),
    supabase
      .from("fixed_expenses")
      .select("id,name,reference_amount,due_day,status,notes,category_id,categories(name)")
      .eq("family_id", membership.family_id)
      .eq("status", "active"),
    supabase
      .from("audit_events")
      .select("id,actor_id,event_type,entity_id,metadata,created_at")
      .eq("family_id", membership.family_id)
      .in("event_type", ["bill_payment_recorded", "bill_payment_reversed"])
      .order("created_at"),
  ]);
  if (
    cardsResult.error ||
    storesResult.error ||
    storePurchasesResult.error ||
    storeInstallmentsResult.error ||
    cardInstallmentsResult.error ||
    fixedResult.error ||
    eventsResult.error
  )
    return NextResponse.json(
      { message: "Não foi possível carregar as contas." },
      { status: 500 },
    );

  const events = eventsResult.data ?? [];
  const paymentEvents = activePaymentEvents(events);
  const actorIds = [
    ...new Set(paymentEvents.map((event) => event.actor_id).filter(Boolean)),
  ] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", actorIds)
    : { data: [] };
  const actorNames = new Map(
    (actors ?? []).map((actor) => [actor.id, actor.full_name]),
  );
  const paymentsFor = (billKey: string) =>
    paymentEvents
      .filter(
        (event) => (event.metadata as PaymentMetadata).billKey === billKey,
      )
      .map((event) => {
        const metadata = event.metadata as PaymentMetadata;
        return {
          id: String(event.id),
          amount: Number(metadata.amount ?? 0),
          date: metadata.paymentDate ?? event.created_at.slice(0, 10),
          createdAt: event.created_at,
          note: metadata.note ?? "",
          method: metadata.method ?? "other",
          responsible: event.actor_id
            ? (actorNames.get(event.actor_id) ?? "Membro da família")
            : "Membro da família",
        };
      });
  const today = formatCivilDate(new Date());
  const requestedMonth = new URL(request.url).searchParams.get("month");
  const currentMonth = /^\d{4}-\d{2}$/.test(requestedMonth ?? "")
    ? requestedMonth!
    : today.slice(0, 7);
  const enrich = <
    T extends {
      id: string;
      amount: number;
      dueDate: string;
      originalDate: string;
      type: "card" | "store" | "subscription" | "fixed";
      sourceId: string;
    },
  >(
    bill: T,
    statusFor: (remaining: number) => "open" | "pending" | "overdue" | "paid",
  ) => {
    const payments = paymentsFor(bill.id);
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, Math.round((bill.amount - paid) * 100) / 100);
    const status = statusFor(remaining);
    const originMonth = bill.originalDate.slice(0, 7);
    return {
      ...bill,
      originalAmount: bill.amount,
      paid,
      remaining,
      status,
      payments,
      originMonth: monthLabel(`${originMonth}-01`),
      carried: originMonth < currentMonth,
    };
  };

  const cardBills = (cardsResult.data ?? []).flatMap((card) => {
    const installments = (cardInstallmentsResult.data ?? []).filter((item) => {
      const purchase = Array.isArray(item.card_purchases)
        ? item.card_purchases[0]
        : item.card_purchases;
      return purchase?.card_id === card.id && purchase.payment_type !== "debit";
    });
    const cycles = new Map<
      string,
      {
        amount: number;
        originalDate: string;
        closingDate: string;
        dueDate: string;
        purchases: Array<{
          id: string;
          description: string;
          date: string;
          amount: number;
          items: never[];
        }>;
      }
    >();
    for (const installment of installments) {
      const purchase = Array.isArray(installment.card_purchases)
        ? installment.card_purchases[0]
        : installment.card_purchases;
      if (!purchase) continue;
      const referenceMonth = installment.competence_date.slice(0, 7);
      const [year, monthNumber] = referenceMonth.split("-").map(Number);
      const lastDay = new Date(year, monthNumber, 0).getDate();
      const dueDate = `${referenceMonth}-${String(Math.min(card.due_day ?? 1, lastDay)).padStart(2, "0")}`;
      const closingReference = new Date(`${referenceMonth}-01T12:00:00`);
      closingReference.setMonth(closingReference.getMonth() - 1);
      const closingMonth = closingReference.toISOString().slice(0, 7);
      const closingLastDay = new Date(closingReference.getFullYear(), closingReference.getMonth() + 1, 0).getDate();
      const closingDate = `${closingMonth}-${String(Math.min(card.closing_day ?? 1, closingLastDay)).padStart(2, "0")}`;
      const current = cycles.get(dueDate);
      cycles.set(dueDate, {
        amount: (current?.amount ?? 0) + Number(installment.amount),
        originalDate:
          current?.originalDate && current.originalDate < purchase.purchase_date
            ? current.originalDate
            : purchase.purchase_date,
        closingDate,
        dueDate,
        purchases: [
          ...(current?.purchases ?? []),
          {
            id: purchase.id,
            description: purchase.description,
            date: purchase.purchase_date,
            amount: Number(installment.amount),
            items: [],
          },
        ],
      });
    }
    return [...cycles.values()].map((cycle) =>
      enrich(
        {
          id: `card-${card.id}-${cycle.dueDate}`,
          type: "card" as const,
          sourceId: card.id,
          name: card.name,
          origin: "Cartão",
          originalDate: cycle.originalDate,
          closingDate: cycle.closingDate,
          dueDate: cycle.dueDate,
          amount: cycle.amount,
          purchases: cycle.purchases,
        },
        (remaining) =>
          calculateCardStatus(
            cycle.closingDate,
            cycle.dueDate,
            remaining,
            today,
          ),
      ),
    );
  });
  const storesById = new Map(
    (storesResult.data ?? []).map((store) => [store.id, store]),
  );
  const purchasesById = new Map(
    (storePurchasesResult.data ?? []).map((purchase) => [
      purchase.id,
      purchase,
    ]),
  );
  const storeBills = (storeInstallmentsResult.data ?? []).flatMap(
    (installment) => {
      const purchase = purchasesById.get(installment.purchase_id);
      const store = purchase ? storesById.get(purchase.store_id) : null;
      if (!purchase || !store) return [];
      const originalDate = purchase.purchase_date;
      const items = (
        (purchase.purchase_items as unknown as Array<{
          name: string;
          quantity: number;
          unit_price: number;
          total_amount: number;
        }> | null) ?? []
      ).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        total: Number(item.total_amount),
      }));
      return [
        enrich(
          {
            id: `store-${installment.id}`,
            type: "store" as const,
            sourceId: installment.id,
            name: store.name,
            origin: "Comércio",
            originalDate,
            dueDate: addCivilDays(originalDate, 30),
            amount: Number(installment.amount),
            purchases: [
              {
                id: purchase.id,
                description: store.name,
                date: purchase.purchase_date,
                amount: Number(purchase.total_amount),
                items,
              },
            ],
          },
          (remaining) => calculateStoreStatus(originalDate, remaining, today),
        ),
      ];
    },
  );
  const recurringStatus = (dueDate: string, remaining: number) =>
    remaining <= 0
      ? ("paid" as const)
      : dueDate < today
        ? ("overdue" as const)
        : ("pending" as const);

  const getDueDateForMonth = (monthStr: string, day: number) => {
    const [year, month] = monthStr.split("-").map(Number);
    const last = new Date(year, month, 0).getDate();
    return `${monthStr}-${String(Math.min(day, last)).padStart(2, "0")}`;
  };

  // Gerar lista de meses para verificação de pendências anteriores (até 6 meses antes) + mês atual
  const pastMonths: string[] = [];
  const [currYear, currMonthNum] = currentMonth.split("-").map(Number);
  for (let offset = 6; offset >= 1; offset--) {
    const d = new Date(currYear, currMonthNum - 1 - offset, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    pastMonths.push(mStr);
  }

  // Assinaturas pagas via PIX/Dinheiro/Outro entram em Contas a pagar. Assinaturas em Cartão de Crédito NÃO entram para não duplicar a fatura.
  const { data: activeSubs } = await supabase
    .from("subscriptions")
    .select("id,name,amount,due_day,payment_method,status,starts_on")
    .eq("family_id", membership.family_id)
    .eq("status", "active")
    .neq("payment_method", "card");

  const subscriptionBills = (activeSubs ?? []).flatMap((item) => {
    const startMonth = item.starts_on ? String(item.starts_on).slice(0, 7) : "";
    const results = [];

    // Checa meses anteriores para carregar se não foi pago
    for (const m of pastMonths) {
      if (startMonth && startMonth > m) continue;
      const dueDate = getDueDateForMonth(m, item.due_day);
      const pastBill = enrich(
        {
          id: `subscription-${item.id}-${m}`,
          type: "subscription" as const,
          sourceId: item.id,
          name: item.name,
          origin: "Assinatura (PIX)",
          originalDate: `${m}-01`,
          dueDate,
          amount: Number(item.amount),
          purchases: [],
        },
        (remaining) => recurringStatus(dueDate, remaining),
      );
      if (pastBill.remaining > 0) {
        results.push(pastBill);
      }
    }

    // Mês atual (se ativo e elegível pela data de início)
    if (!startMonth || startMonth <= currentMonth) {
      const dueDate = getDueDateForMonth(currentMonth, item.due_day);
      results.push(
        enrich(
          {
            id: `subscription-${item.id}-${currentMonth}`,
            type: "subscription" as const,
            sourceId: item.id,
            name: item.name,
            origin: "Assinatura (PIX)",
            originalDate: `${currentMonth}-01`,
            dueDate,
            amount: Number(item.amount),
            purchases: [],
          },
          (remaining) => recurringStatus(dueDate, remaining),
        ),
      );
    }

    return results;
  });

  const fixedBills = (fixedResult.data ?? []).flatMap((item) => {
    const notes = (item as { notes?: string }).notes || "";
    const match = notes.match(/\[start:(\d{4}-\d{2})\]/);
    const startMonth = match && match[1] ? match[1] : "";
    const catName = Array.isArray(item.categories)
      ? item.categories[0]?.name
      : (item.categories as { name?: string } | null)?.name;
    const isHousing =
      catName?.toLowerCase().includes("moradia") ||
      item.name.toLowerCase().includes("aluguel") ||
      item.name.toLowerCase().includes("condomínio");

    const results = [];

    // Checa meses anteriores para carregar se não foi pago
    for (const m of pastMonths) {
      if (startMonth && startMonth > m) continue;
      const dueDate = getDueDateForMonth(m, item.due_day);
      const pastBill = enrich(
        {
          id: `fixed-${item.id}-${m}`,
          type: (isHousing ? "housing" : "fixed") as "fixed",
          sourceId: item.id,
          name: item.name,
          origin: catName || "Contas da casa",
          originalDate: `${m}-01`,
          dueDate,
          amount: Number(item.reference_amount),
          purchases: [],
        },
        (remaining) => recurringStatus(dueDate, remaining),
      );
      if (pastBill.remaining > 0) {
        results.push(pastBill);
      }
    }

    // Mês atual
    if (!startMonth || startMonth <= currentMonth) {
      const dueDate = getDueDateForMonth(currentMonth, item.due_day);
      results.push(
        enrich(
          {
            id: `fixed-${item.id}-${currentMonth}`,
            type: (isHousing ? "housing" : "fixed") as "fixed",
            sourceId: item.id,
            name: item.name,
            origin: catName || "Contas da casa",
            originalDate: `${currentMonth}-01`,
            dueDate,
            amount: Number(item.reference_amount),
            purchases: [],
          },
          (remaining) => recurringStatus(dueDate, remaining),
        ),
      );
    }

    return results;
  });

  const visible = [
    ...cardBills,
    ...storeBills,
    ...subscriptionBills,
    ...fixedBills,
  ]
    .filter(
      (bill) =>
        bill.dueDate.startsWith(currentMonth) ||
        (bill.dueDate < `${currentMonth}-01` && bill.remaining > 0),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const totalFor = (type: string) =>
    visible
      .filter((bill) => bill.type === type)
      .reduce((sum, bill) => sum + bill.remaining, 0);
  return NextResponse.json({
    bills: visible,
    groups: {
      cards: totalFor("card"),
      stores: totalFor("store"),
      subscriptions: totalFor("subscription"),
      fixed: totalFor("fixed"),
    },
  });
}
