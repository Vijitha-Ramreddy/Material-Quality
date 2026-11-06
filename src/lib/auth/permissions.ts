export const USER_ROLES = [
  "admin",
  "sales_projects",
  "engineering",
  "planning_procurement",
  "stores",
  "production",
  "quality_assurance",
  "logistics",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AppUser {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  active: boolean;
}

export const ROUTE_PERMISSIONS: Record<string, readonly UserRole[]> = {
  "/dashboard": USER_ROLES,
  "/workflow": USER_ROLES,
  "/orders": ["admin", "sales_projects", "engineering", "planning_procurement", "production", "quality_assurance", "logistics"],
  "/projects": ["admin", "sales_projects", "engineering", "planning_procurement", "production", "quality_assurance", "logistics"],
  "/engineering": ["admin", "engineering", "planning_procurement", "production", "quality_assurance"],
  "/procurement": ["admin", "planning_procurement", "stores", "engineering"],
  "/materials": ["admin", "planning_procurement", "stores", "production", "quality_assurance"],
  "/incoming-qa": ["admin", "stores", "quality_assurance"],
  "/production": ["admin", "production", "engineering", "quality_assurance", "planning_procurement"],
  "/quality": ["admin", "quality_assurance", "production", "engineering"],
  "/final-inspection": ["admin", "quality_assurance", "production"],
  "/dispatch": ["admin", "logistics"],
  "/reports": ["admin", "sales_projects", "engineering", "planning_procurement", "stores", "production", "quality_assurance", "logistics"],
  "/users": ["admin"],
};

export function canAccessRoute(role: UserRole, pathname: string) {
  const matchingRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return matchingRoute ? ROUTE_PERMISSIONS[matchingRoute].includes(role) : role === "admin";
}
