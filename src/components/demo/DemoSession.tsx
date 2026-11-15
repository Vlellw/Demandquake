import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuthUser } from '@/hooks/use-auth';

const DemoContext = createContext({ active: false, ready: false, leave: () => {} });
const KEY = 'demandquake-demo-dismissed';

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuthUser();
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setDismissed(window.localStorage.getItem(KEY) === 'true');
    setReady(true);
  }, []);
  const leave = () => {
    window.localStorage.setItem(KEY, 'true');
    setDismissed(true);
  };
  return <DemoContext.Provider value={{ active: ready && authReady && !user && !dismissed, ready: ready && authReady, leave }}>{children}</DemoContext.Provider>;
}

export const useDemoSession = () => useContext(DemoContext);