import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
const env = z.enum(['sandbox','live']);
const checkout = z.object({ packageId: z.string().min(1).max(40), requestId: z.string().uuid(), environment: env, origin: z.string().url().max(300) });

export const createCreditCheckout = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof checkout>) => checkout.parse(d))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import('./stripe.server');
    try {
      const origin = new URL(data.origin);
      if (origin.origin !== data.origin || (origin.protocol !== 'https:' && origin.hostname !== 'localhost')) throw new Error('Invalid checkout origin');
      const pkg = await context.supabase.from('credit_packages').select('*').eq('id', data.packageId).eq('active',true).single();
      if (pkg.error) throw new Error('This package is not available');
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const stripe = createStripeClient(data.environment);
      const { data: { user } } = await context.supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, { userId: context.userId, ...(user?.email && { email: user.email }) });
      const prices = await stripe.prices.list({ lookup_keys: [pkg.data.price_key], active: true, limit: 1 });
      const price = prices.data[0];
      if (!price || price.unit_amount !== pkg.data.amount || price.currency !== pkg.data.currency) throw new Error('Package pricing is being updated. Please try again shortly.');
      const product = await stripe.products.retrieve(typeof price.product === 'string' ? price.product : price.product.id);
      const order = await supabaseAdmin.from('credit_payments').upsert({ id: data.requestId, user_id: context.userId, environment: data.environment, package_id: pkg.data.id, credits: pkg.data.credits, amount: pkg.data.amount, currency: pkg.data.currency }, { onConflict: 'id', ignoreDuplicates: true });
      if (order.error) throw new Error(order.error.message);
      const existing = await context.supabase.from('credit_payments').select('*').eq('id', data.requestId).eq('environment',data.environment).single();
      if (existing.error || existing.data.package_id !== data.packageId || existing.data.status !== 'pending') throw new Error('Invalid purchase request');
      const session = await stripe.checkout.sessions.create({
        customer: customerId, line_items: [{ price: price.id, quantity: 1 }], mode: 'payment', ui_mode: 'embedded_page',
        return_url: `${data.origin}/credits?session_id={CHECKOUT_SESSION_ID}`,
        payment_intent_data: { description: product.name },
        managed_payments: { enabled: true },
        metadata: { userId: context.userId, orderId: data.requestId, managed_payments: 'true' },
      } as import('stripe').default.Checkout.SessionCreateParams, { idempotencyKey: `checkout:${data.environment}:${data.requestId}` });
      const saved = await supabaseAdmin.from('credit_payments').update({ session_id: session.id }).eq('id',data.requestId).eq('user_id',context.userId);
      if (saved.error) throw new Error(saved.error.message);
      if (!session.client_secret) throw new Error('Payment form unavailable');
      return { clientSecret: session.client_secret };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof import('./stripe.server').createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error('Invalid userId');
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    const first = found.data[0];
    if (first) return first.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.['userId'] !== options.userId) await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      return customer.id;
    }
  }
  const created = await stripe.customers.create({ ...(options.email && { email: options.email }), ...(options.userId && { metadata: { userId: options.userId } }) });
  return created.id;
}

const packageEdit = z.object({ id: z.string().min(1).max(40), credits: z.number().int().min(1).max(1000000), amount: z.number().int().min(50).max(1000000), environment: env, requestId: z.string().uuid() });
export const updateCreditPackage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof packageEdit>) => packageEdit.parse(d))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import('./stripe.server');
    try {
      const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
      if (role.error || !role.data) throw new Error('Admin access required');
      const pkg = await context.supabase.from('credit_packages').select('*').eq('id',data.id).single();
      if (pkg.error) throw new Error('Package not found');
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [pkg.data.price_key], limit: 1 });
      const price = prices.data[0];
      if (!price) throw new Error('Price not found');
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      const product = await stripe.products.retrieve(productId);
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      await supabaseAdmin.from('credit_packages').update({ active: false }).eq('id',data.id);
      await stripe.prices.create({ product: productId, unit_amount: data.amount, currency: 'eur', lookup_key: pkg.data.price_key, transfer_lookup_key: true, tax_behavior: 'inclusive', nickname: product.name, metadata: { lovable_external_id: pkg.data.price_key } }, { idempotencyKey: `price:${data.requestId}` });
      await stripe.products.update(productId, { name: `Demandquake ${pkg.data.name} - ${data.credits.toLocaleString('en-US')} credits` });
      const result = await supabaseAdmin.from('credit_packages').update({ credits: data.credits, amount: data.amount, active: true }).eq('id',data.id);
      if (result.error) throw new Error(result.error.message);
      return { ok: true as const };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });