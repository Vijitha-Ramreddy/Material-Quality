import type { PostgrestError, AuthError } from "@supabase/supabase-js";

export interface ServiceError {
  code: string;
  message: string;
  details?: string | null;
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceError };

export function toServiceError(error: PostgrestError | AuthError | Error | unknown): ServiceError {
  if (typeof error !== "object" || error === null) {
    return { code: "UNKNOWN_ERROR", message: "An unexpected database error occurred." };
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string | null;
    status?: number;
  };

  return {
    code: candidate.code || (candidate.status ? `HTTP_${candidate.status}` : "UNKNOWN_ERROR"),
    message: candidate.message || "An unexpected database error occurred.",
    details: candidate.details,
  };
}
