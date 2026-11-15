export type CreditEnvironment = 'sandbox' | 'live';

/** Welcome credits and wallet reads do not require a payment account. */
export function creditEnvironment(clientToken?: string): CreditEnvironment {
  return clientToken?.startsWith('pk_live_') ? 'live' : 'sandbox';
}