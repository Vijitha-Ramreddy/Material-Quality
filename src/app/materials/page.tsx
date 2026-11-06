import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { SteelAllocationForm } from "@/components/materials/steel-traceability-manager";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const [materials, stock, bom, receipts, jobs, allocations, trace] = await Promise.all([
    supabase.from("materials").select("id,material_code,name,unit,specification").eq("active",true).order("material_code"),
    supabase.from("material_stock").select("*"),
    supabase.from("bom_items").select("project_id,item_code,description,quantity,unit,material_specification,status"),
    supabase.from("material_receipts").select("id,receipt_number,heat_number,batch_number,received_quantity,unit,status").eq("status","accepted").not("heat_number","is",null).not("batch_number","is",null).order("received_at",{ascending:false}),
    supabase.from("production_jobs").select("id,job_number").in("status",["planned","released","in_progress"]).order("job_number"),
    supabase.from("steel_material_allocations").select("*,material_receipts(receipt_number,heat_number,batch_number,material_description,steel_grade,unit),production_jobs(job_number)").order("created_at",{ascending:false}),
    supabase.from("manufacturing_traceability").select("*,material_receipts(receipt_number,heat_number,batch_number,steel_grade),production_jobs(job_number)").order("created_at",{ascending:false}),
  ]);
  const stockByMaterial = new Map((stock.data ?? []).map((row) => [row.material_id,row]));
  return <div className="space-y-5">
    <div><p className="text-sm text-orange-600">Stores / planning</p><h1 className="text-2xl font-semibold text-slate-900">Material availability</h1></div>
    <div className="grid gap-4 md:grid-cols-3"><Card className="p-5"><p className="text-sm text-slate-500">Active materials</p><p className="mt-2 text-3xl font-semibold">{materials.data?.length ?? 0}</p></Card><Card className="p-5"><p className="text-sm text-slate-500">BOM requirements</p><p className="mt-2 text-3xl font-semibold">{bom.data?.length ?? 0}</p></Card><Card className="p-5"><p className="text-sm text-slate-500">Stock lines</p><p className="mt-2 text-3xl font-semibold">{stock.data?.length ?? 0}</p></Card></div>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Allocate accepted steel batch to production</h2><SteelAllocationForm receipts={receipts.data??[]} jobs={jobs.data??[]}/></Card>
    <Card className="overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-semibold">Heat / batch allocations</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 text-left">Batch</th><th className="px-5 py-3 text-left">Job</th><th className="px-5 py-3 text-left">Equipment / component</th><th className="px-5 py-3 text-left">Allocated</th><th className="px-5 py-3 text-left">Consumed / scrap</th><th className="px-5 py-3 text-left">Status</th></tr></thead><tbody className="divide-y">{allocations.data?.map((row)=>{
      return <tr key={row.id}><td className="px-5 py-4 font-medium">{row.material_receipts?.receipt_number}<p className="text-xs text-slate-500">{row.material_receipts?.heat_number} / {row.material_receipts?.batch_number}</p></td><td className="px-5 py-4">{row.production_jobs?.job_number}</td><td className="px-5 py-4">{row.finished_equipment_serial || "-"} / {row.component_identification || "-"}</td><td className="px-5 py-4">{row.allocated_quantity} {row.unit}</td><td className="px-5 py-4">{row.consumed_quantity} / {row.scrap_quantity}</td><td className="px-5 py-4 capitalize">{row.status.replaceAll("_"," ")}</td></tr>;
    })}</tbody></table></div></Card>
    <Card className="overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-semibold">Material-to-finished-equipment traceability</h2></div><div className="divide-y">{trace.data?.map((row)=><div key={row.id} className="grid gap-2 px-5 py-4 text-sm md:grid-cols-6"><p className="font-medium">{row.material_receipts?.receipt_number}</p><p>{row.material_receipts?.steel_grade ?? "-"}</p><p>Heat {row.heat_number} / Batch {row.batch_number}</p><p>Job {row.production_jobs?.job_number}</p><p>{row.finished_equipment_serial ?? row.component_identification ?? "-"}</p><p>{row.consumed_quantity} {row.unit} consumed; {row.scrap_quantity} scrap</p></div>)}</div></Card>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 text-left">Material</th><th className="px-5 py-3 text-left">Specification</th><th className="px-5 py-3 text-left">Available stock</th><th className="px-5 py-3 text-left">Reserved</th><th className="px-5 py-3 text-left">Shortage</th></tr></thead><tbody className="divide-y">{materials.data?.map((material)=>{
      const current=stockByMaterial.get(material.id);
      const required=(bom.data??[]).filter((item)=>item.status==="approved").reduce((total,item)=>total+(Number(item.quantity)||0),0);
      const available=Number(current?.quantity_on_hand ?? 0)-Number(current?.reserved_quantity ?? 0);
      const shortage=Math.max(0,required-available);
      return <tr key={material.id}><td className="px-5 py-4"><p className="font-medium">{material.material_code}</p><p className="text-xs text-slate-500">{material.name}</p></td><td className="px-5 py-4">{material.specification ?? "-"}</td><td className="px-5 py-4">{available} {material.unit}</td><td className="px-5 py-4">{current?.reserved_quantity ?? 0}</td><td className={`px-5 py-4 font-semibold ${shortage>0?"text-red-600":"text-green-700"}`}>{shortage>0?`${shortage} ${material.unit}`:"None"}</td></tr>;
    })}</tbody></table></div></Card>
  </div>;
}
