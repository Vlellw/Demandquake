import { useState } from "react";
import { faviconUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SourceFavicon({ domain, className }: { domain: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={cn("grid size-4 shrink-0 place-items-center rounded-sm bg-foreground/10 font-mono text-[9px] uppercase text-muted-foreground", className)}>
        {domain.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={faviconUrl(domain)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("size-4 shrink-0 rounded-sm bg-foreground/5", className)}
    />
  );
}
