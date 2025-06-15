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
  /* other config options here */
};

export default nextConfig;
