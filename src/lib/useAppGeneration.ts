"use client";

import { useCallback, useRef, useState } from "react";
import { cleanGeneratedHtml } from "@/lib/appDocument";

const ERROR_MARK = "<!--EFFANT_ERROR:";

/**
 * Builds or changes an app via /api/generate-app and exposes live progress
 * while it's being written. `run` resolves to the finished HTML, or null if
 * it failed (the reason is in `error`).
 */
export function useAppGeneration() {
  const [building, setBuilding] = useState(false);
  const [chars, setChars] = useState(0);
  const [tail, setTail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const run = useCallback(async (input: { prompt: string; currentHtml?: string }): Promise<string | null> => {
    const controller = new AbortController();
    abortRef.current = controller;
    setBuilding(true);
    setError(null);
    setChars(0);
    setTail("");
    try {
      const res = await fetch("/api/generate-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong.");
        return null;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let lastPaint = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const now = performance.now();
        if (now - lastPaint > 120) {
          lastPaint = now;
          setChars(acc.length);
          setTail(acc.slice(-600));
        }
      }
      acc += decoder.decode();
      setChars(acc.length);

      const mark = acc.indexOf(ERROR_MARK);
      if (mark !== -1) {
        setError(acc.slice(mark + ERROR_MARK.length).replace(/-->\s*$/, "").trim() || "Something went wrong while building.");
        return null;
      }
      const html = cleanGeneratedHtml(acc);
      if (!/<html[\s>]|<!doctype html/i.test(html) || !/<\/html>\s*$/i.test(html)) {
        setError("The result wasn't a complete app. Try again, or describe it a little differently.");
        return null;
      }
      return html;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      setError("Couldn't reach the server.");
      return null;
    } finally {
      setBuilding(false);
      abortRef.current = null;
    }
  }, []);

  return { run, cancel, building, chars, tail, error, setError };
}
