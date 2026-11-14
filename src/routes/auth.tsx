import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Flag, ListChecks, Loader2, MailCheck, Radar, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProviderButtons } from "@/components/auth/ProviderButtons";
import { InfoTip } from "@/components/common/InfoTip";
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
    <div className="-mb-24 bg-muted px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-[1000px] overflow-hidden rounded-[4px] bg-surface shadow-[var(--shadow-panel)] lg:grid-cols-[1fr_1.1fr]">
        <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
          <div>
            <h2 className="mt-2 font-display text-[1.9rem] font-bold leading-tight">Turn an idea into your startup</h2>
            <ul className="mt-8 space-y-5">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary-foreground/80">
                    <b.icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="flex items-center gap-2 font-bold">
                    {b.title}
                    <InfoTip
                      label={`More about: ${b.title}`}
                      align="start"
                      className="border-primary-foreground/60 text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10"
                    >
                      {b.body}
                    </InfoTip>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="p-7 sm:p-10">
        <h1 className="section-title text-[1.75rem]">
          {resetMode ? "Reset your password" : search.redirect?.includes("claim=1") ? "Sign in to claim this startup" : tab === "signup" ? "Create your account" : "Sign in"}
        </h1>
        {sentTo ? (
          <div className="mt-6 rounded-[4px] border border-observed/40 bg-observed/[0.06] p-5 text-center">
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
            <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList variant="line" className="w-full justify-start border-b border-border">
                <TabsTrigger variant="line" value="signin">
                  I have an account
                </TabsTrigger>
                <TabsTrigger variant="line" value="signup">
                  I’m new here
                </TabsTrigger>
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
                      <button type="button" onClick={() => setResetMode(true)} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
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
        <p className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          Want to learn more before signing in?{" "}
          <Link to="/" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to the introduction
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}

const BENEFITS = [
  { icon: Flag, title: "Claim a startup", body: "Copy its research into a private workspace that’s yours to edit." },
  { icon: ListChecks, title: "Track what you test", body: "Tick off experiments, keep notes and record what customers say." },
  { icon: Users, title: "Build with co-founders", body: "Invite people with a link and edit the workspace together." },
  { icon: Radar, title: "Watch your market", body: "Run market scans to see what changed since the research." },
];
