import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ROLES, type UserRole } from "@/lib/auth/permissions";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await requireUser(["admin"]);
  if (access.status !== 200) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const { id } = await context.params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.active === "boolean") updates.active = body.active;
  if (typeof body.fullName === "string") updates.full_name = body.fullName;
  if (body.role && USER_ROLES.includes(body.role as UserRole)) updates.role = body.role;
  else if (body.role) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (typeof body.active === "boolean") {
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: body.active ? "0s" : "876000h",
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
