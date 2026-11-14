import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { HowItWorksMosaic } from "@/components/home/HowItWorksMosaic";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Demandquake — Find a startup worth building" },
    { name: "description", content: "Find startup ideas grounded in real web evidence. Sign in to explore sources, AI-labelled hypotheses and founder workspaces." },
    { property: "og:title", content: "Demandquake — Find a startup worth building" },
    { property: "og:description", content: "Evidence-first startup discovery, with source-linked facts and clearly labelled AI hypotheses." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuthUser();
  return <div>
    <HeroCarousel />
    <section className="bg-surface-sunken px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading title="Real problems. Ideas you can investigate."
        description="Each idea starts from real web sources. Facts link to their evidence, and anything the AI suggests is clearly labelled as a hypothesis." />
      <div className="mx-auto mt-8 max-w-2xl text-center">
        <p className="text-muted-foreground">Sign in to browse startups, read the research and follow market changes. Your founder workspace stays private to you and invited co-founders.</p>
        <Button asChild variant="hero" className="mt-6">
          {user ? <Link to="/discover">Explore startups <ArrowRight /></Link> : <Link to="/auth" search={{ redirect: "/discover" }}>Sign in to discover <ArrowRight /></Link>}
        </Button>
      </div>
    </section>
    <HowItWorksMosaic />
  </div>;
}