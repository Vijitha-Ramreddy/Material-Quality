import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "engineering", "quality_assurance", "production"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Malformed JSON request." }, { status: 400 }); }
  const supabase = await createClient();
  const recordType = String(body.record_type || "");
  let error;
  let insertedId: string | undefined;

  if (recordType === "wps") {
    const wpsNumber = String(body.wps_number || "").trim();
    if (!wpsNumber || !String(body.welding_process || "").trim()) return NextResponse.json({ error: "WPS number and welding process are required." }, { status: 400 });
    const result = await supabase.from("welding_procedure_specifications").insert({
      wps_number: wpsNumber, revision: String(body.revision || "0"), welding_process: String(body.welding_process),
      base_material_grade: body.base_material_grade || null, filler_material: body.filler_material || null,
      joint_type: body.joint_type || null, position: body.position || null, thickness_range: body.thickness_range || null,
      parameters: body.parameters || {}, status: body.status || "draft", created_by: auth.user.id,
    }).select("id").single();
    error = result.error; insertedId = result.data?.id;
  } else if (recordType === "pqr") {
    const pqrNumber = String(body.pqr_number || "").trim();
    if (!pqrNumber) return NextResponse.json({ error: "PQR number is required." }, { status: 400 });
    const result = await supabase.from("welding_procedure_qualifications").insert({
      pqr_number: pqrNumber, wps_id: body.wps_id || null, welding_process: body.welding_process || null,
      base_material_grade: body.base_material_grade || null, test_specimen_details: body.test_specimen_details || {},
      tensile_results: body.tensile_results || {}, bend_results: body.bend_results || {},
      ndt_results: body.ndt_results || {}, status: body.status || "pending",
      qualification_date: body.qualification_date || null,
    }).select("id").single();
    error = result.error; insertedId = result.data?.id;
  } else if (recordType === "welder") {
    const qualificationNumber = String(body.qualification_number || "").trim();
    const welderId = String(body.welder_id || "").trim();
    const welderName = String(body.welder_name || "").trim();
    if (!qualificationNumber || !welderId || !welderName || !String(body.welding_process || "").trim()) {
      return NextResponse.json({ error: "Qualification number, welder ID, name and process are required." }, { status: 400 });
    }
    const positions = typeof body.weld_positions === "string"
      ? String(body.weld_positions).split(",").map((value) => value.trim()).filter(Boolean)
      : [];
    const result = await supabase.from("welder_qualification_records").insert({
      qualification_number: qualificationNumber, welder_id: welderId, welder_name: welderName,
      wps_id: body.wps_id || null, welding_process: String(body.welding_process),
      weld_positions: positions, thickness_range: body.thickness_range || null,
      material_group: body.material_group || null, qualification_date: body.qualification_date || null,
      expiry_date: body.expiry_date || null, status: body.status || "pending", created_by: auth.user.id,
    }).select("id").single();
    error = result.error; insertedId = result.data?.id;
  } else if (recordType === "weld") {
    const weldNumber = String(body.weld_number || "").trim();
    const jobId = String(body.production_job_id || "");
    const process = String(body.welding_process || "").trim();
    if (!weldNumber || !jobId || !process) return NextResponse.json({ error: "Weld number, production job and welding process are required." }, { status: 400 });
    const result = await supabase.from("weld_records").insert({
      weld_number: weldNumber, production_job_id: jobId, production_stage_id: body.production_stage_id || null,
      joint_number: body.joint_number || null, welder_id: body.welder_id || null,
      welder_qualification_id: body.welder_qualification_id || null, wps_id: body.wps_id || null,
      welding_process: process, welding_position: body.welding_position || null,
      filler_material: body.filler_material || null, filler_heat_or_batch: body.filler_heat_or_batch || null,
      consumable_batch: body.consumable_batch || null, base_material_grade: body.base_material_grade || null,
      wps_number: body.wps_number || null, weld_date: body.weld_date || null,
      result: body.result || "pending",
      inspection_status: body.inspection_status || "pending", inspection_remarks: body.inspection_remarks || null,
      remarks: body.remarks || null, created_by: auth.user.id,
    }).select("id").single();
    error = result.error; insertedId = result.data?.id;
  } else {
    return NextResponse.json({ error: "Unsupported welding quality record type." }, { status: 400 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, id: insertedId }, { status: 201 });
}
