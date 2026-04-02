import { auth } from "@clerk/nextjs/server";

import Script from "next/script";
import { Outfit, DM_Serif_Display } from "next/font/google";
import { LandingPage } from "@/components/landing/landing-page";
import type { LandingPlan } from "@/components/landing/landing-page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oaisis.ai";

export const metadata: Metadata = {
  title: "Invoice Intelligence -- AI-Powered Invoice Platform for Restaurants",
  description:
    "AI-powered invoice processing for restaurants. Upload invoices, AI extracts every line item, validates math, exports bookkeeper-ready spreadsheets. $1Free for founding customers.",
  openGraph: {
    title:
      "Invoice Intelligence -- AI-Powered Invoice Platform for Restaurants",
    description:
      "AI-powered invoice processing for restaurants. Upload invoices, AI extracts every line item, validates math, exports bookkeeper-ready spreadsheets.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/images/ii-lockup-color.svg" }],
  },
  twitter: {
    card: "summary",
    title:
      "Invoice Intelligence -- AI-Powered Invoice Platform for Restaurants",
    description:
      "AI-powered invoice processing for restaurants. Upload invoices, AI extracts every line item, validates math, exports bookkeeper-ready spreadsheets.",
    images: ["/images/ii-lockup-color.svg"],
  },
};

async function fetchPlans(): Promise<LandingPlan[]> {
  try {
    const url = `${BASE_URL}/api/billing/plans`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const plans = (data.plans ?? []) as Array<{
      id: string;
      display_name: string;
      price_cents: number;
      features: unknown;
      monthly_invoice_limit: number;
      payment_price_id: string | null;
      workspace_type: string;
      tier: string;
    }>;
    // Return all non-enterprise plans for the landing page
    return plans
      .filter(
        (p) =>
          p.tier !== "enterprise"
      )
      .map((p) => ({
        id: p.id,
        display_name: p.display_name,
        price_cents: p.price_cents,
        features: Array.isArray(p.features) ? (p.features as string[]) : [],
        monthly_invoice_limit: p.monthly_invoice_limit,
        payment_price_id: p.payment_price_id,
      }));
  } catch {
    return [];
  }
}

export default async function RootPage() {
  const { userId } = await auth();

  const plans = await fetchPlans();

  return (
    <div className={`${outfit.variable} ${dmSerif.variable}`}>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Invoice Intelligence -- AI-Powered Invoice Platform for Restaurants",
            description:
              "AI-powered invoice processing for restaurants. Upload invoices, AI extracts every line item, validates math, exports bookkeeper-ready spreadsheets.",
            inLanguage: "en",
            publisher: {
              "@type": "Organization",
              name: "OAISIS",
            },
            about: {
              "@type": "SoftwareApplication",
              name: "Invoice Intelligence",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
            },
          }),
        }}
      />

      {/* Google Analytics - only on landing page */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-TTTSYYJJQS"
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-TTTSYYJJQS');
        `}
      </Script>

      <LandingPage plans={plans} isAuthenticated={!!userId} />
    </div>
  );
}
