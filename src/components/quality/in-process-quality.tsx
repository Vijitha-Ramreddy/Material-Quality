"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

type Stage={id:string;name:string;production_job_id:string;status:string};
type Job={id:string;job_number:string;project_id:string};
type Profile={id:string;full_name:string};

export function InProcessQuality({jobs,stages}:{jobs:Job[];stages:Stage[];profiles:Profile[]}) {
  const router=useRouter();
  const [jobId,setJobId]=useState("");
  const [error,setError]=useState("");
  const [checkpointCount,setCheckpointCount]=useState(1);
  const stagesForJob=stages.filter((stage)=>stage.production_job_id===jobId);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const checkpoints=Array.from({length:checkpointCount},(_,index)=>({
      checkpoint_name:form.get(`checkpoint_${index}`),
      inspection_method:form.get(`method_${index}`),
      unit:form.get(`unit_${index}`),
      minimum_limit:form.get(`min_${index}`),
      maximum_limit:form.get(`max_${index}`),
      measured_value:form.get(`value_${index}`),
      remarks:form.get(`remark_${index}`),
    }));
    const ndtResults={method:form.get("ndt_method"),result:form.get("ndt_result"),reference:form.get("ndt_reference")};
    const response=await fetch("/api/quality/in-process",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      production_job_id:jobId,production_stage_id:form.get("stage_id"),checkpoints,ndt_results:ndtResults,remarks:form.get("remarks"),
    })});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to create inspection.");
    setError("");router.refresh();
  }
  return <form onSubmit={submit} className="space-y-4">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Production job<select required value={jobId} onChange={(event)=>setJobId(event.target.value)} className={input}><option value="">Select job</option>{jobs.map((job)=><option key={job.id} value={job.id}>{job.job_number}</option>)}</select></label><label className="text-sm font-medium">Production stage<select name="stage_id" required className={input}><option value="">Select stage</option>{stagesForJob.map((stage)=><option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label></div>
    <div className="flex items-center justify-between"><h3 className="font-semibold">Inspection checkpoints</h3><button type="button" className="text-sm font-medium text-orange-700" onClick={()=>setCheckpointCount((count)=>count+1)}>+ Add checkpoint</button></div>
    <div className="space-y-3">{Array.from({length:checkpointCount},(_,index)=><div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-6"><input required name={`checkpoint_${index}`} placeholder="Checkpoint" className={input}/><input name={`method_${index}`} placeholder="Method" className={input}/><input name={`unit_${index}`} placeholder="Unit" className={input}/><input name={`min_${index}`} type="number" step="any" placeholder="Min limit" className={input}/><input name={`max_${index}`} type="number" step="any" placeholder="Max limit" className={input}/><input name={`value_${index}`} type="number" step="any" placeholder="Measured value" className={input}/><input name={`remark_${index}`} placeholder="Checkpoint remarks" className={`${input} md:col-span-6`}/></div>)}</div>
    <div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium">NDT method<select name="ndt_method" className={input}><option value="">Not applicable</option><option>Visual</option><option>UT</option><option>RT</option><option>MT</option><option>PT</option></select></label><label className="text-sm font-medium">NDT result<select name="ndt_result" className={input}><option value="">Not recorded</option><option value="acceptable">Acceptable</option><option value="rejected">Rejected</option><option value="pending">Pending</option></select></label><label className="text-sm font-medium">NDT report reference<input name="ndt_reference" className={input}/></label></div>
    <label className="text-sm font-medium">QA remarks<textarea name="remarks" rows={3} className={input}/></label>
    <Button type="submit">Create inspection</Button>
  </form>;
}

export function NCRWorkflow({ncrs,profiles}:{ncrs:Array<{id:string;ncr_number:string;title:string;status:string;work_held:boolean;defect_description:string|null;reinspection_due_at:string|null;quality_inspection_id:string|null}>;actions:Array<{ncr_id:string;title:string;status:string}>;profiles:Profile[]}) {
  const router=useRouter(); const [error,setError]=useState("");
  async function update(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget); const id=form.get("ncr_id");
    const response=await fetch(`/api/quality/ncr/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      defect_description:form.get("defect_description"),containment_action:form.get("containment_action"),
      rework_description:form.get("rework_description"),reinspection_due_at:form.get("reinspection_due_at"),
      action_title:form.get("action_title"),action_description:form.get("action_description"),owner_id:form.get("owner_id"),
      status:form.get("status"),
    })});
    const body=await response.json();if(!response.ok)return setError(body.error??"Unable to update NCR.");
    router.refresh();
  }
  async function reinspection(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const response=await fetch("/api/quality/reinspection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ncr_id:form.get("ncr_id"),result:form.get("result"),remarks:form.get("remarks")})});
    const body=await response.json();if(!response.ok)return setError(body.error??"Unable to record reinspection.");
    router.refresh();
  }
  async function release(id:string) {
    const response=await fetch(`/api/quality/ncr/${id}/release`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({remarks:"Accepted reinspection authorized"})});
    const body=await response.json();if(!response.ok)return setError(body.error??"Unable to release stage.");
    router.refresh();
  }
  return <div className="space-y-4">{error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}{ncrs.map((ncr)=><div key={ncr.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{ncr.ncr_number} - {ncr.title}</p><p className="text-xs text-slate-500">{ncr.work_held?"WORK ON HOLD":"released / closed"}</p></div><span className="text-sm capitalize">{ncr.status.replaceAll("_"," ")}</span></div><form onSubmit={update} className="mt-3 grid gap-3 md:grid-cols-3"><input type="hidden" name="ncr_id" value={ncr.id}/><textarea name="defect_description" defaultValue={ncr.defect_description??""} placeholder="Defect" className={input}/><textarea name="containment_action" placeholder="Containment action" className={input}/><textarea name="rework_description" placeholder="Rework performed" className={input}/><input type="datetime-local" name="reinspection_due_at" className={input}/><input name="action_title" placeholder="Corrective action" className={input}/><input name="action_description" placeholder="Action description" className={input}/><select name="owner_id" className={input}><option value="">Assign corrective action owner</option>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select><select name="status" className={input} defaultValue={ncr.status}><option value="open">Open</option><option value="under_disposition">Under disposition</option><option value="corrective_action">Corrective action</option><option value="closed">Closed</option></select><Button type="submit">Save NCR</Button></form><div className="mt-3 flex flex-wrap gap-3"><form onSubmit={reinspection} className="flex gap-2"><input type="hidden" name="ncr_id" value={ncr.id}/><select name="result" className={input}><option value="accepted">Accepted reinspection</option><option value="rejected">Rejected reinspection</option></select><input name="remarks" placeholder="Reinspection remarks" className={input}/><Button type="submit" variant="secondary">Record</Button></form>{ncr.work_held&&<Button type="button" onClick={()=>release(ncr.id)}>Authorize release</Button>}</div></div>)}
    {ncrs.length===0&&<p className="text-sm text-slate-500">No in-process NCRs.</p>}</div>;
}
