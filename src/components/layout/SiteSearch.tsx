import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { BookOpen, Briefcase, Compass, Loader2, Search, Telescope } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { StartupMark } from "@/components/brand/StartupMark";
import { startupCardsQuery } from "@/lib/queries";
import { useAuthUser } from "@/hooks/use-auth";

/** Header search: find a startup by name, industry or problem, or jump to a main page. */
export function SiteSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const { user } = useAuthUser();
  const { data: cards, isLoading } = useQuery({ ...startupCardsQuery, enabled: open && Boolean(user) });

  function go(fn: () => void) {
    onOpenChange(false);
    setValue("");
    fn();
  }

  const itemClass =
    "flex cursor-pointer items-center gap-3 rounded-[3px] px-3 py-2.5 text-sm text-foreground aria-selected:bg-accent data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[10%] w-[calc(100%-2rem)] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-[4px] p-0">
        <DialogTitle className="sr-only">Search Demandquake</DialogTitle>
        <DialogDescription className="sr-only">Find a startup by name, industry or problem, or go to a page.</DialogDescription>
        <CommandPrimitive
          className="flex flex-col"
          filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0)}
        >
          <div className="flex items-center gap-3 border-b border-border pl-4 pr-12">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              value={value}
              onValueChange={setValue}
              placeholder="Search startups, industries or problems"
              className="h-14 w-full bg-transparent text-base text-foreground outline-none placeholder:text-faint"
            />
          </div>
          <CommandPrimitive.List className="max-h-[60vh] overflow-y-auto p-2">
            <CommandPrimitive.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              No startups match “{value}”. Try an industry such as “Healthcare”.
            </CommandPrimitive.Empty>
            <CommandPrimitive.Group
              heading="Startups"
              className="[&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
            >
              {isLoading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading startups
                </div>
              )}
              {!user && <CommandPrimitive.Item value="sign in discover startups" onSelect={() => go(() => navigate({ to: "/auth", search: { redirect: "/discover" } }))} className={itemClass}>Sign in to search startups</CommandPrimitive.Item>}
              {(user ? cards ?? [] : []).map((c) => (
                <CommandPrimitive.Item
                  key={c.id}
                  value={`${c.name} ${c.industry} ${c.geography} ${c.problem_title ?? ""} ${c.tagline}`}
                  onSelect={() => go(() => navigate({ to: "/startup/$slug", params: { slug: c.slug } }))}
                  className={itemClass}
                >
                  <StartupMark brand={c.brand} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.industry} · {c.geography}
                    </span>
                  </span>
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
            <CommandPrimitive.Group
              heading="Go to"
              className="[&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-foreground mt-1 border-t border-border pt-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
            >
              <CommandPrimitive.Item value="discover startups browse all" onSelect={() => go(() => navigate({ to: "/discover", hash: "startups" }))} className={itemClass}>
                <Compass className="size-4 text-primary" /> Browse all startups
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="research new market discovery start" onSelect={() => go(() => navigate({ to: "/discover", hash: "discover" }))} className={itemClass}>
                <Telescope className="size-4 text-primary" /> Research a new market
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="how it works method sources" onSelect={() => go(() => navigate({ to: "/method" }))} className={itemClass}>
                <BookOpen className="size-4 text-primary" /> How it works
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="my startups workspace claimed" onSelect={() => go(() => navigate({ to: "/workspace" }))} className={itemClass}>
                <Briefcase className="size-4 text-primary" /> My startups
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
