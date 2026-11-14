import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password - Demandquake" },
      { name: "description", content: "Set a new password for your Demandquake account." },
      { property: "og:title", content: "Reset password - Demandquake" },
      { property: "og:description", content: "Set a new password for your Demandquake account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValid(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) setValid(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("The passwords don’t match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/workspace" });
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center -mb-24 bg-muted px-4 py-16">
      <div className="panel-raised w-full max-w-md p-7">
        <span className="flex size-11 items-center justify-center rounded-full border-2 border-primary text-primary"><KeyRound className="size-5" aria-hidden="true" /></span>
        <h1 className="section-title mt-4 text-[1.75rem]">Choose a new password</h1>
        {!ready ? (
          <Loader2 className="mt-6 size-5 animate-spin text-muted-foreground" />
        ) : !valid ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
            <Button asChild variant="outline">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
