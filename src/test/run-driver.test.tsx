import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { advance } = vi.hoisted(() => ({ advance: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: () => advance }));
vi.mock('@/lib/research.functions', () => ({ advanceDiscovery: {} }));
import { useRunDriver } from '@/hooks/use-run-driver';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('concurrent discovery workers', () => {
  it('uses only one request while a serial research stage is in progress', async () => {
    advance.mockImplementation(() => new Promise(() => {}));
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => useRunDriver('run', 'searching'), { wrapper });
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(advance).toHaveBeenCalledTimes(1);
  });
  it('starts all three generation workers without waiting for the display refresh', async () => {
    const client = new QueryClient();
    vi.spyOn(client, 'invalidateQueries').mockImplementation(() => new Promise(() => {}));
    advance.mockResolvedValueOnce({ ok: true, status: 'generating', progressed: true, busy: false });
    advance.mockImplementation(() => new Promise(() => {}));
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => useRunDriver('run', 'analyzed'), { wrapper });
    await waitFor(() => expect(advance).toHaveBeenCalledTimes(4));
  });
  it('ignores a late credit error once another worker completes', async () => {
    const pending: ((value: unknown) => void)[] = [];
    advance.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useRunDriver('run', 'generating'), { wrapper });
    await waitFor(() => expect(pending).toHaveLength(3));
    await act(async () => pending[0]?.({ ok: true, status: 'complete' }));
    await act(async () => {
      pending[1]?.({ ok: false, error: 'Only a researcher with reserved credits can advance this run.' });
      pending[2]?.({ ok: false, error: 'Late worker error' });
    });
    expect(result.current.driverError).toBeNull();
    expect(advance).toHaveBeenCalledTimes(3);
  });
  it('does not conceal errors on ongoing runs but clears them when completion is observed', async () => {
    advance.mockResolvedValue({ ok: false, error: 'Research unavailable' });
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(({ status }) => useRunDriver('run', status), { initialProps: { status: 'generating' }, wrapper });
    await waitFor(() => expect(result.current.driverError).toBe('Research unavailable'));
    rerender({ status: 'complete' });
    expect(result.current.driverError).toBeNull();
  });
});