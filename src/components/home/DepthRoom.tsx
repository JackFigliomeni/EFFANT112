"use client";

import { useEffect, useRef } from "react";

/**
 * The home page's background: a minimalist architectural interior (back
 * wall, angled side walls, a floor plane, a couple of accent slabs) that
 * the bubbles float inside of.
 *
 * Built to be cheap: every surface is a single absolutely-positioned div
 * shaded with a CSS gradient (no SVG, no images, nothing re-painted on
 * scroll) and the bubbles are plain elements that only ever change
 * `transform` — the one property the browser can move without repainting.
 */

const TONES = ["signal", "cool", "fresh"] as const;
const ANIMS = ["a", "b", "c"] as const;

// Nearer bubbles are larger and move faster as you scroll; that difference in
// speed is what reads as depth. Positions are chosen to stay off the middle
// column where the text sits. `anim`/`duration`/`delay` drive a slow ambient
// float (see bubble-drift-* in globals.css) that runs all the time, on top
// of the scroll-parallax; the further a bubble sits (lower `speed`), the
// softer its `blur`, like background objects out of focus.
const BUBBLES = [
  { top: 4, left: "4%", size: 210, speed: 0.34, tone: 0, anim: 0, duration: 22, delay: 0 },
  { top: 9, left: "84%", size: 150, speed: 0.2, tone: 1, anim: 1, duration: 26, delay: -6 },
  { top: 24, left: "-3%", size: 120, speed: 0.12, tone: 2, anim: 2, duration: 30, delay: -14 },
  { top: 30, left: "90%", size: 260, speed: 0.4, tone: 0, anim: 1, duration: 20, delay: -3 },
  { top: 44, left: "6%", size: 170, speed: 0.22, tone: 1, anim: 0, duration: 25, delay: -11 },
  { top: 52, left: "82%", size: 110, speed: 0.1, tone: 2, anim: 2, duration: 28, delay: -8 },
  { top: 64, left: "-2%", size: 240, speed: 0.36, tone: 0, anim: 2, duration: 21, delay: -16 },
  { top: 72, left: "88%", size: 150, speed: 0.18, tone: 1, anim: 0, duration: 27, delay: -4 },
  { top: 84, left: "10%", size: 130, speed: 0.14, tone: 2, anim: 1, duration: 24, delay: -19 },
  { top: 92, left: "80%", size: 220, speed: 0.3, tone: 0, anim: 0, duration: 23, delay: -9 },
];

