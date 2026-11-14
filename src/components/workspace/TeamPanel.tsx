import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, Crown, Link2, Loader2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { createProjectInvite, removeProjectMember, revokeProjectInvite } from "@/lib/projects.functions";
import { projectTeamQuery } from "@/lib/queries";
import type { ProjectDTO, ProjectInviteDTO } from "@/lib/dto";
import { TimeAgo } from "@/components/common/TimeAgo";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

function inviteUrl(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function Initial({ name, owner }: { name: string; owner?: boolean }) {
  return (
    <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-raised font-display text-sm font-semibold text-foreground">
      {name.slice(0, 1).toUpperCase()}
      {owner && (
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
          <Crown className="size-2.5" />
        </span>
      )}
    </span>
  );
}

function InviteRow({ invite, onRevoke, revoking }: { invite: ProjectInviteDTO; onRevoke: () => void; revoking: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn’t copy - select the link and copy it manually.");
    }
  }
  return (
    <li className="rounded-lg border border-dashed border-border-strong p-2.5">
      <div className="flex items-center gap-2">
        <Link2 className="size-3.5 shrink-0 text-observed" />
        <input
          readOnly
          value={inviteUrl(invite.token)}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invite link"
          className="min-w-0 flex-1 truncate bg-transparent font-mono text-[11px] text-foreground/80 outline-none"
        />
        <Button size="sm" variant="outline" className="h-7 px-2" onClick={copy} aria-label="Copy invite link">
          {copied ? <Check className="text-positive" /> : <Copy />}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground" onClick={onRevoke} disabled={revoking} aria-label="Revoke invite link">
          {revoking ? <Loader2 className="animate-spin" /> : <X />}
        </Button>
      </div>
      <p className="mt-1 pl-5 font-mono text-[10px] text-faint">
        Created <TimeAgo iso={invite.created_at} /> · expires {formatDate(invite.expires_at)}
      </p>
    </li>
  );
}

/** Co-founders: who can edit this workspace, invite links (owner only), remove/leave. */
export function TeamPanel({ project, currentUserId, onLeft }: { project: ProjectDTO; currentUserId: string | null; onLeft: () => void }) {
  const queryClient = useQueryClient();
  const { data: team, isLoading, isError, refetch } = useQuery({
    ...projectTeamQuery(project.id),
    // While someone may be joining (open invites) or the team is active, keep the roster fresh.
    refetchInterval: (q) => (q.state.data && (q.state.data.invites.length > 0 || q.state.data.members.length > 0) ? 20_000 : false),
  });
  const createFn = useServerFn(createProjectInvite);
  const revokeFn = useServerFn(revokeProjectInvite);
  const removeFn = useServerFn(removeProjectMember);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // A new teammate joining also writes to the activity feed - pull the latest project when the roster changes.
  const memberCount = team?.members.length;
  const lastCount = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (memberCount === undefined) return;
    if (lastCount.current !== undefined && lastCount.current !== memberCount) {
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
    lastCount.current = memberCount;
  }, [memberCount, project.id, queryClient]);

  async function createInvite() {
    setCreating(true);
    try {
      const invite = await createFn({ data: { projectId: project.id } });
      await refetch();
      try {
        await navigator.clipboard.writeText(inviteUrl(invite.token));
        toast.success("Invite link copied - send it to your co-founder.");
      } catch {
        toast.success("Invite link created.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t create an invite link.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await revokeFn({ data: { inviteId: id } });
      await refetch();
      toast.success("Invite link revoked - it no longer works.");
    } catch {
      toast.error("Couldn’t revoke this link.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(userId: string, name: string, self: boolean) {
    if (!window.confirm(self ? "Leave this project? You’ll lose access to the workspace." : `Remove ${name} from this project?`)) return;
    setBusyId(userId);
    try {
      await removeFn({ data: { projectId: project.id, userId } });
      if (self) {
        toast.success("You left the project.");
        onLeft();
        return;
      }
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success(`${name} no longer has access.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t update the team.");
    } finally {
      setBusyId(null);
    }
  }

  const ownerName = team?.owner_name ?? project.owner_name ?? (project.is_owner ? "You" : "Founder");

  return (
    <section className="panel p-5" aria-labelledby="team-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id="team-heading" className="font-display text-lg font-bold text-foreground">
            Co-founders
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.is_owner ? "Invite people to edit this workspace with you. Only you can delete it." : "Everyone here can edit this workspace."}
          </p>
        </div>
        <Users className="size-5 shrink-0 text-muted-foreground" />
      </div>

      {isLoading && <div className="mt-4 h-24 animate-pulse rounded-lg bg-foreground/[0.05]" aria-label="Loading team" />}
      {isError && (
        <p className="mt-4 text-sm text-negative">
          Couldn’t load the team.{" "}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      )}

      {team && (
        <>
          <ul className="mt-4 space-y-2.5">
            <li className="flex items-center gap-3">
              <Initial name={ownerName} owner />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {ownerName}
                  {team.is_owner && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="font-mono text-[10px] text-faint">Claimed the startup · owner</p>
              </div>
            </li>
            {team.members.map((m) => {
              const self = m.user_id === currentUserId;
              return (
                <li key={m.user_id} className="flex items-center gap-3">
                  <Initial name={m.display_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {m.display_name}
                      {self && <span className="text-muted-foreground"> (you)</span>}
                    </p>
                    <p className="font-mono text-[10px] text-faint">
                      Co-founder · joined <TimeAgo iso={m.joined_at} />
                    </p>
                  </div>
                  {(team.is_owner || self) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-negative"
                      onClick={() => remove(m.user_id, m.display_name, self)}
                      disabled={busyId === m.user_id}
                      aria-label={self ? "Leave project" : `Remove ${m.display_name}`}
                    >
                      {busyId === m.user_id ? <Loader2 className="animate-spin" /> : <UserMinus />}
                      <span className="hidden sm:inline">{self ? "Leave" : "Remove"}</span>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {team.is_owner && (
            <div className="mt-4 border-t border-border pt-4">
              {team.invites.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {team.invites.map((inv) => (
                    <InviteRow key={inv.id} invite={inv} onRevoke={() => revoke(inv.id)} revoking={busyId === inv.id} />
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={createInvite} disabled={creating}>
                {creating ? <Loader2 className="animate-spin" /> : <UserPlus />} {team.invites.length ? "Create another invite link" : "Invite a co-founder"}
              </Button>
              <p className="mt-2 text-[11px] text-faint">Anyone with a link can join after signing in. Links expire after 14 days.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
