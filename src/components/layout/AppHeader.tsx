import { useEffect, useState } from "react";
import { Link, useCanGoBack, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemandquakeLogo } from "@/components/brand/DemandquakeLogo";
import { SiteSearch } from "@/components/layout/SiteSearch";
import { JourneySteps } from "@/components/journey/JourneySteps";
import { journeyStepForPath } from "@/lib/journey";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared header with journey navigation and a single account/navigation drawer.
 */
export function AppHeader() {
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-0 px-4 py-2 sm:px-6 md:h-16 md:flex-nowrap md:py-0">
          <Link to="/" className="shrink-0" aria-label="Demandquake home">
            <DemandquakeLogo />
          </Link>

          <div id="header-journey" className="order-last w-full min-w-0 [&:has(>nav)>div]:hidden md:order-none md:ml-auto md:w-auto md:flex-1">
            <div>
              <JourneySteps inline current={journeyStepForPath(pathname)}
                renderStep={(n, content, cls) => n === 1 ? (
                  <Link to="/discover" search={{ research: true }} className={cls}>{content}</Link>
                ) : n === 3 ? (
                  <Link to="/workspace" className={cls}>{content}</Link>
                ) : undefined}
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-4">
            {hydrated && canGoBack && pathname !== "/" && (
              <Button variant="ghost" size="icon" onClick={() => router.history.back()} aria-label="Back" title="Back">
                <ArrowLeft className="size-5" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={() => setSearchOpen(true)}
              className="text-foreground"
              aria-label="Open navigation menu" title="Menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <SiteSearch open={searchOpen} onOpenChange={setSearchOpen} onSignOut={signOut} />
    </>
  );
}
