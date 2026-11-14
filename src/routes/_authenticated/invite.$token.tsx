import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Link2Off, Loader2, UserPlus } from "lucide-react";
import { invitePreviewQuery } from "@/lib/queries";
import { acceptInvite } from "@/lib/projects.functions";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(invitePreviewQuery(params.token)),
  head: () => ({
    meta: [
      { title: "Join a startup workspace — Demandquake" },
      { name: "description", content: "You were invited to co-found a startup workspace on Demandquake." },
      { property: "og:title", content: "Join a startup workspace — Demandquake" },
      { property: "og:description", content: "Accept the invite to edit this founder workspace together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { data: invite } = useSuspenseQuery(invitePreviewQuery(token));
  const accept = useServerFn(acceptInvite);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(false);

  async function join() {
    setJoining(true);
    try {
      const res = await accept({ data: { token } });
      if (!res.ok) {
        toast.error(res.error);
        await queryClient.invalidateQueries({ queryKey: ["invite", token] });
        setJoining(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("You joined the workspace.");
      navigate({ to: "/workspace/$projectId", params: { projectId: res.projectId }, replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Couldn’t join right now. Please try again.");
      setJoining(false);
    }
  }

  const usable = invite.status === "valid" || invite.status === "owner" || invite.status === "member";

  if (!usable) {
    const copy =
      invite.status === "revoked"
        ? "The founder revoked this invite link."
        : invite.status === "expired"
          ? "This invite link has expired."
          : "This invite link doesn’t exist.";
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-surface-raised">
          <Link2Off className="size-5 text-muted-foreground" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">Invite unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy} Ask the founder to send you a new one.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">Explore opportunities</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20" style={brandStyle(invite.brand)}>
      <div className="panel relative overflow-hidden p-8 text-center">
        <div className="brand-surface pointer-events-none absolute inset-x-0 top-0 h-28 opacity-50" />
        <div className="relative">
          <StartupMark brand={invite.brand} size="xl" className="mx-auto" />
          <p className="eyebrow mt-6">{invite.status === "valid" ? "Co-founder invite" : "Your workspace"}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">{invite.project_name}</h1>
          {invite.tagline && <p className="mt-2 text-muted-foreground">{invite.tagline}</p>}
          <p className="mt-6 text-sm text-foreground/85">
            {invite.status === "owner"
              ? "This is your own workspace — you shared this link."
              : invite.status === "member"
                ? "You’re already a co-founder on this workspace."
                : `${invite.owner_name ?? "The founder"} invited you to build this startup together. You’ll be able to edit the concept, checklist, assumptions, roadmap and notes.`}
          </p>
          {invite.status === "valid" ? (
            <Button variant="hero" className="mt-6 w-full" onClick={join} disabled={joining}>
              {joining ? <Loader2 className="animate-spin" /> : <UserPlus />} Join as co-founder
            </Button>
          ) : (
            <Button asChild variant="hero" className="mt-6 w-full">
              <Link to="/workspace/$projectId" params={{ projectId: invite.project_id! }}>
                Open workspace <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
