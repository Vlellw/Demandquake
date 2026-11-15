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
  link: { to: "/discover"; search: { view?: string; overview?: string } } | { to: "/method" } | { to: "/workspace" };
};

const TILES = [
  {
    step: "Step 1",
    title: "How Demandquake works",
    body: "See how Demandquake searches the web, groups recurring problems and separates sourced facts from AI suggestions.",
    cta: "Read how it works",
    tone: "bg-primary text-primary-foreground",
    link: { to: "/method" },
  },
  {
    step: "Step 2",
    title: "Explore startup ideas",
    body: "Browse the startup catalog and choose an idea to inspect. Its profile shows source-linked facts, competitors and labelled AI hypotheses.",
    cta: "Explore startup ideas",
    tone: "bg-tile-purple text-tile-foreground",
    link: { to: "/discover", search: {} },
  },
  {
    step: "Step 3",
    title: "Manage your startups",
    body: "Open the startups you have already claimed to manage assumptions, notes, co-founder access and market scans in your workspace.",
    cta: "Open my startups",
    tone: "bg-tile-green text-tile-foreground",
    link: { to: "/workspace" },
  },
] as const satisfies readonly Tile[];

function TileBlock({ tile }: { tile: Tile }) {
  return (
    <div className={cn("flex min-h-[17rem] flex-col justify-end p-6 sm:p-7", tile.tone)}>
      <h3 className="mt-2 font-display text-[1.4rem] font-bold leading-tight">{tile.title}</h3>
      <p className="mt-2 text-sm leading-relaxed opacity-90">{tile.body}</p>
      <div className="mt-5">
        <Button asChild variant="glass" size="sm" className="h-9 px-4">
          {"search" in tile.link ? (
            <Link to={tile.link.to} search={tile.link.search} {...(tile.link.search.overview ? { hash: "market-overview" } : {})}>
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

/** Three journey steps paired with topic photography. */
export function HowItWorksMosaic() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6">
      <SectionHeading
        id="how-heading"
        title="From a problem online to a startup you can build"
      />
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[17rem_17rem]">
        <Photo src={customerPhoto} alt="A bakery owner checking orders on a tablet" />
        <TileBlock tile={TILES[0]} />
        <Photo src={evidencePhoto} alt="Hands highlighting lines in printed research" />
        <TileBlock tile={TILES[1]} />
        <TileBlock tile={TILES[2]} />
        <Photo src={planPhoto} alt="A founder writing a plan in a notebook" />
      </div>
    </section>
  );
}
