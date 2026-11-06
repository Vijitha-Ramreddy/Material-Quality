import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PurchaseOrderForm, RequisitionForm } from "@/components/procurement/procurement-forms";
import { SupplierForm } from "@/components/procurement/supplier-form";

export default async function ProcurementPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id,name,project_code,bom_items(status),quality_plans(status),purchase_orders(id,po_number,status)").order("project_code");
  const [bom, suppliers, purchaseOrders, requisitions] = await Promise.all([
    supabase.from("bom_items").select("id,project_id,item_code,description,unit,status").eq("status","approved"),
    supabase.from("suppliers").select("id,name,code,email,phone,approved,active").eq("active",true).order("name"),
    supabase.from("purchase_orders").select("*,suppliers(name)").order("created_at",{ascending:false}),
    supabase.from("purchase_requisitions").select("*,projects(project_code,name)").order("created_at",{ascending:false}),
  ]);
  const planningProjects=(projects??[]).map((project)=>({id:project.id,name:project.name,project_code:project.project_code}));
  return <div className="space-y-5">
    <div><p className="text-sm text-orange-600">Planning / procurement</p><h1 className="text-2xl font-semibold text-slate-900">Procurement release</h1></div>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Create purchase requisition</h2><RequisitionForm projects={planningProjects} bomItems={(bom.data??[]).map((item)=>({...item,quantity:0}))}/></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Create purchase order</h2><PurchaseOrderForm projects={planningProjects} suppliers={suppliers.data??[]} bomItems={bom.data??[]}/></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Supplier management</h2><SupplierForm/><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{suppliers.data?.map((supplier)=><div key={supplier.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between"><p className="font-medium text-slate-900">{supplier.name}</p><span className={`rounded-full px-2 py-1 text-xs ${supplier.approved?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>{supplier.approved?"Approved":"Pending approval"}</span></div><p className="mt-1 text-xs text-slate-500">{supplier.code}</p><p className="mt-2 text-sm text-slate-600">{supplier.email??supplier.phone??"-"}</p></div>)}</div></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Purchase requisitions</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 text-left">Requisition</th><th className="px-5 py-3 text-left">Project</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Created</th></tr></thead><tbody className="divide-y">{requisitions.data?.map((item)=><tr key={item.id}><td className="px-5 py-4 font-medium">{item.requisition_number}</td><td className="px-5 py-4">{item.projects?.project_code}</td><td className="px-5 py-4 capitalize">{item.status.replaceAll("_"," ")}</td><td className="px-5 py-4">{new Date(item.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Purchase orders</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3 text-left">PO</th><th className="px-5 py-3 text-left">Supplier</th><th className="px-5 py-3 text-left">Expected delivery</th><th className="px-5 py-3 text-left">Status</th></tr></thead><tbody className="divide-y">{purchaseOrders.data?.map((item)=><tr key={item.id}><td className="px-5 py-4 font-medium">{item.po_number}</td><td className="px-5 py-4">{item.suppliers?.name}</td><td className="px-5 py-4">{item.expected_delivery_date??"-"}</td><td className="px-5 py-4 capitalize">{item.status.replaceAll("_"," ")}</td></tr>)}</tbody></table></div></Card>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 text-left">Project</th><th className="px-5 py-3 text-left">BOM approval</th><th className="px-5 py-3 text-left">Quality plan</th><th className="px-5 py-3 text-left">Purchase orders</th><th className="px-5 py-3 text-left">Release</th></tr></thead><tbody className="divide-y">{projects?.map((project) => {
      const bomRows = Array.isArray(project.bom_items) ? project.bom_items : [];
      const planRows = Array.isArray(project.quality_plans) ? project.quality_plans : [];
      const bomApproved = bomRows.length > 0 && bomRows.every((item: {status:string}) => item.status === "approved");
      const planApproved = planRows.length > 0 && planRows.every((item: {status:string}) => item.status === "approved");
      return <tr key={project.id}><td className="px-5 py-4"><p className="font-medium">{project.project_code}</p><p className="text-xs text-slate-500">{project.name}</p></td><td className="px-5 py-4">{bomApproved ? "Approved" : "Pending"}</td><td className="px-5 py-4">{planApproved ? "Approved" : "Pending"}</td><td className="px-5 py-4">{Array.isArray(project.purchase_orders) ? project.purchase_orders.length : 0}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${bomApproved && planApproved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{bomApproved && planApproved ? "Released" : "Blocked"}</span></td></tr>;
    })}</tbody></table></div></Card>
  </div>;
}
