import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardFilters = {
  from?: string;
  to?: string;
  order?: string;
  customer?: string;
  status?: string;
};

function inRange(value: string | null | undefined, from?: string, to?: string) {
  if (!from && !to) return true;
  if (!value) return false;
  const date = value.slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
}

function groupCount(rows: Array<{ status: string | null }>, labels: string[]) {
  const counts = new Map(labels.map((label) => [label, 0]));
  rows.forEach(({ status }) => {
    if (status && counts.has(status)) counts.set(status, (counts.get(status) ?? 0) + 1);
  });
  return labels.map((status) => ({ name: status.replaceAll("_", " "), status, value: counts.get(status) ?? 0 }));
}

export async function getDashboardData(filters: DashboardFilters = {}) {
  // Use admin client for control tower aggregated operational metrics across departments
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const [
    ordersResponse,
    customersResponse,
    drawingsResponse,
    purchaseOrdersResponse,
    receiptsResponse,
    jobsResponse,
    inspectionsResponse,
    finalInspectionsResponse,
    dispatchesResponse,
    projectsResponse,
    dossiersResponse,
  ] = await Promise.all([
    supabase.from("orders").select("id,order_number,description,status,order_date,total_value,customer_id,customers(id,name)"),
    supabase.from("customers").select("id,name").eq("active", true).order("name"),
    supabase.from("drawing_revisions").select("id,status,created_at"),
    supabase.from("purchase_orders").select("id,status,order_date"),
    supabase.from("material_receipts").select("id,status,received_at,created_at"),
    supabase.from("production_jobs").select("id,project_id,status,actual_start_at,actual_end_at,created_at"),
    supabase.from("quality_inspections").select("id,inspection_number,inspection_date,result,remarks,production_job_id,created_at"),
    supabase.from("final_inspections").select("id,result,inspection_date,inspection_number,production_job_id,created_at"),
    supabase.from("dispatches").select("id,status,dispatch_date,order_id,created_at"),
    supabase.from("projects").select("id,project_code,order_id,created_at"),
    supabase.from("quality_dossiers").select("production_job_id,status"),
  ]);

  const orders = ordersResponse.data ?? [];
  const customers = customersResponse.data ?? [];
  const customerNames = new Map(customers.map((c) => [c.id, c.name]));

  const visibleOrderIds = new Set(
    orders
      .filter((order) => {
        const customerName = customerNames.get(order.customer_id) ?? "";
        const matchesOrder = !filters.order ||
          (order.order_number && order.order_number.toLowerCase().includes(filters.order.toLowerCase()));
        const matchesCustomer = !filters.customer || order.customer_id === filters.customer || customerName === filters.customer;
        const matchesStatus = !filters.status || order.status === filters.status;
        return matchesOrder && matchesCustomer && matchesStatus && inRange(order.order_date, filters.from, filters.to);
      })
      .map((order) => order.id),
  );
  const filteredOrders = orders.filter((order) => visibleOrderIds.has(order.id));

  const drawings = drawingsResponse.data ?? [];
  const purchaseOrders = purchaseOrdersResponse.data ?? [];
  const receipts = receiptsResponse.data ?? [];
  const jobs = jobsResponse.data ?? [];
  const inspections = inspectionsResponse.data ?? [];
  const finalInspections = finalInspectionsResponse.data ?? [];
  const dispatches = dispatchesResponse.data ?? [];

  const approvedDossierJobs = new Set(
    (dossiersResponse.data ?? [])
      .filter((dossier) => dossier.status === "approved")
      .map((dossier) => dossier.production_job_id),
  );

  const pendingDrawingApprovals = drawings.filter((drawing) =>
    ["draft", "under_review"].includes(drawing.status ?? "") &&
    inRange(drawing.created_at, filters.from, filters.to),
  ).length;

  const pendingProcurement = purchaseOrders.filter((po) =>
    ["draft", "issued"].includes(po.status ?? "") && inRange(po.order_date, filters.from, filters.to),
  ).length;

  const awaitingInspection = receipts.filter((receipt) =>
    receipt.status === "pending_inspection" &&
    inRange(receipt.received_at ?? receipt.created_at, filters.from, filters.to),
  ).length;

  const activeJobs = jobs.filter((job) =>
    ["planned", "released", "in_progress", "paused"].includes(job.status ?? "") &&
    inRange(job.actual_start_at ?? job.created_at, filters.from, filters.to),
  ).length;

  const failedInspections = inspections.filter((inspection) =>
    inspection.result === "rejected" && inRange(inspection.inspection_date, filters.from, filters.to),
  );

  const pendingFinalInspections = finalInspections.filter((inspection) =>
    inspection.result === "pending" && inRange(inspection.inspection_date, filters.from, filters.to),
  ).length;

  const acceptedJobProjectIds = new Set(
    finalInspections
      .filter((inspection) => inspection.result === "accepted")
      .map((inspection) => jobs.find((job) => job.id === inspection.production_job_id)?.project_id)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
  // Also include projects where jobs are completed
  jobs.filter((j) => j.status === "completed").forEach((j) => {
    if (j.project_id) acceptedJobProjectIds.add(j.project_id);
  });

  const readyOrderIds = new Set(
    (projectsResponse.data ?? [])
      .filter((project) => project.order_id && acceptedJobProjectIds.has(project.id))
      .filter((project) => {
        // If dossiers exist, check approved; otherwise accepted final inspection suffices
        if (approvedDossierJobs.size > 0) {
          return jobs.some((job) => job.project_id === project.id && approvedDossierJobs.has(job.id));
        }
        return true;
      })
      .map((project) => project.order_id),
  );

  const readyForDispatch = orders.filter((order) =>
    visibleOrderIds.has(order.id) &&
    readyOrderIds.has(order.id) &&
    !dispatches.some((dispatch) => dispatch.order_id === order.id && ["dispatched", "delivered"].includes(dispatch.status ?? "")),
  ).length;

  const completedDispatches = dispatches.filter((dispatch) =>
    ["dispatched", "delivered"].includes(dispatch.status ?? "") &&
    inRange(dispatch.dispatch_date, filters.from, filters.to),
  ).length;

  const productionStatuses = groupCount(
    jobs.map((job) => ({ status: job.status })),
    ["planned", "released", "in_progress", "paused", "completed", "cancelled"],
  );

  const orderStatuses = groupCount(
    filteredOrders.map((order) => ({ status: order.status })),
    ["draft", "confirmed", "in_progress", "completed", "cancelled", "on_hold"],
  );

  const rejectionStatuses = inspections.reduce<Record<string, number>>((totals, inspection) => {
    if (inspection.result === "rejected" && inRange(inspection.inspection_date, filters.from, filters.to)) {
      const key = inspection.inspection_date ? inspection.inspection_date.slice(0, 7) : "Unknown";
      totals[key] = (totals[key] ?? 0) + 1;
    }
    return totals;
  }, {});
  const rejectionTrend = Object.entries(rejectionStatuses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));

  const monthlyProduction = jobs.reduce<Record<string, number>>((totals, job) => {
    const date = job.actual_end_at ?? job.created_at;
    if (date && job.status === "completed" && inRange(date, filters.from, filters.to)) {
      const month = date.slice(0, 7);
      totals[month] = (totals[month] ?? 0) + 1;
    }
    return totals;
  }, {});
  const monthlyTrend = Object.entries(monthlyProduction)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, jobsCount]) => ({ month, jobs: jobsCount }));

  const recentOrders = filteredOrders
    .slice()
    .sort((a, b) => (b.order_date ?? "").localeCompare(a.order_date ?? ""))
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      number: order.order_number,
      customer: customerNames.get(order.customer_id) ?? "Unknown",
      description: order.description,
      status: order.status,
      date: order.order_date ?? "-",
      value: Number(order.total_value ?? 0),
    }));

  const recentFailures = failedInspections
    .slice()
    .sort((a, b) => (b.inspection_date ?? "").localeCompare(a.inspection_date ?? ""))
    .slice(0, 8)
    .map((inspection) => ({
      id: inspection.id,
      number: inspection.inspection_number,
      date: inspection.inspection_date ?? "-",
      remarks: inspection.remarks ?? "No remarks recorded",
      jobId: inspection.production_job_id,
    }));

  const bottlenecks = [
    { stage: "Engineering approval", count: pendingDrawingApprovals, severity: pendingDrawingApprovals > 10 ? "High" : "Normal" },
    { stage: "Procurement", count: pendingProcurement, severity: pendingProcurement > 15 ? "High" : "Normal" },
    { stage: "Incoming inspection", count: awaitingInspection, severity: awaitingInspection > 10 ? "High" : "Normal" },
    { stage: "Final inspection", count: pendingFinalInspections, severity: pendingFinalInspections > 10 ? "High" : "Normal" },
  ].sort((a, b) => b.count - a.count);

  return {
    metrics: {
      totalOrders: filteredOrders.length,
      ordersInProgress: filteredOrders.filter((order) => order.status === "in_progress").length,
      pendingEngineeringApprovals: pendingDrawingApprovals,
      pendingProcurement,
      awaitingIncomingInspection: awaitingInspection,
      activeProductionJobs: activeJobs,
      failedQualityInspections: failedInspections.length,
      pendingFinalInspections,
      ordersReadyForDispatch: readyForDispatch,
      completedDispatches,
    },
    productionStatuses,
    orderStatuses,
    rejectionTrend,
    monthlyTrend,
    recentOrders,
    recentFailures,
    bottlenecks,
    customers: customers.map((customer) => ({ id: customer.id, name: customer.name })),
  };
}
