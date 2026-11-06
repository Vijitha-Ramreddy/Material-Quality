"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function ReceiptForm({ poItems, materials }: { poItems:Array<{id:string;item_code:string;description:string;unit:string}>; materials:Array<{id:string;material_code:string;name:string}> }) {
  const router=useRouter(); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response=await fetch("/api/incoming-qa/receipts",{method:"POST",body:new FormData(event.currentTarget)});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to record receipt.");
    router.refresh(); event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">Purchase order item<select name="purchase_order_item_id" required className={input}><option value="">Select PO item</option>{poItems.map((item)=><option key={item.id} value={item.id}>{item.item_code} - {item.description}</option>)}</select></label>
    <label className="text-sm font-medium">Material<select name="material_id" className={input}><option value="">Match automatically / unlinked</option>{materials.map((material)=><option key={material.id} value={material.id}>{material.material_code} - {material.name}</option>)}</select></label>
    <label className="text-sm font-medium">Received quantity<input name="received_quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label>
    <label className="text-sm font-medium">Material description<input name="material_description" required placeholder="Plate / section / pipe description" className={input}/></label>
    <label className="text-sm font-medium">Unit<input name="unit" required className={input}/></label>
    <label className="text-sm font-medium">Heat number<input name="heat_number" className={input}/></label>
    <label className="text-sm font-medium">Batch number<input name="batch_number" className={input}/></label>
    <label className="text-sm font-medium">Steel grade<input name="steel_grade" placeholder="e.g. SA516 Gr.70 / IS 2062 E250" className={input}/></label>
    <label className="text-sm font-medium">Material standard<input name="material_standard" placeholder="e.g. ASTM A516 / IS 2062" className={input}/></label>
    <label className="text-sm font-medium">Plate thickness (mm)<input name="thickness_mm" type="number" min="0.1" step="0.1" className={input}/></label>
    <label className="text-sm font-medium">Width (mm)<input name="width_mm" type="number" min="0.1" step="0.1" className={input}/></label>
    <label className="text-sm font-medium">Length (mm)<input name="length_mm" type="number" min="0.1" step="0.1" className={input}/></label>
    <label className="text-sm font-medium">Weight (kg)<input name="weight_kg" type="number" min="0.0001" step="0.0001" className={input}/></label>
    <label className="text-sm font-medium">Section size<input name="section_size" placeholder="e.g. 200 x 100 x 10" className={input}/></label>
    <label className="text-sm font-medium">Dimensions / pipe size<input name="dimensions" className={input}/></label>
    <label className="text-sm font-medium">MTC number<input name="mtc_number" className={input}/></label>
    <label className="text-sm font-medium">MTC issued by<input name="mtc_issued_by" className={input}/></label>
    <label className="text-sm font-medium">MTC issue date<input name="mtc_issued_on" type="date" className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Material test certificate<input name="certificate" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="mt-1 w-full text-sm"/></label>
    <div><Button type="submit">Record receipt</Button></div>
  </form>;
}

export function InspectionForm({ receipts }: { receipts:Array<{id:string;receipt_number:string}> }) {
  const router=useRouter(); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const response=await fetch("/api/incoming-qa/inspections",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      receipt_id:form.get("receipt_id"),result:form.get("result"),inspected_quantity:Number(form.get("inspected_quantity")),
      accepted_quantity:Number(form.get("accepted_quantity")),rejected_quantity:Number(form.get("rejected_quantity")),
      remarks:form.get("remarks"),observations:{specification_check:form.get("specification_check")==="on"},
    })});
    const body=await response.json();
    if(!response.ok)return setError(body.error??"Unable to save inspection.");
    router.refresh(); event.currentTarget.reset();
  }
  const resultOptions=["pending","under_inspection","accepted","rejected","on_hold"];
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">Material receipt<select name="receipt_id" required className={input}><option value="">Select receipt</option>{receipts.map((receipt)=><option key={receipt.id} value={receipt.id}>{receipt.receipt_number}</option>)}</select></label>
    <label className="text-sm font-medium">Inspection result<select name="result" required defaultValue="under_inspection" className={input}>{resultOptions.map((result)=><option key={result}>{result}</option>)}</select></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="specification_check"/> Specifications checked</label>
    <label className="text-sm font-medium">Inspected quantity<input name="inspected_quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label>
    <label className="text-sm font-medium">Accepted quantity<input name="accepted_quantity" type="number" min="0" step="0.0001" defaultValue="0" className={input}/></label>
    <label className="text-sm font-medium">Rejected quantity<input name="rejected_quantity" type="number" min="0" step="0.0001" defaultValue="0" className={input}/></label>
    <label className="text-sm font-medium md:col-span-2">Inspection remarks<textarea name="remarks" rows={2} className={input}/></label>
    <div><Button type="submit">Record inspection</Button></div>
  </form>;
}
