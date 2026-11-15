import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Coins, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { SectionHeading } from '@/components/common/SectionHeading';
import { PageError } from '@/components/common/PageError';
import { Button } from '@/components/ui/button';
import { useAuthUser } from '@/hooks/use-auth';
import { creditCatalogQuery, creditAccountQuery } from '@/lib/credit-queries';
import { addFreeCredits } from '@/lib/credits.functions';
import { getStripeEnvironment } from '@/lib/stripe';
import { CreditReadFeedback } from '@/components/credits/CreditReadFeedback';

export const Route = createFileRoute('/credits')({
  loader: ({ context }) => context.queryClient.ensureQueryData(creditCatalogQuery()),
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => typeof s['session_id'] === 'string' && /^cs_[a-zA-Z0-9_]{1,250}$/.test(s['session_id']) ? { session_id: s['session_id'] } : {},
  head: () => ({ meta: [{ title: 'Free research credits - Demandquake' }, { name: 'description', content: 'Add free Demandquake credits for evidence-first startup discovery.' }, { property: 'og:title', content: 'Free research credits - Demandquake' }, { property: 'og:description', content: 'Free credit packages for real startup research.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: CreditsPage,
  errorComponent: PageError,
  notFoundComponent: () => <p className="p-6 text-muted-foreground">Credit packages unavailable.</p>,
});
function CreditsPage() {
  const catalog = useSuspenseQuery(creditCatalogQuery()).data;
  const discoveryCost = catalog.settings['discovery'] ?? 5;
  const { user } = useAuthUser();
  const account = useQuery({ ...creditAccountQuery(user?.id ?? ''), enabled: Boolean(user) });
  const add = useServerFn(addFreeCredits);
  const qc = useQueryClient();
  const inFlight = useRef(false);
  const requests = useRef<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { session_id } = Route.useSearch();
  const order = account.data?.payments.find(p => p.session_id === session_id);
  useEffect(() => { if (order?.status === 'paid') { toast.success('Payment confirmed. Your credits are available.'); qc.invalidateQueries({ queryKey: ['credit-account'] }); } }, [order?.status, qc]);
  async function buy(id: string) {
    if (inFlight.current || !user) return;
    inFlight.current = true;
    setPending(id);
    setPaymentError(null);
    try {
      const requestId = requests.current[id] ?? crypto.randomUUID();
      requests.current[id] = requestId;
      const result = await add({ data: { packageId: id, requestId, environment: getStripeEnvironment() } });
      delete requests.current[id];
      await qc.invalidateQueries({ queryKey: ['credit-account'] });
      toast.success(`${result.credits.toLocaleString('en-US')} free credits added to your account.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add credits. Try again.';
      setPaymentError(message);
      toast.error(message);
    }
    finally { setPending(null); inFlight.current = false; }
  }
  return <div>
    <section className="bg-surface-sunken py-12"><div className="mx-auto max-w-[1400px] px-4 sm:px-6">
      <SectionHeading title="Free credits" description="Add a package to your account without payment. You can add more whenever you need them." />
      {user && <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm"><span className="inline-flex items-center gap-2 font-semibold"><Coins className="size-5 text-primary" />{account.data ? `${(account.data.wallet.balance - account.data.wallet.reserved).toLocaleString('en-US')} credits available` : account.isError ? 'Balance unavailable' : 'Loading balance…'}</span><CreditReadFeedback query={account} hasData={Boolean(account.data)} /><Button asChild variant="link"><Link to="/credits/history">Transaction history</Link></Button>{account.data?.isAdmin && <Button asChild variant="link"><Link to="/credits/admin">Manage credits</Link></Button>}</div>}
    </div></section>
    <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      {paymentError && <p role="alert" className="mb-8 border-l-4 border-negative bg-negative/10 p-4 text-sm text-foreground">{paymentError}</p>}
      {session_id && <p role="status" className="mb-8 border-l-4 border-primary bg-accent p-4">{order?.status === 'paid' ? `Payment confirmed - ${order.credits.toLocaleString('en-US')} credits added.` : order?.status === 'failed' || order?.status === 'cancelled' ? 'Payment was not completed. No credits were added.' : account.isError ? 'Could not check payment confirmation. Retry loading your account above; do not pay again.' : 'Waiting for verified payment confirmation. Credits will appear when your payment is confirmed.'}</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{catalog.packages.map(pkg => <article key={pkg.id} className="flex flex-col border-t-4 border-primary bg-background p-6 shadow-panel"><p className="font-display text-lg font-bold text-foreground">{pkg.name}</p><h2 className="mt-4 text-3xl font-bold text-primary">{pkg.credits.toLocaleString('en-US')}<span className="mt-1 block text-base font-normal text-muted-foreground">credits</span></h2><p className="mt-6 text-2xl font-semibold text-observed">Free</p><p className="mb-6 mt-2 text-sm text-muted-foreground">{discoveryCost > 0 ? `Up to ${Math.floor(pkg.credits / discoveryCost)} discovery searches` : 'Discovery searches are currently free'}</p>{user ? <Button className="mt-auto" disabled={Boolean(pending)} onClick={() => buy(pkg.id)}>{pending === pkg.id ? 'Adding credits…' : 'Add credits'}<ArrowRight /></Button> : <Button asChild className="mt-auto"><Link to="/auth" search={{ redirect: '/credits' }}>Sign in to add credits<ArrowRight /></Link></Button>}</article>)}</div>
      <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"><span>{catalog.settings['discovery']} credits per successful discovery</span><span>Claims: {catalog.settings['claim'] ?? 5} credits public, {catalog.settings['claim_private'] ?? 20} private</span><span>No charge for failed research</span></div>
    </section>
  </div>;
}