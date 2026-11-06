import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProjectManager } from "@/components/planning/project-manager";
import { BomManager } from "@/components/planning/bom-manager";
import { MilestoneManager } from "@/components/planning/milestone-manager";
import { ApprovalAction } from "@/components/planning/approval-actions";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [projects, orders, managers, bomItems, milestones] = await Promise.all([
    supabase.from("projects").select("*,orders(order_number),profiles:project_manager_id(full_name)").order("created_at", { ascending:false }),
    supabase.from("orders").select("id,order_number").order("order_number"),
    supabase.from("profiles").select("id,full_name").eq("active",true).order("full_name"),
    supabase.from("bom_items").select("id,item_code,description,quantity,unit,status,project_id,material_specification").order("created_at", { ascending:false }).limit(30),
    supabase.from("project_milestones").select("*,projects(project_code,name)").order("due_date"),
  ]);
  return <div className="space-y-5">
    <div><p className="text-sm text-orange-600">Project planning</p><h1 className="text-2xl font-semibold text-slate-900">Projects & BOM</h1></div>
    <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-900">Create project</h2><ProjectManager orders={orders.data ?? []} managers={managers.data ?? []}/></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Active projects</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 text-left">Project</th><th className="px-5 py-3 text-left">Order</th><th className="px-5 py-3 text-left">Manager</th><th className="px-5 py-3 text-left">Target</th><th className="px-5 py-3 text-left">Status</th></tr></thead><tbody className="divide-y">{projects.data?.map((project) => <tr key={project.id}><td className="px-5 py-4"><p className="font-medium">{project.project_code}</p><p className="text-xs text-slate-500">{project.name}</p></td><td className="px-5 py-4">{project.orders?.order_number ?? "-"}</td><td className="px-5 py-4">{project.profiles?.full_name ?? "-"}</td><td className="px-5 py-4">{project.planned_end_date ?? "-"}</td><td className="px-5 py-4 capitalize">{project.status?.replaceAll("_"," ")}</td></tr>)}</tbody></table></div></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold">Add milestone</h2><MilestoneManager projects={(projects.data ?? []).map((project) => ({id:project.id,name:project.name,project_code:project.project_code}))}/></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Project milestones</h2></div><div className="divide-y">{milestones.data?.map((milestone) => <div key={milestone.id} className="grid gap-2 px-5 py-4 md:grid-cols-4"><p className="font-medium">{milestone.name}</p><p className="text-sm text-slate-500">{milestone.projects?.project_code}</p><p className="text-sm text-slate-500">{milestone.due_date ?? "No due date"}</p><p className="text-sm capitalize">{milestone.status.replaceAll("_"," ")}</p></div>)}</div></Card>
    <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-900">Add BOM item</h2><BomManager projects={(projects.data ?? []).map((project) => ({id:project.id,name:project.name,project_code:project.project_code}))}/></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">BOM items</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 text-left">Material</th><th className="px-5 py-3 text-left">Description</th><th className="px-5 py-3 text-left">Quantity</th><th className="px-5 py-3 text-left">Specification</th><th className="px-5 py-3 text-left">Approval</th></tr></thead><tbody className="divide-y">{bomItems.data?.map((item) => <tr key={item.id}><td className="px-5 py-4 font-medium">{item.item_code}</td><td className="px-5 py-4">{item.description}</td><td className="px-5 py-4">{item.quantity} {item.unit}</td><td className="px-5 py-4">{item.material_specification ?? "-"}</td><td className="px-5 py-4"><ApprovalAction id={item.id} type="bom" status={item.status}/></td></tr>)}</tbody></table></div></Card>
  </div>;
}
