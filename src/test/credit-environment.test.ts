import { afterEach, expect, it, vi } from 'vitest';
import { creditEnvironment } from '@/lib/credit-environment';

vi.mock('@/lib/credits.functions', () => ({
  getCreditAccount: vi.fn(async () => ({ wallet: { balance: 10, reserved: 0 } })),
  getCreditCatalog: vi.fn(),
  getCreditAdmin: vi.fn(async () => ({ wallets: [{ balance: 10, reserved: 0 }] })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

it('uses the existing test wallet when payment setup is missing', () => {
  expect(creditEnvironment(undefined)).toBe('sandbox');
  expect(creditEnvironment('')).toBe('sandbox');
});

it('keeps configured live wallets separate from test wallets', () => {
  expect(creditEnvironment('pk_live_example')).toBe('live');
  expect(creditEnvironment('pk_test_example')).toBe('sandbox');
});

it('reads the actual balance without a payment token', async () => {
  vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', '');
  const { creditAccountQuery } = await import('@/lib/credit-queries');
  const { getCreditAccount } = await import('@/lib/credits.functions');
  const { QueryClient } = await import('@tanstack/react-query');
  const client = new QueryClient();
  try {
    expect(await client.fetchQuery(creditAccountQuery('founder'))).toEqual({ wallet: { balance: 10, reserved: 0 } });
    expect(getCreditAccount).toHaveBeenCalledWith(expect.objectContaining({ data: { environment: 'sandbox' } }));
  } finally {
    client.clear();
  }
});

it('still blocks payment forms when payment setup is missing', async () => {
  vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', '');
  const { getStripe } = await import('@/lib/stripe');
  expect(() => getStripe()).toThrow('Payments are not configured');
});

it('loads admin wallet reads without payment configuration', async () => {
  vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', '');
  const { creditAdminQuery } = await import('@/lib/credit-queries');
  const { getCreditAdmin } = await import('@/lib/credits.functions');
  const { QueryClient } = await import('@tanstack/react-query');
  const client = new QueryClient();
  try {
    expect(await client.fetchQuery(creditAdminQuery())).toEqual({ wallets: [{ balance: 10, reserved: 0 }] });
    expect(getCreditAdmin).toHaveBeenCalledWith(expect.objectContaining({ data: { environment: 'sandbox' } }));
  } finally {
    client.clear();
  }
});

it('uses the same wallet environment for search, claims, retries and balance reads', async () => {
  vi.stubEnv('VITE_PAYMENTS_CLIENT_TOKEN', '');
  const { getStripeEnvironment } = await import('@/lib/stripe');
  expect(getStripeEnvironment()).toBe('sandbox');
});