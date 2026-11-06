import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { QualityPlanManager } from "@/components/planning/quality-plan-manager";
import { ApprovalAction } from "@/components/planning/approval-actions";
import { InProcessQuality, NCRWorkflow } from "@/components/quality/in-process-quality";
import { InspectionReportUpload } from "@/components/quality/report-upload";
import { DossierActions,DossierForm } from "@/components/quality/quality-dossier";
import { MachineryQuality } from "@/components/quality/machinery-quality";
import { WeldingNdtManager } from "@/components/quality/welding-ndt-manager";

export default async function QualityPage() {
  const supabase = await createClient();
  const [projects, plans, jobs, stages, inspections, ncrs, actions, profiles, dossiers, acceptedJobs, receipts, weldRecords, wps, welders] = await Promise.all([
    supabase.from("projects").select("id,name,project_code").order("project_code"),
    supabase.from("quality_plans").select("*,projects(name,project_code),quality_plan_inspection_points(*)").order("created_at",{ascending:false}),
    supabase.from("production_jobs").select("id,job_number,project_id").order("created_at",{ascending:false}),
    supabase.from("production_stages").select("id,name,status,production_job_id"),
    supabase.from("quality_inspections").select("*,production_stages(name),profiles(full_name)").not("production_stage_id","is",null).order("created_at",{ascending:false}),
    supabase.from("non_conformance_reports").select("id,ncr_number,title,status,work_held,defect_description,reinspection_due_at,quality_inspection_id").not("quality_inspection_id","is",null).order("created_at",{ascending:false}),
    supabase.from("corrective_actions").select("ncr_id,title,status"),
    supabase.from("profiles").select("id,full_name").eq("active",true),
    supabase.from("quality_dossiers").select("*").order("created_at",{ascending:false}),
    supabase.from("final_inspections").select("production_job_id,production_jobs(job_number)").eq("result","accepted"),
    supabase.from("material_receipts").select("id,receipt_number,heat_number,batch_number").order("received_at",{ascending:false}),
    supabase.from("weld_records").select("id,weld_number,production_job_id").order("weld_number"),
    supabase.from("welding_procedure_specifications").select("id,wps_number"),
    supabase.from("welder_qualification_records").select("id,qualification_number,welder_id,welder_name").eq("status","qualified"),
  ]);
  return <div className="space-y-5">
    <div><p className="text-sm text-orange-600">Quality planning</p><h1 className="text-2xl font-semibold text-slate-900">Quality plans</h1></div>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Welding, NDT, hydrostatic testing and material traceability</h2><MachineryQuality jobs={jobs.data??[]} stages={stages.data??[]} receipts={receipts.data??[]}/></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">WPS, PQR, welder qualification and controlled NDT</h2><WeldingNdtManager jobs={jobs.data??[]} welds={weldRecords.data??[]} wps={wps.data??[]} welders={welders.data??[]}/></Card>
    <Card className="p-5"><div className="mb-4"><h2 className="font-semibold">In-process inspection</h2><p className="text-sm text-slate-500">Cutting, fabrication, welding, machining and assembly checkpoints</p></div><InProcessQuality jobs={jobs.data??[]} stages={stages.data??[]} profiles={profiles.data??[]}/></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Quality dossiers</h2><DossierForm jobs={(acceptedJobs.data??[]).map((item)=>{const jobs=(item.production_jobs as Array<{job_number:string}>|{job_number:string}|null);const job=Array.isArray(jobs)?jobs[0]:jobs;return {id:item.production_job_id,job_number:job?.job_number??item.production_job_id};})}/><div className="mt-5 divide-y">{(dossiers.data??[]).map((dossier)=><div key={dossier.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{dossier.dossier_number}</p><p className="text-xs capitalize text-slate-500">{dossier.status.replaceAll("_"," ")}</p></div><DossierActions id={dossier.id} status={dossier.status} hasPdf={Boolean(dossier.pdf_storage_path)}/></div>)}</div></Card>
    <Card className="overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-semibold">Inspection history</h2></div><div className="divide-y">{(inspections.data??[]).map((inspection)=><div key={inspection.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-6"><p className="font-medium">{inspection.inspection_number}</p><p>{inspection.production_stages?.name}</p><p className="capitalize">{inspection.result}</p><p>{inspection.profiles?.full_name}</p><p>{inspection.ndt_results?.method ? `${inspection.ndt_results.method}: ${inspection.ndt_results.result ?? "-"}` : "-"}</p><InspectionReportUpload inspectionId={inspection.id} fileName={inspection.report_file_name}/></div>)}</div></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">NCR, rework and reinspection workflow</h2><NCRWorkflow ncrs={ncrs.data??[]} actions={actions.data??[]} profiles={profiles.data??[]}/></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Create quality plan</h2><QualityPlanManager projects={projects.data ?? []}/></Card>
    {(plans.data ?? []).map((plan) => <Card key={plan.id} className="overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><p className="text-xs text-orange-600">{plan.plan_number} · Rev {plan.revision}</p><h2 className="mt-1 font-semibold">{plan.title}</h2><p className="mt-1 text-sm text-slate-500">{plan.projects?.project_code} - {plan.projects?.name}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize">{plan.status.replaceAll("_"," ")}</span><ApprovalAction id={plan.id} type="quality-plan" status={plan.status}/></div></div><div className="divide-y">{plan.quality_plan_inspection_points?.map((point: Record<string, unknown>) => <div key={String(point.id)} className="grid gap-2 px-5 py-4 md:grid-cols-4"><div><p className="text-xs text-slate-400">Stage</p><p className="text-sm font-medium">{String(point.stage)}</p></div><div><p className="text-xs text-slate-400">Requirement / range</p><p className="text-sm">{String(point.inspection_requirement)} {point.acceptable_min != null || point.acceptable_max != null ? `(${String(point.acceptable_min ?? "*")} to ${String(point.acceptable_max ?? "*")} ${String(point.unit ?? "")})` : ""}</p></div><div><p className="text-xs text-slate-400">Method / certificates</p><p className="text-sm">{String(point.inspection_method ?? "-")} · {Array.isArray(point.required_certificates) ? point.required_certificates.join(", ") : "-"}</p></div><div>{Boolean(point.hold_point) && <span className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">Hold point</span>}</div></div>)}</div></Card>)}
  </div>;
}
