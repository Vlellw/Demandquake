/** Retry only read failures where the browser never received a response. */
export function isNetworkReadFailure(error: unknown): boolean {
  return error instanceof TypeError && /^(failed to fetch|fetch failed|load failed|networkerror when attempting to fetch resource\.?)$/i.test(error.message.trim());
}

export function retryNetworkRead(failureCount: number, error: unknown): boolean {
  return failureCount < 2 && isNetworkReadFailure(error);
}

export function networkReadDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 4000);
}