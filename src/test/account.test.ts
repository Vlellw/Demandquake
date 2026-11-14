import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), verifyOtp: vi.fn(), from: vi.fn(), deleteUser: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => ({ middleware() { return this; }, inputValidator(validate: (data: unknown) => unknown) { return { handler: (handler: (args: unknown) => unknown) => (args: { data: unknown; context: unknown }) => handler({ ...args, data: validate(args.data) }) }; } }) }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, auth: { admin: { deleteUser: mocks.deleteUser } } } }));
import { deleteOwnAccount } from "@/lib/account.functions";

describe("self account deletion", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "self", email: "self@example.test" } } }); mocks.from.mockReturnValue({ delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }) }); mocks.deleteUser.mockResolvedValue({ error: null }); });
  const invoke = (token: string) => (deleteOwnAccount as unknown as (args: unknown) => Promise<unknown>)({ data: { token, confirmation: "DELETE", userId: "other" }, context: { userId: "self", supabase: { auth: { getUser: mocks.getUser, verifyOtp: mocks.verifyOtp } } } });
  it("rejects an invalid email code before privileged deletion", async () => {
    mocks.verifyOtp.mockResolvedValue({ data: {}, error: new Error("invalid") });
    await expect(invoke("123456")).rejects.toThrow("invalid or expired");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("deletes only the authenticated account, ignoring a supplied account ID", async () => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: { id: "self" } }, error: null });
    await invoke("123456");
    expect(mocks.deleteUser).toHaveBeenCalledWith("self");
  });
  it("rejects a code verified for another account", async () => {
    mocks.verifyOtp.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    await expect(invoke("123456")).rejects.toThrow();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});