import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { AuthNavStatus } from "@/components/AuthNavStatus";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { LogoMark } from "@/components/brand/LogoMark";
import { MobileNav, PillNav } from "@/components/site/PillNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "effant",
  description: "Describe any tool and it gets built. Keep it private, share it, or install it as its own app.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="relative min-h-screen overflow-x-clip bg-background text-foreground selection:bg-signal/20">
          <AmbientBackground />
          <div className="relative z-10 mx-auto max-w-[90rem] px-4 pb-24 sm:px-7 sm:pb-16">
            {/* relative + absolutely-centered nav: with only `mr-auto` on the
                logo, the nav's position was just "whatever's left after the
                auth block on the right" — a long email pushed it one way,
                "Sign in" the other. A `1fr`-column grid still has this
                problem (a track's content-based min-width beats an even fr
                share unless every track is `minmax(0,1fr)`, and even then
                the wider side's content can spill toward center). Centering
                the nav via `left-1/2` instead makes it exact and truly
                independent of both sides' width. */}
            <header className="site-chrome relative flex items-center justify-between gap-4 py-5">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-mono text-xs font-semibold uppercase"
                aria-label="effant home"
              >
                <LogoMark className="h-6 w-auto" />
                effant
              </Link>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <PillNav />
              </div>
              <Suspense fallback={<span className="w-16" />}>
                <AuthNavStatus />
              </Suspense>
            </header>
            <main>{children}</main>
            <SiteFooter />
          </div>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
