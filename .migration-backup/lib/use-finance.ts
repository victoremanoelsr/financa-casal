"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { demoState } from "@/lib/demo-data";
import type {
  Bill,
  Budget,
  Card,
  CardPurchase,
  FinanceState,
  Goal,
  Transaction,
} from "@/lib/types";

const STORAGE_KEY = "financas-a-dois-demo-v1";

type TableName = "transactions" | "bills" | "cards" | "card_purchases" | "budgets" | "goals";

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadLocal(): FinanceState {
  if (typeof window === "undefined") return demoState;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(demoState);
  try {
    return JSON.parse(raw) as FinanceState;
  } catch {
    return structuredClone(demoState);
  }
}

export function useFinance() {
  const [state, setState] = useState<FinanceState>(demoState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => createClient(), []);

  const persistLocal = useCallback((next: FinanceState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!configured || !supabase) {
      setState(loadLocal());
      setLoading(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setError("Sessão não encontrada. Entre novamente.");
      setLoading(false);
      return;
    }

    const { data: member, error: memberError } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (memberError || !member) {
      setError("Não foi possível localizar a família financeira.");
      setLoading(false);
      return;
    }

    const householdId = member.household_id;
    const [householdRes, transactionsRes, billsRes, cardsRes, purchasesRes, budgetsRes, goalsRes] =
      await Promise.all([
        supabase.from("households").select("id,name,invite_code").eq("id", householdId).single(),
        supabase.from("transactions").select("*").eq("household_id", householdId).order("date", { ascending: false }),
        supabase.from("bills").select("*").eq("household_id", householdId).order("due_day"),
        supabase.from("cards").select("*").eq("household_id", householdId).order("created_at"),
        supabase.from("card_purchases").select("*").eq("household_id", householdId).order("purchase_date", { ascending: false }),
        supabase.from("budgets").select("*").eq("household_id", householdId).order("category"),
        supabase.from("goals").select("*").eq("household_id", householdId).order("created_at")
      ]);

    const firstError = [householdRes, transactionsRes, billsRes, cardsRes, purchasesRes, budgetsRes, goalsRes]
      .find((r) => r.error)?.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setState({
      household: householdRes.data,
      transactions: (transactionsRes.data ?? []) as Transaction[],
      bills: (billsRes.data ?? []) as Bill[],
      cards: (cardsRes.data ?? []) as Card[],
      purchases: (purchasesRes.data ?? []) as CardPurchase[],
      budgets: (budgetsRes.data ?? []) as Budget[],
      goals: (goalsRes.data ?? []) as Goal[]
    });
    setLoading(false);
  }, [configured, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const householdId = state.household?.id;

  const insert = useCallback(async <T extends { id: string }>(table: TableName, collection: keyof FinanceState, item: T) => {
    const dbItem = configured && householdId ? { ...item, household_id: householdId } : item;

    if (configured && supabase) {
      const { data, error: insertError } = await supabase.from(table).insert(dbItem).select().single();
      if (insertError) throw insertError;
      setState((prev) => ({ ...prev, [collection]: [...(prev[collection] as unknown as T[]), data as T] }));
      return data as T;
    }

    const next = { ...state, [collection]: [...(state[collection] as unknown as T[]), item] } as FinanceState;
    persistLocal(next);
    return item;
  }, [configured, householdId, persistLocal, state, supabase]);

  const update = useCallback(async <T extends { id: string }>(table: TableName, collection: keyof FinanceState, id: string, changes: Partial<T>) => {
    if (configured && supabase) {
      const { data, error: updateError } = await supabase.from(table).update(changes as Record<string, unknown>).eq("id", id).select().single();
      if (updateError) throw updateError;
      setState((prev) => ({
        ...prev,
        [collection]: (prev[collection] as unknown as T[]).map((item) => item.id === id ? data as T : item)
      }));
      return;
    }

    const next = {
      ...state,
      [collection]: (state[collection] as unknown as T[]).map((item) => item.id === id ? { ...item, ...changes } : item)
    } as FinanceState;
    persistLocal(next);
  }, [configured, persistLocal, state, supabase]);

  const remove = useCallback(async <T extends { id: string }>(table: TableName, collection: keyof FinanceState, id: string) => {
    if (configured && supabase) {
      const { error: deleteError } = await supabase.from(table).delete().eq("id", id);
      if (deleteError) throw deleteError;
      setState((prev) => ({
        ...prev,
        [collection]: (prev[collection] as unknown as T[]).filter((item) => item.id !== id)
      }));
      return;
    }

    const next = {
      ...state,
      [collection]: (state[collection] as unknown as T[]).filter((item) => item.id !== id)
    } as FinanceState;
    persistLocal(next);
  }, [configured, persistLocal, state, supabase]);

  return {
    state,
    loading,
    error,
    configured,
    refresh,
    addTransaction: (item: Omit<Transaction, "id">) => insert("transactions", "transactions", { ...item, id: uid("tx") }),
    updateTransaction: (id: string, changes: Partial<Transaction>) => update<Transaction>("transactions", "transactions", id, changes),
    deleteTransaction: (id: string) => remove<Transaction>("transactions", "transactions", id),
    addBill: (item: Omit<Bill, "id">) => insert("bills", "bills", { ...item, id: uid("bill") }),
    updateBill: (id: string, changes: Partial<Bill>) => update<Bill>("bills", "bills", id, changes),
    deleteBill: (id: string) => remove<Bill>("bills", "bills", id),
    addCard: (item: Omit<Card, "id">) => insert("cards", "cards", { ...item, id: uid("card") }),
    deleteCard: (id: string) => remove<Card>("cards", "cards", id),
    addPurchase: (item: Omit<CardPurchase, "id">) => insert("card_purchases", "purchases", { ...item, id: uid("purchase") }),
    deletePurchase: (id: string) => remove<CardPurchase>("card_purchases", "purchases", id),
    addBudget: (item: Omit<Budget, "id">) => insert("budgets", "budgets", { ...item, id: uid("budget") }),
    deleteBudget: (id: string) => remove<Budget>("budgets", "budgets", id),
    addGoal: (item: Omit<Goal, "id">) => insert("goals", "goals", { ...item, id: uid("goal") }),
    updateGoal: (id: string, changes: Partial<Goal>) => update<Goal>("goals", "goals", id, changes),
    deleteGoal: (id: string) => remove<Goal>("goals", "goals", id),
    async renameHousehold(name: string) {
      if (!state.household) return;
      if (configured && supabase) {
        const { error: renameError } = await supabase.from("households").update({ name }).eq("id", state.household.id);
        if (renameError) throw renameError;
        setState((prev) => ({ ...prev, household: prev.household ? { ...prev.household, name } : null }));
      } else {
        persistLocal({ ...state, household: { ...state.household, name } });
      }
    },
    async joinHousehold(inviteCode: string) {
      if (!configured || !supabase) throw new Error("Configure o Supabase para usar convites reais.");
      const { error: rpcError } = await supabase.rpc("join_household_by_code", { p_invite_code: inviteCode.trim().toUpperCase() });
      if (rpcError) throw rpcError;
      await refresh();
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      window.location.href = "/";
    },
    resetDemo() {
      localStorage.removeItem(STORAGE_KEY);
      setState(structuredClone(demoState));
    }
  };
}
