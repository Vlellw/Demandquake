/** Accept only same-origin app paths ("/x"), never protocol-relative or absolute URLs. */
export function safeRedirect(value: unknown, fallback = "/workspace"): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  if (/^\/(auth|reset-password)(\/|\?|$)/.test(v)) return fallback;
  if (/[\u0000-\u001f]/.test(v)) return fallback;
  return v;
}

export const REDIRECT_STORAGE_KEY = "dq:post-auth-redirect";
