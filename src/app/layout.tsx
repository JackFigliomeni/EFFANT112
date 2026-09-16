import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Small Software Workspace",
  description: "Build a small tool by prompt or by hand, and use it from a link on any device.",
};

const NAV_LINKS = [
  { href: "/gallery", label: "Gallery" },
  { href: "/generate", label: "Generate" },
  { href: "/builder", label: "Builder" },
  { href: "/tools/demo", label: "Phase 1 demo" },
  { href: "/login", label: "Sign in" },
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
            Small Software Workspace
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-black/60 dark:text-white/60">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:underline hover:text-black dark:hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
