"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string; code?: string };

export function OrderForm({ customers, projects }: { customers: Option[]; projects: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/orders", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Unable to create order.");
      setSaving(false);
      return;
    }
    router.push(`/orders/${result.id}`);
    router.refresh();
  }

  const inputClass = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500";
  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2">{error}</div>}
      <label className="text-sm font-medium text-slate-700">Customer<select name="customer_id" required className={inputClass}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Customer PO number<input name="customer_po_number" className={inputClass} /></label>
      <label className="text-sm font-medium text-slate-700 lg:col-span-2">Order description<textarea name="description" required rows={3} className={inputClass} /></label>
      <label className="text-sm font-medium text-slate-700">Product name<input name="product_name" required className={inputClass} /></label>
      <div className="grid grid-cols-[1fr_120px] gap-3"><label className="text-sm font-medium text-slate-700">Quantity<input name="quantity" type="number" min="0.0001" step="0.0001" required className={inputClass} /></label><label className="text-sm font-medium text-slate-700">Unit<input name="unit" defaultValue="nos" className={inputClass} /></label></div>
      <label className="text-sm font-medium text-slate-700">Order type<select name="order_type" className={inputClass}><option value="MTO">MTO - Make to Order</option><option value="ETO">ETO - Engineer to Order</option></select></label>
      <label className="text-sm font-medium text-slate-700">Priority<select name="priority" defaultValue="3" className={inputClass}><option value="1">1 - Critical</option><option value="2">2 - High</option><option value="3">3 - Normal</option><option value="4">4 - Low</option><option value="5">5 - Planned</option></select></label>
      <label className="text-sm font-medium text-slate-700">Required delivery date<input type="date" name="required_delivery_date" required className={inputClass} /></label>
      <label className="text-sm font-medium text-slate-700">Order value (INR)<input type="number" name="total_value" min="0" step="0.01" className={inputClass} /></label>
      <label className="text-sm font-medium text-slate-700">Existing project<select name="project_id" className={inputClass}><option value="">Create project below</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code ? `${project.code} - ` : ""}{project.name}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">New project name<input name="project_name" placeholder="Used when no project is selected" className={inputClass} /></label>
      <label className="text-sm font-medium text-slate-700 lg:col-span-2">Customer requirements or specification<input name="requirements" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt" className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:font-medium file:text-orange-700" /><span className="mt-1 block text-xs font-normal text-slate-500">PDF, Office documents, text, PNG or JPG up to 20 MB.</span></label>
      <div className="flex gap-3 lg:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create order"}</Button><Button type="button" variant="secondary" onClick={() => router.push("/orders")}>Cancel</Button></div>
    </form>
  );
}
