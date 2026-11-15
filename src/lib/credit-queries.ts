import { queryOptions } from '@tanstack/react-query';
import { getCreditAccount, getCreditCatalog, getCreditAdmin } from './credits.functions';
import { getStripeEnvironment } from './stripe';
import { boundedCreditRead } from './credit-read';
export const creditCatalogQuery = () => queryOptions({ queryKey: ['credit-catalog'], queryFn: ({ signal }) => boundedCreditRead((requestSignal) => getCreditCatalog({ signal: requestSignal }), signal), staleTime: 30_000 });
export const creditAccountQuery = (userId: string) => queryOptions({ queryKey: ['credit-account', userId], queryFn: ({ signal }) => boundedCreditRead((requestSignal) => getCreditAccount({ data: { environment: getStripeEnvironment() }, signal: requestSignal }), signal), refetchInterval: 10_000, staleTime: 5000 });
export const creditAdminQuery = () => queryOptions({ queryKey: ['credit-admin'], queryFn: ({ signal }) => boundedCreditRead((requestSignal) => getCreditAdmin({ data: { environment: getStripeEnvironment() }, signal: requestSignal }), signal) });