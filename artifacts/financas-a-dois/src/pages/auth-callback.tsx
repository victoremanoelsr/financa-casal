import { useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next") ?? "/dashboard";

    (async () => {
      if (code) {
        const supabase = createClient();
        if (supabase) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      }
      window.location.href = next;
    })();
  }, []);

  return (
    <div className="loading-card" style={{ minHeight: "100vh" }}>
      <div className="spinner" />
      <span>Confirmando sua conta...</span>
    </div>
  );
}
