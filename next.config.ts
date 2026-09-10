import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH,
  images: { unoptimized: true },
  allowedDevOrigins: ["192.168.102.55"],
};

export default nextConfig;
