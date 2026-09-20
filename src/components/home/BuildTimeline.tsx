"use client";

import { useEffect, useRef } from "react";
import { StepGlyph, type StepGlyphKind } from "./StepGlyph";

const STEPS: { kind: StepGlyphKind; title: string; body: string }[] = [
  {
    kind: "describe",
    title: "Describe it",
    body: "Say what you need in plain words. There's no list of templates to pick from — if you can describe it, it can be built.",
  },
  {
    kind: "draft",
    title: "It drafts the structure",
    body: "Questions to fill in, tables that hold the answers, views that read them back, buttons that act on them.",
  },
  {
    kind: "shape",
    title: "Shape it by hand",
    body: "Open it in the builder and change anything: add a part, rename a field, rearrange how it works, with a live preview as you go.",
  },
  {
    kind: "automate",
    title: "Let it work on its own",
    body: "Add an automation and it runs by itself every day: a new suggestion, a fresh idea, something it found on the web.",
  },
  {
    kind: "style",
    title: "Make it look like yours",
    body: "Pick its color. It carries into its buttons, its charts, and its own app icon.",
  },
  {
    kind: "publish",
    title: "Decide who sees it",
    body: "Keep it private, share it with your workspace, or put it on the community page for anyone.",
  },
  {
    kind: "install",
    title: "Install it as its own app",
    body: "Add it to your phone or computer. It opens on its own — no browser bars, nothing from an app store.",
  },
];

/**
 * The build process as a timeline you scroll through, not a row of cards.
 * A vertical line fills as you move down the page; at each stop a horizontal
 * branch draws out from it and the step (with a picture of what it does)
 * arrives at the end of that branch, alternating sides.
 */
export function BuildTimeline() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.querySelectorAll(".timeline-step").forEach((el) => el.classList.add("is-in"));
      root.style.setProperty("--p", "1");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    root.querySelectorAll(".timeline-step").forEach((el) => observer.observe(el));

    let raf = 0;
    function update() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = root!.getBoundingClientRect();
        const anchor = window.innerHeight * 0.55;
        const p = Math.min(1, Math.max(0, (anchor - rect.top) / rect.height));
        root!.style.setProperty("--p", p.toFixed(4));
      });
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative mx-auto max-w-5xl" style={{ ["--p" as string]: 0 }}>
      {/* the spine: faint track + a colored fill that follows your scroll */}
      <div className="absolute bottom-0 left-4 top-0 w-px -translate-x-1/2 bg-border md:left-1/2" aria-hidden="true" />
      <div
        className="absolute bottom-0 left-4 top-0 w-[2px] -translate-x-1/2 origin-top will-change-transform md:left-1/2"
        style={{
          transform: "scaleY(var(--p))",
          background: "linear-gradient(to bottom, var(--signal), var(--cool), var(--fresh))",
        }}
        aria-hidden="true"
      />

      {STEPS.map((step, i) => {
        const contentLeft = i % 2 === 0;
        return (
          <div
            key={step.title}
            className="timeline-step relative grid grid-cols-[2rem_1fr] items-center gap-x-6 py-12 md:grid-cols-[1fr_4rem_1fr] md:gap-x-0 md:py-16"
          >
            {/* node on the spine */}
            <div className="relative col-start-1 row-start-1 flex justify-center md:col-start-2">
              <span
                className="timeline-node size-3 rounded-full bg-background ring-2"
                style={{ ["--tw-ring-color" as string]: i % 3 === 0 ? "var(--signal)" : i % 3 === 1 ? "var(--cool)" : "var(--fresh)" }}
              />
            </div>

            {/* horizontal branch: draws out of the spine toward the content */}
            <span
              aria-hidden="true"
              className={`timeline-branch absolute top-1/2 hidden h-px bg-foreground/25 md:block ${
                contentLeft ? "right-1/2 mr-2 w-20" : "left-1/2 ml-2 w-20"
              }`}
              style={{ ["--branch-origin" as string]: contentLeft ? "right" : "left" }}
            />
            <span
              aria-hidden="true"
              className="timeline-branch absolute left-4 top-1/2 ml-2 h-px w-4 bg-foreground/25 md:hidden"
              style={{ ["--branch-origin" as string]: "left" }}
            />

            {/* the step */}
            <div
              className={`timeline-body col-start-2 row-start-1 ${
                contentLeft ? "md:col-start-1 md:pr-24 md:text-right" : "md:col-start-3 md:pl-24 md:text-left"
              }`}
            >
              <h3 className="font-display text-2xl font-semibold leading-tight">{step.title}</h3>
              <p className={`mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground ${contentLeft ? "md:ml-auto" : ""}`}>{step.body}</p>
              <div className="mt-6 md:hidden">
                <StepGlyph kind={step.kind} />
              </div>
            </div>

            {/* the picture, on the opposite side of the spine */}
            <div
              className={`timeline-body col-start-2 row-start-1 hidden items-center md:flex ${
                contentLeft ? "md:col-start-3 md:pl-24" : "md:col-start-1 md:justify-end md:pr-24"
              }`}
            >
              <StepGlyph kind={step.kind} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
