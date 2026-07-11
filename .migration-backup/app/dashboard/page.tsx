import { redirect } from "next/navigation";
import FinanceApp from "@/components/finance-app";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (configured) {
    const supabase = await createClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!data.user) redirect("/");
  }

  return <FinanceApp />;
}