export function DepthRoom() {
  const bubbleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    function apply() {
      raf = 0;
      const y = window.scrollY;
      BUBBLES.forEach((b, i) => {
        const el = bubbleRefs.current[i];
        if (el) el.style.transform = `translate3d(0, ${Math.round(-y * b.speed)}px, 0)`;
      });
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(apply);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* the room: static, never repainted */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* back wall — a large soft slab centered behind the hero */}
        <div
          className="absolute left-1/2 top-[4%] h-[48%] w-[62%] -translate-x-1/2 sm:w-[52%]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--foreground) 6%, var(--background)) 0%, color-mix(in oklab, var(--foreground) 2%, var(--background)) 55%, var(--background) 100%)",
            boxShadow: "0 40px 70px -30px color-mix(in oklab, var(--foreground) 12%, transparent)",
          }}
        />

        {/* left wall, angled inward */}
        <div
          className="absolute inset-y-0 left-0 w-[38%] sm:w-[30%]"
          style={{
            clipPath: "polygon(0% 0%, 100% 16%, 58% 64%, 0% 100%)",
            background:
              "linear-gradient(120deg, color-mix(in oklab, var(--foreground) 11%, var(--background)) 0%, color-mix(in oklab, var(--foreground) 3%, var(--background)) 65%, transparent 100%)",
          }}
        />

        {/* right wall / opening, angled inward, with a slim glass-like slit */}
        <div
          className="absolute inset-y-0 right-0 w-[34%] sm:w-[27%]"
          style={{
            clipPath: "polygon(100% 0%, 100% 100%, 6% 100%, 40% 12%)",
            background:
              "linear-gradient(240deg, color-mix(in oklab, var(--foreground) 7%, var(--background)) 0%, var(--background) 62%)",
          }}
        />
        <div
          className="absolute right-[10%] top-[16%] h-[52%] w-[2.5%]"
          style={{
            background: "linear-gradient(180deg, color-mix(in oklab, var(--cool) 16%, var(--background)) 0%, transparent 100%)",
            opacity: 0.55,
          }}
        />

        {/* two quiet accent slabs, floating just off the side walls */}
        <div
          className="absolute left-[1%] top-[28%] h-[36%] w-[13%]"
          style={{
            background: "linear-gradient(160deg, color-mix(in oklab, var(--foreground) 7%, var(--background)) 0%, transparent 85%)",
            boxShadow: "0 24px 44px -18px color-mix(in oklab, var(--foreground) 10%, transparent)",
            opacity: 0.6,
          }}
        />
        <div
          className="absolute right-[3%] top-[20%] h-[26%] w-[9%]"
          style={{
            background: "linear-gradient(205deg, color-mix(in oklab, var(--foreground) 6%, var(--background)) 0%, transparent 85%)",
            opacity: 0.5,
          }}
        />

        {/* floor — a wide plane opening out toward the viewer */}
        <div
          className="absolute inset-x-0 bottom-0 h-[44%]"
          style={{
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--foreground) 3%, var(--background)) 0%, color-mix(in oklab, var(--foreground) 6%, var(--background)) 100%)",
          }}
        >
          {/* a soft sheen near the horizon, standing in for a reflection */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 55% 45% at 50% 0%, oklch(1 0 0 / .55) 0%, transparent 70%)",
            }}
          />
          {/* two very faint lines, just enough to read as a floor edge */}
          <div
            className="absolute inset-x-[20%] top-[18%] h-px"
            style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--foreground) 10%, transparent) 50%, transparent)" }}
          />
          <div
            className="absolute inset-x-[6%] top-[55%] h-px"
            style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--foreground) 8%, transparent) 50%, transparent)" }}
          />
        </div>

        {/* the far end is bright, so everything recedes into soft daylight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 42% at 50% 38%, oklch(0.995 0.004 255 / .9) 0%, oklch(0.99 0.005 255 / .55) 38%, transparent 78%)",
          }}
        />
      </div>

      {/* bubbles spread over the whole page, each drifting at its own rate.
          Below lg (1024px — phone and tablet both), the coordinate space is
          widened so each edge-anchored bubble's % position lands further
          outside the viewport; the same layout that works at desktop width
          otherwise lands on top of the narrower text column. No per-bubble
          tuning needed. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 max-lg:-left-[22%] max-lg:-right-[22%] overflow-hidden"
        aria-hidden="true"
      >
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            ref={(el) => {
              bubbleRefs.current[i] = el;
            }}
            className="absolute will-change-transform"
            style={{
              top: `${b.top}%`,
              left: b.left,
              // Fixed pixel sizes don't shrink with a narrow viewport, so on
              // a phone these were large enough to sit on top of the
              // headline. clamp() scales them down below a 700px viewport
              // and is a no-op above it — desktop keeps its exact size.
              width: `clamp(${Math.round(b.size * 0.4)}px, ${(b.size / 7).toFixed(2)}vw, ${b.size}px)`,
              height: `clamp(${Math.round(b.size * 0.4)}px, ${(b.size / 7).toFixed(2)}vw, ${b.size}px)`,
            }}
          >
            <span
              className={`block size-full rounded-full room-bubble-${TONES[b.tone]}`}
              style={{
                animation: `bubble-drift-${ANIMS[b.anim]} ${b.duration}s ease-in-out ${b.delay}s infinite`,
                filter: b.speed < 0.3 ? `blur(${Math.round((0.3 - b.speed) * 10)}px)` : undefined,
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
