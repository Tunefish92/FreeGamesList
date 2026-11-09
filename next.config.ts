import type { NextConfig } from "next";

/**
 * Path the site is served under, from the GitHub Actions job (actions/configure-pages):
 * "/FreeGamesList" on tunefish92.github.io, "" on a custom domain and locally.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "";

/**
 * Static export for GitHub Pages: `next build` writes plain files to out/. There is no server,
 * so there are no API routes and no custom response headers; the Content Security Policy is a
 * <meta> tag in layout.tsx instead.
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Next 16 blocks dev-server assets for any host but localhost; without this the page
  // never hydrates when opened via LAN IP or domain. Has no effect on the export.
  allowedDevOrigins: ["10.0.0.54", "freegames.tunefishservers.net"],
};

export default nextConfig;
