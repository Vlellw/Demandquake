import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, LogOut, Radar, Sparkles } from "lucide-react";
import { DemandquakeLogo } from "@/components/brand/DemandquakeLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { displayName, useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, ready } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navItem = (active: boolean) =>
    cn(
      "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
      active ? "bg-foreground/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="Demandquake home">
          <DemandquakeLogo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className={navItem(pathname === "/")}>
            <Radar className="size-4" /> Discover
          </Link>
          <Link to="/method" className={navItem(pathname === "/method")}>
            <Sparkles className="size-4" /> Method
          </Link>
          <Link to="/workspace" className={navItem(pathname.startsWith("/workspace"))}>
            <Briefcase className="size-4" /> My startups
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground lg:inline-flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
            </span>
            Live web · Context.dev
          </span>
          {ready && !user && (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          {ready && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface-raised font-display text-sm font-semibold text-foreground transition-colors hover:border-primary/50"
                  aria-label="Account menu"
                >
                  {displayName(user).slice(0, 1).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium text-foreground">{displayName(user)}</div>
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
    </header>
  );
}
