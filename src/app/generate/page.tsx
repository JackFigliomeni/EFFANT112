"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AccentPicker } from "@/components/AccentPicker";
import { AppFrame } from "@/components/AppFrame";
import { DownloadAppButton } from "@/components/AppInstall";
import { readAppMeta } from "@/lib/appDocument";
import { appToolSchema } from "@/lib/schema";
import { BUILDER_PREFILL_KEY } from "@/lib/builderPrefill";
import { DEFAULT_THEME_COLOR, accentOf, isMissingColumn } from "@/lib/toolColumns";
import { useAppGeneration } from "@/lib/useAppGeneration";

// Unrelated to each other on purpose: proof there's no fixed category.
const EXAMPLE_PROMPTS = [
  "a budget planner with monthly categories, charts and a savings goal",
  "a workout tracker with programs, sets, personal records and progress graphs",
  "a kanban board for a small team with labels, due dates and filters",
  "a meal planner that builds a weekly plan and a grocery list from 40 recipes",
  "an invoice and client tracker for a freelancer with totals and overdue alerts",
  "a study app with flashcards, spaced repetition and streaks",
];

const CHANGE_IDEAS = [
  "Add a summary dashboard with charts",
  "Add search, filters and sorting",
  "Add export and import of my data",
  "Make it simpler and cleaner",
];

type Result = { html: string; name: string; description: string };

// The in-progress build is otherwise plain React state, which is gone the
// instant this page unmounts — clicking any nav link, not just navigating
// away on purpose, silently threw away a finished app before it was saved.
// Mirroring it into sessionStorage (same mechanism BUILDER_PREFILL_KEY
// already uses for a similar draft handoff) means a click-away, a refresh,
// or an accidental back-button doesn't lose it — only the explicit "Delete
// project" button does, and now that asks first.
const DRAFT_KEY = "effant:generator-draft";
type Draft = { prompt: string; result: Result | null; history: Result[]; accent: string };

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full/blocked (private browsing, etc.) — the page still works,
    // it just won't survive a navigation away. Not worth surfacing an error for.
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clean up if storage isn't available in the first place.
  }
}

