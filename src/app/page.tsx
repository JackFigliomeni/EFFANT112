import Link from "next/link";

const STEPS = [
  {
    href: "/tools/demo",
    title: "Phase 1 — the engine",
    body: "A hard-coded habit tracker proving inputs, tables, views, and actions all work end-to-end against Supabase.",
  },
  {
    href: "/builder",
    title: "Phase 2 — manual builder",
    body: "Add, edit, and remove blocks by hand, with a live preview as you go.",
  },
  {
    href: "/generate",
    title: "Phase 3 — prompt to schema",
    body: "Describe a tool in plain language and let Claude draft the first version.",
  },
  {
    href: "/gallery",
    title: "Phases 4–5 — workspace & sharing",
    body: "Sign in, get a workspace, and mark tools private or shared with your workspace.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Small Software Workspace</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          Build a small tool — by prompt or by hand — out of a fixed set of safe building blocks,
          keep it private or publish it to your workspace, and use it from a link that works on
          any device.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex flex-col gap-1 rounded-lg border border-black/10 p-4 transition hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
          >
            <span className="text-sm font-semibold">{step.title}</span>
            <span className="text-sm text-black/60 dark:text-white/60">{step.body}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
