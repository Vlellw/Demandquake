import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { cn } from "@/lib/utils";
import customerPhoto from "@/assets/mosaic-customer.jpg";
import evidencePhoto from "@/assets/mosaic-evidence.jpg";
import planPhoto from "@/assets/mosaic-plan.jpg";

type Tile = {
  step: string;
  title: string;
  body: string;
  cta: string;
  tone: string;
  link: { to: "/"; hash: string } | { to: "/method" } | { to: "/workspace" };
};

const TILES = [
  {
    step: "Step 1",
    title: "Real problems, found online",
    body: "We search forums, reviews, job posts and news for problems businesses keep describing, then group the ones that repeat.",
    cta: "How we research",
    tone: "bg-primary text-primary-foreground",
    link: { to: "/method" },
  },
  {
    step: "Step 2",
    title: "Every fact has a source",
    body: "Open a startup to read the posts and articles behind it. Anything the AI guessed is labelled as a hypothesis.",
    cta: "Browse startups",
    tone: "bg-tile-purple text-tile-foreground",
    link: { to: "/", hash: "startups" },
  },
  {
    step: "Step 3",
    title: "Claim it and start building",
    body: "Claim an idea to get a private workspace with a launch checklist, notes and invites for co-founders.",
    cta: "My startups",
    tone: "bg-tile-green text-tile-foreground",
    link: { to: "/workspace" },
  },
  {
    step: "Step 4",
    title: "Watch the market move",
    body: "Market scans check new articles and tell you whether each change strengthens or weakens the idea.",
    cta: "Latest changes",
    tone: "bg-tile-magenta text-tile-foreground",
    link: { to: "/", hash: "market-changes" },
  },
] as const satisfies readonly Tile[];

function TileBlock({ tile }: { tile: Tile }) {
  return (
    <div className={cn("flex min-h-[17rem] flex-col justify-end p-6 sm:p-7", tile.tone)}>
      <p className="eyebrow text-current opacity-90">{tile.step}</p>
      <h3 className="mt-2 font-display text-[1.4rem] font-bold leading-tight">{tile.title}</h3>
      <p className="mt-2 text-sm leading-relaxed opacity-90">{tile.body}</p>
      <div className="mt-5">
        <Button asChild variant="glass" size="sm" className="h-9 px-4">
          {"hash" in tile.link ? (
            <Link to={tile.link.to} hash={tile.link.hash}>
              {tile.cta} <ArrowRight />
            </Link>
          ) : (
            <Link to={tile.link.to}>
              {tile.cta} <ArrowRight />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}

function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative hidden overflow-hidden lg:block", className)}>
      <img src={src} alt={alt} width={1024} height={1024} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

/** Four steps as a Lindström-style mosaic of colored tiles and photos. */
export function HowItWorksMosaic() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
      <SectionHeading
        id="how-heading"
        eyebrow="How it works"
        title="From a problem online to a startup you can build"
        description="Four simple steps. Browsing and reading the evidence need no account."
      />
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[17rem_17rem]">
        <Photo src={customerPhoto} alt="A bakery owner checking orders on a tablet" />
        <TileBlock tile={TILES[0]} />
        <Photo src={evidencePhoto} alt="Hands highlighting lines in printed research" className="lg:row-span-2" />
        <TileBlock tile={TILES[1]} />
        <TileBlock tile={TILES[2]} />
        <Photo src={planPhoto} alt="A founder writing a plan in a notebook" />
        <TileBlock tile={TILES[3]} />
      </div>
    </section>
  );
}
