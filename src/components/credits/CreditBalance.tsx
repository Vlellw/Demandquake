import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Coins, RefreshCw } from 'lucide-react';
import { creditAccountQuery } from '@/lib/credit-queries';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
export function CreditBalance({ userId, onNavigate }: { userId: string; onNavigate?: () => void }) {
  const account = useQuery(creditAccountQuery(userId));
  const w = account.data?.wallet;
  const last = useRef<string | null>(null);
  useEffect(() => {
    const latest = account.data?.transactions[0];
    if (!latest) return;
    if (last.current && last.current !== latest.id) {
      if (latest.kind === 'search') toast.success(`${Math.abs(latest.delta)} credits used for successful research.`);
      if (latest.kind === 'purchase') toast.success(`${latest.delta} credits added after payment confirmation.`);
    }
    last.current = latest.id;
  }, [account.data?.transactions]);
  const low = useRef(false);
  useEffect(() => {
    if (!w) return;
    const available = w.balance-w.reserved;
    if (available < 10 && !low.current) toast.warning(available <= 0 ? 'No credits available. Buy credits to continue.' : 'Your credit balance is running low.');
    low.current = available < 10;
  }, [w]);
  return <div className="space-y-4">
    <Link to="/credits/history" onClick={onNavigate} className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Credit balance and history">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Coins className="size-5" /></span>
      <span className="min-w-0"><span className="block text-xs text-muted-foreground">Available credits</span><span className={`block break-words font-semibold text-primary ${w ? 'text-2xl tabular-nums' : 'text-sm'}`}>{w ? (w.balance - w.reserved).toLocaleString('en-US') : account.isError ? 'Balance unavailable' : 'Loading balance…'}</span></span>
    </Link>
    {account.isError && <div className="flex items-center gap-2">
      <p role="status" className="text-xs text-muted-foreground">{w ? 'Could not refresh balance.' : 'Could not load balance.'}</p>
      <Button variant="ghost" size="sm" disabled={account.isFetching} onClick={() => void account.refetch()}><RefreshCw className={account.isFetching ? 'animate-spin' : ''} />Retry</Button>
    </div>}
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild size="sm"><Link to="/credits" onClick={onNavigate}>Buy Credits</Link></Button>
      <Button asChild variant="link" size="sm"><Link to="/credits/history" onClick={onNavigate}>Credit history</Link></Button>
    </div>
  </div>;
}