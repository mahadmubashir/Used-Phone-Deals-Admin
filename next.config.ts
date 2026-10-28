import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Hides the floating dev badge so demo recordings are clean.
  devIndicators: false,
  // Pin the workspace root to this app (a stray lockfile in the home dir
  // otherwise makes Next infer the wrong root).
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Real product images (S3/CDN) get added here when the backend lands.
    remotePatterns: [],
  },
};

export default nextConfig;
