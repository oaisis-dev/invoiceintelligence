import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import Providers from "./providers";
import "./globals.css";

const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    {
      path: "../assets/fonts/inter/Inter-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/inter/Inter-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/inter/Inter-600.ttf",
      weight: "600",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oaisis.ai"
  ),
  title: {
    default: "Invoice Intelligence | OAISIS",
    template: "%s | OAISIS",
  },
  description: "AI-powered invoice processing for the restaurant industry",
  applicationName: "Invoice Intelligence",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "Invoice Intelligence | OAISIS",
    description: "AI-powered invoice processing for the restaurant industry",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Invoice Intelligence | OAISIS",
    description: "AI-powered invoice processing for the restaurant industry",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1412" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Calling headers() opts this layout out of Next.js static caching,
  // ensuring process.env is read at request time (not build time).
  await headers();

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-full font-sans antialiased`}>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window.__APP_ENV__=${JSON.stringify(process.env.APP_ENV || "")};window.__RUNTIME_CONFIG__=${JSON.stringify({
              SUPABASE_URL: process.env.SUPABASE_URL || "",
              SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || "",
            })}`,
          }}
        />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
