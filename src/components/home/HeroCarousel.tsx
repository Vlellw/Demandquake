import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import heroFounder from "@/assets/hero-founder.jpg";
import heroIndustry from "@/assets/hero-industry.jpg";
import heroMarket from "@/assets/hero-market.jpg";
import heroTeam from "@/assets/hero-team.jpg";

type Slide = {
  title: string;
  body: string;
  cta: string;
  image: string;
  alt: string;
  link: { to: "/discover"; search: { research?: boolean; view?: string; overview?: string } } | { to: "/workspace" };
};

const SLIDES: Slide[] = [
  {
    title: "Find a startup worth building",
    body: "Browse startup ideas built from real problems people describe online. Every fact links to its source.",
    cta: "Browse startups",
    image: heroFounder,
    alt: "A founder smiling at her laptop in a bright office",
    link: { to: "/discover", search: {} },
  },
  {
    title: "Research any market in minutes",
    body: "Describe a market. Demandquake reads the live web, groups the problems it keeps finding and drafts startups for them.",
    cta: "Research a market",
    image: heroIndustry,
    alt: "A factory manager checking a tablet on the production floor",
    link: { to: "/discover", search: { research: true } },
  },
  {
    title: "Look beyond the startup idea",
    body: "Choose a startup from the catalog to review its sources, competitors, AI hypotheses and available market updates.",
    cta: "Explore startup ideas",
    image: heroMarket,
    alt: "Two analysts reviewing printed market reports",
    link: { to: "/discover", search: {} },
  },
  {
    title: "Keep building your claimed startups",
    body: "Open your existing workspaces to update assumptions, keep notes, invite co-founders and run market scans.",
    cta: "Open my startups",
    image: heroTeam,
    alt: "Three co-founders planning with sticky notes on a whiteboard",
    link: { to: "/workspace" },
  },
];

const INTERVAL_S = 7;

/** Full-bleed photo carousel with segmented progress bars and circle arrow controls. */
export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  // Assume reduced motion until the browser says otherwise, so nothing auto-advances before hydration.
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback((i: number) => setActive((i + SLIDES.length) % SLIDES.length), []);
  const paused = hoverPaused || userPaused || reducedMotion;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What you can do with Demandquake"
      className="relative isolate h-[clamp(440px,64vh,640px)] overflow-hidden bg-ink"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={() => setHoverPaused(false)}
    >
      {SLIDES.map((s, i) => {
        const isActive = i === active;
        const Title = i === 0 ? "h1" : "h2";
        return (
          <div
            key={s.title}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}: ${s.title}`}
            aria-hidden={!isActive}
            inert={!isActive}
            className={cn("absolute inset-0 transition-opacity duration-700 ease-out", isActive ? "z-10 opacity-100" : "z-0 opacity-0")}
          >
            <img
              src={s.image}
              alt={s.alt}
              width={1920}
              height={1088}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-[70%_center] transition-transform duration-[8000ms] ease-out",
                isActive && !reducedMotion ? "scale-105" : "scale-100",
              )}
            />
            <div className="bg-photo-fade absolute inset-0" />
            <div className="absolute inset-0 bg-ink/35 sm:hidden" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/60 to-transparent" />
            <div className="relative mx-auto flex h-full max-w-[1400px] flex-col justify-center px-4 pb-16 sm:px-6">
              <Title className="mt-3 max-w-3xl font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.02em] text-ink-foreground sm:text-6xl lg:text-[4.75rem]">
                {s.title}
              </Title>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-foreground/90 sm:text-lg">{s.body}</p>
              <div className="mt-8">
                <Button asChild variant="glass" size="lg">
                  {"search" in s.link ? (
                    <Link to={s.link.to} search={s.link.search} {...(s.link.search.overview ? { hash: "market-overview" } : {})}>
                      {s.cta} <ArrowRight />
                    </Link>
                  ) : (
                    <Link to={s.link.to}>
                      {s.cta} <ArrowRight />
                    </Link>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-[1400px] px-4 pb-5 sm:px-6">
          <div className="mb-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              className="grid size-10 cursor-pointer place-items-center rounded-full border-2 border-ink-foreground text-ink-foreground transition-colors hover:bg-ink-foreground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-foreground/70"
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
            >
              {userPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => go(active - 1)}
              className="grid size-10 cursor-pointer place-items-center rounded-full border-2 border-ink-foreground text-ink-foreground transition-colors hover:bg-ink-foreground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-foreground/70"
              aria-label="Previous slide"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              className="grid size-10 cursor-pointer place-items-center rounded-full border-2 border-ink-foreground text-ink-foreground transition-colors hover:bg-ink-foreground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-foreground/70"
              aria-label="Next slide"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="flex gap-2 sm:gap-3">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}: ${s.title}`}
                aria-current={i === active ? "true" : undefined}
                className="group flex h-6 flex-1 cursor-pointer items-center focus-visible:outline-none"
              >
                <span className="relative h-[3px] w-full overflow-hidden bg-ink-foreground/35 transition-[height] group-hover:h-[5px] group-focus-visible:h-[5px]">
                  {i < active && <span className="absolute inset-0 bg-ink-foreground" />}
                  {i === active && (
                    <span
                      key={`${active}-${reducedMotion}`}
                      className={cn("absolute inset-0 origin-left bg-ink-foreground", !reducedMotion && "animate-hero-progress")}
                      style={{ "--hero-interval": `${INTERVAL_S}s`, animationPlayState: paused ? "paused" : "running" } as CSSProperties}
                      onAnimationEnd={() => {
                        if (!reducedMotion) go(active + 1);
                      }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
