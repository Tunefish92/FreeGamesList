/**
 * Store data ends up in href/src attributes. Only allow plain web URLs, so a tampered
 * API response can't inject e.g. `javascript:` links.
 */
export function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
