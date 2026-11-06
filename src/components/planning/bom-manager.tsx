"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BomManager({ projects }: { projects: Array<{id:string;name:string;project_code:string}> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/bom", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? "Unable to add BOM item.");
    router.refresh(); event.currentTarget.reset();
  }
  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {error && <p className="bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">Project<select name="project_id" required className={input}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} - {project.name}</option>)}</select></label>
    <label className="text-sm font-medium">Material code<input name="item_code" required className={input}/></label>
    <label className="text-sm font-medium">Unit<input name="unit" required placeholder="kg, nos, m" className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Description<textarea name="description" required rows={2} className={input}/></label>
    <label className="text-sm font-medium">Quantity<input name="quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Specification<textarea name="material_specification" rows={2} className={input}/></label>
    <div className="flex items-end"><Button type="submit">Add BOM item</Button></div>
  </form>;
}
