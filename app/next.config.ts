import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint jalan terpisah (`npm run lint` + job CI), JANGAN blokir `next build`/deploy.
  // (Ada lint error warisan: no-unescaped-entities, no-html-link-for-pages.)
  eslint: { ignoreDuringBuilds: true },
  // Build info untuk ditampilkan di dashboard (versi + waktu deploy + commit).
  // NEXT_PUBLIC_* di-inline saat build → BUILD_TIME = waktu build/deploy.
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.1.0",
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
  experimental: {
    // typedRoutes tidak didukung Turbopack (next dev --turbo) di Next 15.1.x,
    // tapi WAJIB untuk type-check `next build`. Jadi: aktif saat build (webpack,
    // TURBOPACK unset), nonaktif saat dev turbo (TURBOPACK=1) supaya dev jalan +
    // Tailwind v4 CSS ter-compile dengan benar di Turbopack.
    typedRoutes: !process.env.TURBOPACK,
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Tree-shake barrel imports dari paket icon/UI besar: hanya icon yang
    // benar-benar dipakai yang masuk bundle (additive, aman).
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-dialog",
    ],
  },
  serverExternalPackages: ["pino", "postgres", "@anthropic-ai/sdk", "openai", "bullmq"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", port: "", pathname: "/**" },
      // Logo sumber. Google `/s2/favicons` 301-redirect ke t*.gstatic.com,
      // jadi wajib whitelist gstatic juga supaya browser tidak block setelah redirect.
      { protocol: "https", hostname: "www.google.com", port: "", pathname: "/s2/**" },
      { protocol: "https", hostname: "**.gstatic.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "cdn.brandfetch.io", port: "", pathname: "/**" },
      // Self-hosted logo emiten di Vercel Blob (sumber utama setelah sync-logos).
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", port: "", pathname: "/**" },
      // News thumbnail sources (pakai wildcard subdomain biar tahan feed baru
      // mis. detik punya awsimages.* + akcdn.*).
      { protocol: "https", hostname: "**.detik.net.id", port: "", pathname: "/**" },
      { protocol: "https", hostname: "**.cnbcindonesia.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "**.antaranews.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "**.investing.com", port: "", pathname: "/**" },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2048],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js perlu inline scripts untuk hydration; pakai nonce di prod kalau strict mode
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-insights.com https://*.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              // Image domains. Google `/s2/favicons` 301-redirect ke t*.gstatic.com,
              // jadi *.gstatic.com WAJIB di-whitelist juga supaya logo emiten tidak
              // di-block setelah redirect.
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://cdn.brandfetch.io https://www.google.com https://*.gstatic.com https://*.detik.net.id https://images.unsplash.com https://plus.unsplash.com https://*.cnbcindonesia.com https://*.antaranews.com https://*.investing.com",
              "font-src 'self' data:",
              // API: Sentry, PostHog, DeepSeek; allow self for streaming
              "connect-src 'self' https://*.sentry.io https://*.posthog.com https://api.deepseek.com wss://*",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
