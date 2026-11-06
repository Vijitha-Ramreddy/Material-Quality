import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/orders/order-form";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewOrderPage() {
  const auth = await requireUser(["admin", "sales_projects"]);
  if (!auth.user) redirect("/unauthorized");
  const supabase = await createClient();
  const [customers, projects] = await Promise.all([
    supabase.from("customers").select("id,name").eq("active", true).order("name"),
    supabase.from("projects").select("id,name,project_code").order("project_code"),
  ]);
  return (
    <div className="space-y-5">
      <div><p className="text-sm text-orange-600">Sales / Projects</p><h1 className="text-2xl font-semibold text-slate-900">Create customer order</h1></div>
      <Card className="p-5 sm:p-6"><OrderForm customers={customers.data ?? []} projects={(projects.data ?? []).map((project) => ({ ...project, code: project.project_code }))} /></Card>
    </div>
  );
}
