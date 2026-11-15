export const INITIAL_CREDIT_RULES = { welcome: 25, discovery: 5, claim: 5, claimPrivate: 20, admin: 1_000_000 };

/** Public claims keep the startup in everyone's catalog; private claims hide it from other founders. */
export type ClaimAccess = 'public' | 'private';

/** Current claim prices from the advertised credit settings, falling back to the launch prices. */
export function claimPrices(settings?: Record<string, number | undefined> | null): Record<ClaimAccess, number> {
  return {
    public: settings?.['claim'] ?? INITIAL_CREDIT_RULES.claim,
    private: settings?.['claim_private'] ?? INITIAL_CREDIT_RULES.claimPrivate,
  };
}

/** Switching a public claim to private charges only the difference to the private price. */
export function privateUpgradeCost(privatePrice: number, alreadyPaid: number) {
  return Math.max(privatePrice - Math.max(alreadyPaid, 0), 0);
}

/** A startup can only become private while nobody else is building it. */
export function otherBuilders(claimCount: number, hasOwnClaim: boolean) {
  return Math.max(claimCount - (hasOwnClaim ? 1 : 0), 0);
}
export function canClaimPrivately(claimCount: number, hasOwnClaim: boolean) {
  return otherBuilders(claimCount, hasOwnClaim) === 0;
}
export const INITIAL_PACKAGES = [
  { id: 'starter', credits: 100, amount: 500 },
  { id: 'explorer', credits: 500, amount: 2000 },
  { id: 'pro', credits: 1500, amount: 5000 },
  { id: 'business', credits: 5000, amount: 12000 },
];
export function refundableCredits(credits: number, refunded: number, total: number) {
  if (total <= 0 || refunded < 0 || refunded > total) throw new Error('Invalid refund');
  return Math.floor(credits * refunded / total);
}
export function shouldChargeDiscovery(status: string, apiFailed: boolean) {
  return status === 'complete' && !apiFailed;
}
export function canAfford(balance: number, reserved: number, cost: number) {
  return balance - reserved >= cost;
}