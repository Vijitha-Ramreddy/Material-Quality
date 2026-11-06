import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { WorkflowControls } from "@/components/workflow/workflow-controls";
import { getManufacturingWorkflowsList } from "@/lib/services/workflow";
import { connection } from "next/server";

const stages = [
  ["order_received", "Order Receipt"],
  ["engineering_review", "Engineering & Drawings"],
  ["project_planning", "Project & Quality Plans"],
  ["procurement", "Procurement & Raw Materials"],
  ["material_receipt", "Material Receipt"],
  ["incoming_inspection", "Incoming QA"],
  ["production", "Fabrication & Machining"],
  ["quality_inspection", "In-Process Quality & NDT"],
  ["final_inspection_dispatch", "Final Inspection & Dispatch"],
] as const;

export default async function WorkflowPage() {
  await connection();
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const [workflows, historyRes] = await Promise.all([
    getManufacturingWorkflowsList(),
    supabase
      .from("workflow_history")
      .select("*")
      .order("performed_at", { ascending: false })
      .limit(50),
  ]);

  const history = historyRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-600">Integrated Manufacturing Control</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Nine-Stage Manufacturing Workflow</h1>
          <p className="mt-1 text-sm text-slate-500">Live operational lifecycle tracking across JSPL fabrication lines</p>
        </div>
        <div className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
          {workflows.length} Active Workflows
        </div>
      </div>

      <div className="space-y-4">
        {workflows.map((workflow) => {
          const activeIndex = stages.findIndex(([key]) => key === workflow.current_stage);
          const isDone = workflow.workflow_status === "completed";

          return (
            <Card key={workflow.id} className="p-5 transition shadow-sm hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{workflow.orders?.order_number || "Order"}</p>
                    {workflow.projects && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                        {workflow.projects.project_code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {workflow.projects?.name || workflow.orders?.description || "Heavy Equipment Fabrication"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    workflow.workflow_status === "completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : workflow.workflow_status === "on_hold"
                      ? "bg-amber-50 text-amber-700"
                      : workflow.workflow_status === "cancelled"
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {workflow.workflow_status.replaceAll("_", " ")}
                </span>
              </div>

              {/* 9-Stage Progress Pipeline */}
              <div className="mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-9">
                {stages.map(([key, label], index) => {
                  const completed = isDone || index < activeIndex;
                  const current = !isDone && index === activeIndex;

                  return (
                    <div
                      key={key}
                      className={`flex flex-col justify-between rounded-lg border p-2.5 text-center text-xs transition ${
                        completed
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : current
                          ? "border-orange-500 bg-orange-50 text-orange-800 ring-2 ring-orange-200"
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      <div>
                        <span
                          className={`inline-block size-5 rounded-full text-center text-[11px] font-bold leading-5 ${
                            completed
                              ? "bg-emerald-200 text-emerald-900"
                              : current
                              ? "bg-orange-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {completed ? "✓" : index + 1}
                        </span>
                        <p className="mt-1.5 font-medium leading-tight line-clamp-2">{label}</p>
                      </div>
                      <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider">
                        {completed ? "Done" : current ? "In Progress" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <WorkflowControls orderId={workflow.order_id} stage={workflow.current_stage} />
            </Card>
          );
        })}
      </div>

      {/* Workflow Transition History Audit Log */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent Workflow Transitions Audit Log</h2>
          <p className="text-xs text-slate-500">Chronological history of state and stage gate authorizations</p>
        </div>
        <div className="divide-y divide-slate-100">
          {history.length > 0 ? (
            history.map((entry) => (
              <div key={entry.id} className="grid items-center gap-2 px-5 py-3 text-sm md:grid-cols-4">
                <div>
                  <span className="font-medium text-slate-900 capitalize">
                    {String(entry.workflow_stage || "").replace(/_/g, " ")}
                  </span>
                  <p className="text-xs text-slate-400 font-mono">{entry.entity_type}</p>
                </div>
                <div className="text-slate-600 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{entry.from_status ?? "Initial"}</span>
                  <span className="mx-1.5 text-slate-400">→</span>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-800">{entry.to_status}</span>
                </div>
                <div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      entry.result === "approved" || entry.result === "passed"
                        ? "bg-emerald-50 text-emerald-700"
                        : entry.result === "rejected" || entry.result === "failed"
                        ? "bg-red-50 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {entry.result || "completed"}
                  </span>
                  {entry.remarks && <p className="mt-0.5 text-xs text-slate-500 truncate">{entry.remarks}</p>}
                </div>
                <p className="text-right text-xs text-slate-500">
                  {entry.performed_at ? new Date(entry.performed_at).toLocaleString() : "-"}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-sm text-slate-500">No transition history recorded yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
