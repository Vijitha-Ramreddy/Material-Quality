import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin", "sales_projects", "engineering", "planning_procurement"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const { id } = await context.params;
  const body = await request.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Milestone name is required." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("project_milestones").insert({
    project_id: id, name: body.name.trim(), description: body.description || null,
    due_date: body.due_date || null, status: body.status || "planned",
    completed_at: body.status === "completed" ? new Date().toISOString() : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}
