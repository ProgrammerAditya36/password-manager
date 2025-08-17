import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Disable type checking during production builds
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: process.env.NODE_ENV === "production",
  },
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure Prisma client is bundled for server-side rendering
      config.externals = config.externals || [];
      config.externals.push("@prisma/client");
    }
    return config;
  },
};

export default nextConfig;
