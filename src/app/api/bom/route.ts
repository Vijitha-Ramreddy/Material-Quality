import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "engineering", "planning_procurement"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const body = await request.json();
  const quantity = Number(body.quantity);
  if (!body.project_id || !body.item_code?.trim() || !body.description?.trim() || !body.unit?.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Project, material code, description, unit and positive quantity are required." }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("bom_items").insert({
    project_id: body.project_id, item_code: body.item_code.trim().toUpperCase(),
    description: body.description.trim(), quantity, unit: body.unit.trim(),
    material_specification: body.material_specification || null, status: "draft",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}
