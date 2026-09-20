import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthNavStatus } from "@/components/AuthNavStatus";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "effant",
  description: "Build a small tool by prompt or by hand, and use it from a link on any device.",
};

const NAV_LINKS = [
  { href: "/community", label: "Community" },
  { href: "/gallery", label: "Gallery" },
  { href: "/generate", label: "Generate" },
  { href: "/builder", label: "Builder" },
  { href: "/publish", label: "Publish" },
  { href: "/pricing", label: "Pricing" },
  { href: "/settings", label: "Settings" },
  { href: "/tools/demo", label: "Phase 1 demo" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex flex-wrap items-center gap-4 border-b border-black/10 px-6 py-3 dark:border-white/10">
          <Link href="/" className="text-sm font-semibold">
            effant
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-black/60 dark:text-white/60">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:underline hover:text-black dark:hover:text-white">
                {link.label}
              </Link>
            ))}
            <Suspense fallback={<span className="opacity-0">Sign in</span>}>
              <AuthNavStatus />
            </Suspense>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="flex justify-center gap-4 border-t border-black/10 px-6 py-4 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </footer>
      </body>
    </html>
  );
}