export default function GeneratePage() {
  const router = useRouter();
  const gen = useAppGeneration();
  const [prompt, setPrompt] = useState("");
  const [change, setChange] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<"preview" | "design" | "code">("preview");
  const [accent, setAccent] = useState(DEFAULT_THEME_COLOR);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore a draft left from before this page was last unmounted. Runs once,
  // after mount only — reading sessionStorage during the initial render would
  // mismatch what the server rendered and break hydration.
  useEffect(() => {
    const draft = loadDraft();
    if (draft?.result) {
      setPrompt(draft.prompt);
      setResult(draft.result);
      setHistory(draft.history);
      setAccent(draft.accent);
    }
    setHydrated(true);
    // Intentionally once-only: this restores whatever was there on arrival,
    // it doesn't re-sync if sessionStorage changes from elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the draft current as the app is built on, refined, or restyled —
  // but not before the initial restore above has had its turn, or this
  // would immediately overwrite a just-loaded draft with the still-empty
  // initial state.
  useEffect(() => {
    if (!hydrated) return;
    if (result) saveDraft({ prompt, result, history, accent });
    else clearDraft();
  }, [hydrated, prompt, result, history, accent]);

  function toResult(html: string, fallbackName: string): Result {
    const meta = readAppMeta(html);
    return { html, name: meta.name || fallbackName.slice(0, 40), description: meta.description };
  }

  async function build() {
    const html = await gen.run({ prompt });
    if (!html) return;
    setResult(toResult(html, prompt));
    setHistory([]);
    setVersion((v) => v + 1);
    setTab("preview");
    setChange("");
  }

  async function applyChange() {
    if (!result) return;
    const html = await gen.run({ prompt: change, currentHtml: result.html });
    if (!html) return;
    setHistory((h) => [...h, result]);
    setResult(toResult(html, result.name));
    setChange("");
  }

  function undo() {
    setHistory((h) => {
      const previous = h[h.length - 1];
      if (previous) setResult(previous);
      return h.slice(0, -1);
    });
  }

  function deleteProject() {
    setResult(null);
    setHistory([]);
    setChange("");
    setConfirmingDelete(false);
    gen.setError(null);
    clearDraft();
  }

  function openInBuilder() {
    if (!result) return;
    sessionStorage.setItem(
      BUILDER_PREFILL_KEY,
      JSON.stringify({ name: result.name, description: result.description, schema: appToolSchema(result.html), themeColor: accent }),
    );
    router.push("/builder");
  }

  async function saveAndOpen() {
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveError("Sign in to save this app.");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", user.id).maybeSingle();
      const base = {
        name: result.name,
        schema: appToolSchema(result.html),
        visibility: "private",
        owner_id: user.id,
        workspace_id: profile?.workspace_id ?? null,
      };
      let res = await supabase.from("tools").insert({ ...base, theme_color: accent, description: result.description }).select("id").single();
      if (isMissingColumn(res.error)) res = (await supabase.from("tools").insert(base).select("id").single()) as typeof res;
      if (res.error || !res.data) {
        setSaveError(res.error?.message ?? "Couldn't save.");
        return;
      }
      // It's a real saved tool now — leaving the draft around would make it
      // reappear as an "unsaved" app next visit, inviting a second, duplicate save.
      clearDraft();
      router.push(`/tools/${res.data.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  const errorText = gen.error;

  return (
    <section className="workspace generator-workspace">
      <section className="workspace-controls">
        {!result ? (
          <>
            <p className="control-kicker">What do you want to build?</p>
            <div className="animate-reveal mt-5 flex flex-1 flex-col">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={gen.building}
                placeholder="Describe the app you want. The more you say about what it should do, the better it gets…"
                className="min-h-[26rem] w-full flex-1 resize-none rounded-[20px] border border-border bg-card/70 p-5 text-lg leading-relaxed shadow-soft outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground disabled:opacity-60"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <Button
                    key={example}
                    variant="glass"
                    size="sm"
                    // The Button base class sets whitespace-nowrap; !whitespace-normal
                    // (Tailwind's important-prefix) is needed to actually win the
                    // cascade so these long example prompts wrap instead of
                    // overflowing the row on narrow screens.
                    className="h-auto max-w-full !whitespace-normal py-2 text-left"
                    onClick={() => setPrompt(example)}
                    disabled={gen.building}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="control-kicker">Ask for changes</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Built from: {prompt}</p>
            <div className="animate-reveal mt-5 flex flex-1 flex-col">
              <textarea
                value={change}
                onChange={(e) => setChange(e.target.value)}
                disabled={gen.building}
                placeholder="What should be different? Add a feature, change how it looks, fix something…"
                className="min-h-[9rem] w-full resize-none rounded-[20px] border border-border bg-card/70 p-5 text-base leading-relaxed shadow-soft outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground disabled:opacity-60"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {CHANGE_IDEAS.map((idea) => (
                  <Button
                    key={idea}
                    variant="glass"
                    size="sm"
                    className="h-auto max-w-full !whitespace-normal py-2 text-left"
                    onClick={() => setChange(idea)}
                    disabled={gen.building}
                  >
                    {idea}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {errorText && (
          <p className="mt-4 text-xs leading-relaxed text-destructive">
            {errorText}
            {errorText.toLowerCase().includes("sign in") && (
              <>
                {" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
                .
              </>
            )}
            {(errorText.toLowerCase().includes("upgrade to pro") || errorText.toLowerCase().includes("generations")) && (
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

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
          {result ? (
            <div className="flex items-center gap-1">
              {!confirmingDelete ? (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={gen.building}
                  className="text-destructive hover:text-destructive"
                >
                  Delete project
                </Button>
              ) : (
                <span className="flex items-center gap-2 text-xs">
                  Delete this project?
                  <Button variant="destructive" size="sm" onClick={deleteProject}>
                    Yes, delete
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </Button>
                </span>
              )}
              {!confirmingDelete && (
                <Button variant="quiet" size="sm" onClick={undo} disabled={gen.building || history.length === 0}>
                  Undo last change
                </Button>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Any app you can put into words.</span>
          )}
          {gen.building ? (
            <Button variant="glass" onClick={gen.cancel}>
              Stop
            </Button>
          ) : result ? (
            <Button variant="signal" onClick={applyChange} disabled={change.trim().length === 0}>
              Apply change
            </Button>
          ) : (
            <Button variant="signal" onClick={build} disabled={prompt.trim().length === 0}>
              Build it
            </Button>
          )}
        </div>
      </section>

      <aside className="workspace-test">
        <div className="flex items-center justify-between">
          <div className="privacy-switch">
            {(["preview", "design", "code"] as const).map((t) => (
              <Button key={t} variant={tab === t ? "ink" : "quiet"} size="sm" onClick={() => setTab(t)} className="capitalize">
                {t}
              </Button>
            ))}
          </div>
          <span className={`status-dot ${gen.building ? "bg-signal" : result ? "bg-fresh" : "bg-border"}`} />
        </div>

        <div className="relative mt-6 flex-1">
          {gen.building ? (
            <div className="animate-reveal flex h-full min-h-[24rem] flex-col justify-center gap-5 rounded-[20px] border border-border bg-card/70 p-6 shadow-soft">
              <div>
                <p className="text-sm font-semibold">{result ? "Changing your app…" : "Building your app…"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Writing it now. {gen.chars > 0 ? `${(gen.chars / 1000).toFixed(1)}k characters so far.` : "Thinking through how it should work."}
                </p>
              </div>
              <div className="relative h-1 overflow-hidden rounded-full bg-border">
                <span className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-signal" style={{ animation: "indeterminate 1.6s ease-in-out infinite" }} />
              </div>
              <pre className="max-h-40 overflow-hidden whitespace-pre-wrap break-all font-mono text-[9px] leading-relaxed text-muted-foreground">{gen.tail}</pre>
            </div>
          ) : tab === "preview" ? (
            result ? (
              <AppFrame
                key={version}
                html={result.html}
                toolId={null}
                storageKey={`generator-${version}`}
                accent={accentOf(accent)}
                title={result.name}
                className="h-[calc(100vh-17rem)] min-h-[30rem] rounded-[20px] border border-border shadow-soft"
              />
            ) : (
              <div className="grid h-full min-h-[24rem] place-items-center rounded-[20px] border border-dashed border-border p-6 text-center">
                <p className="max-w-[26ch] text-xs leading-relaxed text-muted-foreground">
                  Your app appears here the moment it&rsquo;s built, fully working, before anything is saved.
                </p>
              </div>
            )
          ) : tab === "design" ? (
            <div className="animate-reveal space-y-4">
              <p className="control-kicker">Accent color</p>
              <AccentPicker value={accent} onChange={setAccent} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                The app uses this for its buttons and highlights, and it becomes the app&rsquo;s icon color
                when installed. Changing it updates the preview instantly.
              </p>
            </div>
          ) : (
            <textarea
              readOnly
              value={result?.html ?? ""}
              placeholder="The app's code shows up here."
              className="h-[calc(100vh-17rem)] min-h-[30rem] w-full resize-none rounded-[20px] border border-border bg-card/70 p-4 font-mono text-[10px] leading-relaxed outline-none"
            />
          )}
        </div>

        <div className="test-readout mt-6">
          <strong>{result ? result.name : "Nothing built yet"}</strong>
          <span>{result ? result.description || "A complete app" : ""}</span>
          <span>{result ? `${Math.round(result.html.length / 1000)}k` : "0k"}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="signal" onClick={saveAndOpen} disabled={!result || saving || gen.building}>
            {saving ? "Saving…" : "Save and open"}
          </Button>
          <Button variant="glass" onClick={openInBuilder} disabled={!result || gen.building}>
            Open in Builder
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {result ? <DownloadAppButton html={result.html} name={result.name} accent={accentOf(accent)} /> : <span />}
          <span className="text-[10px] text-muted-foreground">Save it to install it as an app.</span>
        </div>
        {saveError && (
          <p className="mt-3 text-xs leading-relaxed text-destructive">
            {saveError}
            {saveError.toLowerCase().includes("sign in") && (
              <>
                {" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
                .
              </>
            )}
            {saveError.toLowerCase().includes("pro") && (
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
      </aside>
    </section>
  );
}
