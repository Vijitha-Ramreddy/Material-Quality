import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { connection } from "next/server";

const workflowStages = [
  ["order_received", "Order Receipt"],
  ["engineering_review", "Engineering Review"],
  ["project_planning", "Project Planning"],
  ["procurement", "Procurement"],
  ["material_receipt", "Material Receipt"],
  ["incoming_inspection", "Incoming QA"],
  ["production", "Fabrication & Machining"],
  ["quality_inspection", "In-Process Quality & NDT"],
  ["final_inspection_dispatch", "Final Inspection & Dispatch"],
] as const;

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const [orderResult, historyResult] = await Promise.all([
    supabase
      .from("orders")
      .select("*,customers(name,email,phone),projects(id,project_code,name,status)")
      .eq("id", id)
      .single(),
    supabase
      .from("workflow_history")
      .select("*")
      .eq("entity_id", id)
      .order("performed_at", { ascending: true }),
  ]);

  const order = orderResult.data;
  if (orderResult.error || !order) {
    return (
      <Card className="p-8 text-center text-sm text-red-700">
        Order not found or access restricted.
      </Card>
    );
  }

  // Handle PostgREST one-to-many relationship (projects is an array)
  const project = Array.isArray(order.projects) ? order.projects[0] : order.projects;
  const historyStages = new Set((historyResult.data ?? []).map((item) => item.workflow_stage));

  const customerName = Array.isArray(order.customers)
    ? order.customers[0]?.name ?? "Customer"
    : order.customers?.name ?? "Customer";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
              JSPL Machinery Division
            </span>
            <span className="text-sm text-slate-400">Order ID: {order.order_number}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{order.order_number}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{order.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/orders/${id}/edit`}>
            <Button variant="secondary" className="border-slate-300">
              Edit Order
            </Button>
          </Link>
          <Link href="/workflow">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Open in 9-Stage Workflow
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Customer</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{customerName}</p>
          <p className="mt-1 text-xs text-slate-500">PO: {order.customer_po_number || "Direct PO"}</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Contract Value</p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {order.total_value != null ? `₹${Number(order.total_value).toLocaleString("en-IN")}` : "TBD"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Currency: {order.currency || "INR"}</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Required Delivery</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {order.required_delivery_date ? new Date(order.required_delivery_date).toLocaleDateString() : "Not specified"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Order Date: {order.order_date ? new Date(order.order_date).toLocaleDateString() : "-"}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Lifecycle Status</p>
          <p className="mt-2 text-base font-semibold capitalize text-slate-900">
            {String(order.status).replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Priority Level: {order.priority ?? 3} / 5</p>
        </Card>
      </div>

      {/* 9-Stage Workflow Pipeline */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Nine-Stage Manufacturing Workflow Progress</h2>
            <p className="text-xs text-slate-500">Lifecycle progression from order receipt to dispatch authorization</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-800">
            {String(order.status).replace(/_/g, " ")}
          </span>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 md:grid-cols-9">
          {workflowStages.map(([stage, label], index) => {
            const complete = historyStages.has(stage) || order.status === "completed";
            return (
              <div
                key={stage}
                className={`rounded-lg border p-3 text-center text-xs transition ${
                  complete ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                <span
                  className={`inline-block size-5 rounded-full text-center text-[10px] font-bold leading-5 ${
                    complete ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <p className="mt-1.5 font-medium leading-tight">{label}</p>
                <p className={`mt-2 text-[10px] font-semibold uppercase ${complete ? "text-emerald-700" : "text-slate-400"}`}>
                  {complete ? "Recorded" : "Pending"}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Associated Project */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Associated Manufacturing Project</h2>
          {project ? (
            <div className="mt-3 rounded-lg border border-slate-200 p-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-orange-600">{project.project_code}</span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium capitalize">
                  {String(project.status).replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-1.5 font-medium text-slate-900">{project.name}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No manufacturing project currently linked to this order.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Technical Specifications</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Order Currency:</span> {order.currency || "INR"}
            </p>
            <p>
              <span className="font-medium text-slate-800">Priority Level:</span> {order.priority}
            </p>
            <p className="pt-2 text-xs text-slate-500">
              Drawings, Bill of Materials and Quality Plans are managed within the Engineering and Quality modules.
            </p>
          </div>
        </Card>
      </div>

      {/* Workflow History Timeline */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Order Audit & Workflow Timeline</h2>
          <p className="text-xs text-slate-500">All historical state transitions logged for this manufacturing contract</p>
        </div>
        <div className="divide-y divide-slate-100">
          {(historyResult.data ?? []).length > 0 ? (
            (historyResult.data ?? []).map((item) => (
              <div key={item.id} className="px-5 py-3 text-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 capitalize">
                    {workflowStages.find(([s]) => s === item.workflow_stage)?.[1] ?? item.workflow_stage}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {item.remarks || `${item.from_status ?? "Start"} → ${item.to_status ?? "-"}`}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      item.result === "approved" || item.result === "passed"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {item.result || "logged"}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {item.performed_at ? new Date(item.performed_at).toLocaleString() : "-"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">No transition history logged yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
