import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "sales_projects", "engineering"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const body = await request.json();
  if (!body.name?.trim() || !body.order_id || !body.project_code?.trim()) {
    return NextResponse.json({ error: "Project code, name and customer order are required." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert({
    project_code: body.project_code.trim().toUpper(), name: body.name.trim(), order_id: body.order_id,
    start_date: body.start_date || null, planned_end_date: body.planned_end_date || null,
    status: body.status || "planned", project_manager_id: body.project_manager_id || null,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from("workflow_history").insert({
    workflow_stage: "project_planning", entity_type: "projects", entity_id: data.id,
    to_status: body.status || "planned", result: "pending", performed_by: auth.user.id,
  });
  return NextResponse.json(data, { status: 201 });
}
