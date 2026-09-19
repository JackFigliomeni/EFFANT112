"use client";

import { useEffect } from "react";

/** Registers the /tools/-scoped service worker (public/tools/sw.js) — split
 * into its own client component since the tool page itself stays a server
 * component. Silently no-ops where service workers aren't supported. */
export function ToolServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/tools/sw.js", { scope: "/tools/" }).catch(() => {
      // Installability is a nice-to-have, not a requirement — a failed
      // registration (e.g. unsupported browser context) shouldn't surface
      // as an error to someone just trying to use the tool.
    });
  }, []);

  return null;
}
