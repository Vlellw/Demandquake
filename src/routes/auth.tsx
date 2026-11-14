import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProviderButtons } from "@/components/auth/ProviderButtons";
import { DemandquakeLogo } from "@/components/brand/DemandquakeLogo";
import { SeismicField } from "@/components/common/SeismicField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REDIRECT_STORAGE_KEY, safeRedirect } from "@/lib/safe-redirect";

interface AuthSearch {
  redirect?: string | undefined;
  mode?: "signin" | "signup" | undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
    mode: s["mode"] === "signup" ? "signup" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Demandquake" },
      { name: "description", content: "Sign in to claim startup opportunities and track them in your private founder workspace." },
      { property: "og:title", content: "Sign in to Demandquake" },
      { property: "og:description", content: "Claim evidence-backed startup opportunities and build them in your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);

  function target() {
    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(REDIRECT_STORAGE_KEY) : null;
    return safeRedirect(search.redirect ?? stored);
  }

  function finish() {
    const to = target();
    window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    router.history.replace(to);
  }

  function rememberTarget() {
    window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, safeRedirect(search.redirect));
  }

  // Already signed in (or returning from an OAuth redirect): continue to the destination.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) finish();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finish();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "That email and password don’t match an account." : error.message);
      return;
    }
    finish();
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    rememberTarget();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: name.trim() || undefined } },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) finish();
    else setSentTo(email.trim());
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your inbox for a password reset link.");
    setResetMode(false);
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="bg-hero pointer-events-none absolute inset-0" />
      <SeismicField className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full opacity-40" intensity={0.4} />
      <div className="panel-raised relative w-full max-w-md p-7">
        <DemandquakeLogo />
        <h1 className="mt-6 font-display text-2xl font-semibold text-foreground">
          {resetMode ? "Reset your password" : search.redirect?.includes("claim=1") ? "Sign in to claim this startup" : "Welcome, founder"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {resetMode ? "We’ll email you a secure link." : "Claimed startups live in your private workspace with their evidence and validation checklist."}
        </p>

        {sentTo ? (
          <div className="mt-6 rounded-xl border border-observed/30 bg-observed/[0.07] p-5 text-center">
            <MailCheck className="mx-auto size-8 text-observed" />
            <p className="mt-3 font-medium text-foreground">Confirm your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="text-foreground">{sentTo}</span>. Open it to finish creating your account — you’ll come right back here.
            </p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSentTo(null)}>
              Use a different email
            </Button>
          </div>
        ) : resetMode ? (
          <form onSubmit={onReset} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Send reset link
            </Button>
            <button type="button" onClick={() => setResetMode(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6">
              <ProviderButtons onSignedIn={finish} onBeforeRedirect={rememberTarget} />
            </div>
            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-faint">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="mt-3 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" onClick={() => setResetMode(true)} className="text-xs text-muted-foreground hover:text-foreground">
                        Forgot password?
                      </button>
                    </div>
                    <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Sign in
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="mt-3 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-password">Password</Label>
                    <Input id="su-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="animate-spin" />} Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Browsing is open to everyone. <Link to="/" className="text-foreground underline-offset-4 hover:underline">Keep exploring</Link>
        </p>
      </div>
    </div>
  );
}
