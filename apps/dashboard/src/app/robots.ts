import type { MetadataRoute } from "next";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oaisis.ai"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
