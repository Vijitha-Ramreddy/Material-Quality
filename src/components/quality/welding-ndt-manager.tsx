"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function WeldingNdtManager({ jobs, welds, wps, welders }: {
  jobs: Array<{ id: string; job_number: string }>;
  welds: Array<{ id: string; weld_number: string; production_job_id: string }>;
  wps: Array<{ id: string; wps_number: string }>;
  welders: Array<{ id: string; qualification_number: string; welder_id: string; welder_name: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function saveWelding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/quality/welding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to save welding record.");
    setError("");
    event.currentTarget.reset();
    router.refresh();
  }

  async function saveNdt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/quality/ndt", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to save NDT inspection.");
    setError("");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700 xl:col-span-2">{error}</p>}
      <form onSubmit={saveWelding} className="grid gap-3 md:grid-cols-2">
        <h3 className="font-semibold md:col-span-2">WPS, PQR, welder qualification and weld identification</h3>
        <select name="record_type" required className={input} defaultValue="wps">
          <option value="wps">WPS</option><option value="pqr">PQR</option><option value="welder">Welder qualification</option><option value="weld">Weld record</option>
        </select>
        <input name="wps_number" placeholder="WPS number" className={input}/>
        <input name="revision" placeholder="WPS revision" defaultValue="0" className={input}/>
        <input name="welding_process" placeholder="Welding process (SMAW / GTAW / GMAW)" className={input}/>
        <input name="pqr_number" placeholder="PQR number" className={input}/>
        <input name="qualification_number" placeholder="Qualification number" className={input}/>
        <input name="welder_id" placeholder="Welder ID" className={input}/>
        <input name="welder_name" placeholder="Welder name" className={input}/>
        <input name="qualification_date" type="date" className={input}/>
        <input name="expiry_date" type="date" className={input}/>
        <input name="weld_positions" placeholder="Positions: 1G,2G,3G" className={input}/>
        <input name="thickness_range" placeholder="Thickness range" className={input}/>
        <select name="production_job_id" className={input}><option value="">Production job for weld</option>{jobs.map((job)=><option key={job.id} value={job.id}>{job.job_number}</option>)}</select>
        <input name="weld_number" placeholder="Weld identification number" className={input}/>
        <input name="joint_number" placeholder="Joint number" className={input}/>
        <select name="wps_id" className={input}><option value="">Approved WPS</option>{wps.map((item)=><option key={item.id} value={item.id}>{item.wps_number}</option>)}</select>
        <select name="welder_qualification_id" className={input}><option value="">Qualified welder</option>{welders.map((item)=><option key={item.id} value={item.id}>{item.welder_id} - {item.welder_name}</option>)}</select>
        <input name="consumable_batch" placeholder="Consumable / filler batch" className={input}/>
        <select name="inspection_status" className={input}><option value="pending">Pending</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="reinspection_required">Reinspection required</option></select>
        <div className="md:col-span-2"><Button type="submit">Save welding record</Button></div>
      </form>
      <form onSubmit={saveNdt} className="grid gap-3 md:grid-cols-2">
        <h3 className="font-semibold md:col-span-2">UT / RT / MT / PT inspection</h3>
        <select name="production_job_id" required className={input}><option value="">Production job</option>{jobs.map((job)=><option key={job.id} value={job.id}>{job.job_number}</option>)}</select>
        <select name="weld_record_id" required className={input}><option value="">Weld identification</option>{welds.map((weld)=><option key={weld.id} value={weld.id}>{weld.weld_number}</option>)}</select>
        <select name="ndt_method" required className={input}><option value="">NDT method</option><option>UT</option><option>RT</option><option>MT</option><option>PT</option></select>
        <input name="inspection_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className={input}/>
        <input name="acceptance_criteria_reference" placeholder="Acceptance criteria reference" required className={input}/>
        <input name="acceptance_standard" placeholder="Code / standard" className={input}/>
        <input name="procedure_number" placeholder="Procedure number" className={input}/>
        <input name="inspector_name" placeholder="Inspector name" className={input}/>
        <select name="inspection_status" required className={input}><option value="pending">Pending</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="reinspection_required">Reinspection required</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="rework_required"/> Rework required</label>
        <input name="reinspect_after_at" type="datetime-local" className={input}/>
        <textarea name="rework_details" placeholder="Rework details" rows={2} className={`${input} md:col-span-2`}/>
        <textarea name="remarks" placeholder="Inspection remarks / indications" rows={2} className={`${input} md:col-span-2`}/>
        <input type="file" name="report" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className={`${input} md:col-span-2`}/>
        <div className="md:col-span-2"><Button type="submit">Save NDT inspection</Button></div>
      </form>
    </div>
  );
}
