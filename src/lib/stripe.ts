import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { creditEnvironment } from './credit-environment';
export type StripeEnv = 'sandbox' | 'live';
const token = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];
export function getStripeEnvironment(): StripeEnv {
  return creditEnvironment(token);
}
let promise: Promise<Stripe | null> | null = null;
export function getStripe() {
  if (!token?.startsWith('pk_test_') && !token?.startsWith('pk_live_')) {
    throw new Error('Payments are not configured. Complete payment account setup before accepting live purchases.');
  }
  if (!promise) promise = loadStripe(token);
  return promise;
}