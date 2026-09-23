"use client";

import { useEffect, useRef, useState } from "react";
import { ToolGlyph, type CoreKind } from "./ToolGlyph";

const SCENES: { label: string; core: CoreKind }[] = [
  { label: "Describe what you need", core: "prompt" },
  { label: "Test it live", core: "test" },
  { label: "Share on your terms", core: "share" },
];

// The design's "watch it assemble" loop. Kept as-is minus the hard borders
// and the rule that ran through the label text; the glyph is no longer clipped.
export function AutoPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setScene((current) => (current + 1) % SCENES.length), 1800);
    return () => window.clearInterval(timer);
  }, [visible]);

  const current = SCENES[scene];
  return (
    <div ref={ref} className="relative mx-auto flex min-h-[32rem] max-w-lg flex-col items-center py-14 text-center">
      <div className="relative w-full">
        <ToolGlyph core={current.core} nodes={scene + 3} />
      </div>
      <div className="z-10 mt-6">
        <span className="font-mono text-[10px] uppercase text-signal">Live sequence 0{scene + 1}</span>
        <p className="mt-4 font-display text-2xl font-semibold sm:text-3xl">{current.label}</p>
        <div className="mt-7 flex justify-center gap-2">
          {SCENES.map((item, index) => (
            <span key={item.label} className={`h-1 w-10 transition-colors ${index === scene ? "bg-foreground" : "bg-border"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
