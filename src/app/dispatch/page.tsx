import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { DispatchActions,DispatchForm } from "@/components/dispatch/dispatch-manager";

export default async function Page() {
 const supabase=await createClient();
 const [orders,finalInspections,dispatches,history]=await Promise.all([
  supabase.from("orders").select("id,order_number").order("order_number",{ascending:false}),
  supabase.from("final_inspections").select("id,inspection_number,accepted_quantity,production_job_id").eq("result","accepted"),
  supabase.from("dispatches").select("*,orders(order_number)").order("created_at",{ascending:false}),
  supabase.from("dispatch_history").select("*").order("created_at",{ascending:false}).limit(100),
 ]);
 return <div className="space-y-5"><div><p className="text-sm text-orange-600">Logistics</p><h1 className="text-2xl font-semibold text-slate-900">Dispatch management</h1></div><Card className="p-5"><h2 className="mb-4 font-semibold">Create dispatch</h2><DispatchForm orders={orders.data??[]} finalInspections={finalInspections.data??[]}/></Card>
 <Card className="overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-semibold">Dispatch records</h2></div><div className="divide-y">{(dispatches.data??[]).map((dispatch)=><div key={dispatch.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-6"><div><p className="font-medium">{dispatch.dispatch_number}</p><p className="text-xs text-slate-500">{dispatch.orders?.order_number}</p></div><p>{dispatch.quantity} units</p><p className="capitalize">{dispatch.status.replaceAll("_"," ")}</p><div><p>{dispatch.vehicle_number??"Vehicle pending"}</p><p className="text-xs text-slate-500">{dispatch.transporter_name??"-"}</p></div><p>{dispatch.lr_number??"LR pending"}</p><DispatchActions dispatch={dispatch}/></div>)}</div></Card>
 <Card className="overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-semibold">Dispatch history</h2></div><div className="divide-y">{(history.data??[]).map((row)=><div key={row.id} className="flex justify-between px-5 py-3 text-sm"><span>{row.from_status??"Created"} → {row.to_status}</span><span className="text-slate-500">{new Date(row.created_at).toLocaleString()}</span></div>)}</div></Card></div>;
}
