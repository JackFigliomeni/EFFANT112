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
  const safariMac = /^((?!chrome|android).)*safari/i.test(ua) && /Macintosh/.test(ua);
  const steps = ios
    ? "Tap the Share button, then Add to Home Screen."
    : safariMac
      ? "In the menu bar choose File, then Add to Dock."
      : "Open your browser's menu and choose Install app (or Add to Home screen). In Chrome and Edge there's also an install icon at the right end of the address bar.";

  return (
    <div className="relative inline-block">
      <Button variant="ink" size="sm" onClick={install}>
        {label}
      </Button>
      {help && !prompt && (
        <div className="animate-reveal absolute right-0 top-full z-50 mt-2 w-64 rounded-[20px] border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground shadow-soft">
          {steps}
        </div>
      )}
    </div>
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
