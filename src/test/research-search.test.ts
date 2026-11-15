import { expect, it } from 'vitest';
import { INITIAL_SEARCH, essentialSearches, selectInitialSources } from '@/lib/research-search';

it('requests at most 20 initial sources across web, news and Reddit', () => {
  expect(INITIAL_SEARCH.intents.length * INITIAL_SEARCH.webResults + INITIAL_SEARCH.newsResults + INITIAL_SEARCH.redditQueries * INITIAL_SEARCH.redditResults).toBe(20);
  expect(INITIAL_SEARCH.maxSources).toBe(20);
});

it('caps retained sources at 20', () => {
  const sources = Array.from({ length: 50 }, (_, i) => ({ url: `https://example.com/${i}`, relevance: 'high' }));
  expect(selectInitialSources(sources)).toHaveLength(20);
});

it('keeps customer complaints, requests, forums and industry evidence from old plans', () => {
  const searches = ['technology','complaints','regulation','requests','forums','market_news','complaints'].map(intent => ({ intent, query: `${intent} topic` }));
  expect(essentialSearches(searches).map(s => s.intent)).toEqual(['complaints','requests','forums','market_news']);
});

it('drops low-relevance hits and duplicate links rather than padding the pool', () => {
  expect(selectInitialSources([
    { url: 'https://example.com/weak', relevance: 'low' },
    { url: 'https://example.com/customer', relevance: 'high' },
    { url: 'https://example.com/customer?utm_source=news', relevance: 'medium' },
    { url: 'https://reddit.com/r/topic/post', relevance: null },
  ]).map(s => s.url)).toEqual(['https://example.com/customer', 'https://reddit.com/r/topic/post']);
});