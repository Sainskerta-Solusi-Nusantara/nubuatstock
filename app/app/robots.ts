import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/research", "/privacy", "/terms", "/disclaimer", "/login", "/signup"],
        disallow: ["/api/", "/admin/", "/superadmin/", "/dashboard", "/watchlist", "/picks", "/alerts", "/copilot", "/subscription"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
