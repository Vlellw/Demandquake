import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useServerFn } from '@tanstack/react-start';
import { Coins, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { SectionHeading } from '@/components/common/SectionHeading';
import { Button } from '@/components/ui/button';
import { PaymentNotice } from '@/components/credits/PaymentNotice';
import { useAuthUser } from '@/hooks/use-auth';
import { creditCatalogQuery, creditAccountQuery } from '@/lib/credit-queries';
import { createCreditCheckout } from '@/lib/payments.functions';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';

export const Route = createFileRoute('/credits')({
  loader: ({ context }) => context.queryClient.ensureQueryData(creditCatalogQuery()),
  validateSearch: (s: Record<string, unknown>) => ({ session_id: typeof s['session_id'] === 'string' && /^cs_[a-zA-Z0-9_]{1,250}$/.test(s['session_id']) ? s['session_id'] : undefined }),
  head: () => ({ meta: [{ title: 'Buy research credits — Demandquake' }, { name: 'description', content: 'Purchase Demandquake credits for evidence-first startup discovery.' }, { property: 'og:title', content: 'Buy research credits — Demandquake' }, { property: 'og:description', content: 'Flexible credit packages for real startup research.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: CreditsPage,
});
function CreditsPage() {
  const catalog = useSuspenseQuery(creditCatalogQuery()).data;
  const { user } = useAuthUser();
  const account = useQuery({ ...creditAccountQuery(user?.id ?? ''), enabled: Boolean(user) });
  const create = useServerFn(createCreditCheckout);
  const qc = useQueryClient();
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const { session_id } = Route.useSearch();
  const order = account.data?.payments.find(p => p.session_id === session_id);
  useEffect(() => { if (order?.status === 'paid') { toast.success('Payment confirmed. Your credits are available.'); qc.invalidateQueries({ queryKey: ['credit-account'] }); } }, [order?.status, qc]);
  async function buy(id: string) {
    setPending(id);
    try {
      const result = await create({ data: { packageId: id, requestId: crypto.randomUUID(), environment: getStripeEnvironment(), origin: window.location.origin } });
      if ('error' in result) throw new Error(result.error);
      setSecret(result.clientSecret);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not open payment form'); }
    finally { setPending(null); }
  }
  return <div>
    <PaymentNotice />
    <Breadcrumbs current="Buy credits" />
    <section className="bg-surface-sunken py-12"><div className="mx-auto max-w-[1400px] px-4 sm:px-6">
      <SectionHeading eyebrow="Your next discovery" title="Buy credits" description="Choose a package. Pay only for successful research." />
      {user && <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm"><span className="inline-flex items-center gap-2 font-semibold"><Coins className="size-5 text-primary" />{account.data ? (account.data.wallet.balance - account.data.wallet.reserved).toLocaleString('en-US') : '…'} credits available</span><Button asChild variant="link"><Link to="/credits/history">Transaction history</Link></Button>{account.data?.isAdmin && <Button asChild variant="link"><Link to="/credits/admin">Manage credits</Link></Button>}</div>}
    </div></section>
    <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      {session_id && <p role="status" className="mb-8 border-l-4 border-primary bg-accent p-4">{order?.status === 'paid' ? `Payment confirmed — ${order.credits.toLocaleString('en-US')} credits added.` : order?.status === 'failed' || order?.status === 'cancelled' ? 'Payment was not completed. No credits were added.' : 'Waiting for verified payment confirmation. Credits will appear when your payment is confirmed.'}</p>}
      {secret ? <div className="mx-auto max-w-3xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-primary">Secure checkout</h2><Button variant="outline" onClick={() => setSecret(null)}><X />Cancel checkout</Button></div><EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret: secret }}><EmbeddedCheckout /></EmbeddedCheckoutProvider></div> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{catalog.packages.map(pkg => <article key={pkg.id} className="flex flex-col border-t-4 border-primary bg-background p-6 shadow-panel"><p className="eyebrow">{pkg.name}</p><h2 className="mt-4 text-3xl font-bold text-primary">{pkg.credits.toLocaleString('en-US')}<span className="mt-1 block text-base font-normal text-muted-foreground">credits</span></h2><p className="mt-6 text-2xl font-semibold">{new Intl.NumberFormat('en-IE', { style: 'currency', currency: pkg.currency }).format(pkg.amount / 100)}</p><p className="mb-6 mt-2 text-sm text-muted-foreground">{catalog.settings['discovery'] > 0 ? `Up to ${Math.floor(pkg.credits / catalog.settings['discovery'])} discovery searches` : 'Discovery searches are currently free'}</p>{user ? <Button className="mt-auto" disabled={Boolean(pending)} onClick={() => buy(pkg.id)}>{pending === pkg.id ? 'Opening checkout…' : 'Buy Credits'}<ArrowRight /></Button> : <Button asChild className="mt-auto"><Link to="/auth" search={{ redirect: '/credits' }}>Sign in to buy<ArrowRight /></Link></Button>}</article>)}</div>}
      <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><ShieldCheck className="size-5 text-observed" />Secure card payments</span><span>{catalog.settings['discovery']} credits per successful discovery</span><span>No charge for failed research</span></div>
    </section>
  </div>;
}