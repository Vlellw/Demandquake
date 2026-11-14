import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { myProjectsQuery } from "@/lib/queries";
import { recommendStartups } from "@/lib/project-progress";
import type { StartupCardDTO } from "@/lib/dto";
import { StartupCard } from "./StartupCard";

/** Signed-in founders see startups that share an industry or market with the ones they claimed. */
export function PickedForYou({ cards }: { cards: StartupCardDTO[] }) {
  const { user } = useAuthUser();
  const { data: projects } = useQuery({ ...myProjectsQuery, enabled: !!user });
  const picks = useMemo(() => (projects ? recommendStartups(cards, projects, 3) : []), [cards, projects]);

  if (!user || !projects?.length || picks.length === 0) return null;
  const names = projects.slice(0, 3).map((p) => p.name);

  return (
    <section aria-labelledby="picked-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Picked for you
          </p>
          <h2 id="picked-heading" className="mt-1 font-display text-2xl font-semibold text-foreground">
            Close to what you’re building
          </h2>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Matched on industry and region with {names.join(", ")}
          {projects.length > names.length ? ` and ${projects.length - names.length} more` : ""}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {picks.map(({ card, reason }, i) => (
          <div key={card.id} className="flex min-w-0 flex-col gap-2">
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-primary">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> {reason}
            </p>
            <StartupCard card={card} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
