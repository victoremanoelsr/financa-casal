import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import FinanceApp from "@/pages/finance-app";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-client";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const [checking, setChecking] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setChecking(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setChecking(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/");
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="loading-card" style={{ minHeight: "100vh" }}>
        <div className="spinner" />
        <span>Carregando...</span>
      </div>
    );
  }

  return <FinanceApp />;
}
