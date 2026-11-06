import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

export function createAdminClient() {
  const publicConfig = getSupabasePublicConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!publicConfig || !serviceRoleKey) {
    throw new Error(
      "Server Supabase access is not configured. This is a server-only configuration error.",
    );
  }

  return createSupabaseClient(publicConfig.url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
