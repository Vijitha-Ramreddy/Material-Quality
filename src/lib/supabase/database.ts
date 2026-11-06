import type { SupabaseClient } from "@supabase/supabase-js";
import { toServiceError, type ServiceResult } from "@/lib/supabase/errors";

export async function fetchRows<T>(
  client: SupabaseClient,
  table: string,
  options?: { columns?: string; limit?: number; order?: { column: string; ascending?: boolean } },
): Promise<ServiceResult<T[]>> {
  let query = client.from(table).select(options?.columns ?? "*");

  if (options?.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  return error
    ? { data: null, error: toServiceError(error) }
    : { data: (data ?? []) as T[], error: null };
}

export async function insertRow<T>(
  client: SupabaseClient,
  table: string,
  values: Record<string, unknown>,
): Promise<ServiceResult<T>> {
  const { data, error } = await client.from(table).insert(values).select().single();
  return error
    ? { data: null, error: toServiceError(error) }
    : { data: data as T, error: null };
}

export async function updateRow<T>(
  client: SupabaseClient,
  table: string,
  match: Record<string, unknown>,
  values: Record<string, unknown>,
): Promise<ServiceResult<T>> {
  let query = client.from(table).update(values);
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value as never);
  }

  const { data, error } = await query.select().single();
  return error
    ? { data: null, error: toServiceError(error) }
    : { data: data as T, error: null };
}
