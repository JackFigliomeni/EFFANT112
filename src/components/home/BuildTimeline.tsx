"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    title: "Choose",
    body: "Start from something you already understand — a schedule, a list, a tracker.",
  },
  {
    title: "Shape",
    body: "Add and rearrange the pieces until the rules match how you actually live.",
  },
  {
    title: "Run",
    body: "It's a real, working tool immediately — not a mockup of one.",
  },
  {
    title: "Share",
    body: "Keep it to yourself, hand it to your workspace, or put it on the shelf for anyone.",
  },
];

/**
 * Replaces a boxed 3-or-5-up grid with a single vertical spine that steps
 * branch off of, left and right, revealing one at a time as it's scrolled
 * into view — a timeline, not a row of cards.
 */
export function BuildTimeline() {
  const [revealed, setRevealed] = useState<boolean[]>(() => STEPS.map(() => false));
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = stepRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index === -1) continue;
          setRevealed((prev) => {
            if (prev[index]) return prev;
            const next = [...prev];
            next[index] = true;
            return next;
          });
        }
      },
      { threshold: 0.4 },
    );
    for (const el of stepRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative mx-auto flex max-w-2xl flex-col">
      <div
        aria-hidden
        className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-black/15 to-transparent dark:via-white/15"
      />
      {STEPS.map((step, i) => {
        const fromLeft = i % 2 === 0;
        return (
          <div
            key={step.title}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            className={`relative flex py-16 ${fromLeft ? "justify-start pr-[52%]" : "justify-end pl-[52%]"}`}
          >
            <div
              aria-hidden
              className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-black/60 transition-all duration-700 dark:bg-white/60 ${
                revealed[i] ? "scale-100 opacity-100" : "scale-0 opacity-0"
              } ${fromLeft ? "left-1/2 -translate-x-1/2" : "left-1/2 -translate-x-1/2"}`}
            />
            <div
              className={`transition-all duration-700 ease-out ${
                revealed[i]
                  ? "translate-x-0 opacity-100"
                  : `opacity-0 ${fromLeft ? "-translate-x-6" : "translate-x-6"}`
              }`}
            >
              <p className="text-xs tracking-widest text-black/40 dark:text-white/40">
                0{i + 1}
              </p>
              <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
              <p className={`mt-2 max-w-xs text-sm text-black/60 dark:text-white/60 ${fromLeft ? "" : "ml-auto text-right"}`}>
                {step.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
