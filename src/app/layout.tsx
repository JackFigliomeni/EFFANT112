import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { AuthNavStatus } from "@/components/AuthNavStatus";
import { AmbientBackground } from "@/components/site/AmbientBackground";
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
            <header className="flex items-center gap-4 py-5">
              <Link
                href="/"
                className="mr-auto font-mono text-xs font-semibold uppercase"
                aria-label="effant home"
              >
                effant
              </Link>
              <PillNav />
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
