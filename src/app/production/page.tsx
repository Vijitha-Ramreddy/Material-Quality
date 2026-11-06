import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProductionForms } from "@/components/production/production-forms";
import { StageCard } from "@/components/production/stage-card";

export default async function Page() {
  const supabase=await createClient();
  const [jobs, projects, bom, profiles, inspections, allocations]=await Promise.all([
    supabase.from("production_jobs").select("*,projects(project_number,name),bom_items(item_code,description,unit)").order("created_at",{ascending:false}),
    supabase.from("projects").select("id,project_number,name").order("project_number"),
    supabase.from("bom_items").select("id,item_code,description,unit,status,project_id"),
    supabase.from("profiles").select("id,full_name,role").eq("active",true).or("role.eq.production,role.eq.admin"),
    supabase.from("quality_inspections").select("id,inspection_number,result,production_job_id,production_stage_id,created_at").order("created_at",{ascending:false}),
    supabase.from("steel_material_allocations").select("id,production_job_id,allocated_quantity,consumed_quantity,scrap_quantity,status,material_receipts(heat_number,batch_number)").neq("status","cancelled"),
  ]);
  const jobRows=jobs.data??[];
  const stageJobs=await Promise.all(jobRows.map(async (job)=>{
    const stages=await supabase.from("production_stages").select("*").eq("production_job_id",job.id).order("stage_sequence");
    const consumption=await supabase.from("production_material_consumption").select("*").eq("production_job_id",job.id).order("created_at",{ascending:false});
    const evidence=await supabase.from("production_evidence").select("*").eq("production_job_id",job.id).order("created_at",{ascending:false});
    return {...job,stages:stages.data??[],consumption:consumption.data??[],evidence:evidence.data??[]};
  }));
  const stageCounts=stageJobs.flatMap((job)=>job.stages).reduce<Record<string,number>>((counts:Record<string,number>,row:{status:string})=>{counts[row.status]=(counts[row.status]??0)+1;return counts;},{});
  return <div className="space-y-5">
    <div><p className="text-sm text-orange-600">Production control</p><h1 className="text-2xl font-semibold text-slate-900">Production management</h1></div>
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="p-5"><p className="text-sm text-slate-500">Production jobs</p><p className="mt-2 text-3xl font-semibold">{jobRows.length}</p></Card>
      <Card className="p-5"><p className="text-sm text-slate-500">Active stages</p><p className="mt-2 text-3xl font-semibold">{stageCounts.in_progress??0}</p></Card>
      <Card className="p-5"><p className="text-sm text-slate-500">Completed stages</p><p className="mt-2 text-3xl font-semibold">{stageCounts.completed??0}</p></Card>
      <Card className="p-5"><p className="text-sm text-slate-500">Quality links</p><p className="mt-2 text-3xl font-semibold">{inspections.data?.filter((item)=>item.production_job_id).length??0}</p></Card>
    </div>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Create production job</h2><ProductionForms projects={projects.data??[]} bomItems={bom.data??[]} profiles={profiles.data??[]}/></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Production jobs and stages</h2></div>
      <div className="divide-y">{stageJobs.map((job)=>{
        const completed=job.stages.filter((stage:{status:string})=>stage.status==="completed").length;
        const progress=job.stages.length?Math.round(completed/job.stages.length*100):0;
        return <div key={job.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{job.job_number}</p><p className="text-sm text-slate-500">{job.projects?.project_number} - {job.projects?.name}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize">{job.status.replaceAll("_"," ")}</span></div>
          <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-orange-500" style={{width:`${progress}%`}}/></div>
          <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Planned {job.quantity}</span><span>{progress}% complete</span></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">{job.stages.map((stage:{id:string;name:string;status:string;remarks:string|null;produced_quantity:number;started_at:string|null})=><StageCard key={stage.id} stage={stage} profiles={profiles.data??[]} jobId={job.id} allocations={(allocations.data??[]).filter((allocation)=>allocation.production_job_id===job.id).map((allocation)=>{const receipt=Array.isArray(allocation.material_receipts)?allocation.material_receipts[0]:allocation.material_receipts;return {...allocation,material_receipt_id:allocation.id,heat_number:receipt?.heat_number??null,batch_number:receipt?.batch_number??null};})}/>)}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase text-slate-500">Consumption</p>{job.consumption.length?job.consumption.slice(0,4).map((row:{id:string;quantity:number;unit:string;remarks:string|null;heat_number:string|null})=><p key={row.id} className="mt-2 text-sm">{row.quantity} {row.unit} <span className="text-slate-500">{row.remarks||row.heat_number||"-"}</span></p>):<p className="mt-2 text-sm text-slate-400">No consumption recorded</p>}</div><div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase text-slate-500">Evidence</p>{job.evidence.length?job.evidence.slice(0,4).map((row:{id:string;file_name:string})=><p key={row.id} className="mt-2 text-sm">{row.file_name}</p>):<p className="mt-2 text-sm text-slate-400">No evidence uploaded</p>}</div></div>
        </div>;
      })}{jobRows.length===0&&<p className="p-6 text-sm text-slate-500">No production jobs have been created.</p>}</div>
    </Card>
  </div>;
}
