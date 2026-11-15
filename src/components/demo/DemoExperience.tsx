import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ExternalLink, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/common/SectionHeading';
import { useDemoSession } from './DemoSession';

const steps = ['Search & Discover', 'Inspect the evidence', 'Claim & build'];

export function DemoExperience() {
  const [step, setStep] = useState(0);
  const { leave } = useDemoSession();
  return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <div><h1 className="text-3xl font-semibold text-primary">Test user</h1><Badge variant="outline" className="mt-2">Read-only demo · sample data</Badge></div>
      <Button asChild variant="outline"><Link to="/auth" search={{ redirect: '/discover' }} onClick={leave}><LogOut />Leave demo and sign in</Link></Button>
    </div>
    <nav aria-label="Demo journey" className="mb-10 flex flex-wrap gap-2">
      {steps.map((title, index) => <Button key={title} variant={step === index ? 'default' : 'outline'} onClick={() => setStep(index)} aria-pressed={step === index}>{index + 1}. {title}</Button>)}
    </nav>
    {step === 0 && <section>
      <SectionHeading title="Clinic booking problems" />
      <article className="mt-8 border-y border-border py-8">
        <Badge variant="outline">Illustrative AI hypothesis</Badge>
        <h2 className="mt-4 text-2xl font-semibold text-primary">ClinicFlow</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">A proposed booking assistant that helps small clinics fill cancelled appointments from a waiting list.</p>
        <Button className="mt-6" onClick={() => setStep(1)}>Inspect sample evidence <ArrowRight /></Button>
      </article>
    </section>}
    {step === 1 && <section>
      <SectionHeading title="Evidence" />
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <article className="border-t-2 border-primary pt-5"><h2 className="text-xl font-semibold text-primary">Original publication</h2><p className="mt-3 text-muted-foreground">NHS England publishes appointment data for general practice.</p><Button asChild variant="outline" className="mt-5"><a href="https://www.england.nhs.uk/statistics/statistical-work-areas/appointments-in-general-practice/" target="_blank" rel="noopener noreferrer">Open NHS publication <ExternalLink /></a></Button></article>
        <article className="border-t-2 border-border pt-5"><Badge variant="outline">Illustrative AI hypothesis</Badge><h2 className="mt-3 text-xl font-semibold text-primary">What still needs testing</h2><p className="mt-3 text-muted-foreground">Small clinics may want a waiting-list assistant. This sample does not establish demand, willingness to pay or product-market fit.</p></article>
      </div>
      <Button className="mt-8" onClick={() => setStep(2)}>View sample workspace <ArrowRight /></Button>
    </section>}
    {step === 2 && <section>
      <SectionHeading title="ClinicFlow workspace" />
      <div className="mt-8 divide-y divide-border border-y border-border">
        <article className="py-6"><Badge variant="outline">Sample assumption · not validated</Badge><p className="mt-3 text-lg">Clinic teams want to fill cancelled appointments faster.</p></article>
        <article className="py-6"><h2 className="text-xl font-semibold text-primary">Recommended actions</h2><p className="mt-3 text-muted-foreground">Interview clinic managers and test a waiting-list prototype before building.</p></article>
      </div>
      <Button asChild className="mt-8"><Link to="/auth" search={{ redirect: '/discover' }} onClick={leave}>Sign in to research your own market <ArrowRight /></Link></Button>
    </section>}
  </div>;
}