"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProjectManager({ orders, managers }: { orders: Array<{id:string;order_number:string}>; managers: Array<{id:string;full_name:string}> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/projects", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? "Unable to create project.");
    router.refresh();
    event.currentTarget.reset();
  }
  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 md:col-span-4">{error}</p>}
    <label className="text-sm font-medium">Project code<input name="project_code" required placeholder="PRJ-2026-001" className={input}/></label>
    <label className="text-sm font-medium">Project name<input name="name" required className={input}/></label>
    <label className="text-sm font-medium">Customer order<select name="order_id" required className={input}><option value="">Select order</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.order_number}</option>)}</select></label>
    <label className="text-sm font-medium">Project manager<select name="project_manager_id" className={input}><option value="">Not assigned</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.full_name}</option>)}</select></label>
    <label className="text-sm font-medium">Start date<input name="start_date" type="date" className={input}/></label>
    <label className="text-sm font-medium">Planned completion<input name="planned_end_date" type="date" className={input}/></label>
    <label className="text-sm font-medium">Status<select name="status" defaultValue="planned" className={input}>{["planned","released","in_progress","paused","completed","cancelled"].map((status) => <option key={status}>{status}</option>)}</select></label>
    <div className="flex items-end"><Button type="submit">Create project</Button></div>
  </form>;
}
