import { useNavigate } from "@tanstack/react-router";
import { Command as CommandPrimitive } from "cmdk";
import { BookOpen, Briefcase, Compass, Telescope } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export function SiteSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  function go(fn: () => void) { onOpenChange(false); fn(); }
  const itemClass = "flex cursor-pointer items-center gap-3 rounded-md px-3 py-4 text-sm font-medium text-foreground aria-selected:bg-accent hover:bg-accent";
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-[88vw] max-w-sm p-0 motion-reduce:animate-none motion-reduce:transition-none">
      <div className="flex h-16 items-center border-b border-border px-6">
        <SheetTitle>Go to</SheetTitle>
        <SheetDescription className="sr-only">Go to a page.</SheetDescription>
      </div>
      <nav aria-label="Site navigation" className="p-4">
      <CommandPrimitive><CommandPrimitive.List>
            <CommandPrimitive.Group
              className="space-y-1"
            >
              <CommandPrimitive.Item value="discover startups browse all" onSelect={() => go(() => navigate({ to: "/discover", search: { view: "all" } }))} className={itemClass}>
                <Compass className="size-4 text-primary" /> Browse all startups
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="research new market discovery start" onSelect={() => go(() => navigate({ to: "/discover", search: { research: true } }))} className={itemClass}>
                <Telescope className="size-4 text-primary" /> Research a new market
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="how it works method sources" onSelect={() => go(() => navigate({ to: "/method" }))} className={itemClass}>
                <BookOpen className="size-4 text-primary" /> How it works
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="my startups workspace claimed" onSelect={() => go(() => navigate({ to: "/workspace" }))} className={itemClass}>
                <Briefcase className="size-4 text-primary" /> My startups
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>
      </CommandPrimitive.List></CommandPrimitive>
      </nav>
    </SheetContent>
  </Sheet>;
}
