"use client";

import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { EnvironmentBadge } from "@/components/beta-badge";
import "@/styles/landing.css";

/* Global functions defined in /scripts/landing.js */
declare global {
  interface Window {
    toggleFaq: (btn: HTMLElement) => void;
    openModal: (id: string) => void;
    closeModal: (id: string) => void;
    submitContact: () => void;
    startCheckout: (tier?: string) => void;
    trackEvent: (event: string, params?: Record<string, unknown>) => void;
  }
}

export interface LandingPlan {
  id: string;
  display_name: string;
  price_cents: number;
  features: string[];
  monthly_invoice_limit: number;
  payment_price_id: string | null;
}

interface LandingPageProps {
  plans: LandingPlan[];
  isAuthenticated?: boolean;
}

export function LandingPage({ plans: _plans, isAuthenticated = false }: LandingPageProps) {
  useEffect(() => {
    window.dispatchEvent(new Event("landing:init"));
  }, []);

  return (
    <div className="landing-page text-gray-800" style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}>

      <div className="ambient-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="orb orb-4"></div>
      </div>

      {/* NAVBAR */}
      <nav id="navbar" className="nav-glass fixed top-0 left-0 right-0 z-50 w-full max-w-[100vw]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between min-w-0 w-full">
          <a href="#" className="flex items-center gap-3 min-w-0 shrink">
            <img src="/images/ii-lockup-color.svg" alt="Invoice Intelligence" className="h-10 sm:h-12 w-auto max-h-12" />
            <EnvironmentBadge className="border-[#27653D]/20 bg-white/75 text-[#27653D]" />
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors">FAQ</a>
            {isAuthenticated ? (
              <Link href="/home" className="btn-brand text-sm !py-2.5 !px-6 !rounded-xl" data-gtag-event="cta_click" data-gtag-label="go_to_dashboard" data-gtag-location="nav">Go to Dashboard</Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-brand-700 transition-colors">Login</Link>
                <a href="#cta" className="btn-brand text-sm !py-2.5 !px-6 !rounded-xl" data-gtag-event="cta_click" data-gtag-label="get_started" data-gtag-location="nav" data-gtag-target="#pricing">Get Started</a>
              </>
            )}
          </div>
          <button id="menuBtn" className="hamburger md:hidden flex flex-col gap-[5px] p-2 shrink-0" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
        <div id="mobileMenu" className="hidden md:hidden px-6 pb-5">
          <div className="glass-subtle p-4 flex flex-col gap-3">
            <a href="#features" className="text-sm font-medium text-gray-600 py-2 mobile-link">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 py-2 mobile-link">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 py-2 mobile-link">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 py-2 mobile-link">FAQ</a>
            {isAuthenticated ? (
              <Link href="/home" className="btn-brand text-sm text-center !py-2.5 mt-1" data-gtag-event="cta_click" data-gtag-label="go_to_dashboard" data-gtag-location="mobile_menu">Go to Dashboard</Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-medium text-gray-600 py-2 mobile-link">Login</Link>
                <a href="#cta" className="btn-brand text-sm text-center !py-2.5 mt-1" data-gtag-event="cta_click" data-gtag-label="get_started" data-gtag-location="mobile_menu" data-gtag-target="#pricing">Get Started</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="reveal">
              <div className="glass-subtle inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-semibold text-brand-700 tracking-wide uppercase">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Built Exclusively for Restaurants
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.12] tracking-tight text-gray-900 mb-6">
                Stop paying people to type.<br /><span className="gradient-text">AI invoice processing in minutes.</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg font-light">
                Upload your invoices. AI extracts every line item, validates the math, and exports bookkeeper-ready spreadsheets. Done.
              </p>
              <div className="flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link href="/home" className="btn-brand" data-gtag-event="cta_click" data-gtag-label="go_to_dashboard" data-gtag-location="hero">Go to Dashboard</Link>
                ) : (
                  <>
                    <button onClick={() => window.startCheckout('free')} className="btn-brand" data-gtag-event="cta_click" data-gtag-label="start_free" data-gtag-location="hero">Start Free</button>
                    <button onClick={() => window.startCheckout('pro')} className="btn-glass" data-gtag-event="cta_click" data-gtag-label="start_business" data-gtag-location="hero">Start Business {"\u2014"} $100/mo</button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>10-Hour Promise guarantee</span>
                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Setup in 5 min</span>
                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Cancel anytime</span>
              </div>
            </div>

            {/* Dashboard mock */}
            <div className="reveal reveal-delay-2 relative">
              <div className="absolute -inset-8 rounded-3xl bg-gradient-to-br from-brand-200/30 via-brand-300/20 to-transparent blur-2xl"></div>
              <div className="glass-heavy p-5 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400/70"></div><div className="w-3 h-3 rounded-full bg-yellow-400/70"></div><div className="w-3 h-3 rounded-full bg-green-400/70"></div></div>
                  <span className="text-[11px] text-gray-600 font-medium">Invoice Intelligence Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="glass-subtle p-3 text-center"><div className="text-[11px] text-gray-600 mb-1">Monthly COGS</div><div className="text-lg font-bold text-gray-800">$42,847</div><div className="text-[10px] text-green-700 font-semibold">{"\u2193"} 4.2%</div></div>
                  <div className="glass-subtle p-3 text-center"><div className="text-[11px] text-gray-600 mb-1">Invoices</div><div className="text-lg font-bold text-gray-800">1,284</div><div className="text-[10px] text-brand-700 font-semibold">Processed</div></div>
                  <div className="glass-subtle p-3 text-center"><div className="text-[11px] text-gray-600 mb-1">Errors Caught</div><div className="text-lg font-bold text-gray-800">3</div><div className="text-[10px] text-amber-700 font-semibold">Flagged</div></div>
                </div>
                <div className="glass-subtle p-3 mb-4">
                  <div className="flex items-center justify-between mb-2"><span className="text-[11px] text-gray-600 font-medium">COGS Trend {"\u2014"} 6 Months</span><span className="text-[10px] text-brand-700 font-semibold glass-subtle px-2 py-0.5 rounded-full">Food 32%</span></div>
                  <svg viewBox="0 0 300 60" className="w-full h-12"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(39,101,61,0.20)" /><stop offset="100%" stopColor="rgba(39,101,61,0)" /></linearGradient></defs><path d="M0,45 Q30,40 60,38 T120,32 T180,28 T240,18 T300,22" fill="none" stroke="#27653D" strokeWidth="2" strokeLinecap="round" /><path d="M0,45 Q30,40 60,38 T120,32 T180,28 T240,18 T300,22 V60 H0 Z" fill="url(#cg)" /></svg>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] text-gray-600 font-medium mb-1">Recent Invoices</div>
                  <div className="glass-subtle flex items-center justify-between p-2.5 rounded-xl mock-row" style={{ animationDelay: "0.1s" }}>
                    <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">SF</div><div><div className="text-xs font-medium text-gray-700">Sysco Foods</div><div className="text-[10px] text-gray-600">Feb 22, 2026</div></div></div>
                    <div className="text-xs font-semibold text-gray-700">$3,247.80</div>
                  </div>
                  <div className="glass-subtle flex items-center justify-between p-2.5 rounded-xl mock-row" style={{ animationDelay: "0.2s" }}>
                    <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-700">PF</div><div><div className="text-xs font-medium text-gray-700">Pacific Fresh</div><div className="text-[10px] text-gray-600">Feb 21, 2026</div></div></div>
                    <div className="text-xs font-semibold text-gray-700">$1,856.20</div>
                  </div>
                  <div className="glass-subtle flex items-center justify-between p-2.5 rounded-xl mock-row" style={{ animationDelay: "0.3s" }}>
                    <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">VW</div><div><div className="text-xs font-medium text-gray-700">Valley Wine Co.</div><div className="text-[10px] text-gray-600">Feb 20, 2026</div></div></div>
                    <div className="text-xs font-semibold text-gray-700">$892.40</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE 10-HOUR PROMISE */}
      <section className="relative z-10 pb-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="reveal glass-subtle py-6 px-8 flex flex-col items-center gap-4">
            <span className="text-xs font-semibold text-brand-700 tracking-widest uppercase">The 10-Hour Promise</span>
            <p className="text-sm text-gray-700 text-center font-light max-w-xl">If you don&apos;t save at least 10 hours of AP labor in your first 30 days, we&apos;ll refund your first month. No questions. Keep all your exports.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 py-20 lg:py-28">
        <div className="section-orb w-72 h-72 bg-brand-200/15 top-20 -left-36" style={{ position: "absolute", filter: "blur(80px)" }}></div>
        <div className="section-orb w-56 h-56 bg-green-200/10 bottom-10 -right-28" style={{ position: "absolute", filter: "blur(70px)" }}></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16 reveal">
            <span className="glass-subtle inline-block px-4 py-1.5 text-xs font-semibold text-brand-700 tracking-widest uppercase mb-4">Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">Everything you need,<br /><span className="gradient-text">nothing you don&apos;t</span></h2>
            <p className="text-gray-600 max-w-xl mx-auto font-light">Purpose-built tools that replace spreadsheets, shoeboxes, and guesswork with clarity.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="glass-card p-7 reveal reveal-delay-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" strokeWidth="1.5" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Capture</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">Snap a photo or upload a PDF. Our AI reads every line item in seconds {"\u2014"} vendor, quantities, prices, totals.</p>
            </div>
            <div className="glass-card p-7 reveal reveal-delay-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Line-Item Extraction</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">Every line item pulled from every invoice {"\u2014"} item names, quantities, unit prices, totals. No manual entry.</p>
            </div>
            <div className="glass-card p-7 reveal reveal-delay-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Math Validation</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">AI cross-checks every total, extension, and tax calculation. Catches errors before you pay the wrong amount.</p>
            </div>
            <div className="glass-card p-7 reveal reveal-delay-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export-Ready Output</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">One click to download a clean, bookkeeper-ready XLSX. Hand it to your AP team or accountant as-is.</p>
            </div>
            <div className="glass-card p-7 reveal reveal-delay-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon: Email Ingestion</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">Forward supplier invoices to your dedicated inbox. Auto-processed, no uploading required. Coming Q2 2026.</p>
            </div>
            <div className="glass-card p-7 reveal reveal-delay-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon: QuickBooks & Xero</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">Direct integration with your accounting software. Push validated invoices straight to your books. Coming Q2 2026.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <span className="glass-subtle inline-block px-4 py-1.5 text-xs font-semibold text-brand-700 tracking-widest uppercase mb-4">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">Three steps to <span className="gradient-text">total clarity</span></h2>
            <p className="text-gray-600 max-w-lg mx-auto font-light">From paper invoice to actionable insight in under sixty seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-8 text-center reveal reveal-delay-1 relative overflow-hidden">
              <div className="absolute top-4 right-5 text-6xl font-bold text-brand-700/[0.06] leading-none">01</div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200/60 flex items-center justify-center mx-auto mb-5 float-gentle"><svg className="w-7 h-7 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload</h3>
              <p className="text-sm text-gray-600 font-light leading-relaxed">Snap a photo or drag-and-drop a PDF. Any invoice format from any supplier works.</p>
            </div>
            <div className="glass-card p-8 text-center reveal reveal-delay-2 relative overflow-hidden">
              <div className="absolute top-4 right-5 text-6xl font-bold text-brand-700/[0.06] leading-none">02</div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200/60 flex items-center justify-center mx-auto mb-5 float-gentle-2"><svg className="w-7 h-7 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Extracts</h3>
              <p className="text-sm text-gray-600 font-light leading-relaxed">Our AI reads every line item, matches it to your categories, and flags anything unusual.</p>
            </div>
            <div className="glass-card p-8 text-center reveal reveal-delay-3 relative overflow-hidden">
              <div className="absolute top-4 right-5 text-6xl font-bold text-brand-700/[0.06] leading-none">03</div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200/60 flex items-center justify-center mx-auto mb-5 float-gentle"><svg className="w-7 h-7 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export & Use</h3>
              <p className="text-sm text-gray-600 font-light leading-relaxed">Download a bookkeeper-ready XLSX with every line item validated. Hand it to your AP team or accountant as-is.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="glass-dark shine py-12 px-8 reveal relative overflow-hidden">
            <div className="absolute w-48 h-48 rounded-full bg-brand-400/10 -top-10 -left-10 blur-3xl"></div>
            <div className="absolute w-36 h-36 rounded-full bg-green-400/10 bottom-0 right-10 blur-3xl"></div>
            <div className="text-center relative z-10">
              <div className="text-xs text-white/80 font-semibold tracking-widest uppercase mb-6">What You&apos;re Recovering</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-8">
                <div><div className="text-3xl md:text-4xl font-bold text-white stat-glow mb-1">$2,000</div><div className="text-xs text-white/90 font-medium tracking-wide uppercase">AP Labor Saved/Mo</div></div>
                <div><div className="text-3xl md:text-4xl font-bold text-white stat-glow mb-1">$200</div><div className="text-xs text-white/90 font-medium tracking-wide uppercase">Errors Caught/Mo</div></div>
                <div><div className="text-3xl md:text-4xl font-bold text-white stat-glow mb-1">$150</div><div className="text-xs text-white/90 font-medium tracking-wide uppercase">Late Fees Avoided</div></div>
                <div><div className="text-3xl md:text-4xl font-bold text-white stat-glow mb-1">{"< 60s"}</div><div className="text-xs text-white/90 font-medium tracking-wide uppercase">Per Invoice</div></div>
              </div>
              <div className="text-lg text-white/95 font-light">All of this for <span className="font-bold text-white">$100/month</span> {"\u2014"} a <span className="font-bold text-white">19x return</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDING CUSTOMERS + LEAD MAGNET */}
      <section className="relative z-10 py-20 lg:py-28">
        <div className="section-orb w-64 h-64 bg-brand-200/12 top-0 right-0" style={{ position: "absolute", filter: "blur(80px)" }}></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16 reveal">
            <span className="glass-subtle inline-block px-4 py-1.5 text-xs font-semibold text-brand-700 tracking-widest uppercase mb-4">Early Access</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">Currently onboarding our first <span className="gradient-text">founding customers</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="glass-card p-6 reveal reveal-delay-1 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Want to be one of 20?</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light mb-5">Founding customers get $100/month pricing locked for life, direct access to our team, and input on the product roadmap.</p>
              {isAuthenticated ? (
                <Link href="/home" className="btn-brand text-sm !py-2.5 !px-6" data-gtag-event="cta_click" data-gtag-label="go_to_dashboard" data-gtag-location="founding_customers">Go to Dashboard</Link>
              ) : (
                <button onClick={() => window.startCheckout()} className="btn-brand text-sm !py-2.5 !px-6" data-gtag-event="cta_click" data-gtag-label="start_now" data-gtag-location="founding_customers">Start Now {"\u2014"} $100/mo</button>
              )}
            </div>
            <div className="glass-card p-6 reveal reveal-delay-2 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Invoice Error Audit</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light mb-5">Send us 10 invoices. We&apos;ll process them free and show you exactly what we find {"\u2014"} errors, missing data, pricing anomalies.</p>
              <a href="#cta" className="btn-glass text-sm !py-2.5 !px-6" data-gtag-event="cta_click" data-gtag-label="free_audit" data-gtag-location="lead_magnet" data-gtag-target="#cta">Send Your Invoices</a>
            </div>
            <div className="glass-card p-6 reveal reveal-delay-3 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200/50 flex items-center justify-center mb-5"><svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Risk, No Commitment</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light mb-5">No credit card required. No contract. Cancel anytime. And if you don&apos;t save 10 hours in 30 days, your first month is refunded.</p>
              <a href="#cta" className="btn-glass text-sm !py-2.5 !px-6" data-gtag-event="cta_click" data-gtag-label="get_started" data-gtag-location="no_risk" data-gtag-target="#pricing">Get Started</a>
            </div>
          </div>
        </div>
      </section>

      {/* BUILT FOR */}
      <section className="relative z-10 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <span className="glass-subtle inline-block px-4 py-1.5 text-xs font-semibold text-brand-700 tracking-widest uppercase mb-4">Who It&apos;s For</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">Built for every <span className="gradient-text">kind of kitchen</span></h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card p-6 text-center reveal reveal-delay-1"><div className="text-3xl mb-3">&#x1F957;</div><h3 className="text-base font-semibold text-gray-900 mb-1">Fast Casual</h3><p className="text-xs text-gray-600 font-light">High volume, tight margins. Track every cent across your supply chain.</p></div>
            <div className="glass-card p-6 text-center reveal reveal-delay-2"><div className="text-3xl mb-3">&#x1F377;</div><h3 className="text-base font-semibold text-gray-900 mb-1">Fine Dining</h3><p className="text-xs text-gray-600 font-light">Premium ingredients, premium insight. Know your per-plate cost in real time.</p></div>
            <div className="glass-card p-6 text-center reveal reveal-delay-3"><div className="text-3xl mb-3">&#x1F3E2;</div><h3 className="text-base font-semibold text-gray-900 mb-1">Multi-Unit</h3><p className="text-xs text-gray-600 font-light">Consolidated view across all locations. Compare, benchmark, optimize.</p></div>
            <div className="glass-card p-6 text-center reveal reveal-delay-4"><div className="text-3xl mb-3">&#x2615;</div><h3 className="text-base font-semibold text-gray-900 mb-1">Caf&eacute;s & Bakeries</h3><p className="text-xs text-gray-600 font-light">Simple enough for a single location. Powerful enough to scale.</p></div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 py-20 lg:py-28">
        <div className="section-orb w-80 h-80 bg-brand-200/12 -top-20 left-1/2 -translate-x-1/2" style={{ position: "absolute", filter: "blur(100px)" }}></div>
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="text-center mb-12 reveal">
            <span className="glass-subtle inline-block px-4 py-1.5 text-xs font-semibold text-brand-700 tracking-widest uppercase mb-4">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">Start free. <span className="gradient-text">Upgrade when ready.</span></h2>
            <p className="text-gray-600 max-w-md mx-auto font-light">No credit card required. Try Invoice Intelligence with 10 invoices per month, free forever.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 items-start max-w-3xl mx-auto">
            {/* Free Plan */}
            <div className="glass-card p-7 reveal reveal-delay-1">
              <div className="glass-subtle inline-block px-3 py-1 text-[10px] font-bold text-gray-600 tracking-widest uppercase rounded-full mb-3">Free</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Get Started</h3>
              <p className="text-xs text-gray-600 mb-4 font-light">Perfect for trying Invoice Intelligence</p>
              <div className="flex items-baseline gap-1 mb-6"><span className="text-4xl font-bold text-gray-900">$0</span><span className="text-sm text-gray-600">/month</span></div>
              {isAuthenticated ? (
                <Link href="/home" className="btn-glass block w-full text-center text-sm !py-3 mb-6" data-gtag-event="cta_click" data-gtag-label="go_to_dashboard" data-gtag-location="pricing_free">Go to Dashboard</Link>
              ) : (
                <button onClick={() => window.startCheckout('free')} className="btn-glass block w-full text-center text-sm !py-3 mb-6" data-gtag-event="cta_click" data-gtag-label="start_free" data-gtag-location="pricing_free">Start Free</button>
              )}
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>10 invoices per month</li>
                <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Up to 2 users</li>
                <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>AI extraction + math validation</li>
                <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Web upload</li>
                <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Excel export</li>
              </ul>
            </div>
            {/* Business Plan — Founding Customer Offer */}
            <div className="relative reveal reveal-delay-2">
              <div className="absolute -inset-[1px] rounded-[21px] bg-gradient-to-b from-brand-400/50 to-brand-700/50 blur-[1px]"></div>
              <div className="glass-heavy p-7 relative" style={{ borderColor: "rgba(39,101,61,0.25)" }}>
                <div className="glass-subtle inline-block px-3 py-1 text-[10px] font-bold text-brand-700 tracking-widest uppercase rounded-full mb-3">Founding Customer</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Business</h3>
                <p className="text-xs text-gray-600 mb-4 font-light">Locked for life {"\u2014"} this rate never increases</p>
                <div className="flex items-baseline gap-1 mb-2"><span className="text-4xl font-bold text-gray-900">$100</span><span className="text-sm text-gray-600">/month</span></div>
                <p className="text-xs text-brand-700 font-semibold mb-6">First 20 founding customers only {"\u2014"} <span id="spotsRemaining">17</span> spots remaining</p>
                {isAuthenticated ? (
                  <Link href="/home" className="btn-brand block w-full text-center text-sm !py-3 mb-3" data-gtag-event="cta_click" data-gtag-label="go_to_dashboard" data-gtag-location="pricing_business">Go to Dashboard</Link>
                ) : (
                  <button onClick={() => window.startCheckout('pro')} className="btn-brand block w-full text-center text-sm !py-3 mb-3" data-gtag-event="cta_click" data-gtag-label="start_business" data-gtag-location="pricing_business">Start Now {"\u2014"} $100/month</button>
                )}
                <a href="#cta" className="btn-glass block text-center text-sm !py-2.5 mb-6" data-gtag-event="cta_click" data-gtag-label="book_demo_first" data-gtag-location="pricing_business" data-gtag-target="#cta">Book a Demo First</a>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Unlimited invoices</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Unlimited users</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>AI extraction + math validation</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Bookkeeper-ready XLSX export</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Direct access to our team</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-600"><svg className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>No setup fee {"\u00B7"} No contract</li>
                </ul>
              </div>
            </div>
          </div>
          {/* Guarantee row */}
          <div className="max-w-3xl mx-auto mt-6 reveal reveal-delay-3">
            <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">The 10-Hour Promise</h3>
                <p className="text-sm text-gray-600 font-light">If you don&apos;t save at least 10 hours of AP labor in your first 30 days on Business, we&apos;ll refund your first month. No questions asked.</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600 shrink-0">
                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Cancel anytime</span>
                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Export anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 py-20 lg:py-28">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12 reveal">
            <span className="glass-subtle inline-block px-4 py-1.5 text-xs font-semibold text-brand-700 tracking-widest uppercase mb-4">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Common <span className="gradient-text">questions</span></h2>
          </div>
          <div className="space-y-3 reveal reveal-delay-1">
            <div className="glass-card overflow-hidden faq-item">
              <button className="faq-btn w-full flex items-center justify-between p-5 text-left" onClick={(e: React.MouseEvent<HTMLButtonElement>) => window.toggleFaq(e.currentTarget)}><span className="text-sm font-semibold text-gray-800">How long does setup take?</span><svg className="faq-chevron w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></button>
              <div className="faq-answer text-sm text-gray-600 font-light leading-relaxed">Most restaurants are up and running in under 5 minutes. Create your account, upload your first invoice, and see the AI extract every line item immediately.</div>
            </div>
            <div className="glass-card overflow-hidden faq-item">
              <button className="faq-btn w-full flex items-center justify-between p-5 text-left" onClick={(e: React.MouseEvent<HTMLButtonElement>) => window.toggleFaq(e.currentTarget)}><span className="text-sm font-semibold text-gray-800">What invoice formats do you support?</span><svg className="faq-chevron w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></button>
              <div className="faq-answer text-sm text-gray-600 font-light leading-relaxed">PDF, JPEG, PNG, email attachments, and even handwritten invoices. Our AI handles virtually any format your suppliers send.</div>
            </div>
            <div className="glass-card overflow-hidden faq-item">
              <button className="faq-btn w-full flex items-center justify-between p-5 text-left" onClick={(e: React.MouseEvent<HTMLButtonElement>) => window.toggleFaq(e.currentTarget)}><span className="text-sm font-semibold text-gray-800">Is my financial data secure?</span><svg className="faq-chevron w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></button>
              <div className="faq-answer text-sm text-gray-600 font-light leading-relaxed">Absolutely. We use 256-bit encryption for all data in transit and at rest, and your data is never shared or used to train models. Your invoices are processed in isolated environments and access is strictly limited.</div>
            </div>
            <div className="glass-card overflow-hidden faq-item">
              <button className="faq-btn w-full flex items-center justify-between p-5 text-left" onClick={(e: React.MouseEvent<HTMLButtonElement>) => window.toggleFaq(e.currentTarget)}><span className="text-sm font-semibold text-gray-800">Which accounting software do you integrate with?</span><svg className="faq-chevron w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></button>
              <div className="faq-answer text-sm text-gray-600 font-light leading-relaxed">Today, Invoice Intelligence exports bookkeeper-ready XLSX files that your accountant or AP team can use directly. QuickBooks and Xero direct integrations are coming in Q2 2026.</div>
            </div>
            <div className="glass-card overflow-hidden faq-item">
              <button className="faq-btn w-full flex items-center justify-between p-5 text-left" onClick={(e: React.MouseEvent<HTMLButtonElement>) => window.toggleFaq(e.currentTarget)}><span className="text-sm font-semibold text-gray-800">Can I cancel anytime?</span><svg className="faq-chevron w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></button>
              <div className="faq-answer text-sm text-gray-600 font-light leading-relaxed">Yes, no contracts and no cancellation fees. You can export all your data at any time.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative z-10 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass-heavy p-10 sm:p-14 text-center reveal relative overflow-hidden">
            <div className="absolute w-40 h-40 rounded-full bg-brand-200/20 -top-10 -right-10 blur-2xl"></div>
            <div className="absolute w-32 h-32 rounded-full bg-green-200/15 bottom-0 -left-8 blur-2xl"></div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4 relative z-10">Ready to stop paying people <span className="gradient-text">to type?</span></h2>
            <p className="text-gray-600 max-w-lg mx-auto mb-8 font-light relative z-10">Start free with 10 invoices per month. Ready for more? Founding customers get unlimited invoices at $100/month {"\u2014"} locked for life.</p>
            <div className="flex flex-wrap justify-center gap-4 relative z-10">
              {isAuthenticated ? (
                <Link href="/home" className="btn-brand text-base !px-10" data-gtag-event="cta_click" data-gtag-label="go_to_dashboard" data-gtag-location="cta_section">Go to Dashboard</Link>
              ) : (
                <>
                  <button onClick={() => window.startCheckout('free')} className="btn-brand text-base !px-10" data-gtag-event="cta_click" data-gtag-label="start_free" data-gtag-location="cta_section">Start Free</button>
                  <button onClick={() => window.startCheckout('pro')} className="btn-glass text-base !px-8" data-gtag-event="cta_click" data-gtag-label="start_business" data-gtag-location="cta_section">Start Business {"\u2014"} $100/mo</button>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 mt-8 relative z-10">
              <span className="text-xs text-gray-600 font-medium">No credit card for free plan. Founding customer pricing locked for life. Cancel anytime.</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="glass py-10 px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
              <div><img src="/images/ii-lockup-color.svg" alt="Invoice Intelligence" className="h-10 mb-4" /><p className="text-xs text-gray-600 leading-relaxed font-light">AI-powered invoice management built exclusively for the restaurant industry.</p></div>
              <div><h4 className="text-xs font-semibold text-gray-700 tracking-widest uppercase mb-3">Product</h4><ul className="space-y-2"><li><a href="#features" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light">Features</a></li><li><a href="#how-it-works" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light">How It Works</a></li><li><a href="#pricing" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light">Pricing</a></li><li><a href="#faq" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light">FAQ</a></li></ul></div>
              <div><h4 className="text-xs font-semibold text-gray-700 tracking-widest uppercase mb-3">Company</h4><ul className="space-y-2"><li><a href="#" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light">About</a></li><li><a href="#" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light" onClick={(e: React.MouseEvent) => { e.preventDefault(); window.openModal("contactModal"); }} data-gtag-event="cta_click" data-gtag-label="contact" data-gtag-location="footer" data-gtag-target="contactModal">Contact</a></li></ul></div>
              <div><h4 className="text-xs font-semibold text-gray-700 tracking-widest uppercase mb-3">Legal</h4><ul className="space-y-2"><li><a href="#" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light" onClick={(e: React.MouseEvent) => { e.preventDefault(); window.openModal("privacyModal"); }}>Privacy Policy</a></li><li><a href="#" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light" onClick={(e: React.MouseEvent) => { e.preventDefault(); window.openModal("termsModal"); }}>Terms of Service</a></li><li><a href="#" className="text-xs text-gray-600 hover:text-brand-700 transition-colors font-light" onClick={(e: React.MouseEvent) => { e.preventDefault(); window.openModal("a11yModal"); }}>Accessibility</a></li></ul></div>
            </div>
            <div className="border-t border-white/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-600 font-light">{"\u00A9"} 2026 Invoice Intelligence. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <a href="#" className="w-8 h-8 rounded-full glass-subtle flex items-center justify-center text-gray-600 hover:text-brand-700 transition-colors" aria-label="Twitter"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
                <a href="#" className="w-8 h-8 rounded-full glass-subtle flex items-center justify-center text-gray-600 hover:text-brand-700 transition-colors" aria-label="LinkedIn"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== MODALS ===== */}

      {/* Privacy Policy Modal */}
      <div id="privacyModal" className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacyTitle">
        <div className="modal-panel p-8 sm:p-10">
          <button className="modal-close" onClick={() => window.closeModal("privacyModal")} aria-label="Close dialog">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 id="privacyTitle" className="text-xl font-bold text-gray-900 mb-1 pr-10">Privacy Policy</h2>
          <p className="text-xs text-gray-600 mb-6">Last updated: February 28, 2026</p>
          <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">1. Information We Collect</h3>
              <p>We collect information you provide directly, including your name, email address, business name, and invoice data uploaded to our platform. We also collect usage data such as log files, device identifiers, and interaction patterns to improve our services.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">2. How We Use Your Information</h3>
              <p>Your information is used to operate and improve Invoice Intelligence, process and categorize invoices, generate cost reports, communicate with you about your account, and send transactional notifications. We do not sell your personal data to third parties.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">3. Data Security</h3>
              <p>We implement industry-standard security measures including 256-bit TLS encryption in transit and AES-256 encryption at rest. Access to customer data is restricted to authorized personnel on a need-to-know basis.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">4. Data Retention</h3>
              <p>We retain your data for the duration of your active subscription. Upon account cancellation, your data is securely deleted within 90 days unless you request an earlier deletion or a data export prior to termination.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">5. Third-Party Services</h3>
              <p>We may share data with trusted third-party service providers who assist in operating our platform (e.g., cloud hosting, analytics). All third parties are contractually obligated to handle your data in accordance with this policy.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">6. Your Rights</h3>
              <p>You have the right to access, correct, or delete your personal data at any time. You may also request a portable copy of your data. To exercise any of these rights, contact us at privacy@openoaisis.com.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">7. Changes to This Policy</h3>
              <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or through a notice on our platform. Continued use of Invoice Intelligence after changes constitutes acceptance of the updated policy.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms of Service Modal */}
      <div id="termsModal" className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="termsTitle">
        <div className="modal-panel p-8 sm:p-10">
          <button className="modal-close" onClick={() => window.closeModal("termsModal")} aria-label="Close dialog">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 id="termsTitle" className="text-xl font-bold text-gray-900 mb-1 pr-10">Terms of Service</h2>
          <p className="text-xs text-gray-600 mb-6">Last updated: February 28, 2026</p>
          <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">1. Acceptance of Terms</h3>
              <p>By accessing or using Invoice Intelligence, you agree to be bound by these Terms of Service. If you are using the service on behalf of a business, you represent that you have the authority to bind that entity to these terms.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">2. Description of Service</h3>
              <p>Invoice Intelligence provides AI-powered invoice processing, categorization, and cost-of-goods-sold tracking for restaurant businesses. Features and functionality may be updated, modified, or discontinued at our discretion with reasonable notice.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">3. User Responsibilities</h3>
              <p>You are responsible for maintaining the confidentiality of your account credentials, ensuring the accuracy of data you upload, and using the service in compliance with all applicable laws. You agree not to misuse, reverse-engineer, or attempt to gain unauthorized access to the platform.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">4. Billing and Payments</h3>
              <p>Subscription fees are billed monthly at your locked-in rate. Founding customer rates are guaranteed for the lifetime of the subscription. We offer a 30-day satisfaction guarantee for new customers. We reserve the right to change pricing for new subscribers with 30 days&apos; notice; existing rates are not affected. Failure to pay may result in suspension or termination of your account.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">5. Intellectual Property</h3>
              <p>All content, features, and functionality of Invoice Intelligence are owned by OAISIS and are protected by copyright, trademark, and other intellectual property laws. You retain ownership of the data you upload to the platform.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">6. Limitation of Liability</h3>
              <p>To the maximum extent permitted by law, Invoice Intelligence shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the service. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">7. Termination</h3>
              <p>Either party may terminate this agreement at any time. Upon termination, your right to access the service ceases immediately. You may export your data prior to termination. We may terminate or suspend access for violation of these terms without prior notice.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">8. Governing Law</h3>
              <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Modal */}
      <div id="a11yModal" className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="a11yTitle">
        <div className="modal-panel p-8 sm:p-10">
          <button className="modal-close" onClick={() => window.closeModal("a11yModal")} aria-label="Close dialog">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 id="a11yTitle" className="text-xl font-bold text-gray-900 mb-1 pr-10">Accessibility Statement</h2>
          <p className="text-xs text-gray-600 mb-6">Last updated: February 28, 2026</p>
          <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Our Commitment</h3>
              <p>Invoice Intelligence is committed to ensuring digital accessibility for people of all abilities. We continually improve the user experience for everyone and apply the relevant accessibility standards to our platform and website.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Conformance Standard</h3>
              <p>We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at the AA level. These guidelines define requirements for designers and developers to improve accessibility for people with disabilities, including visual, auditory, physical, speech, cognitive, language, learning, and neurological disabilities.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Measures Taken</h3>
              <p>We have taken the following measures to ensure accessibility: all text meets or exceeds WCAG 2.2 AA contrast ratios; all interactive elements are keyboard navigable; all images and icons include appropriate alternative text; form fields include associated labels; modal dialogs implement focus trapping and screen reader announcements; and our layout is responsive and functional across assistive technologies.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Assistive Technology Compatibility</h3>
              <p>Invoice Intelligence is designed to be compatible with leading assistive technologies including screen readers (NVDA, JAWS, VoiceOver), screen magnification software, speech recognition software, and keyboard-only navigation.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Known Limitations</h3>
              <p>While we strive for comprehensive accessibility, some third-party content or newly released features may not yet fully conform. We are actively working to identify and resolve any accessibility barriers.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Feedback</h3>
              <p>We welcome your feedback on the accessibility of Invoice Intelligence. If you encounter any barriers or have suggestions for improvement, please contact us at accessibility@openoaisis.com. We aim to respond to accessibility feedback within 5 business days.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact / Book a Demo Modal */}
      <div id="contactModal" className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="contactTitle">
        <div className="modal-panel p-8 sm:p-10">
          <button className="modal-close" onClick={() => window.closeModal("contactModal")} aria-label="Close dialog">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Form view */}
          <div id="contactForm">
            <h2 id="contactTitle" className="text-xl font-bold text-gray-900 mb-1 pr-10">Get in Touch</h2>
            <p className="text-sm text-gray-600 mb-7">Fill out the form below and a member of our team will reach out shortly.</p>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="cf-name" className="form-label">First and Last Name <span className="text-red-600" aria-hidden="true">*</span></label>
                <input id="cf-name" type="text" className="form-input" placeholder="Jane Smith" required autoComplete="name" />
                <p className="form-error" id="cf-name-err" role="alert">Please enter your name.</p>
              </div>
              {/* Business Name */}
              <div>
                <label htmlFor="cf-biz" className="form-label">Business Name <span className="text-red-600" aria-hidden="true">*</span></label>
                <input id="cf-biz" type="text" className="form-input" placeholder="Rosemary Caf&eacute;" required autoComplete="organization" />
                <p className="form-error" id="cf-biz-err" role="alert">Please enter your business name.</p>
              </div>
              {/* Email */}
              <div>
                <label htmlFor="cf-email" className="form-label">Business Email Address <span className="text-red-600" aria-hidden="true">*</span></label>
                <input id="cf-email" type="email" className="form-input" placeholder="jane@rosemarycafe.com" required autoComplete="email" />
                <p className="form-error" id="cf-email-err" role="alert">Please enter a valid email address.</p>
              </div>
              {/* Message */}
              <div>
                <label htmlFor="cf-msg" className="form-label">Anything you would like to add?</label>
                <textarea id="cf-msg" className="form-input" rows={3} placeholder="Tell us about your restaurant or any questions you have..."></textarea>
              </div>
              {/* Demo Checkbox */}
              <div className="flex items-start gap-3">
                <input id="cf-demo" type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 text-brand-700 focus:ring-brand-700 focus:ring-2 focus:ring-offset-0 accent-[#27653D] shrink-0 cursor-pointer" defaultChecked={false} />
                <label htmlFor="cf-demo" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                  <span className="font-medium">Please confirm if you would like to book a demo with us.</span><br />
                  <span className="text-gray-600">&quot;Yes, I would like to book a demo! I understand that someone will contact me at the email address I have provided.&quot;</span>
                </label>
              </div>
              {/* Required note */}
              <p className="text-xs text-gray-600">Fields marked with <span className="text-red-600">*</span> are required.</p>
              <p className="form-error text-sm text-red-600" id="cf-submit-err" role="alert">Something went wrong. Please try again or email us at agent@openoaisis.com.</p>
              {/* Submit */}
              <button id="cf-submit" type="button" className="btn-brand w-full text-center !rounded-xl" onClick={() => window.submitContact()}>Submit</button>
            </div>
          </div>

          {/* Success view */}
          <div id="contactSuccess" className="hidden text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-100 to-brand-200/60 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">Your submission has been received. A member of our team will be contacting you shortly to schedule your demo.</p>
          </div>
        </div>
      </div>

      <Script src="/scripts/landing.js" strategy="afterInteractive" />
    </div>
  );
}
