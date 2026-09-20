"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/generate", label: "Generator" },
  { href: "/builder", label: "Builder" },
  { href: "/gallery", label: "Gallery" },
  { href: "/community", label: "Community" },
  { href: "/publish", label: "Publish" },
  { href: "/pricing", label: "Pricing" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function PillNav() {
  const pathname = usePathname();
  return (
    <nav
      className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/55 p-1 shadow-soft sm:flex"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            isActive(pathname, item.href)
              ? "bg-foreground text-background shadow-soft"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-1 overflow-x-auto rounded-full border border-border/80 bg-card/90 p-1 shadow-soft sm:hidden"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] ${
            isActive(pathname, item.href) ? "bg-foreground text-background" : "text-muted-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
