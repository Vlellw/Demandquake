import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use - Demandquake" },
      { name: "description", content: "The terms that govern your use of Demandquake: accounts, credits, claims, evidence and acceptable use." },
      { property: "og:title", content: "Terms of Use - Demandquake" },
      { property: "og:description", content: "The terms that govern your use of Demandquake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="section-title text-4xl">Terms of Use</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: November 2026</p>

      <Section title="The service">
        <p>
          Demandquake researches the live web and turns what it finds into evidence-backed startup opportunities you can
          explore, claim and build on. By using the site you agree to these terms.
        </p>
      </Section>

      <Section title="Evidence, not guarantees">
        <p>
          Every factual claim on Demandquake links to its original source, and AI-drafted content is labelled as such. Even so,
          research results are a starting point, not a promise: problems found online do not prove that customers will pay, and
          market conditions change. You are responsible for validating an opportunity before you invest time or money in it. We
          are not liable for business decisions you make based on the research.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          You need a verified account to browse the research catalog, run searches and claim startups. Keep your sign-in
          details to yourself and tell us if you suspect someone else is using your account. You can delete your account at any
          time in Settings.
        </p>
      </Section>

      <Section title="Credits and payments">
        <ul className="list-disc space-y-2 pl-5">
          <li>Some actions cost credits - for example, a successful market search or claiming a startup. The price in credits is always shown before you confirm.</li>
          <li>You are never charged for an action that fails.</li>
          <li>Credits are bought in packages through Stripe and are added to your balance after the payment is confirmed.</li>
          <li>Credits are not money, cannot be exchanged for cash, and are not transferable between accounts.</li>
          <li>Refund requests are handled case by case; contact us with your order details.</li>
        </ul>
      </Section>

      <Section title="Claims and workspaces">
        <p>
          Claiming a startup gives you a private workspace for that opportunity. A public claim keeps the startup visible, so
          other founders can find and claim it too. A private claim removes that startup from other users' search and catalog
          while your workspace exists; it is only available while nobody else is building it, and deleting the workspace makes
          the startup public again.
        </p>
        <p>
          Either way, a claim is an organisational tool inside Demandquake - it is not a legal right, trademark, or exclusivity
          over an idea, a market, or a company name. Other founders can research the same market and may arrive at similar
          ideas.
        </p>
        <p>
          Workspace owners can invite co-founders. Owners are responsible for the people they invite and can remove them at any
          time.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>abuse the research system (for example by running automated or excessive searches),</li>
          <li>attempt to access other users' accounts, workspaces or billing data,</li>
          <li>scrape or bulk-export the catalog,</li>
          <li>use the site for anything unlawful or misleading.</li>
        </ul>
        <p>We may suspend accounts that break these rules.</p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The Demandquake site, brand and software belong to us. The underlying sources belong to their publishers and are
          linked, not copied. Content you create in your workspace is yours.
        </p>
      </Section>

      <Section title="Availability and changes">
        <p>
          We work to keep the service available and accurate, but we provide it "as is" without warranties. We may change or
          discontinue features, and we may update these terms - the date above shows the latest version, and continued use
          means you accept it.
        </p>
      </Section>
    </div>
  );
}
