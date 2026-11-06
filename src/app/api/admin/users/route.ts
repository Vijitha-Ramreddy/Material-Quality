import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ROLES, type UserRole } from "@/lib/auth/permissions";

export async function GET() {
  const access = await requireUser(["admin"]);
  if (access.status !== 200) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }
  const supabase = await createAdminClient().from("profiles").select("*").order("full_name");
  if (supabase.error) {
    return NextResponse.json({ error: supabase.error.message }, { status: 500 });
  }
  return NextResponse.json(supabase.data);
}

export async function POST(request: NextRequest) {
  const access = await requireUser(["admin"]);
  if (access.status !== 200) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const body = await request.json();
  const role = body.role as UserRole;
  if (!USER_ROLES.includes(role) || !body.email || !body.fullName || !body.password) {
    return NextResponse.json({ error: "Invalid user details or role" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: String(body.email),
    password: String(body.password),
    email_confirm: true,
    user_metadata: { full_name: String(body.fullName) },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "User creation failed" }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: String(body.fullName), role, active: true })
    .eq("id", data.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ userId: data.user.id }, { status: 201 });
}
