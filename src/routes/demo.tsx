import { createFileRoute } from '@tanstack/react-router';
import { DemoExperience } from '@/components/demo/DemoExperience';

export const Route = createFileRoute('/demo')({
  head: () => ({ meta: [
    { title: 'Test user demo - Demandquake' },
    { name: 'description', content: 'Explore a read-only sample of Demandquake startup discovery, evidence and founder workspaces.' },
    { property: 'og:title', content: 'Demandquake read-only demo' },
    { property: 'og:description', content: 'Sample startup discovery with labelled hypotheses and a source-linked publication.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: DemoExperience,
});