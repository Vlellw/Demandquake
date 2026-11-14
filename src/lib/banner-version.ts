/** Versioned URLs keep updated artwork separate from previously cached images. */
export const BANNER_VERSION = "objects-2";
export function isCurrentBanner(url: string | null | undefined): boolean {
  if (!url) return false;
  return new URL(url, "https://local.invalid").searchParams.get("v") === BANNER_VERSION;
}