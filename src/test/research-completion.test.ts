import { expect, it, vi } from 'vitest';

const { updates, artwork, generateJSON } = vi.hoisted(() => ({
  updates: [] as Record<string, unknown>[],
  artwork: vi.fn(() => new Promise(() => {})),
  generateJSON: vi.fn(async () => ({ name: 'Test concept', tagline: 'A test hypothesis', brand: {}, problem: {}, assessment: {} })),
}));
vi.mock('@/lib/ai.server', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/ai.server')>(), generateJSON,
}));
vi.mock('@/lib/banner.server', () => ({ generateStartupBanner: artwork }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {
  from: (table: string) => {
    let inserted = false;
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'not', 'limit', 'order', 'ilike']) chain[method] = () => chain;
    chain['insert'] = () => { inserted = true; return chain; };
    chain['update'] = (patch: Record<string, unknown>) => { updates.push(patch); return chain; };
    chain['single'] = async () => ({ data: inserted ? { id: 'startup' } : {
      id: 'cluster', source_ids: [], competitor_source_ids: [], signals: [], title: 'Test problem',
    }, error: null });
    chain['then'] = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'startups' ? [{ id: 'startup', name: 'Test concept' }] : [], error: null }).then(resolve);
    return chain;
  },
} }));
import { generateStartup } from '@/lib/pipeline.server';

it('completes a generated startup without waiting for decorative artwork', async () => {
  await generateStartup({ id: 'run', query: 'test problem', industry: null, geography: null, status: 'generating', plan: {}, stats: {}, stage_started_at: null, created_at: '2026-11-15' }, 'cluster');
  expect(updates).toContainEqual({ generation_status: 'done', startup_id: 'startup', generation_error: null });
  expect(artwork).not.toHaveBeenCalled();
  expect(generateJSON).toHaveBeenCalledWith(expect.objectContaining({ name: 'startup_profile', effort: 'low' }));
});