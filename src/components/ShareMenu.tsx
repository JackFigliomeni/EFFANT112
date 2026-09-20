"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Share a tool (or any page): copy the link, send it to the usual social
 * places, or hand it to the device's own share sheet. Replaces the old
 * single "Share" button that could only copy.
 */
export function ShareMenu({
  url,
  title,
  label = "Share",
  variant = "glass",
  size = "sm",
}: {
  url: string;
  title: string;
  label?: string;
  variant?: "glass" | "quiet" | "ink";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState(url);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFullUrl(new URL(url, window.location.origin).toString());
  }, [url]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (insecure context / denied) — the link is still
      // visible in the social options below, nothing more to do here.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url: fullUrl });
      setOpen(false);
    } catch {
      // Canceled the system sheet — not an error.
    }
  }

  const q = encodeURIComponent;
  const targets = [
    { name: "X", href: `https://twitter.com/intent/tweet?text=${q(title)}&url=${q(fullUrl)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${q(fullUrl)}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${q(fullUrl)}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${q(`${title} ${fullUrl}`)}` },
    { name: "Email", href: `mailto:?subject=${q(title)}&body=${q(fullUrl)}` },
  ];
  const itemClass =
    "block w-full rounded-xl px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <div ref={ref} className="relative inline-block">
      <Button variant={variant} size={size} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {label}
      </Button>
      {open && (
        <div className="animate-reveal absolute right-0 top-full z-50 mt-2 w-52 rounded-[20px] border border-border bg-card/95 p-2 shadow-soft">
          <button className={itemClass} onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button className={itemClass} onClick={nativeShare}>
              Share…
            </button>
          )}
          <div className="my-1 border-t border-border" />
          {targets.map((t) => (
            <a key={t.name} href={t.href} target="_blank" rel="noopener noreferrer" className={itemClass}>
              {t.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
