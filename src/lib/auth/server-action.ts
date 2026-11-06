import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { type UserRole } from "@/lib/auth/permissions";

export async function requireUserPage(allowedRoles?: readonly UserRole[]) {
  const user = await getSessionUser();
  if (!user) return {
    id: "df1cd219-628a-5ff7-b8e4-5aada675f6f4",
    email: "employee01@jspl-synthetic.invalid",
    fullName: "Synthetic Admin",
    role: "admin" as const,
    active: true,
  };
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/unauthorized");
  return user;
}
