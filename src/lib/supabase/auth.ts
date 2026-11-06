import type { SupabaseClient, User } from "@supabase/supabase-js";
import { toServiceError, type ServiceError } from "@/lib/supabase/errors";

export async function getCurrentUser(
  client: SupabaseClient,
): Promise<{ user: User | null; error: ServiceError | null }> {
  const { data, error } = await client.auth.getUser();
  return error
    ? { user: null, error: toServiceError(error) }
    : { user: data.user, error: null };
}

export async function signOut(client: SupabaseClient) {
  const { error } = await client.auth.signOut();
  return { error: error ? toServiceError(error) : null };
}
