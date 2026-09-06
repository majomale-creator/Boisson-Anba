import type { NextConfig } from "next";
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "Boisson-Anba";
const isPages = process.env.GITHUB_ACTIONS === "true";
const basePath = isPages ? `/${repo}` : "";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
};
export default nextConfig;
