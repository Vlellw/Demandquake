import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Demandquake" },
      { name: "description", content: "How Demandquake collects, uses and protects your data: accounts, payments, research activity and visitor analytics." },
      { property: "og:title", content: "Privacy Policy — Demandquake" },
      { property: "og:description", content: "How Demandquake collects, uses and protects your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="section-title text-4xl">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: November 2026</p>

      <Section title="What Demandquake is">
        <p>
          Demandquake turns live web research into evidence-backed startup opportunities that signed-in founders can explore
          and claim. This policy explains what data we collect when you use the site and how we use it.
        </p>
      </Section>

      <Section title="Account data">
        <p>
          When you create an account we store your email address and, if you choose one, a display name. You can sign in with
          your email and a verification code, or with Google. If you use Google, that provider shares basic profile details
          (such as your email address) with us to create your session.
        </p>
        <p>
          You can change your email, change your password, or delete your account at any time from the Settings page. Deleting
          your account removes your profile and workspaces.
        </p>
      </Section>

      <Section title="Research and workspace activity">
        <p>
          We store the market searches you run, the startup opportunities you view and claim, and the workspace content you
          create (assumptions, notes, checklists and invites) so the service can show them back to you and your co-founders.
          Research results are shared across the catalog so every founder sees the same evidence.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Credit purchases are processed by Stripe. We never see or store your card details; Stripe handles them under its own
          privacy policy. We keep a record of your orders, credit balance and ledger entries so we can deliver the credits you
          bought and resolve billing questions.
        </p>
      </Section>

      <Section title="Visitor analytics">
        <p>
          Lovable collects this data for us.{" "}
          <a href="https://lovable.dev/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            Lovable's privacy policy
          </a>{" "}
          explains how it handles it. Lovable's analytics uses no cookies, stores nothing on your device, doesn't keep IP
          addresses and doesn't identify you.
        </p>
        <p>
          For every visitor it records the pages visited, where visitors came from, their country, browser, operating system
          and device type, how long they stay, how fast pages load, errors, and which buttons and links they click. Detailed
          data is kept for 90 days and daily summaries for a year.
        </p>
      </Section>

      <Section title="Third-party services">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-foreground">Context.dev</strong> — powers the live web research behind each
            opportunity. Search queries are sent to Context.dev to retrieve public sources; no personal account data is sent.
          </li>
          <li>
            <strong className="font-semibold text-foreground">AI models</strong> — summarise sources, draft startup concepts
            and generate banner artwork. AI-drafted content is always labelled as such on the page.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Stripe</strong> — processes payments and sends us confirmed
            payment events.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Lovable Cloud</strong> — hosts the database, authentication and
            file storage for the site.
          </li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, export or delete your personal data. Most of
          this is self-service in Settings; for anything else, contact us and we will help.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this policy we will update the date above. Continued use of the site after a change means you accept the
          updated policy.
        </p>
      </Section>
    </div>
  );
}
