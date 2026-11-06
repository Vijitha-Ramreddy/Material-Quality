"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm";

export function MachineryQuality({jobs, stages, receipts}: {
  jobs:Array<{id:string;job_number:string}>;
  stages:Array<{id:string;name:string;production_job_id:string}>;
  receipts:Array<{id:string;receipt_number:string;heat_number:string|null;batch_number:string|null}>;
}) {
  const router=useRouter();const [error,setError]=useState("");const [type,setType]=useState("weld");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response=await fetch("/api/machinery-quality",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const result=await response.json();if(!response.ok)return setError(result.error||"Unable to save machinery QA record.");
    setError("");router.refresh();event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">Record type<select name="record_type" value={type} onChange={e=>setType(e.target.value)} className={input}><option value="weld">Weld traceability</option><option value="ndt">NDT record</option><option value="hydrostatic">Hydrostatic test</option><option value="traceability">Material consumption / traceability</option></select></label>
    <label className="text-sm font-medium">Production job<select name="production_job_id" required className={input}><option value="">Select job</option>{jobs.map(job=><option key={job.id} value={job.id}>{job.job_number}</option>)}</select></label>
    <label className="text-sm font-medium">Production stage<select name="production_stage_id" className={input}><option value="">Not specific</option>{stages.map(stage=><option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
    {type==="weld"&&<>
      <label className="text-sm">Weld number<input name="weld_number" required className={input}/></label>
      <label className="text-sm">Joint number<input name="joint_number" className={input}/></label>
      <label className="text-sm">Welder ID<input name="welder_id" className={input}/></label>
      <label className="text-sm">Welding process<input name="welding_process" required placeholder="SMAW / GMAW / GTAW / SAW" className={input}/></label>
      <label className="text-sm">Position<input name="welding_position" placeholder="1G / 2G / 3G / 5G / 6G" className={input}/></label>
      <label className="text-sm">Filler metal / heat batch<input name="filler_heat_or_batch" className={input}/></label>
      <label className="text-sm">Filler material<input name="filler_material" placeholder="E7018 etc." className={input}/></label>
      <label className="text-sm">Base material grade<input name="base_material_grade" className={input}/></label>
      <label className="text-sm">WPS number<input name="wps_number" className={input}/></label>
      <label className="text-sm">Weld result<select name="result" className={input}><option>pending</option><option>accepted</option><option>rejected</option><option>repair_required</option></select></label>
    </>}
    {type==="ndt"&&<>
      <label className="text-sm">NDT record number<input name="ndt_number" required className={input}/></label>
      <label className="text-sm">NDT method<select name="ndt_method" required className={input}><option value="">Select</option><option>VT</option><option>UT</option><option>RT</option><option>MT</option><option>PT</option><option>PAUT</option><option>TOFD</option></select></label>
      <label className="text-sm">Acceptance standard<input name="acceptance_standard" placeholder="ASME / ISO / approved code" className={input}/></label>
      <label className="text-sm">Procedure number<input name="procedure_number" className={input}/></label>
      <label className="text-sm">Technician<input name="technician" className={input}/></label>
      <label className="text-sm">Result<select name="result" className={input}><option>pending</option><option>acceptable</option><option>rejected</option><option>reinspect</option></select></label>
    </>}
    {type==="hydrostatic"&&<>
      <label className="text-sm">Test number<input name="test_number" required className={input}/></label>
      <label className="text-sm">Equipment tag<input name="equipment_tag" className={input}/></label>
      <label className="text-sm">Test pressure<input name="test_pressure" type="number" step="0.01" required className={input}/></label>
      <label className="text-sm">Unit<select name="pressure_unit" className={input}><option>bar</option><option>MPa</option><option>psi</option></select></label>
      <label className="text-sm">Holding time (minutes)<input name="holding_time_minutes" type="number" step="0.1" required className={input}/></label>
      <label className="text-sm">Test result<select name="result" className={input}><option>pending</option><option>passed</option><option>failed</option><option>reinspect</option></select></label>
      <label className="text-sm">Witness / inspector<input name="witnessed_by" className={input}/></label>
    </>}
    {type==="traceability"&&<>
      <label className="text-sm">Material receipt<select name="material_receipt_id" required className={input}><option value="">Select heat / batch receipt</option>{receipts.map(receipt=><option key={receipt.id} value={receipt.id}>{receipt.receipt_number} · {receipt.heat_number??"-"} / {receipt.batch_number??"-"}</option>)}</select></label>
      <label className="text-sm">Finished equipment serial<input name="finished_equipment_serial" className={input}/></label>
      <label className="text-sm">Component identification<input name="component_identification" className={input}/></label>
      <label className="text-sm">Heat number<input name="heat_number" className={input}/></label>
      <label className="text-sm">Batch number<input name="batch_number" className={input}/></label>
      <label className="text-sm">Consumed quantity<input name="consumed_quantity" type="number" step="0.0001" min="0.0001" required className={input}/></label>
      <label className="text-sm">Scrap quantity<input name="scrap_quantity" type="number" step="0.0001" min="0" defaultValue="0" className={input}/></label>
      <label className="text-sm">Unit<input name="unit" required placeholder="kg / nos / m" className={input}/></label>
    </>}
    <label className="text-sm md:col-span-3">Remarks<textarea name="remarks" rows={2} className={input}/></label>
    <div className="md:col-span-3"><Button type="submit">Save Machinery Division QA record</Button></div>
  </form>;
}
