import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/api/public/payments/webhook')({ server: { handlers: {
  POST: async ({ request }) => {
    const rawEnv = new URL(request.url).searchParams.get('env');
    if (rawEnv !== 'sandbox' && rawEnv !== 'live') return new Response('Invalid environment', { status: 400 });
    const { verifyWebhook } = await import('@/lib/stripe.server');
    let event: Awaited<ReturnType<typeof verifyWebhook>>;
    try { event = await verifyWebhook(request, rawEnv); }
    catch { return new Response('Invalid signature', { status: 400 }); }
    try {
      z.object({ id: z.string().min(1), type: z.string().min(1), livemode: z.boolean() }).parse(event);
      if (event.livemode !== (rawEnv === 'live')) return new Response('Environment mismatch', { status: 400 });
      const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
      if (event.type.startsWith('checkout.session.')) {
        const session = z.object({ id: z.string(), metadata: z.object({ orderId: z.string().uuid(), userId: z.string().uuid() }), payment_status: z.string(), payment_intent: z.string().nullable(), amount_total: z.number().int(), currency: z.string() }).parse(event.data.object);
        const order = await db.from('credit_payments').select('*').eq('id', session.metadata.orderId).eq('environment',rawEnv).eq('user_id',session.metadata.userId).single();
        if (order.error) throw new Error('Order not available');
        // A valid signed event may arrive before the create-session call saves its ID.
        if (!order.data.session_id) {
          const saved = await db.from('credit_payments').update({ session_id: session.id }).eq('id',order.data.id).is('session_id',null);
          if (saved.error) throw saved.error;
        }
        if ((event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') && session.payment_status === 'paid') {
          const result = await db.rpc('fulfill_credit_payment', { p_payment: order.data.id, p_env: rawEnv, p_event: event.id, p_session: session.id, p_intent: session.payment_intent ?? '', p_amount: session.amount_total, p_currency: session.currency });
          if (result.error) throw result.error;
        } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
          const result = await db.from('credit_payments').update({ status: event.type === 'checkout.session.expired' ? 'cancelled' : 'failed', updated_at: new Date().toISOString() }).eq('id',order.data.id).eq('status','pending');
          if (result.error) throw result.error;
        }
      }
      if (event.type === 'charge.refunded') {
        const charge = z.object({ payment_intent: z.string(), amount_refunded: z.number().int().nonnegative() }).parse(event.data.object);
        const result = await db.rpc('refund_credit_payment', { p_env: rawEnv, p_event: event.id, p_intent: charge.payment_intent, p_refunded: charge.amount_refunded });
        if (result.error) throw result.error;
      }
      return Response.json({ received: true });
    } catch (error) {
      console.error('Payment event processing failed', event.id, error);
      return new Response('Payment processing unavailable; retry', { status: 500 });
    }
  },
} } });