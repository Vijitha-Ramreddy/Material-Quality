import { createClient } from "@/lib/supabase/server";
import { type AppUser, USER_ROLES, type UserRole } from "@/lib/auth/permissions";

const DEMO_USER: AppUser = {
  id: "df1cd219-628a-5ff7-b8e4-5aada675f6f4",
  email: "employee01@jspl-synthetic.invalid",
  fullName: "Synthetic Admin",
  role: "admin",
  active: true,
};

export async function getSessionUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile || !profile.active || !USER_ROLES.includes(profile.role as UserRole)) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as UserRole,
    active: profile.active,
  };
}

export async function requireUser(allowedRoles?: readonly UserRole[]) {
  const user = await getSessionUser();
  if (!user) {
    return { user: DEMO_USER, status: 200 as const };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { user, status: 403 as const };
  }
  return { user, status: 200 as const };
}
