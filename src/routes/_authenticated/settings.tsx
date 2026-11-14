import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Mail, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { deleteOwnAccount } from "@/lib/account.functions";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Account settings - Demandquake" },
    { name: "description", content: "Manage your Demandquake email, password and account." },
    { property: "og:title", content: "Account settings - Demandquake" },
    { property: "og:description", content: "Manage your Demandquake account securely." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteAccount = useServerFn(deleteOwnAccount);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/auth` });
      if (error) throw error;
      setMessage("Check your new email for confirmation. You may also need to confirm from your current email.");
      setEmail("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not change your email."); }
    finally { setBusy(null); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeat) { toast.error("The new passwords don’t match."); return; }
    setBusy("password");
    try {
      const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
      if (error) throw error;
      setPassword(""); setRepeat(""); setCurrentPassword("");
      toast.success("Password changed.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not change your password."); }
    finally { setBusy(null); }
  }

  async function sendCode() {
    if (!user?.email) return;
    setBusy("code");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: user.email, options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth` } });
      if (error) throw error;
      setCodeSent(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send confirmation."); }
    finally { setBusy(null); }
  }

  async function removeAccount(e: React.FormEvent) {
    e.preventDefault();
    if (confirmation !== "DELETE") return;
    setBusy("delete");
    try {
      await deleteAccount({ data: { token: code, confirmation: "DELETE" } });
      await qc.cancelQueries(); qc.clear();
      await supabase.auth.signOut({ scope: "local" });
      await navigate({ to: "/", replace: true });
      toast.success("Your account has been deleted.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete your account."); }
    finally { setBusy(null); }
  }

  return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <SectionHeading as="h1" title="Account settings" align="left" />
    <section className="mt-8 border-t border-border py-7">
      <h2 className="section-title flex items-center gap-2 text-xl"><Mail className="size-5" />Email address</h2>
      <p className="mt-3 break-all text-sm text-muted-foreground">{user?.email}</p>
      <form onSubmit={changeEmail} className="mt-5 space-y-4">
        <div className="space-y-2"><Label htmlFor="new-email">New email address</Label><Input id="new-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {message && <p role="status" className="text-sm text-observed">{message}</p>}
        <Button disabled={Boolean(busy)} type="submit"><Mail />Change email</Button>
      </form>
    </section>
    <section className="border-t border-border py-7">
      <h2 className="section-title flex items-center gap-2 text-xl"><KeyRound className="size-5" />Password</h2>
      <form onSubmit={changePassword} className="mt-5 space-y-4">
        <div className="space-y-2"><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="repeat-password">Confirm new password</Label><Input id="repeat-password" type="password" autoComplete="new-password" minLength={8} required value={repeat} onChange={(e) => setRepeat(e.target.value)} /></div>
        <Button type="submit" disabled={Boolean(busy)}><KeyRound />Change password</Button>
      </form>
    </section>
    <section className="border-t border-border py-7">
      <h2 className="section-title text-xl">Delete account</h2>
      <p className="mt-3 text-sm text-muted-foreground">Permanently delete your account and workspaces, including shared workspaces you own. Remaining credits are lost. Payment records and the shared research catalog are retained.</p>
      <Button className="mt-5" variant="destructive" onClick={() => setDeleting(true)}><Trash2 />Delete account</Button>
    </section>
    <Dialog open={deleting} onOpenChange={(open) => { if (!busy) { setDeleting(open); if (!open) { setCode(""); setConfirmation(""); setCodeSent(false); } } }}>
      <DialogContent><DialogHeader><DialogTitle>Delete your account?</DialogTitle><DialogDescription>This cannot be undone. Confirm ownership of your current email before deleting your account and owned workspaces.</DialogDescription></DialogHeader>
        {!codeSent ? <Button onClick={sendCode} disabled={Boolean(busy)}>{busy && <Loader2 className="animate-spin" />}Send confirmation code</Button> : <form onSubmit={removeAccount} className="space-y-4">
          <p role="status" className="text-sm text-muted-foreground">Enter the code from your sign-in email. If your email contains only a link, account deletion needs an email template that includes a confirmation code.</p>
          <div className="space-y-2"><Label htmlFor="delete-code">Email confirmation code</Label><Input id="delete-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="delete-confirmation">Type DELETE to confirm</Label><Input id="delete-confirmation" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></div>
          <Button type="submit" variant="destructive" disabled={Boolean(busy) || confirmation !== "DELETE"}>{busy === "delete" && <Loader2 className="animate-spin" />}Permanently delete account</Button>
        </form>}
      </DialogContent>
    </Dialog>
  </main>;
}