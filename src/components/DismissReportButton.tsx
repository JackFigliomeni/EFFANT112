"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DismissReportButton({ reportId }: { reportId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    setBusy(false);
    if (!error) router.refresh();
  }

  return (
    <button
      onClick={dismiss}
      disabled={busy}
      className="text-xs text-black/40 underline hover:text-black disabled:opacity-50 dark:text-white/40 dark:hover:text-white"
    >
      {busy ? "…" : "Dismiss"}
    </button>
  );
}
