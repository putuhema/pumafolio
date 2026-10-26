import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Dev server is bound to 0.0.0.0; allow the loopback host used in the browser.
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/chat": ["./content/about.md"],
    "/opengraph-image": ["./fonts/**/*"],
    "/twitter-image": ["./fonts/**/*"],
    "/icon": ["./fonts/**/*"],
    "/apple-icon": ["./fonts/**/*"],
  },
  async redirects() {
    // The reading list moved to /saved.
    return [{ source: "/reading", destination: "/saved", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
