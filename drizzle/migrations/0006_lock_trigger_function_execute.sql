-- Trigger-only function: nobody needs to call it directly.
revoke execute on function public.sync_claim_count() from public, anon, authenticated;