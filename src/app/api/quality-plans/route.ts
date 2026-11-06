import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "engineering", "quality_assurance"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const body = await request.json();
  if (!body.project_id || !body.title?.trim()) return NextResponse.json({ error: "Project and plan title are required." }, { status: 400 });
  const supabase = await createClient();
  const planNumber = `QP-${body.project_id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-5)}`;
  const { data, error } = await supabase.from("quality_plans").insert({
    plan_number: planNumber, project_id: body.project_id, bom_item_id: body.bom_item_id || null,
    title: body.title.trim(), revision: body.revision || "0", status: "draft",
    created_by: auth.user.id,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const points = Array.isArray(body.points) ? body.points : [];
  if (points.length) {
    const rows = points.map((point: Record<string, unknown>, index: number) => ({
      quality_plan_id: data.id, sequence: index + 1,
      stage: String(point.stage ?? "").trim(), inspection_requirement: String(point.requirement ?? "").trim(),
      acceptable_min: point.min === "" || point.min == null ? null : Number(point.min),
      acceptable_max: point.max === "" || point.max == null ? null : Number(point.max),
      unit: String(point.unit ?? "").trim() || null, inspection_method: String(point.method ?? "").trim() || null,
      required_certificates: String(point.certificates ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      hold_point: Boolean(point.hold_point),
    }));
    if (rows.some((row: {stage:string; inspection_requirement:string}) => !row.stage || !row.inspection_requirement)) {
      await supabase.from("quality_plans").delete().eq("id", data.id);
      return NextResponse.json({ error: "Every inspection point requires a stage and requirement." }, { status: 400 });
    }
    const pointError = (await supabase.from("quality_plan_inspection_points").insert(rows)).error;
    if (pointError) return NextResponse.json({ error: pointError.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
