"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BUILDER_PREFILL_KEY } from "@/app/builder/page";

// Deliberately spans very different domains — not a hint that these are the
// only kinds of tool this makes, but proof there's no fixed category at all.
const EXAMPLE_PROMPTS = [
  "a habit tracker with a calendar view",
  "a shared grocery list for my apartment",
  "a workout log that tracks personal records",
  "a recipe box that suggests dinner from what I have",
  "a simple invoice tracker for freelance clients",
  "a reading list with a rating for each book",
];

/**
 * Describe a tool in plain language, call the Anthropic API, and hand the
 * validated schema off to the builder to tweak. This is the primary way
 * most tools get made — kept front-and-center on purpose, one big prompt,
 * not a multi-step wizard or a fixed list of categories to pick from.
 */
export default function GeneratePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      sessionStorage.setItem(
        BUILDER_PREFILL_KEY,
        JSON.stringify({ name: prompt.slice(0, 60), schema: body.schema }),
      );
      router.push("/builder");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 pt-20 pb-24 text-center">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">What do you want to build?</h1>
        <p className="mt-3 text-black/60 dark:text-white/60">
          Describe anything — there&rsquo;s no fixed list of tool types. Claude drafts a working
          first version you can then edit by hand.
        </p>
      </div>

      <div className="w-full">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the tool you want..."
          rows={5}
          className="w-full rounded-2xl border border-black/15 px-5 py-4 text-base shadow-sm focus:border-black/40 focus:outline-none dark:border-white/20 dark:bg-transparent dark:focus:border-white/40"
        />
        <div className="mt-4 flex justify-center">
          <button
            onClick={generate}
            disabled={loading || prompt.trim().length === 0}
            className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            {loading ? "Building…" : "Build it"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            onClick={() => setPrompt(example)}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/60 transition hover:border-black/30 hover:text-black dark:border-white/15 dark:text-white/60 dark:hover:border-white/30 dark:hover:text-white"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600">
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
    </div>
  );
}
