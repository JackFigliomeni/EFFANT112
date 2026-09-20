"use client";

import { useEffect, useRef } from "react";

/**
 * The continuous background for the whole homepage — one field of soft,
 * blurred shapes spanning the entire page height (not per-section), each
 * drifting at its own rate as you scroll. Nearer shapes (small `depth`)
 * move faster and sit larger/less blurred; farther ones move less and sit
 * smaller/softer — that difference in rate is what reads as depth, without
 * needing a real 3D engine. No section ever has its own flat background,
 * so there's never a hard seam between them.
 *
 * Must be the first child of a `position: relative` wrapper that spans the
 * full page (see app/page.tsx) — it's absolutely positioned to fill that
 * wrapper's actual content height, not just the viewport, so the drift
 * continues smoothly for the entire scroll instead of resetting per screen.
 */
const SHAPES = [
  { top: "-4%", left: "-10%", size: 460, hue: 8, depth: 0.06 },
  { top: "2%", left: "70%", size: 380, hue: 150, depth: 0.14 },
  { top: "18%", left: "88%", size: 420, hue: 212, depth: 0.04 },
  { top: "26%", left: "6%", size: 300, hue: 150, depth: 0.18 },
  { top: "38%", left: "45%", size: 520, hue: 8, depth: 0.09 },
  { top: "52%", left: "-8%", size: 360, hue: 212, depth: 0.16 },
  { top: "58%", left: "78%", size: 340, hue: 30, depth: 0.12 },
  { top: "72%", left: "18%", size: 460, hue: 150, depth: 0.07 },
  { top: "84%", left: "62%", size: 400, hue: 212, depth: 0.15 },
  { top: "96%", left: "0%", size: 380, hue: 8, depth: 0.1 },
] as const;

export function DepthField() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        fieldRef.current?.style.setProperty("--scroll", String(window.scrollY));
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={fieldRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1400px]"
    >
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: `radial-gradient(circle at 35% 30%, hsl(${s.hue} 75% 88% / 0.9), hsl(${s.hue} 65% 80% / 0.15) 70%)`,
            filter: `blur(${18 + s.depth * 120}px)`,
            transform: `translateY(calc(var(--scroll, 0) * ${-s.depth}px)) translateZ(${-(s.depth * 2000)}px) scale(${1 + s.depth})`,
            opacity: 0.8 - s.depth,
          }}
        />
      ))}
    </div>
  );
}
