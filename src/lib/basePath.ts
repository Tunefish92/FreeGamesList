/**
 * Path the site is served under: "" on a custom domain, "/FreeGamesList" on
 * tunefish92.github.io/FreeGamesList. Set at build time from PAGES_BASE_PATH (next.config.ts);
 * Next.js prefixes its own assets, everything the code loads by hand needs this prefix.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
