"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function QualityPlanManager({ projects }: { projects: Array<{id:string;name:string;project_code:string}> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const point = { stage: form.get("stage"), requirement: form.get("requirement"), min: form.get("min"), max: form.get("max"), unit: form.get("unit"), method: form.get("method"), certificates: form.get("certificates"), hold_point: form.get("hold_point") === "on" };
    const response = await fetch("/api/quality-plans", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ project_id: form.get("project_id"), title: form.get("title"), revision: form.get("revision"), points:[point] })});
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? "Unable to create quality plan.");
    router.refresh(); event.currentTarget.reset();
  }
  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {error && <p className="bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">Project<select name="project_id" required className={input}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} - {project.name}</option>)}</select></label>
    <label className="text-sm font-medium">Plan title<input name="title" required className={input}/></label>
    <label className="text-sm font-medium">Revision<input name="revision" defaultValue="0" className={input}/></label>
    <label className="text-sm font-medium">Inspection stage<input name="stage" required placeholder="Incoming / dimensional / NDT" className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Inspection requirement<textarea name="requirement" required rows={2} className={input}/></label>
    <label className="text-sm font-medium">Minimum<input name="min" type="number" step="any" className={input}/></label>
    <label className="text-sm font-medium">Maximum<input name="max" type="number" step="any" className={input}/></label>
    <label className="text-sm font-medium">Unit<input name="unit" className={input}/></label>
    <label className="text-sm font-medium">Inspection method<input name="method" required className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Required certificates<input name="certificates" placeholder="MTC, PMI, NDT report" className={input}/></label>
    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="hold_point"/> Mandatory hold point</label>
    <div className="flex items-end"><Button type="submit">Create quality plan</Button></div>
  </form>;
}
