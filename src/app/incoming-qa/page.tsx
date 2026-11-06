import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ReceiptForm, InspectionForm } from "@/components/incoming-qa/incoming-qa-forms";

export default async function IncomingQAPage() {
  const supabase=await createClient();
  const [receipts, inspections, poItems, materials, ncrs]=await Promise.all([
    supabase.from("material_receipts").select("*,suppliers(name),purchase_order_items(item_code,description)").order("received_at",{ascending:false}),
    supabase.from("incoming_inspections").select("*,material_receipts(receipt_number,suppliers(name))").order("created_at",{ascending:false}),
    supabase.from("purchase_order_items").select("id,item_code,description,unit,purchase_orders(status)").neq("purchase_orders.status","cancelled"),
    supabase.from("materials").select("id,material_code,name").eq("active",true).order("material_code"),
    supabase.from("non_conformance_reports").select("id,ncr_number,title,status,incoming_inspection_id,created_at").order("created_at",{ascending:false}),
  ]);
  const pending=(receipts.data??[]).filter((item)=>item.status==="pending_inspection");
  return <div className="space-y-5">
    <div><p className="text-sm text-orange-600">Stores / incoming quality assurance</p><h1 className="text-2xl font-semibold text-slate-900">Incoming material inspection</h1></div>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Record incoming material</h2><ReceiptForm poItems={poItems.data??[]} materials={materials.data??[]}/></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Record inspection</h2><InspectionForm receipts={pending}/></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Material receipts</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">    <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 text-left">Receipt</th><th className="px-5 py-3 text-left">Item</th><th className="px-5 py-3 text-left">Supplier</th><th className="px-5 py-3 text-left">Heat / batch</th><th className="px-5 py-3 text-left">Quantity</th><th className="px-5 py-3 text-left">Status</th></tr></thead><tbody className="divide-y">{receipts.data?.map((receipt)=><tr key={receipt.id}><td className="px-5 py-4 font-medium">{receipt.receipt_number}</td><td className="px-5 py-4">{receipt.purchase_order_items?.item_code}</td><td className="px-5 py-4">{receipt.suppliers?.name}</td><td className="px-5 py-4">{receipt.heat_number??"-"} / {receipt.batch_number??"-"}</td><td className="px-5 py-4">{receipt.received_quantity} {receipt.unit}</td><td className="px-5 py-4 capitalize">{receipt.status.replaceAll("_"," ")}</td></tr>)}</tbody></table></div></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Inspection history</h2></div><div className="divide-y">{inspections.data?.map((inspection)=><div key={inspection.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-5"><p className="font-medium">{inspection.inspection_number}</p><p>{inspection.material_receipts?.receipt_number}</p><p className="capitalize">{inspection.result}</p><p>{inspection.accepted_quantity}/{inspection.inspected_quantity} accepted</p><p className="text-slate-500">{inspection.remarks||"-"}</p></div>)}</div></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Material NCRs</h2></div><div className="divide-y">{ncrs.data?.filter((ncr)=>ncr.incoming_inspection_id).map((ncr)=><div key={ncr.id} className="flex justify-between gap-3 px-5 py-4 text-sm"><div><p className="font-medium">{ncr.ncr_number} - {ncr.title}</p><p className="text-xs text-slate-500">{new Date(ncr.created_at).toLocaleString()}</p></div><span className="capitalize">{ncr.status.replaceAll("_"," ")}</span></div>)}</div></Card>
  </div>;
}
