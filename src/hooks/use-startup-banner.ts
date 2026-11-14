import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ensureStartupBanner } from "@/lib/banner.functions";
import { isCurrentBanner } from "@/lib/banner-version";

/** Startup ids already asked for a banner in this browser session (generation is cached server-side). */
const requested = new Map<string, Promise<{ url: string | null }>>();

/**
 * The startup's banner image URL. When the startup has none yet, asks the server to generate
 * it once (cached on the startup row afterwards). Returns null until then — callers keep the
 * plain brand-colored banner as the fallback.
 */
export function useStartupBanner(startup: { id: string; banner_image_url: string | null }) {
  const ensureFn = useServerFn(ensureStartupBanner);
  const currentImage = isCurrentBanner(startup.banner_image_url) ? startup.banner_image_url : null;
  const [result, setResult] = useState<{ id: string; url: string | null }>({ id: startup.id, url: currentImage });
  const url = currentImage ?? (result.id === startup.id ? result.url : null);

  useEffect(() => {
    if (url) return;
    let request = requested.get(startup.id);
    if (!request) {
      request = ensureFn({ data: { startupId: startup.id } });
      requested.set(startup.id, request);
    }
    let alive = true;
    request
      .then((r) => {
        if (alive && r.url) setResult({ id: startup.id, url: r.url });
      })
      .catch(() => {
        requested.delete(startup.id);
      });
    return () => {
      alive = false;
    };
  }, [startup.id, url, ensureFn]);

  return url;
}
