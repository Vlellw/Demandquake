import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Coins } from 'lucide-react';
import { creditAccountQuery } from '@/lib/credit-queries';
export function CreditBalance({ userId }: { userId: string }) {
  const account = useQuery(creditAccountQuery(userId));
  const w = account.data?.wallet;
  return <div className="flex items-center gap-3 text-xs text-ink-foreground">
    <Link to="/credits/history" className="inline-flex items-center gap-1.5" aria-label="Credit balance and history"><Coins className="size-4" /><span>{w ? (w.balance - w.reserved).toLocaleString('en-US') : '…'} credits</span></Link>
    <Link to="/credits" className="font-bold underline underline-offset-4">Buy Credits</Link>
  </div>;
}