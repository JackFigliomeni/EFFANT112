"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ReportButton({ toolId }: { toolId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    setStatus("sending");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("reports")
        .insert({ tool_id: toolId, reporter_id: user?.id ?? null, reason });
      setStatus(error ? "error" : "sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <p className="text-xs text-black/50 dark:text-white/50">Reported — thanks for flagging it.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-fit text-xs text-black/40 underline hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
      >
        Report this tool
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-black/10 p-3 dark:border-white/10">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What's wrong with this tool?"
        rows={2}
        className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/20 dark:bg-transparent"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={status === "sending" || reason.trim().length === 0}
          className="w-fit rounded-md bg-black px-3 py-1 text-xs font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {status === "sending" ? "Sending…" : "Submit report"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-black/40 dark:text-white/40">
          Cancel
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-600">Couldn&rsquo;t send — try again.</p>}
    </div>
  );
}
