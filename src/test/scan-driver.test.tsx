import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { advance } = vi.hoisted(() => ({ advance: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: () => advance }));
vi.mock('@/lib/research.functions', () => ({ advanceMarketScan: {} }));
import { useScanDriver } from '@/hooks/use-scan-driver';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function setup(status = 'analyzing') {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(({ status, scanId }) => useScanDriver(scanId, 'startup', status), { initialProps: { status, scanId: 'scan' }, wrapper }) };
}

describe('market scan completion', () => {
  it.each(['detail', 'workspace'])('ignores a late error after %s polling observes completion', async (screen) => {
    let finish: ((value: unknown) => void) | undefined;
    advance.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { client, result } = setup();
    await waitFor(() => expect(advance).toHaveBeenCalledOnce());
    await act(async () => {
      if (screen === 'detail') client.setQueryData(['scan', 'scan'], { scan: { status: 'complete' } });
      else client.setQueryData(['startup-scans', 'startup'], { scans: [{ id: 'scan', status: 'complete' }] });
      finish?.({ ok: false, error: 'Late request error' });
    });
    expect(result.current.driverError).toBeNull();
    expect(advance).toHaveBeenCalledOnce();
  });
  it('preserves ongoing errors but hides them once workspace polling removes the running scan', async () => {
    advance.mockResolvedValue({ ok: false, error: 'Scan unavailable' });
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.driverError).toBe('Scan unavailable'));
    rerender({ status: '', scanId: '' });
    expect(result.current.driverError).toBeNull();
  });
  it('hides errors on completed scan details', async () => {
    advance.mockResolvedValue({ ok: false, error: 'Scan unavailable' });
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.driverError).toBe('Scan unavailable'));
    rerender({ status: 'complete', scanId: 'scan' });
    expect(result.current.driverError).toBeNull();
  });
});