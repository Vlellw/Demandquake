import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Globe, Loader2, Lock } from "lucide-react";
import { InfoTip } from "@/components/common/InfoTip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { projectClaimQuery } from "@/lib/queries";
import { makeProjectPrivate } from "@/lib/projects.functions";
import { creditAccountQuery } from "@/lib/credit-queries";
import { canAfford } from "@/lib/credit-rules";
import { getStripeEnvironment } from "@/lib/stripe";
import { useAuthUser } from "@/hooks/use-auth";
import type { ProjectDTO } from "@/lib/dto";
import { CreditReadFeedback } from "@/components/credits/CreditReadFeedback";

export function useProjectClaim(projectId: string) {
  return useQuery(projectClaimQuery(projectId));
}

/** Public/private claim badge for the workspace header, with the owner's "make private" upgrade. */
export function ClaimAccess({ project }: { project: ProjectDTO }) {
  const { data: claim } = useProjectClaim(project.id);
  if (!claim?.access) return null;
  const isPrivate = claim.access === "private";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge variant={isPrivate ? "live" : "outline"}>
        {isPrivate ? <Lock /> : <Globe />} {isPrivate ? "Private claim" : "Public claim"}
      </Badge>
      <InfoTip align="start" label="What this claim means">
        {isPrivate
          ? "Other founders can’t find or claim this startup. Only you and the co-founders you invite can open it. Deleting the workspace returns the idea to the public catalog."
          : claim.other_builders > 0
            ? `Other founders can still find and claim this startup - ${claim.other_builders} already ${claim.other_builders === 1 ? "is" : "are"} building it, so it has to stay public. Your workspace itself is private.`
            : "Other founders can still find and claim this startup. Your workspace itself is private."}
      </InfoTip>
      {project.is_owner && claim.can_make_private && claim.upgrade_cost !== null && (
        <MakePrivate project={project} cost={claim.upgrade_cost} />
      )}
    </span>
  );
}

function MakePrivate({ project, cost }: { project: ProjectDTO; cost: number }) {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const makePrivate = useServerFn(makeProjectPrivate);
  const account = useQuery({ ...creditAccountQuery(user?.id ?? ""), enabled: Boolean(user) });
  const wallet = account.data?.wallet;
  const affordable = wallet ? canAfford(wallet.balance, wallet.reserved, cost) : false;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const slug = project.research.startup_slug;

  async function confirm() {
    if (busy || !affordable) return;
    setBusy(true);
    try {
      const res = await makePrivate({ data: { projectId: project.id, environment: getStripeEnvironment(), expectedCost: cost } });
      setOpen(false);
      toast.success(res.changed ? `${project.name} is now private to your workspace` : `${project.name} is already private`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Couldn’t make this startup private.";
      toast.error(`${message} No credits were charged.`);
    } finally {
      setBusy(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project-claim", project.id] }),
        queryClient.invalidateQueries({ queryKey: ["project", project.id] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["credit-account"] }),
        queryClient.invalidateQueries({ queryKey: ["startups"] }),
        ...(slug ? [queryClient.invalidateQueries({ queryKey: ["startup", slug] })] : []),
      ]);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
          <Lock /> Make private · {cost} credits
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Make {project.name} private?</AlertDialogTitle>
          <AlertDialogDescription>
            Other founders will no longer find or claim this startup. Only you and the co-founders you invite can open it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="grid grid-cols-2 gap-4">
          <div className="stat-rule pt-3">
            <dt className="text-sm text-primary">Cost</dt>
            <dd className="font-display text-2xl font-bold text-primary">{cost} credits</dd>
          </div>
          <div className="stat-rule pt-3">
            <dt className="text-sm text-primary">You have</dt>
            <dd className="font-display text-lg font-bold text-primary">
              {wallet ? `${(wallet.balance - wallet.reserved).toLocaleString("en-US")} credits` : account.isError ? 'Balance unavailable' : 'Loading balance…'}
            </dd>
          </div>
        </dl>
        <CreditReadFeedback query={account} hasData={Boolean(wallet)} />
        <p className="text-sm text-muted-foreground">You only pay the difference to a private claim. Nothing is charged if this fails.</p>
        {wallet && !affordable && (
          <p role="alert" className="rounded-[4px] border border-negative/40 p-3 text-sm text-negative">
            You need {cost} available credits to make this startup private.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Not yet</AlertDialogCancel>
          {wallet && !affordable ? (
            <Button asChild>
              <Link to="/credits">Buy credits</Link>
            </Button>
          ) : (
            <Button onClick={confirm} disabled={busy || !affordable}>
              {busy ? <Loader2 className="animate-spin" /> : <Lock />} Make private · {cost} credits
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
