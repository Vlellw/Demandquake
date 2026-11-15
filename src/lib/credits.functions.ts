import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const environment = z.enum(['sandbox', 'live']);
const envSchema = z.object({ environment });
export const getCreditCatalog = createServerFn({ method: 'GET' }).handler(async () => {
  const { publicDb } = await import('./public-db.server');
  const db = publicDb();
  const [packages, settings] = await Promise.all([db.from('credit_packages').select('*').eq('active', true).order('amount'), db.from('credit_settings').select('*')]);
  if (packages.error || settings.error) throw new Error('Credit pricing is unavailable');
  return { packages: packages.data, settings: Object.fromEntries(settings.data.map(s => [s.key, s.value])) };
});

export const getCreditAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof envSchema>) => envSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const init = await supabaseAdmin.rpc('ensure_credit_wallet', { p_user: context.userId, p_env: data.environment });
    if (init.error) throw new Error(init.error.message);
    const [wallet, transactions, payments, roles] = await Promise.all([
      context.supabase.from('credit_wallets').select('*').eq('user_id', context.userId).eq('environment', data.environment).single(),
      context.supabase.from('credit_transactions').select('*').eq('user_id', context.userId).eq('environment', data.environment).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('credit_payments').select('*').eq('user_id', context.userId).eq('environment', data.environment).order('created_at', { ascending: false }).limit(100),
      context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' }),
    ]);
    if (wallet.error || transactions.error || payments.error || roles.error) throw new Error('Could not load credit account');
    return { wallet: wallet.data, transactions: transactions.data, payments: payments.data, isAdmin: roles.data };
  });

const adminInput = z.object({ environment, userId: z.string().uuid(), delta: z.number().int().min(-1000000).max(1000000), reason: z.string().trim().min(5).max(200), requestId: z.string().uuid() });
export const adjustCredits = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof adminInput>) => adminInput.parse(d))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || !role.data) throw new Error('Admin access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.rpc('adjust_credit_balance', { p_user: data.userId, p_env: data.environment, p_delta: data.delta, p_reason: `${data.reason} (admin ${context.userId})`, p_key: `admin:${data.requestId}` });
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const getCreditAdmin = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof envSchema>) => envSchema.parse(d))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || !role.data) throw new Error('Admin access required');
    const [wallets, transactions, payments, settings, packages] = await Promise.all([
      context.supabase.from('credit_wallets').select('*').eq('environment', data.environment),
      context.supabase.from('credit_transactions').select('*').eq('environment', data.environment).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('credit_payments').select('*').eq('environment', data.environment).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('credit_settings').select('*'), context.supabase.from('credit_packages').select('*').order('amount'),
    ]);
    if (wallets.error || transactions.error || payments.error || settings.error || packages.error) throw new Error('Could not load administration');
    return { wallets: wallets.data, transactions: transactions.data, payments: payments.data, settings: settings.data, packages: packages.data };
  });

const config = z.object({ key: z.enum(['welcome','discovery','claim','claim_private']), value: z.number().int().min(0).max(1000000) });
export const updateCreditSetting = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof config>) => config.parse(d))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || !role.data) throw new Error('Admin access required');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const result = await supabaseAdmin.from('credit_settings').update({ value: data.value }).eq('key', data.key);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });