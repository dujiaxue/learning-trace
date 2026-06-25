import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist 使用 Node 原生特性，需从 Server Components 打包中外置
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
