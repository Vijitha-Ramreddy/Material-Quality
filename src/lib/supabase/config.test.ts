import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublicConfig, getSupabaseServiceRoleKey } from "./config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Supabase environment configuration", () => {
  it("accepts publishable and legacy anon public keys", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      key: "sb_publishable_test",
    });

    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    expect(getSupabasePublicConfig()?.key).toBe("test-anon-key");
  });

  it("rejects placeholder and non-HTTP configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(getSupabasePublicConfig()).not.toBeNull();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "javascript:alert(1)";
    expect(getSupabasePublicConfig()).toBeNull();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "your-key";
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("never treats a secret key as public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_should_not_be_public";
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("only returns the server-side service key when configured", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(getSupabaseServiceRoleKey()).toBeNull();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
    expect(getSupabaseServiceRoleKey()).toBe("test-server-key");
  });
});
