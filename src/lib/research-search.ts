import { normalizeUrl } from './research-utils';

export const INITIAL_SEARCH = {
  intents: ['complaints', 'requests', 'forums', 'market_news'],
  webResults: 5,
  redditQueries: 1,
  redditResults: 6,
  newsResults: 4,
  maxSources: 30,
} as const;

/** One focused search per essential intent, including previously saved plans. */
export function essentialSearches<T extends { intent: string; query: string }>(searches: T[]): T[] {
  return INITIAL_SEARCH.intents.flatMap(intent => {
    const search = searches.find(s => s.intent === intent && s.query.trim());
    return search ? [search] : [];
  });
}

/** Keep relevant, distinct sources; never pad the pool with weak hits. */
export function selectInitialSources<T extends { url: string; relevance: string | null }>(sources: T[]): T[] {
  const seen = new Set<string>();
  const rank = (s: T) => s.relevance === 'high' ? 2 : s.relevance === 'medium' ? 1 : 0;
  return [...sources].filter(s => s.relevance !== 'low').sort((a, b) => rank(b) - rank(a)).filter(s => {
    const key = normalizeUrl(s.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, INITIAL_SEARCH.maxSources);
}