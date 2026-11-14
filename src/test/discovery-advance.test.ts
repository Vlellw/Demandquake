import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
const { advanceRun } = vi.hoisted(() => ({ advanceRun: vi.fn() }));
vi.mock('@/lib/pipeline.server', () => ({ advanceRun, userMessageOf: (err: Error) => err.message }));
import { advanceDiscovery } from '@/lib/research.functions';

function caller(statuses: string[], reserved = false) {
  const from = vi.fn((table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: { status: statuses.shift() ?? 'generating' } }),
      limit: async () => ({ data: reserved ? [{ id: 'reservation' }] : [], error: null }),
    };
    return chain;
  });
  const invoke = advanceDiscovery as unknown as (input: unknown) => Promise<unknown>;
  return { from, call: () => invoke({ data: { runId: 'run' }, context: { userId: 'owner', supabase: { from } } }) };
}

describe('discovery completion and settled credits', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns complete without requiring a reservation or advancing again', async () => {
    const request = caller(['complete']);
    expect(await request.call()).toEqual({ ok: true, status: 'complete', progressed: false, busy: false });
    expect(request.from).toHaveBeenCalledTimes(1);
    expect(advanceRun).not.toHaveBeenCalled();
  });
  it('handles completion between the status and reservation reads', async () => {
    expect(await caller(['generating', 'complete']).call()).toMatchObject({ ok: true, status: 'complete' });
    expect(advanceRun).not.toHaveBeenCalled();
  });
  it('still rejects an ongoing run without the caller’s reserved credits', async () => {
    expect(await caller(['generating', 'generating']).call()).toMatchObject({ ok: false });
    expect(advanceRun).not.toHaveBeenCalled();
  });
  it('advances ongoing research with reserved credits', async () => {
    advanceRun.mockResolvedValue({ status: 'generating', progressed: true, busy: false });
    expect(await caller(['generating'], true).call()).toMatchObject({ ok: true, status: 'generating' });
    expect(advanceRun).toHaveBeenCalledWith('run');
  });
  it('returns failed terminal status without attempting to spend again', async () => {
    expect(await caller(['failed']).call()).toMatchObject({ ok: true, status: 'failed', progressed: false });
    expect(advanceRun).not.toHaveBeenCalled();
  });
});