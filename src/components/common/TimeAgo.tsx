import { useEffect, useState } from "react";
import { formatDateTime, timeAgo } from "@/lib/format";

/**
 * Relative time that is safe to server-render: the server's text is kept during hydration,
 * then the label refreshes in the browser every minute.
 */
export function TimeAgo({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return (
    <time dateTime={iso ?? undefined} title={iso ? formatDateTime(iso) : undefined} className={className} suppressHydrationWarning>
      {timeAgo(iso, now ?? undefined)}
    </time>
  );
}
