import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { OrderEditor } from "@/components/orders/order-editor";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser(["admin", "sales_projects"]);
  if (!auth.user) redirect("/unauthorized");
  const supabase = await createClient();
  const [order, customers, projects] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase.from("customers").select("id,name").eq("active", true).order("name"),
    supabase.from("projects").select("id,name,project_code").order("project_code"),
  ]);
  if (order.error || !order.data) redirect("/orders");
  return <div className="space-y-5"><div><p className="text-sm text-orange-600">{order.data.order_number}</p><h1 className="text-2xl font-semibold text-slate-900">Edit order</h1></div><Card className="p-5 sm:p-6"><OrderEditor order={order.data} customers={customers.data ?? []} projects={projects.data ?? []}/></Card></div>;
}
