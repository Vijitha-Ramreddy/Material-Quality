"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs";

export function StageCard({ stage, profiles, jobId, allocations=[] }: {stage:{id:string;name:string;status:string;remarks:string|null;produced_quantity:number;started_at:string|null};profiles:Array<{id:string;full_name:string}>;jobId:string;allocations?:Array<{id:string;material_receipt_id:string;allocated_quantity:number;heat_number:string|null;batch_number:string|null}>}) {
  const router=useRouter(); const [error,setError]=useState("");
  async function update(event:FormEvent<HTMLFormElement>,action:string) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const response=await fetch(`/api/production/stages/${stage.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      status:action,operator_id:form.get("operator_id"),remarks:form.get("remarks"),produced_quantity:form.get("produced_quantity"),
    })});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to update stage.");
    router.refresh();
  }
  async function evidence(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response=await fetch("/api/production/evidence",{method:"POST",body:new FormData(event.currentTarget)});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to upload evidence.");
    router.refresh();
  }
  async function consume(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const response=await fetch("/api/production/consumption",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      production_job_id:jobId,stage_id:stage.id,allocation_id:form.get("allocation_id"),quantity:form.get("quantity"),unit:form.get("unit"),scrap_quantity:form.get("scrap_quantity"),finished_equipment_serial:form.get("finished_equipment_serial"),component_identification:form.get("component_identification"),remarks:form.get("remarks"),
    })});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to record consumption.");
    router.refresh();
  }
  return <div className="rounded-lg border border-slate-200 p-3">
    {error&&<p className="mb-2 text-xs text-red-700">{error}</p>}
    <div className="flex justify-between gap-2"><p className="font-medium">{stage.name}</p><span className="text-xs capitalize text-slate-500">{stage.status.replaceAll("_"," ")}</span></div>
    <form onSubmit={(event)=>update(event,stage.status==="completed"?"rework":stage.status==="in_progress"?"completed":"in_progress")} className="mt-3 space-y-2">
      <select name="operator_id" className={input}><option value="">Operator</option>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select>
      <input name="produced_quantity" type="number" min="0" step="0.0001" defaultValue={stage.produced_quantity} className={input}/>
      <input name="remarks" defaultValue={stage.remarks??""} placeholder="Stage remarks" className={input}/>
      <Button type="submit" className="w-full">{stage.status==="in_progress"?"Complete stage":stage.status==="completed"?"Send to rework":"Start stage"}</Button>
    </form>
    <form onSubmit={consume} className="mt-3 space-y-2 border-t pt-3"><p className="text-xs font-medium">Material consumption and scrap</p><select name="allocation_id" required className={input}><option value="">Select accepted heat / batch</option>{allocations.map((allocation)=><option key={allocation.id} value={allocation.id}>{allocation.heat_number ?? "-"} / {allocation.batch_number ?? "-"} ({allocation.allocated_quantity})</option>)}</select><div className="grid grid-cols-2 gap-2"><input name="quantity" type="number" min="0.0001" step="0.0001" required placeholder="Consumed qty" className={input}/><input name="unit" required placeholder="Unit" className={input}/></div><div className="grid grid-cols-2 gap-2"><input name="scrap_quantity" type="number" min="0" step="0.0001" defaultValue="0" placeholder="Scrap qty" className={input}/><input name="finished_equipment_serial" placeholder="Equipment serial" className={input}/></div><input name="component_identification" placeholder="Component / weldment" className={input}/><input name="remarks" placeholder="Remarks" className={input}/><button type="submit" className="text-xs font-medium text-orange-700">Record consumption</button></form>
    <form onSubmit={evidence} className="mt-3 space-y-2 border-t pt-3"><p className="text-xs font-medium">Production evidence</p><input type="hidden" name="stage_id" value={stage.id}/><input type="file" name="evidence" required accept="image/*,.pdf,.mp4,.zip" className="w-full text-xs"/><input name="remarks" placeholder="Remarks" className={input}/><button type="submit" className="text-xs font-medium text-orange-700">Upload evidence</button></form>
  </div>;
}
