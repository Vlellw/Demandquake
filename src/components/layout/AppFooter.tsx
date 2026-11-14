import { Link } from "@tanstack/react-router";
import { ArrowUp, BookOpen, Compass } from "lucide-react";
import { DemandquakeLogo } from "@/components/brand/DemandquakeLogo";
import { InfoTip } from "@/components/common/InfoTip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthUser } from "@/hooks/use-auth";

const LINKS = [{ to: "/workspace", label: "My startups" }] as const;

const circle =
  "grid size-10 place-items-center rounded-full border border-ink text-foreground transition-colors hover:bg-ink hover:text-ink-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AppFooter() {
  const { user, ready } = useAuthUser();
  return (
    <footer className="mt-24 border-t border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <DemandquakeLogo />
          <InfoTip label="About Demandquake" align="start">
            Demandquake reads the live web, finds problems businesses keep describing, and turns them into startup ideas
            signed-in founders can explore and claim. It shows evidence, not guarantees: problems found online do not prove that
            customers will pay, so validate before you build.
          </InfoTip>
        </div>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground underline-offset-4 hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              {ready && !user && (
                <li>
                  <Link to="/auth" className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground underline-offset-4 hover:underline">
                    Sign in
                  </Link>
                </li>
              )}
            </ul>
            <p className="mt-5 text-xs text-muted-foreground">
              © {new Date().getUTCFullYear()} Demandquake · Research powered by Context.dev
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/discover" className={circle} aria-label="Discover startups">
                    <Compass className="size-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-muted text-xs font-normal text-muted-foreground">Browse startup ideas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/method" className={circle} aria-label="How it works">
                    <BookOpen className="size-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="bg-muted text-xs font-normal text-muted-foreground">How it works</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`${circle} cursor-pointer`}
                    aria-label="Back to top"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    <ArrowUp className="size-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-muted text-xs font-normal text-muted-foreground">Back to top</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </footer>
  );
}
