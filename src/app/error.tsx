"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <span className="font-mono text-[10px] uppercase text-destructive">Error</span>
      <h1 className="mt-3 text-2xl font-semibold">Something went wrong.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        That&rsquo;s on us, not you. Try again, or come back in a moment.
      </p>
      <Button variant="ink" size="lg" className="mt-8" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
