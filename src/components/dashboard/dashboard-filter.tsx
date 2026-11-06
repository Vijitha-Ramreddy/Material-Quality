"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function DashboardFilters({ customers }: { customers: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const params = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  function apply(form: FormData) {
    const query = new URLSearchParams();
    ["from", "to", "order", "customer", "status"].forEach((key) => {
      const value = String(form.get(key) ?? "").trim();
      if (value) query.set(key, value);
    });
    router.push(`/dashboard${query.size ? `?${query.toString()}` : ""}`);
  }

  function handleReset() {
    formRef.current?.reset();
    router.push("/dashboard");
  }

  return (
    <form ref={formRef} action={apply} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6">
      <label className="text-xs font-medium text-slate-600">From<input name="from" type="date" defaultValue={params.get("from") ?? ""} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500" /></label>
      <label className="text-xs font-medium text-slate-600">To<input name="to" type="date" defaultValue={params.get("to") ?? ""} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500" /></label>
      <label className="text-xs font-medium text-slate-600">Order<input name="order" placeholder="Order number" defaultValue={params.get("order") ?? ""} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500" /></label>
      <label className="text-xs font-medium text-slate-600">Customer<select name="customer" defaultValue={params.get("customer") ?? ""} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Status<select name="status" defaultValue={params.get("status") ?? ""} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"><option value="">All statuses</option>{["draft", "confirmed", "in_progress", "completed", "cancelled", "on_hold"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
      <div className="flex items-end gap-2">
        <button type="submit" className="h-9 flex-1 rounded-md bg-orange-600 px-3 text-sm font-semibold text-white hover:bg-orange-700">Apply</button>
        <button type="button" onClick={handleReset} className="h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset</button>
      </div>
    </form>
  );
}
