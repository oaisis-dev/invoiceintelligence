import type { NextConfig } from "next";

const clerkDomains = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.accounts.com",
  "https://clerk.openoaisis.com",
  "https://accounts.openoaisis.com",
  "https://challenges.cloudflare.com",
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `frame-src 'self' ${clerkDomains}`,
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkDomains} https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com`,
  `connect-src 'self' https: wss:`,
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/#pricing",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
