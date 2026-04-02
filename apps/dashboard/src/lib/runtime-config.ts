/**
 * Runtime configuration for values that differ per environment.
 *
 * NEXT_PUBLIC_* vars are baked into JS at build time, so they can't differ
 * between staging and production when using image promotion (same image).
 *
 * Instead, the root layout injects these values into window.__RUNTIME_CONFIG__
 * via a <Script> tag, reading from process.env at request time (Cloud Run
 * secrets). Client-side code reads from window; server-side reads process.env.
 */

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      SUPABASE_URL: string;
      SUPABASE_PUBLISHABLE_KEY: string;
    };
    __APP_ENV__?: string;
  }
}

export function getAppEnv(): string {
  if (typeof window === "undefined") {
    return process.env.APP_ENV || "";
  }
  return window.__APP_ENV__ || "";
}

export function getSupabaseUrl(): string {
  if (typeof window === "undefined") {
    // Server: use non-prefixed env var — NEXT_PUBLIC_* gets inlined at build
    // time by Next.js and won't reflect the runtime Cloud Run secret.
    return process.env.SUPABASE_URL || "";
  }
  // Client: read from runtime config injected by root layout <head> script
  return window.__RUNTIME_CONFIG__?.SUPABASE_URL || "";
}

export function getSupabasePublishableKey(): string {
  if (typeof window === "undefined") {
    return process.env.SUPABASE_PUBLISHABLE_KEY || "";
  }
  return window.__RUNTIME_CONFIG__?.SUPABASE_PUBLISHABLE_KEY || "";
}
