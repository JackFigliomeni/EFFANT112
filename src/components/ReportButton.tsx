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
    return <p className="text-xs text-muted-foreground">Reported — thanks for flagging it.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-fit text-xs text-muted-foreground underline hover:text-foreground"
      >
        Report this tool
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What's wrong with this tool?"
        rows={2}
        className="rounded-md border border-border px-2 py-1 text-sm "
      />
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={status === "sending" || reason.trim().length === 0}
          className="w-fit rounded-md bg-black px-3 py-1 text-xs font-medium text-white hover:bg-black/80 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Submit report"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground">
          Cancel
        </button>
      </div>
      {status === "error" && <p className="text-xs text-destructive">Couldn&rsquo;t send — try again.</p>}
    </div>
  );
}
