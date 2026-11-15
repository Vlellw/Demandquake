import { expect, it, vi } from 'vitest';
import { freeCreditGrantInput, grantFreePackage } from '@/lib/free-credit-grant';

const input = { packageId: 'starter', requestId: '00000000-0000-4000-8000-000000000001', environment: 'sandbox' as const };

it('uses the authenticated user and server package lookup, not browser amounts', async () => {
  const grant = vi.fn(async () => ({ credits: 100, balance: 110, added: true }));
  expect(await grantFreePackage('signed-in-founder', input, grant)).toEqual({ credits: 100, balance: 110, added: true });
  expect(grant).toHaveBeenCalledWith({ p_user: 'signed-in-founder', p_env: 'sandbox', p_package: 'starter', p_request: input.requestId });
  expect(freeCreditGrantInput.safeParse({ ...input, credits: 1000000, userId: 'other-user' }).success).toBe(false);
});

it('allows another request for the same package without a per-account limit', async () => {
  const grant = vi.fn(async () => ({ added: true }));
  await grantFreePackage('founder', input, grant);
  await grantFreePackage('founder', { ...input, requestId: '00000000-0000-4000-8000-000000000002' }, grant);
  expect(grant).toHaveBeenCalledTimes(2);
  expect(grant.mock.calls[0]).not.toEqual(grant.mock.calls[1]);
});