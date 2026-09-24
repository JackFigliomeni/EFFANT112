import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <span className="font-mono text-[10px] uppercase text-signal">404</span>
      <h1 className="mt-3 text-2xl font-semibold">This page doesn&rsquo;t exist.</h1>
      <p className="mt-3 text-sm text-muted-foreground">The link might be broken, or the page may have moved.</p>
      <ButtonLink href="/" variant="ink" size="lg" className="mt-8">
        Back to effant
      </ButtonLink>
    </div>
  );
}
