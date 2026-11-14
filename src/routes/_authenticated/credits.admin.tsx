import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { creditAdminQuery } from '@/lib/credit-queries';
import { adjustCredits, updateCreditSetting } from '@/lib/credits.functions';
import { updateCreditPackage } from '@/lib/payments.functions';
import { getStripeEnvironment } from '@/lib/stripe';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { CreditLedger } from './credits.history';

export const Route = createFileRoute('/_authenticated/credits/admin')({
  loader: ({ context }) => context.queryClient.ensureQueryData(creditAdminQuery()),
  head: () => ({ meta: [{ title: 'Credit administration — Demandquake' },{name:'description',content:'Manage Demandquake credit balances, research costs and packages.'},{property:'og:title',content:'Credit administration — Demandquake'},{property:'og:description',content:'Secure credit and payment administration.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }),
  component: CreditAdmin,
});
function CreditAdmin() {
  const data = useSuspenseQuery(creditAdminQuery()).data;
  const qc = useQueryClient();
  const adjust = useServerFn(adjustCredits);
  const setting = useServerFn(updateCreditSetting);
  const pkgUpdate = useServerFn(updateCreditPackage);
  const [busy, setBusy] = useState(false);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    try { const res = await fn(); if (res && typeof res === 'object' && 'error' in res) throw new Error(String(res.error)); await qc.invalidateQueries({queryKey:['credit-admin']}); await qc.invalidateQueries({queryKey:['credit-catalog']}); await qc.invalidateQueries({queryKey:['credit-account']}); toast.success('Saved'); }
    catch(e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }
  const field = 'h-10 min-w-0 rounded border border-border bg-background px-3 text-sm';
  return <div><Breadcrumbs trail={[<Link key="c" to="/credits">Buy credits</Link>]} current="Credit administration" /><div className="mx-auto max-w-[1400px] space-y-10 px-4 py-10 sm:px-6"><header><h1 className="section-title mt-2">Credits & payments</h1></header>
    <section><h2 className="mb-4 text-xl font-bold text-primary">Credit costs</h2><div className="grid gap-4 sm:grid-cols-2">{data.settings.filter(s => s.key === 'welcome' || s.key === 'discovery').map(s => <form key={s.key} className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const key = s.key; if (key !== 'welcome' && key !== 'discovery') return; action(() => setting({data:{key,value:Number(f.get('value'))}})); }}><label className="flex-1 text-sm font-semibold">{s.key === 'welcome' ? 'Welcome credits' : 'Discovery search'}<input aria-label={s.key} className={`${field} mt-2 block w-full`} name="value" type="number" min="0" max="1000000" defaultValue={s.value} required /></label><Button disabled={busy} type="submit" variant="outline"><Save />Save</Button></form>)}</div></section>
    <section><h2 className="mb-4 text-xl font-bold text-primary">Packages</h2><div className="divide-y divide-border">{data.packages.map(p => <form key={p.id} className="flex flex-wrap items-end gap-4 py-4" onSubmit={e => { e.preventDefault(); const f=new FormData(e.currentTarget); action(() => pkgUpdate({data:{id:p.id,credits:Number(f.get('credits')),amount:Math.round(Number(f.get('price'))*100),environment:getStripeEnvironment(),requestId:crypto.randomUUID()}})); }}><p className="w-24 pb-3 font-semibold">{p.name}</p><label className="text-sm">Credits<input className={`${field} mt-2 block w-32`} name="credits" type="number" min="1" defaultValue={p.credits} required /></label><label className="text-sm">Price (€)<input className={`${field} mt-2 block w-32`} name="price" type="number" min="0.5" step="0.01" defaultValue={p.amount/100} required /></label><Button disabled={busy} variant="outline" type="submit"><Save />Save</Button></form>)}</div></section>
    <section><h2 className="mb-4 text-xl font-bold text-primary">Adjust a balance</h2><form className="flex flex-wrap items-end gap-3" onSubmit={e => {e.preventDefault(); const f = new FormData(e.currentTarget); action(() => adjust({data:{userId:String(f.get('user')),delta:Number(f.get('delta')),reason:String(f.get('reason')),environment:getStripeEnvironment(),requestId:crypto.randomUUID()}}));}}><label className="min-w-0 flex-1 text-sm">Account<select className={`${field} mt-2 block w-full`} name="user" required>{data.wallets.map(w => <option key={w.user_id} value={w.user_id}>{w.user_id} · {w.balance} credits</option>)}</select></label><label className="text-sm">Adjustment<input className={`${field} mt-2 block w-32`} name="delta" type="number" min="-1000000" max="1000000" required /></label><label className="min-w-0 flex-1 text-sm">Reason<input className={`${field} mt-2 block w-full`} name="reason" minLength={5} maxLength={200} required /></label><Button disabled={busy} type="submit"><Plus />Apply adjustment</Button></form></section>
    <section><h2 className="mb-4 text-xl font-bold text-primary">Recent transactions</h2><CreditLedger rows={data.transactions} /></section>
    <section><h2 className="mb-4 text-xl font-bold text-primary">Payment records</h2><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr>{['Account','Payment ID','Amount','Credits','Status'].map(h=><th className="border-b-2 border-primary p-3" key={h}>{h}</th>)}</tr></thead><tbody>{data.payments.map(p=><tr key={p.id}><td className="border-b border-border p-3">{p.user_id}</td><td className="border-b border-border p-3">{p.payment_intent_id ?? 'Pending'}</td><td className="border-b border-border p-3">€{(p.amount/100).toFixed(2)}</td><td className="border-b border-border p-3">{p.credits}</td><td className="border-b border-border p-3">{p.status}</td></tr>)}</tbody></table></div></section>
  </div></div>;
}