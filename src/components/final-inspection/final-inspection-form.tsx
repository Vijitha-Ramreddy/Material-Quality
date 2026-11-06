"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function FinalInspectionForm({jobs}:{jobs:Array<{id:string;job_number:string;quantity:number}>}) {
  const router=useRouter(); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const measurements=Array.from(form.getAll("characteristic")).map((_,index)=>({
      inspection_type:form.getAll("inspection_type")[index],characteristic:form.getAll("characteristic")[index],
      unit:form.getAll("unit")[index],minimum_limit:form.getAll("minimum_limit")[index],
      maximum_limit:form.getAll("maximum_limit")[index],measured_value:form.getAll("measured_value")[index],
      remarks:form.getAll("measurement_remarks")[index],
    }));
    const response=await fetch("/api/final-inspection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      production_job_id:form.get("production_job_id"),result:form.get("result"),
      inspected_quantity:Number(form.get("inspected_quantity")),accepted_quantity:Number(form.get("accepted_quantity")),
      rejected_quantity:Number(form.get("rejected_quantity")),certificate_number:form.get("certificate_number"),
      dimensional_observations:form.get("dimensional_observations"),functional_observations:form.get("functional_observations"),
      customer_inspection_required:form.get("customer_inspection_required")==="on",
      customer_inspector_name:form.get("customer_inspector_name"),customer_inspector_company:form.get("customer_inspector_company"),
      third_party_inspector_name:form.get("third_party_inspector_name"),third_party_inspector_company:form.get("third_party_inspector_company"),
      remarks:form.get("remarks"),measurements,
    })});
    const body=await response.json();if(!response.ok)return setError(body.error??"Unable to create final inspection.");
    setError("");router.refresh();
  }
  const Measurement = ({index}:{index:number}) => <div className="grid gap-2 rounded border border-slate-200 p-3 md:grid-cols-7">
    <select name="inspection_type" required className={input} defaultValue="dimensional"><option value="dimensional">Dimensional</option><option value="functional">Functional</option></select>
    <input name="characteristic" required placeholder={`Characteristic ${index+1}`} className={input}/>
    <input name="unit" placeholder="Unit" className={input}/>
    <input name="minimum_limit" type="number" step="any" placeholder="Minimum" className={input}/>
    <input name="maximum_limit" type="number" step="any" placeholder="Maximum" className={input}/>
    <input name="measured_value" type="number" step="any" placeholder="Measured" required className={input}/>
    <input name="measurement_remarks" placeholder="Remarks" className={input}/>
  </div>;
  return <form onSubmit={submit} className="space-y-4">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 md:grid-cols-4"><label className="text-sm font-medium">Completed production job<select name="production_job_id" required className={input}><option value="">Select job</option>{jobs.map((job)=><option key={job.id} value={job.id}>{job.job_number}</option>)}</select></label><label className="text-sm font-medium">Status<select name="result" className={input}><option value="under_inspection">Under Inspection</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="reinspection_required">Reinspection Required</option></select></label><label className="text-sm font-medium">Inspected quantity<input name="inspected_quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label><label className="text-sm font-medium">Certificate number<input name="certificate_number" className={input}/></label></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Accepted quantity<input name="accepted_quantity" type="number" min="0" step="0.0001" defaultValue="0" className={input}/></label><label className="text-sm font-medium">Rejected quantity<input name="rejected_quantity" type="number" min="0" step="0.0001" defaultValue="0" className={input}/></label></div>
    <h3 className="font-semibold">Dimensional and functional measurements</h3>
    {Array.from({length:3},(_,index)=><Measurement key={index} index={index}/>)}
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Dimensional observations<textarea name="dimensional_observations" rows={2} className={input}/></label><label className="text-sm font-medium">Functional observations<textarea name="functional_observations" rows={2} className={input}/></label></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="customer_inspection_required"/> Customer inspection required</label>
    <div className="grid gap-4 md:grid-cols-2"><input name="customer_inspector_name" placeholder="Customer inspector name" className={input}/><input name="customer_inspector_company" placeholder="Customer company" className={input}/><input name="third_party_inspector_name" placeholder="Third-party inspector name" className={input}/><input name="third_party_inspector_company" placeholder="Third-party company" className={input}/></div>
    <label className="text-sm font-medium">QA remarks<textarea name="remarks" rows={3} className={input}/></label>
    <Button type="submit">Save final inspection</Button>
  </form>;
}
