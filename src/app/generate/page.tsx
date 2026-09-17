"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BUILDER_PREFILL_KEY } from "@/app/builder/page";

/**
 * Phase 3: describe a tool in plain language, call the Anthropic API, and
 * hand the validated schema off to the Phase 2 builder to tweak.
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
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Describe a tool</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          e.g. &ldquo;a shift scheduler&rdquo; — Claude drafts a first version you can then edit.
        </p>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the tool you want..."
        rows={4}
        className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
      />

      <button
        onClick={generate}
        disabled={loading || prompt.trim().length === 0}
        className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Generating…" : "Generate"}
      </button>

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
