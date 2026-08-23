"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountSettings } from "./account-types";

export function useAccount() {
  const [data, setData] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      if (response.ok) setData(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // A montagem dispara a sincronização com o cadastro remoto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);
  return { data, loading, reload };
}
