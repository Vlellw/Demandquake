import { useEffect, useState } from "react";
import { Link, useHydrated, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Briefcase, ChevronDown, ChevronRight, CircleUserRound, Compass, LogOut, Menu } from "lucide-react";
import { DemandquakeLogo } from "@/components/brand/DemandquakeLogo";
import { SiteSearch } from "@/components/layout/SiteSearch";
import { JourneySteps } from "@/components/journey/JourneySteps";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { displayName, useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CreditBalance } from '@/components/credits/CreditBalance';
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/discover", label: "Discover startups", icon: Compass, match: (p: string) => p === "/discover" || p.startsWith("/startup") || p.startsWith("/research") },
  { to: "/method", label: "How it works", icon: BookOpen, match: (p: string) => p === "/method" },
  { to: "/workspace", label: "My startups", icon: Briefcase, match: (p: string) => p.startsWith("/workspace") || p.startsWith("/invite") },
] as const;

/**
 * Two-tier header: a thin ink utility bar with the account link (right), then a white
 * bar with the logo (left), bold navigation and search (right).
 */
export function AppHeader() {
  const { user, ready } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // A protected page can redirect to sign-in before hydration, so the server-rendered highlight may be
  // stale; remounting the nav once hydrated redraws it from the real location.
  const hydrated = useHydrated();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
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

  const utilityLink =
    "inline-flex h-8 items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-ink-foreground hover:underline underline-offset-4";

  return (
    <>
      <div className="bg-ink text-ink-foreground">
        <div className="mx-auto flex h-8 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <p className="hidden truncate text-[0.6875rem] text-ink-foreground/80 lg:block">
            Startup ideas built from real problems found on the live web
          </p>
          <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-5">
            {ready && user && <CreditBalance userId={user.id} />}
            {ready && !user && (
              <Link to="/auth" className={utilityLink}>
                <CircleUserRound className="size-4" /> Sign in
              </Link>
            )}
            {ready && user && (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(utilityLink, "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-foreground/60")}>
                  <CircleUserRound className="size-4" />
                  <span className="max-w-20 truncate sm:max-w-40">{displayName(user)}</span>
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-sm font-semibold text-foreground">{displayName(user)}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/workspace" })}>
                    <Briefcase className="size-4" /> My startups
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={signOut}>
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-0 px-4 py-2 sm:px-6 md:h-16 md:flex-nowrap md:py-0">
          <Link to="/" className="shrink-0" aria-label="Demandquake home">
            <DemandquakeLogo />
          </Link>

          <div id="header-journey" className="order-last w-full min-w-0 [&:has(>nav)>div]:hidden md:order-none md:ml-auto md:w-auto md:flex-1">
            <div>
              <JourneySteps inline current={pathname.startsWith("/workspace") ? 4 : 1}
                renderStep={(n, content, cls) => n === 1 ? (
                  <Link to="/discover" search={{ research: true }} className={cls}>{content}</Link>
                ) : undefined}
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="grid size-10 cursor-pointer place-items-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open navigation menu" title="Menu"
            >
              <Menu className="size-5" />
            </button>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="grid size-10 cursor-pointer place-items-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[86vw] max-w-sm p-0">
                <div className="border-b border-border px-5 py-4">
                  <SheetTitle asChild>
                    <span>
                      <DemandquakeLogo />
                    </span>
                  </SheetTitle>
                  <SheetDescription className="mt-2 text-xs text-muted-foreground">
                    Startup ideas built from real problems found on the live web.
                  </SheetDescription>
                </div>
                <nav aria-label="Mobile" className="flex flex-col py-2">
                  {NAV.map((item) => {
                    const active = item.match(pathname);
                    return (
                      <SheetClose asChild key={item.to}>
                        <Link
                          to={item.to}
                          className={cn(
                            "flex items-center gap-3 border-l-[3px] px-5 py-4 text-base font-bold transition-colors hover:bg-accent",
                            active ? "border-primary text-primary" : "border-transparent text-foreground",
                          )}
                        >
                          <item.icon className="size-5" />
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
                <div className="border-t border-border px-5 py-4">
                  {ready && !user && (
                    <SheetClose asChild>
                      <Link to="/auth" className="inline-flex h-10 items-center gap-2 rounded-full border border-ink px-5 text-sm font-semibold text-foreground hover:bg-ink hover:text-ink-foreground">
                        <CircleUserRound className="size-4" /> Sign in
                      </Link>
                    </SheetClose>
                  )}
                  {ready && user && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Signed in as <span className="font-semibold text-foreground">{displayName(user)}</span>
                      </p>
                      <SheetClose asChild>
                        <button
                          type="button"
                          onClick={signOut}
                          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-ink px-5 text-sm font-semibold text-foreground hover:bg-ink hover:text-ink-foreground"
                        >
                          <LogOut className="size-4" /> Sign out
                        </button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <SiteSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
