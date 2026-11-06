"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

export function RequisitionForm({ projects, bomItems }: { projects: Array<{id:string;project_code:string;name:string}>; bomItems: Array<{id:string;project_id:string;item_code:string;description:string;quantity:number;unit:string}> }) {
  const router = useRouter(); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const projectId = String(form.get("project_id"));
    const bom = bomItems.find((item) => item.id === form.get("bom_item_id"));
    const quantity = Number(form.get("quantity"));
    const res = await fetch("/api/procurement/requisitions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project_id:projectId,notes:form.get("notes"),submit_for_approval:form.get("submit")==="on",items:bom?[{bom_item_id:bom.id,quantity,unit:form.get("unit")}]:[]})});
    const body=await res.json(); if(!res.ok)return setError(body.error??"Unable to create requisition.");
    router.refresh(); event.currentTarget.reset();
  }
  const projectItems=(projectId:string)=>bomItems.filter((item)=>item.project_id===projectId);
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-4" id="requisition-form">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-4">{error}</p>}
    <label className="text-sm font-medium">Project<select name="project_id" required className={input} onChange={(event)=>{const select=document.querySelector<HTMLSelectElement>("#requisition-bom");if(select){select.innerHTML='<option value="">Select BOM requirement</option>'+projectItems(event.currentTarget.value).map((item)=>`<option value="${item.id}">${item.item_code} - ${item.description}</option>`).join("");}}}><option value="">Select project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.project_code} - {project.name}</option>)}</select></label>
    <label className="text-sm font-medium">BOM requirement<select id="requisition-bom" name="bom_item_id" required className={input}><option value="">Select BOM requirement</option></select></label>
    <label className="text-sm font-medium">Quantity<input name="quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label>
    <label className="text-sm font-medium">Unit<input name="unit" required className={input}/></label>
    <label className="text-sm font-medium md:col-span-3">Notes<input name="notes" className={input}/></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="submit"/> Submit for approval</label>
    <div><Button type="submit">Create requisition</Button></div>
  </form>;
}

export function PurchaseOrderForm({ projects, suppliers, bomItems }: { projects:Array<{id:string;project_code:string;name:string}>; suppliers:Array<{id:string;name:string}>; bomItems:Array<{id:string;project_id:string;item_code:string;description:string;unit:string}> }) {
  const router=useRouter(); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const bom=bomItems.find((item)=>item.id===form.get("bom_item_id"));
    const quantity=Number(form.get("ordered_quantity"));
    const res=await fetch("/api/procurement/purchase-orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      po_number:form.get("po_number"),project_id:form.get("project_id"),supplier_id:form.get("supplier_id"),expected_delivery_date:form.get("expected_delivery_date"),status:"draft",notes:form.get("notes"),
      items:bom?[{bom_item_id:bom.id,item_code:bom.item_code,description:bom.description,ordered_quantity:quantity,unit:form.get("unit"),unit_price:form.get("unit_price")}]:[],
    })});
    const body=await res.json(); if(!res.ok)return setError(body.error??"Unable to create purchase order.");
    router.refresh(); event.currentTarget.reset();
  }
  const projectItems=(projectId:string)=>bomItems.filter((item)=>item.project_id===projectId);
  return <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
    {error&&<p className="rounded bg-red-50 p-3 text-sm text-red-700 md:col-span-3">{error}</p>}
    <label className="text-sm font-medium">PO number<input name="po_number" required placeholder="PO-2026-001" className={input}/></label>
    <label className="text-sm font-medium">Project<select name="project_id" required className={input} onChange={(event)=>{const select=document.querySelector<HTMLSelectElement>("#po-bom");if(select)select.innerHTML='<option value="">Select BOM requirement</option>'+projectItems(event.currentTarget.value).map((item)=>`<option value="${item.id}">${item.item_code} - ${item.description}</option>`).join("");}}><option value="">Select project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.project_code} - {project.name}</option>)}</select></label>
    <label className="text-sm font-medium">Supplier<select name="supplier_id" required className={input}><option value="">Select supplier</option>{suppliers.filter((supplier)=>supplier.id).map((supplier)=><option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
    <label className="text-sm font-medium">BOM requirement<select id="po-bom" name="bom_item_id" required className={input}><option value="">Select BOM requirement</option></select></label>
    <label className="text-sm font-medium">Quantity<input name="ordered_quantity" type="number" min="0.0001" step="0.0001" required className={input}/></label>
    <label className="text-sm font-medium">Unit<input name="unit" required className={input}/></label>
    <label className="text-sm font-medium">Unit price<input name="unit_price" type="number" min="0" step="0.01" required className={input}/></label>
    <label className="text-sm font-medium">Expected delivery<input name="expected_delivery_date" type="date" required className={input}/></label>
    <label className="text-sm font-medium">Notes<input name="notes" className={input}/></label>
    <div><Button type="submit">Create purchase order</Button></div>
  </form>;
}
