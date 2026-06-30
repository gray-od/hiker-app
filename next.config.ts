import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Force webpack for production (Serwist requires webpack)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure webpack is used for client builds
    }
    return config;
  },

  // Supabase image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    unoptimized: true,
  },

  // i18n: next-intl handles routing via middleware, no built-in i18n needed
  // Next.js 16 Pages Router: no i18n config required when using next-intl middleware

  // PWA headers
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
