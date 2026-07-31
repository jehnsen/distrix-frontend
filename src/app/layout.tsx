import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { AppProviders } from "@/components/providers/app-providers";
import { ThemeBootScript } from "@/components/providers/theme-boot-script";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Distrix",
    template: "%s · Distrix",
  },
  description:
    "Distribution ERP for Philippine importer-distributors — orders, deliveries, receivables, landed cost and commissions.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-PH"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <head>
        <ThemeBootScript />
      </head>
      <body className="min-h-full bg-canvas text-ink">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
