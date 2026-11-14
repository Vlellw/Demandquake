export const INITIAL_CREDIT_RULES = { welcome: 25, discovery: 5, claim: 5, admin: 1_000_000 };
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