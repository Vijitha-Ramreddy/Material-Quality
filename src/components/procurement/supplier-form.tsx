"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SupplierForm() {
  const router=useRouter(); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response=await fetch("/api/procurement/suppliers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to save supplier.");
    router.refresh(); event.currentTarget.reset();
  }
  const input="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">Supplier code<input name="code" required className={input}/></label>
    <label className="text-sm font-medium">Supplier name<input name="name" required className={input}/></label>
    <label className="text-sm font-medium">Email<input name="email" type="email" className={input}/></label>
    <label className="text-sm font-medium">Phone<input name="phone" className={input}/></label>
    <label className="text-sm font-medium">Contact person<input name="contact_person" className={input}/></label>
    <label className="text-sm font-medium">GST number<input name="gst_number" className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Address<textarea name="address" rows={2} className={input}/></label>
    <label className="flex items-center gap-2 text-sm"><input name="approved" type="checkbox"/> Approved supplier</label>
    <div><Button type="submit">Add supplier</Button></div>
  </form>;
}
