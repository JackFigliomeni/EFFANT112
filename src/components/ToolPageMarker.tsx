"use client";

import { useEffect } from "react";

/** Flags the document as a tool page so the site chrome can hide itself when
 * the tool is running as an installed app (see globals.css). */
export function ToolPageMarker() {
  useEffect(() => {
    document.documentElement.dataset.toolPage = "1";
    return () => {
      delete document.documentElement.dataset.toolPage;
    };
  }, []);
  return null;
}
