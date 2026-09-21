import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-chrome mt-20 flex flex-col items-center gap-5 border-t border-border/70 pt-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">effant</p>
      <div className="flex gap-4" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-signal" />
        <span className="size-1.5 rounded-full bg-cool" />
        <span className="size-1.5 rounded-full bg-fresh" />
      </div>
      <div className="flex gap-5 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}
