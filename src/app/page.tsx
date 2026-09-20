import Link from "next/link";
import { DepthField } from "@/components/home/DepthField";
import { BuildTimeline } from "@/components/home/BuildTimeline";

export default function Home() {
  return (
    <div className="relative">
      <DepthField />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-32 pb-40 text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Describe any tool. Watch it get built.
        </h1>
        <p className="max-w-xl text-lg text-black/60 dark:text-white/60">
          Not a fixed set of templates — pick the pieces, arrange them your way, and ship
          literally any tool you can describe. Install it like a real app on your phone or
          computer, with nothing to download from a store.
        </p>
        <Link
          href="/generate"
          className="mt-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
        >
          Start building
        </Link>
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="text-3xl font-semibold">From a description to something you can use.</h2>
      </div>

      <div className="relative px-6 pb-40">
        <BuildTimeline />
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 pb-40 text-center">
        <p className="max-w-md text-black/60 dark:text-white/60">
          See what other people have already built and shared.
        </p>
        <Link
          href="/community"
          className="rounded-full border border-black/15 px-6 py-3 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Explore community tools
        </Link>
      </div>
    </div>
  );
}
