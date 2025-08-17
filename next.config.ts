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
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
