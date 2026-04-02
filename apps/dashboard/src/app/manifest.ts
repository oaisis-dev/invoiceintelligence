import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Invoice Intelligence",
    short_name: "Invoices",
    description: "AI-powered invoice processing for the restaurant industry",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#f5f7f6",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
