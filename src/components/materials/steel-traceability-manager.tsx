"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function SteelAllocationForm({ receipts, jobs }: {
  receipts: Array<{ id: string; receipt_number: string; heat_number: string|null; batch_number: string|null; received_quantity: number; unit: string }>;
  jobs: Array<{ id: string; job_number: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/materials/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to allocate material.");
    setError("");
    event.currentTarget.reset();
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
      <label className="text-sm font-medium">Accepted heat / batch
        <select name="material_receipt_id" required className={input}>
          <option value="">Select material batch</option>
          {receipts.map((receipt) => (
            <option key={receipt.id} value={receipt.id}>{receipt.receipt_number} - {receipt.heat_number}/{receipt.batch_number}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">Production job
        <select name="production_job_id" required className={input}>
          <option value="">Select job</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.job_number}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Allocated quantity<input name="quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label>
      <label className="text-sm font-medium">Unit<input name="unit" required className={input}/></label>
      <label className="text-sm font-medium">Equipment serial<input name="finished_equipment_serial" className={input}/></label>
      <label className="text-sm font-medium">Component / assembly<input name="component_identification" className={input}/></label>
      <label className="text-sm font-medium md:col-span-2">Remarks<textarea name="remarks" rows={2} className={input}/></label>
      <div><Button type="submit">Allocate material</Button></div>
    </form>
  );
}
