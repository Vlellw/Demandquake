import { Link, useNavigate } from "@tanstack/react-router";
import { Command as CommandPrimitive } from "cmdk";
import { BookOpen, Briefcase, CircleUserRound, Compass, LogOut, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CreditBalance } from "@/components/credits/CreditBalance";
import { displayName, useAuthUser } from "@/hooks/use-auth";
import { useDemoSession } from '@/components/demo/DemoSession';

export function SiteSearch({ open, onOpenChange, onSignOut }: { open: boolean; onOpenChange: (open: boolean) => void; onSignOut: () => Promise<void> }) {
  const navigate = useNavigate();
  const { user, ready } = useAuthUser();
  const demo = useDemoSession();
  function go(fn: () => void) { onOpenChange(false); fn(); }
  const itemClass = "flex cursor-pointer items-center gap-3 rounded-md px-3 py-4 text-sm font-medium text-foreground aria-selected:bg-accent hover:bg-accent";
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-[88vw] max-w-sm flex-col gap-0 overflow-y-auto p-0 motion-reduce:animate-none motion-reduce:transition-none">
      <div className="flex h-16 items-center border-b border-border px-6">
        <SheetTitle>Go to</SheetTitle>
        <SheetDescription className="sr-only">Go to a page.</SheetDescription>
      </div>
      <nav aria-label="Site navigation" className="p-4">
      <CommandPrimitive><CommandPrimitive.List>
            <CommandPrimitive.Group
              className="space-y-1"
            >
              <CommandPrimitive.Item value="discover startups browse all" onSelect={() => go(() => demo.active ? navigate({ to: '/demo' }) : navigate({ to: "/discover", search: { view: "all" } }))} className={itemClass}>
                <Compass className="size-4 text-primary" /> Search startups
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="how it works method sources" onSelect={() => go(() => navigate({ to: "/method" }))} className={itemClass}>
                <BookOpen className="size-4 text-primary" /> How it works
              </CommandPrimitive.Item>
              <CommandPrimitive.Item value="my startups workspace claimed" onSelect={() => go(() => demo.active ? navigate({ to: '/demo' }) : navigate({ to: "/workspace" }))} className={itemClass}>
                <Briefcase className="size-4 text-primary" /> My startups
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>
      </CommandPrimitive.List></CommandPrimitive>
      </nav>
      <section aria-label="Your account" className="mt-auto border-t border-border bg-muted/50 px-6 py-6">
        {ready && user && <>
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-primary"><CircleUserRound className="size-5" /></span>
            <div className="min-w-0"><p className="break-words text-sm font-semibold text-foreground">{displayName(user)}</p><p className="break-all text-xs text-muted-foreground">{user.email}</p></div>
          </div>
          <CreditBalance userId={user.id} onNavigate={() => onOpenChange(false)} />
          <div className="mt-6 border-t border-border pt-3">
            <Button asChild variant="ghost" className="-ml-3"><Link to="/settings" onClick={() => onOpenChange(false)}><Settings />Settings</Link></Button>
            <Button variant="ghost" className="-ml-3" onClick={() => { onOpenChange(false); void onSignOut(); }}><LogOut />Sign out</Button>
          </div>
        </>}
        {demo.active && <><div className="mb-5 flex items-center gap-3"><CircleUserRound className="size-8 text-primary" /><div><p className="font-semibold">Test user</p><p className="text-xs text-muted-foreground">Read-only demo · no account session</p></div></div><Button asChild variant="outline" className="w-full"><Link to="/auth" search={{ redirect: '/discover' }} onClick={() => { demo.leave(); onOpenChange(false); }}><LogOut />Leave demo and sign in</Link></Button></>}
        {ready && !user && !demo.active && <Button asChild className="w-full"><Link to="/auth" onClick={() => onOpenChange(false)}><CircleUserRound />Sign in</Link></Button>}
      </section>
    </SheetContent>
  </Sheet>;
}
