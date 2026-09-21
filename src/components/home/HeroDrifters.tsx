// Circles that drift slowly across the hero and pass over the headline. They
// exist only in the hero (they scroll away with it) and only ever animate
// `transform`, so they stay cheap. `mix-blend-mode: multiply` lets the text
// read straight through them where they overlap.
const DRIFTERS = [
  { left: "6%", top: "12%", size: 250, tone: "signal", anim: "a", duration: 19, delay: 0 },
  { left: "72%", top: "4%", size: 200, tone: "cool", anim: "b", duration: 23, delay: -6 },
  { left: "34%", top: "22%", size: 210, tone: "fresh", anim: "a", duration: 26, delay: -11 },
  { left: "60%", top: "40%", size: 260, tone: "signal", anim: "b", duration: 21, delay: -3 },
  { left: "14%", top: "52%", size: 170, tone: "cool", anim: "b", duration: 24, delay: -14 },
  { left: "48%", top: "58%", size: 150, tone: "fresh", anim: "a", duration: 18, delay: -8 },
] as const;

export function HeroDrifters() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {DRIFTERS.map((d, i) => (
        <span
          key={i}
          className={`absolute block rounded-full room-bubble-${d.tone}`}
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            mixBlendMode: "multiply",
            opacity: 0.85,
            animation: `bubble-drift-${d.anim} ${d.duration}s ease-in-out ${d.delay}s infinite`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
