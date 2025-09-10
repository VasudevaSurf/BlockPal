// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip ESLint during builds (including Vercel deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript type checking during builds (optional)
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Configure fallbacks for client-side builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // External packages that should not be bundled
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Configure for wallet libraries
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    return config;
  },
  // Remove esmExternals as it's not supported in Turbopack
  // experimental: {
  //   esmExternals: "loose",
  // },
  reactStrictMode: false,
  transpilePackages: [
    "@rainbow-me/rainbowkit",
    "wagmi",
    "viem",
    "@tanstack/react-query",
  ],
};

export default nextConfig;
