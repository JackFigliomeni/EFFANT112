"use client";

import { useEffect, useRef } from "react";

/**
 * The home page's background: an empty, softly lit white room that extends
 * away from the screen, with bubbles floating at real depth inside it. As
 * you scroll, the camera moves forward through the room — the floor grid
 * slides toward you and bubbles drift past — so the whole page reads as one
 * continuous space instead of stacked flat sections.
 *
 * Real CSS 3D (perspective + translateZ), not layered parallax. Only one
 * custom property (--cam) changes on scroll; everything else is GPU
 * transforms. The room's planes are periodic textures, so instead of
 * moving them the full distance (which would need enormous planes) they
 * shift by `cam mod period` — visually identical, and never runs out.
 */

// Small deterministic generator — random-looking placement that's identical
// on server and client (Math.random would cause a hydration mismatch).
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const TONES = ["signal", "cool", "fresh"] as const;

const BUBBLES = (() => {
  const rand = seeded(11);
  return Array.from({ length: 28 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -(520 + i * 430 + Math.round(rand() * 140));
    const size = Math.round(170 + rand() * 300);
    // How much perspective shrinks things at this depth. Used to keep every
    // bubble out of the middle column where the text sits, at any depth.
    const scale = 900 / (900 - z);
    const minScreen = 380 + (size * scale) / 2;
    return {
      x: Math.round((side * (minScreen + rand() * 380)) / scale),
      y: Math.round((rand() - 0.5) * 700),
      z,
      size,
      tone: TONES[i % 3],
      delay: -Math.round(rand() * 12),
    };
  });
})();

const FLOOR_LENGTH = 13000;
const ROOM_HALF_WIDTH = 900;
const ROOM_HALF_HEIGHT = 380;
const NEAR = 1200; // planes start this far in front of z=0 so nothing gaps at the screen edge

export function DepthRoom() {
  const roomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        roomRef.current?.style.setProperty("--cam", String(Math.round(window.scrollY * 1.5)));
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
      ref={roomRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ ["--cam" as string]: 0 }}
    >
      {/* the room itself */}
      <div className="absolute inset-0" style={{ perspective: "900px", perspectiveOrigin: "50% 42%" }}>
      <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        {/* floor: a receding grid that slides toward the viewer */}
        <div
          className="absolute will-change-transform"
          style={{
            left: `calc(50% - ${ROOM_HALF_WIDTH * 2}px)`,
            width: ROOM_HALF_WIDTH * 4,
            height: FLOOR_LENGTH,
            top: `calc(50% + ${ROOM_HALF_HEIGHT}px - ${FLOOR_LENGTH}px)`,
            transformOrigin: "50% 100%",
            transform: `translateZ(calc(${NEAR}px + mod(var(--cam), 200) * 1px)) rotateX(90deg)`,
            backgroundImage:
              "linear-gradient(to right, oklch(0.8 0.02 255 / .55) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.8 0.02 255 / .55) 1px, transparent 1px)",
            backgroundSize: "200px 200px",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 55%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 55%)",
          }}
        />
        {/* ceiling: same room, lit from above, no grid */}
        <div
          className="absolute"
          style={{
            left: `calc(50% - ${ROOM_HALF_WIDTH * 2}px)`,
            width: ROOM_HALF_WIDTH * 4,
            height: FLOOR_LENGTH,
            top: `calc(50% - ${ROOM_HALF_HEIGHT}px)`,
            transformOrigin: "50% 0%",
            transform: `translateZ(${NEAR}px) rotateX(-90deg)`,
            background: "linear-gradient(to top, oklch(1 0 0 / .0), oklch(1 0 0 / .55))",
            maskImage: "linear-gradient(to top, transparent 0%, black 60%)",
            WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 60%)",
          }}
        />
        {/* left + right walls with faint panel seams that slide past */}
        {([-1, 1] as const).map((side) => (
          <div
            key={side}
            className="absolute will-change-transform"
            style={{
              width: FLOOR_LENGTH,
              height: ROOM_HALF_HEIGHT * 2,
              top: `calc(50% - ${ROOM_HALF_HEIGHT}px)`,
              left: side === -1 ? `calc(50% - ${ROOM_HALF_WIDTH}px)` : `calc(50% + ${ROOM_HALF_WIDTH}px - ${FLOOR_LENGTH}px)`,
              transformOrigin: side === -1 ? "0% 50%" : "100% 50%",
              transform: `translateZ(calc(${NEAR}px + mod(var(--cam), 700) * 1px)) rotateY(${side === -1 ? 90 : -90}deg)`,
              backgroundImage:
                "repeating-linear-gradient(to right, oklch(0.8 0.02 255 / .45) 0 1px, transparent 1px 700px), linear-gradient(to bottom, oklch(1 0 0 / .35), transparent 40%, transparent 60%, oklch(1 0 0 / .35))",
              maskImage: `linear-gradient(to ${side === -1 ? "left" : "right"}, transparent 0%, black 55%)`,
              WebkitMaskImage: `linear-gradient(to ${side === -1 ? "left" : "right"}, transparent 0%, black 55%)`,
            }}
          />
        ))}

      </div>
      </div>

      {/* bubbles, each at its own depth; they fly past as the camera advances.
          Same camera as the room but a separate 3D layer, so a bubble never
          intersects a wall or the ceiling (which slices it flat). */}
      <div className="absolute inset-0" style={{ perspective: "900px", perspectiveOrigin: "50% 42%" }}>
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: "translateZ(calc(var(--cam) * 1px))" }}>
          {BUBBLES.map((b, i) => (
            <div
              key={i}
              className="room-bubble"
              style={{
                width: b.size,
                height: b.size,
                marginLeft: -b.size / 2,
                marginTop: -b.size / 2,
                transform: `translate3d(${b.x}px, ${b.y}px, ${b.z}px)`,
                // fades out before it reaches the camera, and fades in out of the far fog
                ["--d" as string]: `calc(${b.z} + var(--cam))`,
                opacity:
                  "min(clamp(0, calc((var(--d) * -1 - 140) / 520), 1), clamp(0, calc((9500 + var(--d)) / 4500), 1))",
              }}
            >
              <span
                className={`block size-full rounded-full room-bubble-${b.tone}`}
                style={{ animation: "room-drift 14s ease-in-out infinite", animationDelay: `${b.delay}s` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* the far end of the room: bright, so everything recedes into light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 52% 44% at 50% 42%, oklch(0.995 0.004 255 / .95) 0%, oklch(0.99 0.005 255 / .7) 30%, transparent 78%)",
        }}
      />
    </div>
  );
}
