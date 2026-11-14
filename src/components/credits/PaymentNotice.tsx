export function PaymentNotice() {
  const token = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];
  if (token?.startsWith('pk_live_')) return null;
  return <div className="border-b border-moderate/30 bg-moderate/10 px-4 py-3 text-center text-sm text-foreground">{token?.startsWith('pk_test_') ? 'Test payments only — no real money is charged.' : 'Live purchases are not available until payment account setup is complete.'}</div>;
}