import { queryOptions } from '@tanstack/react-query';
import { getCreditAccount, getCreditCatalog, getCreditAdmin } from './credits.functions';
import { getStripeEnvironment } from './stripe';
export const creditCatalogQuery = () => queryOptions({ queryKey: ['credit-catalog'], queryFn: () => getCreditCatalog(), staleTime: 30_000 });
export const creditAccountQuery = (userId: string) => queryOptions({ queryKey: ['credit-account', userId], queryFn: () => getCreditAccount({ data: { environment: getStripeEnvironment() } }), refetchInterval: 2000, staleTime: 1000 });
export const creditAdminQuery = () => queryOptions({ queryKey: ['credit-admin'], queryFn: () => getCreditAdmin({ data: { environment: getStripeEnvironment() } }) });