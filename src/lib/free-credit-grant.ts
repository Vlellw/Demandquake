import { z } from 'zod';

export const freeCreditGrantInput = z.object({
  packageId: z.string().min(1).max(40),
  requestId: z.string().uuid(),
  environment: z.enum(['sandbox', 'live']),
}).strict();

export async function grantFreePackage(
  userId: string,
  input: z.infer<typeof freeCreditGrantInput>,
  grant: (args: { p_user: string; p_env: 'sandbox' | 'live'; p_package: string; p_request: string }) => Promise<unknown>,
) {
  return grant({ p_user: userId, p_env: input.environment, p_package: input.packageId, p_request: input.requestId });
}