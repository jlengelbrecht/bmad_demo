import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { XTERM_ERROR_FILTER_SCRIPT } from "@/components/xterm-error-filter";
import {
  ThemeProvider,
  THEME_INIT_SCRIPT,
} from "@/components/theme-provider";
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
  title: "BMAD Demo — Training Portal",
  description: "Local-only training portal teaching BMAD adoption to engineering teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // suppressHydrationWarning because the inline init script below
      // mutates `data-theme` on <html> before React hydrates; the
      // server-rendered markup deliberately doesn't include the
      // attribute, so React would otherwise warn about the mismatch.
      suppressHydrationWarning
    >
      <head>
        {/*
          No-flicker theme bootstrap — must run synchronously before any
          rendered content so `data-theme` is set on <html> before the
          first paint. See `THEME_INIT_SCRIPT` in theme-provider.tsx for
          the source.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/*
          xterm 5.x init-race suppression — must run BEFORE Next.js's
          dev runtime registers its error-overlay listener. Inline-head
          injection is the only reliable spot; loading it from the
          dynamic-imported terminal-pane module is too late. See
          XTERM_ERROR_FILTER_SCRIPT in terminal-pane.tsx for the source.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: XTERM_ERROR_FILTER_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
