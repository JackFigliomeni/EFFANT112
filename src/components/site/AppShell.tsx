"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/LogoMark";
import { SiteFooter } from "@/components/site/SiteFooter";

export const NAV_ITEMS = [
  { href: "/generate", label: "Generator" },
  { href: "/builder", label: "Builder" },
  { href: "/gallery", label: "Gallery" },
  { href: "/community", label: "Community" },
  { href: "/publish", label: "Publish" },
  { href: "/pricing", label: "Pricing" },
  { href: "/settings", label: "Settings" },
];

// The marketing homepage and the auth flow keep their own minimal chrome —
// no nav reaches out from them. Every other page gets the app sidebar.
const BARE_ROUTES = new Set(["/", "/login", "/reset-password", "/update-password"]);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
            isActive(pathname, item.href)
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function BrandLink({ href, onClick }: { href: string; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase"
      aria-label="effant home"
    >
      <LogoMark className="h-6 w-auto" />
      effant
    </Link>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function AppShell({
  children,
  marketingActions,
  sidebarFooter,
}: {
  children: ReactNode;
  // Signed-in/out actions for the bare marketing header (Sign in / Sign up).
  marketingActions: ReactNode;
  // Settings + account row pinned under the sidebar nav (and mirrored in the mobile drawer).
  sidebarFooter: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (BARE_ROUTES.has(pathname)) {
    return (
      <div className="relative z-10 mx-auto max-w-[90rem] px-4 pb-16 sm:px-7">
        <header className="site-chrome flex items-center justify-between gap-4 py-5">
          <BrandLink href="/" />
          {marketingActions}
        </header>
        <main>{children}</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex max-w-[90rem]">
      <aside className="site-chrome sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-8 border-r border-border/70 px-4 py-6 sm:flex">
        <BrandLink href="/" />
        <div className="flex-1">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-border/70 pt-3">{sidebarFooter}</div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="site-chrome flex items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:hidden">
          <BrandLink href="/" />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex size-9 items-center justify-center rounded-full border border-border/70 text-foreground"
          >
            <MenuIcon />
          </button>
        </div>

        <div className="px-4 pb-16 pt-6 sm:px-7">
          <main>{children}</main>
          <SiteFooter />
        </div>
      </div>

      {drawerOpen && (
        <div className="site-chrome fixed inset-0 z-[100] sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col gap-8 bg-card px-4 py-6 shadow-soft">
            <div className="flex items-center justify-between">
              <BrandLink href="/" onClick={() => setDrawerOpen(false)} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex size-8 items-center justify-center rounded-full border border-border/70 text-foreground"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1">
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="border-t border-border/70 pt-3">{sidebarFooter}</div>
          </div>
        </div>
      )}
    </div>
  );
}
