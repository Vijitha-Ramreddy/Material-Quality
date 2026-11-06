import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "quality_assurance"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const supabase = await createClient();
  const form = await request.formData();
  const jobId = String(form.get("production_job_id") || "");
  const weldId = String(form.get("weld_record_id") || "");
  const method = String(form.get("ndt_method") || "");
  const status = String(form.get("inspection_status") || "pending");
  const inspectorId = String(form.get("inspector_id") || auth.user.id);
  if (!jobId || !weldId || !["UT","RT","MT","PT"].includes(method) || !["pending","pass","fail","reinspection_required"].includes(status)) {
    return NextResponse.json({ error: "Valid job, weld, NDT method and inspection status are required." }, { status: 400 });
  }

  const weld = await supabase.from("weld_records").select("id,inspection_status,production_stage_id,production_jobs(project_id,quality_plans(id,status))").eq("id", weldId).eq("production_job_id", jobId).single();
  if (weld.error || !weld.data) return NextResponse.json({ error: "Weld was not found for this production job." }, { status: 404 });
  const nestedJob = Array.isArray(weld.data.production_jobs) ? weld.data.production_jobs[0] : weld.data.production_jobs as {project_id:string;quality_plans?:{id:string;status:string}|Array<{id:string;status:string}>}|null;
  const plans = nestedJob?.quality_plans;
  const plan = Array.isArray(plans) ? plans[0] : plans;
  if (!plan?.id || plan.status !== "approved") return NextResponse.json({ error: "An approved quality plan is required for welding NDT." }, { status: 409 });
  const requirement = await supabase.from("welding_quality_requirements").select("id")
    .eq("quality_plan_id", plan.id).contains("required_ndt_methods", [method]).maybeSingle();
  if (requirement.error) return NextResponse.json({ error: requirement.error.message }, { status: 400 });
  if (!requirement.data) return NextResponse.json({ error: `${method} is not required by the approved quality plan.` }, { status: 409 });

  const report = form.get("report");
  let reportBucket: string | null = null;
  let reportPath: string | null = null;
  let reportName: string | null = null;
  if (report instanceof File && report.size > 0) {
    reportBucket = "quality-documents";
    reportPath = `ndt/${Date.now()}-${String(report.name).replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    reportName = report.name;
    const upload = await supabase.storage.from(reportBucket).upload(reportPath, report, { contentType: report.type || "application/octet-stream" });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });
  }
  const count = await supabase.from("ndt_records").select("id", { count: "exact", head: true });
  const ndtNumber = `NDT-${new Date().getUTCFullYear()}-${String((count.count ?? 0) + 1).padStart(4,"0")}`;
  const result = await supabase.from("ndt_records").insert({
    ndt_number: ndtNumber, production_job_id: jobId, weld_record_id: weldId,
    ndt_method: method, acceptance_criteria_reference: String(form.get("acceptance_criteria_reference") || "").trim() || null,
    inspector_id: inspectorId, technician: String(form.get("inspector_name") || "").trim() || null,
    test_date: String(form.get("inspection_date") || new Date().toISOString().slice(0, 10)),
    acceptance_standard: String(form.get("acceptance_standard") || "").trim() || null,
    procedure_number: String(form.get("procedure_number") || "").trim() || null,
    result: status === "pass" ? "acceptable" : status === "fail" ? "rejected" : status === "reinspection_required" ? "reinspect" : "pending",
    inspection_status: status, indications: (() => {
      const raw = String(form.get("indications") || "");
      if (!raw) return [];
      try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [parsed]; } catch { return [{ description: raw }]; }
    })(),
    report_storage_bucket: reportBucket, report_storage_path: reportPath, report_file_name: reportName,
    rework_required: form.get("rework_required") === "on",
    rework_details: String(form.get("rework_details") || "").trim() || null,
    reinspect_after_at: form.get("reinspect_after_at") ? String(form.get("reinspect_after_at")) : null,
    remarks: String(form.get("remarks") || "").trim() || null, reviewed_by: auth.user.id,
  }).select("id").single();
  if (result.error) {
    if (reportPath) await supabase.storage.from(reportBucket!).remove([reportPath]);
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  if (status === "fail" || status === "reinspection_required") {
    await supabase.from("weld_records").update({
      inspection_status: status, inspection_remarks: String(form.get("remarks") || "").trim() || null,
      result: status === "fail" ? "rejected" : "repair_required",
    }).eq("id", weldId);
    if (weld.data.production_stage_id) {
      await supabase.from("production_stages").update({ status: "paused" }).eq("id", weld.data.production_stage_id);
    }
  }
  if (status === "fail") {
    const ncrCount = await supabase.from("non_conformance_reports").select("id", { count: "exact", head: true });
    await supabase.from("non_conformance_reports").insert({
      ncr_number: `NCR-${new Date().getUTCFullYear()}-${String((ncrCount.count ?? 0) + 1).padStart(4,"0")}`,
      production_job_id: jobId, title: `Failed ${method} inspection for weld`,
      description: `Weld ${weldId} failed ${method} inspection. ${String(form.get("remarks") || "")}`,
      severity: "major", status: "open", work_held: true, reported_by: auth.user.id,
      defect_description: String(form.get("indications") || "Failed NDT acceptance criteria"),
    });
    await supabase.from("workflow_history").insert({
      workflow_stage: "in_process_quality", entity_type: "weld_record", entity_id: weldId,
      from_status: String(weld.data.inspection_status || "pending"), to_status: "hold", result: "failed",
      remarks: "Failed NDT generated NCR and held affected weld.", performed_by: auth.user.id,
    });
  }
  return NextResponse.json({ success: true, id: result.data.id, ndt_number: ndtNumber }, { status: 201 });
}
