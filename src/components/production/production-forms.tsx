"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function ProductionForms({ projects, bomItems, profiles }: {
  projects:Array<{id:string;project_number:string;name:string}>;
  bomItems:Array<{id:string;project_id:string;item_code:string;description:string;unit:string;status:string}>;
  profiles:Array<{id:string;full_name:string}>;
}) {
  const router=useRouter(); const [error,setError]=useState(""); const [projectId,setProjectId]=useState("");
  const availableBom=bomItems.filter((item)=>item.project_id===projectId&&item.status==="approved");
  async function createJob(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/production/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      project_id:form.get("project_id"),bom_item_id:form.get("bom_item_id"),quantity:Number(form.get("quantity")),
      supervisor_id:form.get("supervisor_id"),planned_start_at:form.get("planned_start_at"),
      planned_end_at:form.get("planned_end_at"),remarks:form.get("remarks"),
    })});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to create production job.");
    setError(""); router.refresh(); event.currentTarget.reset(); setProjectId("");
  }
  return <form onSubmit={createJob} className="grid gap-4 md:grid-cols-3">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">Project<select name="project_id" required value={projectId} onChange={(event)=>setProjectId(event.target.value)} className={input}><option value="">Select project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.project_number} - {project.name}</option>)}</select></label>
    <label className="text-sm font-medium">Approved BOM requirement<select name="bom_item_id" required className={input}><option value="">Select BOM item</option>{availableBom.map((item)=><option key={item.id} value={item.id}>{item.item_code} - {item.description}</option>)}</select></label>
    <label className="text-sm font-medium">Planned quantity<input name="quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label>
    <label className="text-sm font-medium">Supervisor<select name="supervisor_id" className={input}><option value="">Select supervisor</option>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select></label>
    <label className="text-sm font-medium">Planned start<input name="planned_start_at" type="datetime-local" className={input}/></label>
    <label className="text-sm font-medium">Planned completion<input name="planned_end_at" type="datetime-local" className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Remarks<textarea name="remarks" rows={2} className={input}/></label>
    <div className="flex items-end"><Button type="submit">Create job & stages</Button></div>
  </form>;
}
