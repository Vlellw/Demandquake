import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
const { identity } = vi.hoisted(() => ({ identity: { user: null as null | { id: string }, ready: true } }));
vi.mock('@/hooks/use-auth', () => ({ useAuthUser: () => identity }));
import { DemoSessionProvider, useDemoSession } from '@/components/demo/DemoSession';
const wrapper = ({ children }: { children: ReactNode }) => <DemoSessionProvider>{children}</DemoSessionProvider>;
afterEach(() => { cleanup(); localStorage.clear(); identity.user = null; });
it('starts new signed-out visitors in the read-only demo', async () => {
  const { result } = renderHook(useDemoSession, { wrapper });
  await waitFor(() => expect(result.current.active).toBe(true));
});
it('never replaces a personal account with the demo', async () => {
  identity.user = { id: 'personal' };
  const { result } = renderHook(useDemoSession, { wrapper });
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.active).toBe(false);
});
it('keeps the demo exited after remounting so personal sign-in stays available', async () => {
  const first = renderHook(useDemoSession, { wrapper });
  await waitFor(() => expect(first.result.current.active).toBe(true));
  act(() => first.result.current.leave());
  first.unmount();
  const next = renderHook(useDemoSession, { wrapper });
  await waitFor(() => expect(next.result.current.ready).toBe(true));
  expect(next.result.current.active).toBe(false);
});