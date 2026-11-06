export type UserRole =
  | "admin"
  | "planner"
  | "engineer"
  | "store"
  | "qa"
  | "production"
  | "dispatch";

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
