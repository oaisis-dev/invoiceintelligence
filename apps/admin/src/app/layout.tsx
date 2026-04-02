import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Platform Admin | OAISIS",
    template: "%s | Admin",
  },
  description: "OAISIS platform administration dashboard",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-full font-sans antialiased`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
