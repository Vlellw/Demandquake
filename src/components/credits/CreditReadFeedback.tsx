import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CreditReadState = { isError: boolean; isFetching: boolean; refetch: () => Promise<unknown> };

export function CreditReadFeedback({ query, hasData = false, label = 'balance' }: { query: CreditReadState; hasData?: boolean; label?: string }) {
  if (!query.isError) return null;
  return <div className="flex flex-wrap items-center gap-2">
    <p role="status" className="text-xs text-muted-foreground">Could not {hasData ? 'refresh' : 'load'} {label}.</p>
    <Button variant="ghost" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? 'animate-spin' : ''} />Retry</Button>
  </div>;
}