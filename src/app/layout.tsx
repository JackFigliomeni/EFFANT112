import type { Metadata } from "next";
import { Suspense } from "react";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { AppShell } from "@/components/site/AppShell";
import { MarketingAuthActions } from "@/components/site/MarketingAuthActions";
import { SidebarAuth } from "@/components/site/SidebarAuth";
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
          <AppShell
            marketingActions={
              <Suspense fallback={<span className="w-16" />}>
                <MarketingAuthActions />
              </Suspense>
            }
            sidebarFooter={
              <Suspense fallback={<span className="w-16" />}>
                <SidebarAuth />
              </Suspense>
            }
          >
            {children}
          </AppShell>
        </div>
      </body>
    </html>
  );
}
