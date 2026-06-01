import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  // Bot AI / scraper untuk training & data-harvesting — blokir TOTAL.
  const aiBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "anthropic-ai",
    "Claude-Web",
    "Google-Extended",
    "CCBot",
    "PerplexityBot",
    "YouBot",
    "Bytespider",
    "Amazonbot",
    "Applebot-Extended",
    "Meta-ExternalAgent",
    "FacebookBot",
    "Diffbot",
    "Omgilibot",
    "ImagesiftBot",
    "cohere-ai",
    "Timpibot",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/saham", "/research", "/privacy", "/terms", "/disclaimer", "/login", "/signup"],
        disallow: ["/api/", "/admin/", "/superadmin/", "/pitchdeck", "/dashboard", "/watchlist", "/picks", "/alerts", "/copilot", "/subscription"],
      },
      // Blokir bot AI/scraper dari seluruh situs.
      { userAgent: aiBots, disallow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
