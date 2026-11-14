import { useNavigate } from "@tanstack/react-router";
import { Command as CommandPrimitive } from "cmdk";
import { BookOpen, Briefcase, Compass, Telescope } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function SiteSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  function go(fn: () => void) { onOpenChange(false); fn(); }
  const itemClass = "flex cursor-pointer items-center gap-3 rounded-[3px] px-3 py-3 text-sm text-foreground aria-selected:bg-accent";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md gap-0 p-4">
      <DialogTitle className="sr-only">Menu</DialogTitle>
      <DialogDescription className="sr-only">Go to a page.</DialogDescription>
      <CommandPrimitive><CommandPrimitive.List>
            <CommandPrimitive.Group
              heading="Go to"
              className="[&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-foreground mt-1 border-t border-border pt-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
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
    </DialogContent>
  </Dialog>;
}
