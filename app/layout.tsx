import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Splash from "@/components/Splash";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GymNado",
  description: "Training splits, sport-specific workouts, scheduling, and photo-based macro tracking.",
  // Installed on an iPhone home screen: open full screen with the app's name.
  appleWebApp: { capable: true, title: "GymNado", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#03045e" },
    { media: "(prefers-color-scheme: dark)", color: "#020524" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT may add the "dark" class before React loads.
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Splash />
        {/* Nav reads the URL; on request-time routes (e.g. /workout/[id]) that needs a Suspense boundary. */}
        <Suspense fallback={null}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
