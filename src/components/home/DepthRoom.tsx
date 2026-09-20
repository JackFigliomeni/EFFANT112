"use client";

import { useEffect, useRef } from "react";

/**
 * The home page's background: an empty white room receding away from the
 * screen, with bubbles at different depths.
 *
 * Built to be cheap. The room is one static SVG (painted once, never
 * animated) and the bubbles are plain elements that only ever change
 * `transform` — the one property the browser can move without repainting.
 * The earlier version used huge 3D-transformed planes and re-styled every
 * bubble on each scroll event, which made scrolling lag and flicker.
 */

const VP = { x: 50, y: 40 }; // vanishing point, in the SVG's 0-100 space

function RoomLines() {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  // far-end rectangle
  const rx = 8;
  const ry = 6;
  const corners = [
    [VP.x - rx, VP.y - ry],
    [VP.x + rx, VP.y - ry],
    [VP.x + rx, VP.y + ry],
    [VP.x - rx, VP.y + ry],
  ];
  const outer = [
    [-4, -6],
    [104, -6],
    [104, 106],
    [-4, 106],
  ];
  // the four room corners running off toward the viewer
  corners.forEach(([x, y], i) => lines.push({ x1: x, y1: y, x2: outer[i][0], y2: outer[i][1] }));
  // floor: lines fanning from the far end to the bottom edge
  for (let i = -6; i <= 6; i++) lines.push({ x1: VP.x + i * 2.2, y1: VP.y + ry, x2: VP.x + i * 20, y2: 106 });
  // floor: cross lines, spaced so they crowd together with distance
  for (let k = 1; k <= 7; k++) {
    const t = (k / 7) ** 2;
    const y = VP.y + ry + t * (106 - VP.y - ry);
    const half = rx + t * (60 - rx);
    lines.push({ x1: VP.x - half, y1: y, x2: VP.x + half, y2: y });
  }
  return (
    <>
      {lines.map((l, i) => (
        <line key={i} {...l} stroke="oklch(0.8 0.02 255)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <rect x={VP.x - rx} y={VP.y - ry} width={rx * 2} height={ry * 2} fill="none" stroke="oklch(0.8 0.02 255)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </>
  );
}

const TONES = ["signal", "cool", "fresh"] as const;

// Nearer bubbles are larger and move faster as you scroll; that difference in
// speed is what reads as depth. Positions are chosen to stay off the middle
// column where the text sits.
const BUBBLES = [
  { top: 4, left: "4%", size: 210, speed: 0.34, tone: 0 },
  { top: 9, left: "84%", size: 150, speed: 0.2, tone: 1 },
  { top: 24, left: "-3%", size: 120, speed: 0.12, tone: 2 },
  { top: 30, left: "90%", size: 260, speed: 0.4, tone: 0 },
  { top: 44, left: "6%", size: 170, speed: 0.22, tone: 1 },
  { top: 52, left: "82%", size: 110, speed: 0.1, tone: 2 },
  { top: 64, left: "-2%", size: 240, speed: 0.36, tone: 0 },
  { top: 72, left: "88%", size: 150, speed: 0.18, tone: 1 },
  { top: 84, left: "10%", size: 130, speed: 0.14, tone: 2 },
  { top: 92, left: "80%", size: 220, speed: 0.3, tone: 0 },
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
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <svg className="size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* surfaces, lit softly toward the far end */}
          <polygon points={`${VP.x - 8},${VP.y + 6} ${VP.x + 8},${VP.y + 6} 104,106 -4,106`} fill="oklch(0.93 0.012 255)" fillOpacity="0.7" />
          <polygon points={`${VP.x - 8},${VP.y - 6} ${VP.x + 8},${VP.y - 6} 104,-6 -4,-6`} fill="oklch(1 0 0)" fillOpacity="0.55" />
          <polygon points={`${VP.x - 8},${VP.y - 6} ${VP.x - 8},${VP.y + 6} -4,106 -4,-6`} fill="oklch(0.97 0.006 255)" fillOpacity="0.6" />
          <polygon points={`${VP.x + 8},${VP.y - 6} ${VP.x + 8},${VP.y + 6} 104,106 104,-6`} fill="oklch(0.97 0.006 255)" fillOpacity="0.6" />
          <RoomLines />
        </svg>
        {/* the far end is bright, so everything recedes into light */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 42% at 50% 40%, oklch(0.995 0.004 255 / .95) 0%, oklch(0.99 0.005 255 / .6) 35%, transparent 80%)",
          }}
        />
      </div>

      {/* bubbles spread over the whole page, each drifting at its own rate */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            ref={(el) => {
              bubbleRefs.current[i] = el;
            }}
            className="absolute will-change-transform"
            style={{ top: `${b.top}%`, left: b.left, width: b.size, height: b.size }}
          >
            <span className={`block size-full rounded-full room-bubble-${TONES[b.tone]}`} />
          </div>
        ))}
      </div>
    </>
  );
}
