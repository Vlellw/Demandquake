import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { creditAccountQuery } from '@/lib/credit-queries';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { StatRule } from '@/components/common/StatRule';

export const Route = createFileRoute('/_authenticated/credits/history')({
  loader: async ({ context }) => { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Sign in required'); await context.queryClient.ensureQueryData(creditAccountQuery(user.id)); return { userId: user.id }; },
  head: () => ({ meta: [{ title: 'Credit transactions — Demandquake' }, { name: 'description', content: 'Your Demandquake credit balance, research charges and payment history.' }, { property: 'og:title', content: 'Credit transactions — Demandquake' }, { property: 'og:description', content: 'Review credit purchases, searches, refunds and adjustments.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: History,
});
export function CreditLedger({ rows }: { rows: Awaited<ReturnType<typeof import('@/lib/credits.functions').getCreditAccount>>['transactions'] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b-2 border-primary text-primary"><tr>{['Date (UTC)','Transaction','Credits','Balance after'].map(h => <th key={h} className="px-3 py-4 font-bold">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-border"><td className="px-3 py-4">{new Date(r.created_at).toLocaleString('en-GB',{ timeZone:'UTC' })}</td><td className="px-3 py-4">{r.description}</td><td className="px-3 py-4 font-semibold">{r.delta > 0 ? '+' : ''}{r.delta.toLocaleString('en-US')}</td><td className="px-3 py-4">{r.balance_after.toLocaleString('en-US')}</td></tr>)}</tbody></table></div>;
}
function History() {
  const { userId } = Route.useLoaderData();
  const data = useSuspenseQuery(creditAccountQuery(userId)).data;
  return <div><Breadcrumbs trail={[<Link key="c" to="/credits">Buy credits</Link>]} current="Transaction history" /><section className="bg-surface-sunken"><div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6"><h1 className="section-title mt-2">Transaction history</h1><dl className="mt-8 grid max-w-xl grid-cols-2 gap-8"><StatRule label="Available credits" value={data.wallet.balance-data.wallet.reserved} /><StatRule label="Reserved for research" value={data.wallet.reserved} /></dl>{data.wallet.balance-data.wallet.reserved < 10 && <p role="status" className="mt-6 text-negative">{data.wallet.balance-data.wallet.reserved <= 0 ? 'No credits available.' : 'Your credit balance is running low.'} <Link to="/credits" className="underline">Buy Credits</Link></p>}</div></section><section className="mx-auto max-w-[1400px] space-y-10 px-4 py-10 sm:px-6"><CreditLedger rows={data.transactions} /><div><h2 className="mb-4 text-xl font-bold text-primary">Payment history</h2>{data.payments.length ? <div className="divide-y divide-border">{data.payments.map(p => <div key={p.id} className="flex flex-wrap justify-between gap-4 py-4 text-sm"><span>{new Date(p.created_at).toLocaleString('en-GB',{timeZone:'UTC'})} UTC · {p.credits.toLocaleString('en-US')} credits</span><span>{new Intl.NumberFormat('en-IE',{style:'currency',currency:p.currency}).format(p.amount/100)} · {p.status.replaceAll('_',' ')}</span></div>)}</div> : <p className="text-muted-foreground">No purchases yet.</p>}</div><Button asChild><Link to="/credits">Buy Credits</Link></Button></section></div>;
}