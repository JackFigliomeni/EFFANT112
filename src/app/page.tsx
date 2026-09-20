import { ButtonLink } from "@/components/ui/button";
import { AutoPreview } from "@/components/home/AutoPreview";
import { BuildTimeline } from "@/components/home/BuildTimeline";

export default function Home() {
  return (
    <>
      <div className="relative flex min-h-[78vh] flex-col items-center justify-center py-16 text-center">
        <h1 className="relative z-10 max-w-2xl text-balance font-display text-4xl font-semibold leading-[1.06] sm:text-6xl">
          Describe any tool. Watch it get built.
        </h1>
        <p className="relative z-30 mt-6 max-w-[46ch] text-pretty text-sm leading-relaxed text-foreground/70 sm:text-base">
          Not a fixed set of templates. Say what you need and it becomes a working tool, then keep it
          private, share it, or install it on your phone or computer as its own app.
        </p>
        <ButtonLink href="/generate" variant="signal" size="lg" className="relative z-30 mt-9">
          Start building
        </ButtonLink>
      </div>

      <div className="mt-10 text-center">
        <h2 className="font-display text-2xl font-semibold">A tool appears as you make decisions.</h2>
        <div className="mt-8">
          <AutoPreview />
        </div>
      </div>

      <div className="mx-auto mt-32 max-w-5xl text-center">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">From a sentence to an app of your own.</h2>
        <div className="mt-16">
          <BuildTimeline />
        </div>
        <ButtonLink href="/community" variant="glass" className="mt-16">
          Explore community tools
        </ButtonLink>
      </div>
    </>
  );
}
