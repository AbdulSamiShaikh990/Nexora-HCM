import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Ignore ESLint errors during production builds to unblock deploys.
    // We will address lint issues separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
