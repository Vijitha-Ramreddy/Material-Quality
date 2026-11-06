"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OrderEditor({
  order,
  customers,
  projects = [],
}: {
  order: Record<string, unknown>;
  customers: Array<{ id: string; name: string }>;
  projects?: Array<{ id: string; name: string; project_code: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Unable to update order.");
        setSaving(false);
      } else {
        router.push(`/orders/${order.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error while updating order.");
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500";

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 lg:col-span-2">{error}</p>}

      <label className="text-sm font-medium text-slate-700">
        Customer
        <select name="customer_id" required defaultValue={String(order.customer_id)} className={inputClass}>
          {customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700">
        Customer PO Number
        <input
          name="customer_po_number"
          defaultValue={String(order.customer_po_number ?? "")}
          className={inputClass}
        />
      </label>

      <label className="text-sm font-medium text-slate-700 lg:col-span-2">
        Order Description / Scope
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={String(order.description ?? "")}
          className={inputClass}
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Priority Level
        <select name="priority" defaultValue={String(order.priority ?? 3)} className={inputClass}>
          <option value="1">1 - Critical / Expedited</option>
          <option value="2">2 - High Priority</option>
          <option value="3">3 - Normal Fabrication</option>
          <option value="4">4 - Low Priority</option>
          <option value="5">5 - Planned / Stock</option>
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700">
        Order Lifecycle Status
        <select name="status" defaultValue={String(order.status ?? "draft")} className={inputClass}>
          {["draft", "confirmed", "in_progress", "completed", "cancelled", "on_hold"].map((item) => (
            <option key={item} value={item}>
              {item.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-700">
        Required Delivery Date
        <input
          type="date"
          name="required_delivery_date"
          defaultValue={String(order.required_delivery_date ?? "")}
          className={inputClass}
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Total Contract Value (INR)
        <input
          type="number"
          min="0"
          step="0.01"
          name="total_value"
          defaultValue={String(order.total_value ?? "")}
          className={inputClass}
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Associated Project
        <select name="project_id" defaultValue={String(order.project_id ?? "")} className={inputClass}>
          <option value="">No Project Assigned</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_code} - {p.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3 lg:col-span-2 mt-2">
        <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
          {saving ? "Saving Changes..." : "Save Changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
