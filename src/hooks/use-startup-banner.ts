import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ensureStartupBanner } from "@/lib/banner.functions";

/** Startup ids already asked for a banner in this browser session (generation is cached server-side). */
const requested = new Set<string>();

/**
 * The startup's banner image URL. When the startup has none yet, asks the server to generate
 * it once (cached on the startup row afterwards). Returns null until then — callers keep the
 * plain brand-colored banner as the fallback.
 */
export function useStartupBanner(startup: { id: string; banner_image_url: string | null }) {
  const ensureFn = useServerFn(ensureStartupBanner);
  const [url, setUrl] = useState<string | null>(startup.banner_image_url);

  useEffect(() => {
    if (url || requested.has(startup.id)) return;
    requested.add(startup.id);
    let alive = true;
    ensureFn({ data: { startupId: startup.id } })
      .then((r) => {
        if (alive && r.url) setUrl(r.url);
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
