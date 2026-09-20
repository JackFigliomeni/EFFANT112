"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccentPicker } from "@/components/AccentPicker";
import { ToolRenderer } from "@/components/renderer/ToolRenderer";
import { BUILDER_PREFILL_KEY } from "@/lib/builderPrefill";
import type { ToolSchema } from "@/lib/schema";
import { DEFAULT_THEME_COLOR, accentOf } from "@/lib/toolColumns";

// Deliberately unrelated to each other — proof there's no fixed category,
// not a hint that these are the kinds of tool this makes.
const EXAMPLE_PROMPTS = [
  "a habit tracker with a calendar view",
  "a shared grocery list for my apartment",
  "a workout log that tracks personal records",
  "suggest me an Italian dinner every night with a real recipe",
  "a simple invoice tracker for freelance clients",
  "a reading list with a rating for each book",
];

const STAGES = ["Describe", "Preview", "Refine in Builder"];

export default function GeneratePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ schema: ToolSchema; name: string } | null>(null);
  const [tab, setTab] = useState<"preview" | "design">("preview");
  const [accent, setAccent] = useState(DEFAULT_THEME_COLOR);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        return;
      }
      setResult({ schema: body.schema, name: prompt.slice(0, 60) });
      setTab("preview");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function openInBuilder() {
    if (!result) return;
    sessionStorage.setItem(
      BUILDER_PREFILL_KEY,
      JSON.stringify({ name: result.name, schema: result.schema, themeColor: accent }),
    );
    router.push("/builder");
  }

  const stage = result ? 1 : 0;

  return (
    <section className="workspace generator-workspace">
      <aside className="workspace-rail">
        <span className="font-mono text-[9px] uppercase text-muted-foreground">Generator</span>
        <h1 className="mt-3 text-xl font-semibold">Describe it, then see it.</h1>
        <div className="stage-track">
          {STAGES.map((item, index) => (
            <div key={item} className={`stage-node ${stage === index ? "is-active" : ""}`}>
              <span>{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
      </aside>

      <section className="workspace-controls">
        <p className="control-kicker">What do you want to build?</p>
        <div className="animate-reveal mt-5 flex flex-1 flex-col">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the tool you want…"
            className="min-h-[15rem] w-full flex-1 resize-none rounded-[20px] border border-border bg-card/70 p-5 text-lg leading-relaxed shadow-soft outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <Button key={example} variant="glass" size="sm" onClick={() => setPrompt(example)}>
                {example}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-destructive">
            {error}
            {error.toLowerCase().includes("sign in") && (
              <>
                {" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
                .
              </>
            )}
            {error.toLowerCase().includes("upgrade to pro") && (
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

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <span className="text-xs text-muted-foreground">Any tool you can put into words.</span>
          <Button variant="signal" onClick={generate} disabled={loading || prompt.trim().length === 0}>
            {loading ? "Building…" : result ? "Build again" : "Build it"}
          </Button>
        </div>
      </section>

      <aside className="workspace-test">
        <div className="flex items-center justify-between">
          <div className="privacy-switch">
            <Button variant={tab === "preview" ? "ink" : "quiet"} size="sm" onClick={() => setTab("preview")}>
              Preview
            </Button>
            <Button variant={tab === "design" ? "ink" : "quiet"} size="sm" onClick={() => setTab("design")}>
              Design
            </Button>
          </div>
          <span className={`status-dot ${result ? "bg-fresh" : "bg-border"}`} />
        </div>

        <div className="relative mt-6 flex-1">
          {tab === "preview" ? (
            result ? (
              <div className="animate-reveal">
                <ToolRenderer schema={result.schema} toolId={null} themeColor={accentOf(accent)} />
              </div>
            ) : (
              <div className="grid h-full min-h-[16rem] place-items-center rounded-[20px] border border-dashed border-border p-6 text-center">
                <p className="max-w-[24ch] text-xs leading-relaxed text-muted-foreground">
                  Your tool shows up here, fully working, before anything is saved.
                </p>
              </div>
            )
          ) : (
            <div className="animate-reveal space-y-4">
              <p className="control-kicker">Accent color</p>
              <AccentPicker value={accent} onChange={setAccent} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Used for the tool&rsquo;s buttons, calendar days, chart bars, and its own app icon. You
                can change it any time in the Builder.
              </p>
            </div>
          )}
        </div>

        <div className="test-readout mt-6">
          <strong>{result ? result.name : "Nothing built yet"}</strong>
          <span>{result ? `${result.schema.blocks.length} parts` : "0 parts"}</span>
          <span>private</span>
        </div>
        <Button variant="signal" className="mt-4 w-full" onClick={openInBuilder} disabled={!result}>
          Open in Builder
        </Button>
      </aside>
    </section>
  );
}
