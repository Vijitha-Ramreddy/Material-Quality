import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReportFilters = {
  from?: string;
  to?: string;
  tab?: "production" | "quality" | "procurement" | "dispatch";
};

function inRange(value: string | null | undefined, from?: string, to?: string) {
  if (!from && !to) return true;
  if (!value) return false;
  const date = value.slice(0, 10);
  return (!from || date >= from) && (!to || date <= to);
}

export async function getReportsData(filters: ReportFilters = {}) {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const [
    jobsRes,
    ordersRes,
    posRes,
    receiptsRes,
    inspectionsRes,
    ncrsRes,
    dispatchesRes,
  ] = await Promise.all([
    supabase.from("production_jobs").select("*,projects(project_code,name)").order("created_at", { ascending: false }),
    supabase.from("orders").select("*,customers(name)").order("order_date", { ascending: false }),
    supabase.from("purchase_orders").select("*,suppliers(name)").order("order_date", { ascending: false }),
    supabase.from("material_receipts").select("*,materials(name,material_code),suppliers(name)").order("received_at", { ascending: false }),
    supabase.from("quality_inspections").select("*,production_stages(name)").order("inspection_date", { ascending: false }),
    supabase.from("non_conformance_reports").select("*").order("created_at", { ascending: false }),
    supabase.from("dispatches").select("*,orders(order_number),final_inspections(inspection_number)").order("dispatch_date", { ascending: false }),
  ]);

  const jobs = jobsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const pos = posRes.data ?? [];
  const receipts = receiptsRes.data ?? [];
  const inspections = inspectionsRes.data ?? [];
  const ncrs = ncrsRes.data ?? [];
  const dispatches = dispatchesRes.data ?? [];

  // 1. Production Metrics
  const filteredJobs = jobs.filter((j) => inRange(j.actual_start_at ?? j.created_at, filters.from, filters.to));
  const completedJobs = filteredJobs.filter((j) => j.status === "completed").length;
  const activeJobs = filteredJobs.filter((j) => ["in_progress", "released"].includes(j.status || "")).length;
  const totalProducedQty = filteredJobs.reduce((acc, j) => acc + Number(j.completed_quantity ?? 0), 0);
  const totalRejectedQty = filteredJobs.reduce((acc, j) => acc + Number(j.rejected_quantity ?? 0), 0);

  // 2. Quality Metrics
  const filteredInspections = inspections.filter((i) => inRange(i.inspection_date, filters.from, filters.to));
  const totalInspections = filteredInspections.length;
  const acceptedInspections = filteredInspections.filter((i) => i.result === "accepted").length;
  const rejectedInspections = filteredInspections.filter((i) => i.result === "rejected").length;
  const passRate = totalInspections > 0 ? Math.round((acceptedInspections / totalInspections) * 100) : 100;
  const openNcrs = ncrs.filter((n) => n.status !== "closed").length;
  const closedNcrs = ncrs.filter((n) => n.status === "closed").length;

  // 3. Procurement Metrics
  const filteredPos = pos.filter((p) => inRange(p.order_date, filters.from, filters.to));
  const filteredReceipts = receipts.filter((r) => inRange(r.received_at, filters.from, filters.to));
  const pendingReceipts = filteredReceipts.filter((r) => r.status === "pending_inspection").length;
  const acceptedReceipts = filteredReceipts.filter((r) => r.status === "accepted").length;
  const rejectedReceipts = filteredReceipts.filter((r) => r.status === "rejected").length;

  // 4. Dispatch & Order Fulfillment Metrics
  const filteredDispatches = dispatches.filter((d) => inRange(d.dispatch_date, filters.from, filters.to));
  const deliveredDispatches = filteredDispatches.filter((d) => d.status === "delivered").length;
  const inTransitDispatches = filteredDispatches.filter((d) => d.status === "dispatched").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const inProgressOrders = orders.filter((o) => o.status === "in_progress").length;

  return {
    filters,
    production: {
      totalJobs: filteredJobs.length,
      completedJobs,
      activeJobs,
      totalProducedQty,
      totalRejectedQty,
      jobs: filteredJobs.map((j) => ({
        id: j.id,
        jobNumber: j.job_number,
        project: Array.isArray(j.projects) ? j.projects[0] : j.projects,
        status: j.status,
        quantity: Number(j.quantity ?? 0),
        completedQuantity: Number(j.completed_quantity ?? 0),
        rejectedQuantity: Number(j.rejected_quantity ?? 0),
        startDate: j.actual_start_at ? j.actual_start_at.slice(0, 10) : "-",
        endDate: j.actual_end_at ? j.actual_end_at.slice(0, 10) : "-",
      })),
    },
    quality: {
      totalInspections,
      acceptedInspections,
      rejectedInspections,
      passRate,
      openNcrs,
      closedNcrs,
      inspections: filteredInspections.map((i) => ({
        id: i.id,
        number: i.inspection_number,
        stage: Array.isArray(i.production_stages) ? i.production_stages[0]?.name : i.production_stages?.name,
        result: i.result,
        date: i.inspection_date ?? "-",
        remarks: i.remarks ?? "Standard QA check",
      })),
      ncrs: ncrs.map((n) => ({
        id: n.id,
        ncrNumber: n.ncr_number,
        title: n.title,
        severity: n.severity,
        status: n.status,
        disposition: n.disposition,
      })),
    },
    procurement: {
      totalPos: filteredPos.length,
      totalReceipts: filteredReceipts.length,
      pendingReceipts,
      acceptedReceipts,
      rejectedReceipts,
      receipts: filteredReceipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receipt_number,
        supplier: Array.isArray(r.suppliers) ? r.suppliers[0]?.name : r.suppliers?.name ?? "Supplier",
        material: Array.isArray(r.materials) ? r.materials[0]?.name : r.materials?.name ?? "Raw Material",
        quantity: `${r.received_quantity ?? 0} ${r.unit ?? "MT"}`,
        heatNumber: r.heat_number ?? "-",
        batchNumber: r.batch_number ?? "-",
        status: r.status,
        date: r.received_at ? r.received_at.slice(0, 10) : "-",
      })),
    },
    dispatch: {
      totalDispatches: filteredDispatches.length,
      deliveredDispatches,
      inTransitDispatches,
      completedOrders,
      inProgressOrders,
      dispatches: filteredDispatches.map((d) => ({
        id: d.id,
        dispatchNumber: d.dispatch_number,
        orderNumber: Array.isArray(d.orders) ? d.orders[0]?.order_number : d.orders?.order_number ?? "Order",
        quantity: d.quantity,
        date: d.dispatch_date ?? "-",
        vehicleNumber: d.vehicle_number ?? "-",
        lrNumber: d.lr_number ?? "-",
        destination: d.destination ?? "Client Works Site",
        status: d.status,
      })),
    },
  };
}
