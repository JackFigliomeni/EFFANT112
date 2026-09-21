"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppGeneration } from "@/lib/useAppGeneration";

/** Asks for a change to the app being edited; the result replaces its code. */
export function AppAssistant({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const gen = useAppGeneration();
  const [request, setRequest] = useState("");
  const [previous, setPrevious] = useState<string | null>(null);

  async function apply() {
    const next = await gen.run({ prompt: request, currentHtml: html });
    if (!next) return;
    setPrevious(html);
    onChange(next);
    setRequest("");
  }

  return (
    <div className="mt-8">
      <p className="control-kicker">Ask for a change</p>
      <textarea
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        disabled={gen.building}
        rows={5}
        placeholder="Add a feature, change how it looks, fix something…"
        className="mt-3 w-full resize-none rounded-[20px] border border-border bg-card/70 p-4 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground disabled:opacity-60"
      />
      <div className="mt-3 flex items-center gap-2">
        {gen.building ? (
          <Button variant="glass" size="sm" onClick={gen.cancel}>
            Stop
          </Button>
        ) : (
          <Button variant="signal" size="sm" onClick={apply} disabled={request.trim().length === 0}>
            Apply change
          </Button>
        )}
        {previous !== null && !gen.building && (
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              onChange(previous);
              setPrevious(null);
            }}
          >
            Undo
          </Button>
        )}
      </div>
      {gen.building && (
        <p className="mt-3 text-xs text-muted-foreground">
          Writing the change{gen.chars > 0 ? `: ${(gen.chars / 1000).toFixed(1)}k characters` : "…"}
        </p>
      )}
      {gen.error && (
        <p className="mt-3 text-xs leading-relaxed text-destructive">
          {gen.error}
          {gen.error.toLowerCase().includes("generations") && (
            <>
              {" "}
              <Link href="/pricing" className="underline">
                See plans
              </Link>
              .
            </>
          )}
        </p>
      )}
    </div>
  );
}
