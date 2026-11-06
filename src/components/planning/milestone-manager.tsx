"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MilestoneManager({ projects }: { projects: Array<{id:string;project_code:string;name:string}> }) {
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const projectId = String(form.get("project_id"));
    await fetch(`/api/projects/${projectId}/milestones`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:form.get("name"), description:form.get("description"), due_date:form.get("due_date"), status:form.get("status") }) });
    router.refresh(); event.currentTarget.reset();
  }
  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-5">
    <label className="text-sm font-medium">Project<select name="project_id" required className={input}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} - {project.name}</option>)}</select></label>
    <label className="text-sm font-medium">Milestone<input name="name" required className={input}/></label>
    <label className="text-sm font-medium">Due date<input name="due_date" type="date" className={input}/></label>
    <label className="text-sm font-medium">Status<select name="status" className={input}>{["planned","in_progress","completed","delayed","cancelled"].map((status) => <option key={status}>{status}</option>)}</select></label>
    <input type="hidden" name="description"/>
    <div className="flex items-end"><Button type="submit">Add milestone</Button></div>
  </form>;
}
