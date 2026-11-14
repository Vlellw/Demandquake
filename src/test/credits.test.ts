import { describe, it, expect } from 'vitest';
import { INITIAL_CREDIT_RULES, INITIAL_PACKAGES, shouldChargeDiscovery, canAfford, refundableCredits } from '@/lib/credit-rules';
describe('credit business rules', () => {
  it('grants 25 welcome credits',()=>expect(INITIAL_CREDIT_RULES.welcome).toBe(25));
  it('sets discovery price to 5 credits',()=>expect(INITIAL_CREDIT_RULES.discovery).toBe(5));
  it('sets a successful startup claim price to 5 credits',()=>expect(INITIAL_CREDIT_RULES.claim).toBe(5));
  it('sets admin allocation to one million',()=>expect(INITIAL_CREDIT_RULES.admin).toBe(1_000_000));
  it.each([[0,100,500],[1,500,2000],[2,1500,5000],[3,5000,12000]])('package %i matches credits and euro cents', (i,credits,amount)=>expect(INITIAL_PACKAGES[i]).toMatchObject({credits,amount}));
  it('charges only completed research',()=>{expect(shouldChargeDiscovery('complete',false)).toBe(true);expect(shouldChargeDiscovery('failed',false)).toBe(false);expect(shouldChargeDiscovery('generating',false)).toBe(false);});
  it('does not charge if an API request failed',()=>expect(shouldChargeDiscovery('complete',true)).toBe(false));
  it('blocks spending reserved or insufficient credits',()=>{expect(canAfford(5,0,5)).toBe(true);expect(canAfford(4,0,5)).toBe(false);expect(canAfford(8,5,5)).toBe(false);});
  it('reverses proportional credits for refunds',()=>{expect(refundableCredits(100,250,500)).toBe(50);expect(refundableCredits(100,500,500)).toBe(100);});
});