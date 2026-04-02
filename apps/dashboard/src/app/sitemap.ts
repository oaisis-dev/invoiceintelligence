import type { MetadataRoute } from "next";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oaisis.ai"
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/sign-in`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];
}
