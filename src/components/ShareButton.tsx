"use client";

import { useState } from "react";

/** Native share sheet where available (mobile, most desktop browsers now),
 * falling back to copy-to-clipboard — works for sharing a tool to socials
 * or just sending someone a link. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const fullUrl = typeof window !== "undefined" ? new URL(url, window.location.origin).toString() : url;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
        return;
      } catch {
        // User canceled the share sheet — not an error worth reporting.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — nothing more we can do here.
    }
  }

  return (
    <button
      onClick={share}
      className="rounded-full border border-black/15 px-3 py-1 text-xs text-black/60 transition hover:border-black/30 hover:text-black dark:border-white/15 dark:text-white/60 dark:hover:border-white/30 dark:hover:text-white"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
