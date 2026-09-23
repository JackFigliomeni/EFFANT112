"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildAppDocument } from "@/lib/appDocument";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * "Make it an app": installs the tool as its own app on this device — own
 * icon, own window, no browser bars. Where the browser offers a real install
 * prompt we use it; everywhere else (Safari, or a browser that has already
 * shown its prompt) we show the exact steps for this device instead of a
 * dead button.
 */
export function InstallAppButton({ label = "Install as app" }: { label?: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <span className="font-mono text-[9px] uppercase text-muted-foreground">Running as an app</span>;

  async function install() {
    if (!prompt) {
      setHelp((v) => !v);
      return;
    }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      // The browser refused to show its prompt; the manual steps still work.
      setHelp(true);
    }
    setPrompt(null);
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const ios = /iphone|ipad|ipod/i.test(ua);
  const ipad = /ipad/i.test(ua);
  const safariMac = /^((?!chrome|android).)*safari/i.test(ua) && /Macintosh/.test(ua);
  const steps = safariMac
    ? "In the menu bar choose File, then Add to Dock."
    : "Open your browser's menu and choose Install app (or Add to Home screen). In Chrome and Edge there's also an install icon at the right end of the address bar.";

  return (
    <div className="relative inline-block">
      <Button variant="ink" size="sm" onClick={install}>
        {label}
      </Button>
      {help &&
        !prompt &&
        (ios ? (
          <IOSInstallPointer atTop={ipad} onDismiss={() => setHelp(false)} />
        ) : (
          <div className="animate-reveal absolute right-0 top-full z-50 mt-2 w-64 rounded-[20px] border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground shadow-soft">
            {steps}
          </div>
        ))}
    </div>
  );
}

/**
 * iOS has no install prompt to trigger — the Share icon it points at lives in
 * Safari's own chrome, outside our DOM, so the closest we can get is a bobbing
 * pointer anchored to the screen edge where that icon actually sits: bottom
 * center on iPhone's compact toolbar, top right near iPad's address bar.
 */
function IOSInstallPointer({ atTop, onDismiss }: { atTop: boolean; onDismiss: () => void }) {
  return (
    <div
      className={`animate-reveal fixed inset-x-0 z-[100] flex px-6 ${
        atTop ? "top-2 justify-end" : "bottom-6 justify-center"
      }`}
      onClick={onDismiss}
    >
      <div className={`flex flex-col items-center gap-2 ${atTop ? "items-end" : ""}`}>
        {atTop && <ShareGlyph className="animate-bob-up size-7 text-signal" />}
        <p className="max-w-[14rem] rounded-[16px] border border-border bg-card px-4 py-3 text-center font-mono text-[10px] uppercase leading-relaxed tracking-wide text-foreground shadow-soft">
          Tap Share, then Add to Home Screen
        </p>
        {!atTop && <ShareGlyph className="animate-bob-down size-7 text-signal" />}
      </div>
    </div>
  );
}

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 16V4" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

/** Saves an app as one standalone .html file that works offline, from the desktop. */
export function DownloadAppButton({ html, name, accent }: { html: string; name: string; accent?: string }) {
  function download() {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
    const doc = buildAppDocument(html, { mode: "standalone", accent, standaloneKey: `effant-app:${slug}` });
    const url = URL.createObjectURL(new Blob([doc], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Button variant="glass" size="sm" onClick={download}>
      Download for desktop
    </Button>
  );
}
