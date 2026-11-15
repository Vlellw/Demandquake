import { afterEach, expect, it, vi } from 'vitest';
import { boundedCreditRead } from '@/lib/credit-read';

afterEach(() => vi.useRealTimers());

it('returns the actual wallet balance without modifying it', async () => {
  expect(await boundedCreditRead(async () => ({ balance: 10, reserved: 0 }))).toEqual({ balance: 10, reserved: 0 });
});

it('rejects a stalled request after 15 seconds and aborts its transport', async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | undefined;
  const request = boundedCreditRead((s) => { signal = s; return new Promise<never>(() => {}); });
  const failure = expect(request).rejects.toThrow('Failed to fetch');
  await vi.advanceTimersByTimeAsync(15_000);
  await failure;
  expect(signal?.aborted).toBe(true);
});

it('preserves real errors instead of substituting a balance', async () => {
  await expect(boundedCreditRead(async () => { throw new Error('Unauthorized'); })).rejects.toThrow('Unauthorized');
});