import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Coins } from 'lucide-react';
import { creditAccountQuery } from '@/lib/credit-queries';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
export function CreditBalance({ userId }: { userId: string }) {
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
  return <div className="flex items-center gap-3 text-xs text-ink-foreground">
    <Link to="/credits/history" className="inline-flex items-center gap-1.5" aria-label="Credit balance and history"><Coins className="size-4" /><span>{w ? (w.balance - w.reserved).toLocaleString('en-US') : '…'} credits</span></Link>
    <Link to="/credits" className="font-bold underline underline-offset-4">Buy Credits</Link>
  </div>;
}