import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PagePending } from "./components/common/PagePending";
import { PageError } from "./components/common/PageError";
import { networkReadDelay, retryNetworkRead } from "./lib/query-recovery";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: retryNetworkRead, retryDelay: networkReadDelay },
      mutations: { retry: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PagePending,
    defaultErrorComponent: PageError,
    defaultPendingMs: 250,
  });

  return router;
};
