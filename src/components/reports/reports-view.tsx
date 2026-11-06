"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Factory, ShieldCheck, ShoppingCart, Truck,
  Download
} from "lucide-react";

interface ReportsViewProps {
  data: {
    filters: { from?: string; to?: string };
    production: {
      totalJobs: number;
      completedJobs: number;
      activeJobs: number;
      totalProducedQty: number;
      totalRejectedQty: number;
      jobs: Array<{
        id: string;
        jobNumber: string;
        project?: { project_code?: string; name?: string } | null;
        status: string;
        quantity: number;
        completedQuantity: number;
        rejectedQuantity: number;
        startDate: string;
        endDate: string;
      }>;
    };
    quality: {
      totalInspections: number;
      acceptedInspections: number;
      rejectedInspections: number;
      passRate: number;
      openNcrs: number;
      closedNcrs: number;
      inspections: Array<{
        id: string;
        number: string;
        stage?: string | null;
        result: string;
        date: string;
        remarks: string;
      }>;
      ncrs: Array<{
        id: string;
        ncrNumber: string;
        title: string;
        severity: string;
        status: string;
        disposition?: string | null;
      }>;
    };
    procurement: {
      totalPos: number;
      totalReceipts: number;
      pendingReceipts: number;
      acceptedReceipts: number;
      rejectedReceipts: number;
      receipts: Array<{
        id: string;
        receiptNumber: string;
        supplier: string;
        material: string;
        quantity: string;
        heatNumber: string;
        batchNumber: string;
        status: string;
        date: string;
      }>;
    };
    dispatch: {
      totalDispatches: number;
      deliveredDispatches: number;
      inTransitDispatches: number;
      completedOrders: number;
      inProgressOrders: number;
      dispatches: Array<{
        id: string;
        dispatchNumber: string;
        orderNumber: string;
        quantity: number;
        date: string;
        vehicleNumber: string;
        lrNumber: string;
        destination: string;
        status: string;
      }>;
    };
  };
}

export function ReportsView({ data }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<"production" | "quality" | "procurement" | "dispatch">("production");

  function exportCSV() {
    let rows: string[][] = [];
    const filename = `jspl-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === "production") {
      rows = [
        ["Job Number", "Project Code", "Project Name", "Status", "Total Qty", "Completed Qty", "Rejected Qty", "Start Date", "End Date"],
        ...data.production.jobs.map((j) => [
          j.jobNumber,
          j.project?.project_code ?? "-",
          `"${(j.project?.name ?? "-").replace(/"/g, '""')}"`,
          j.status,
          String(j.quantity),
          String(j.completedQuantity),
          String(j.rejectedQuantity),
          j.startDate,
          j.endDate,
        ]),
      ];
    } else if (activeTab === "quality") {
      rows = [
        ["Inspection Number", "Production Stage", "Result", "Date", "Remarks"],
        ...data.quality.inspections.map((i) => [
          i.number,
          `"${(i.stage ?? "-").replace(/"/g, '""')}"`,
          i.result,
          i.date,
          `"${(i.remarks ?? "-").replace(/"/g, '""')}"`,
        ]),
      ];
    } else if (activeTab === "procurement") {
      rows = [
        ["Receipt Number", "Supplier", "Material", "Quantity", "Heat Number", "Batch Number", "Status", "Receipt Date"],
        ...data.procurement.receipts.map((r) => [
          r.receiptNumber,
          `"${r.supplier.replace(/"/g, '""')}"`,
          `"${r.material.replace(/"/g, '""')}"`,
          r.quantity,
          r.heatNumber,
          r.batchNumber,
          r.status,
          r.date,
        ]),
      ];
    } else if (activeTab === "dispatch") {
      rows = [
        ["Dispatch Number", "Order Number", "Quantity", "Dispatch Date", "Vehicle Number", "LR Number", "Status", "Destination"],
        ...data.dispatch.dispatches.map((d) => [
          d.dispatchNumber,
          d.orderNumber,
          String(d.quantity),
          d.date,
          d.vehicleNumber,
          d.lrNumber,
          d.status,
          `"${d.destination.replace(/"/g, '""')}"`,
        ]),
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const tabs = [
    { id: "production", label: "Production & Jobs", icon: Factory, count: data.production.totalJobs },
    { id: "quality", label: "Quality, NDT & NCRs", icon: ShieldCheck, count: data.quality.totalInspections },
    { id: "procurement", label: "Procurement & Materials", icon: ShoppingCart, count: data.procurement.totalReceipts },
    { id: "dispatch", label: "Dispatches & Deliveries", icon: Truck, count: data.dispatch.totalDispatches },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
              JSPL Plant Analytics
            </span>
            <span className="text-xs text-slate-400">Enterprise Reporting Suite</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Manufacturing Reports & Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Real-time compliance, throughput, quality yield, and shipment tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={exportCSV} variant="secondary" className="flex items-center gap-2 border-slate-300">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Domain Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
                active
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
              <span
                className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  active ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRODUCTION REPORT */}
      {activeTab === "production" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Total Jobs In Scope</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.production.totalJobs}</p>
              <p className="mt-1 text-xs text-slate-500">Scheduled fabrication orders</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Completed Jobs</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{data.production.completedJobs}</p>
              <p className="mt-1 text-xs text-slate-500">100% stages executed & verified</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Active / In Progress</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{data.production.activeJobs}</p>
              <p className="mt-1 text-xs text-slate-500">Cutting, welding & machining lines</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Output / Defect Yield</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {data.production.totalProducedQty} <span className="text-sm font-normal text-slate-500">pcs</span>
              </p>
              <p className="mt-1 text-xs text-red-600">Rejections: {data.production.totalRejectedQty} pcs</p>
            </Card>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Fabrication Jobs Status Register</h2>
                <p className="text-xs text-slate-500">Detailed list of planned, in-progress, and completed shop floor jobs</p>
              </div>
              <span className="text-xs text-slate-500">{data.production.jobs.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Job Number</th>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Start Date</th>
                    <th className="px-5 py-3">Completed / Target</th>
                    <th className="px-5 py-3">Progress</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.production.jobs.map((job) => {
                    const pct = job.quantity > 0 ? Math.round((job.completedQuantity / job.quantity) * 100) : 0;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{job.jobNumber}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-800">{job.project?.project_code ?? "Project"}</p>
                          <p className="text-xs text-slate-500 truncate max-w-xs">{job.project?.name ?? "-"}</p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{job.startDate}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {job.completedQuantity} / {job.quantity} nos
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                              <span>{pct}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  job.status === "completed" ? "bg-emerald-500" : "bg-orange-500"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              job.status === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : job.status === "in_progress"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {job.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: QUALITY & NCR REPORT */}
      {activeTab === "quality" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Total QA Inspections</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.quality.totalInspections}</p>
              <p className="mt-1 text-xs text-slate-500">Visual, UT, RT, MPI checks</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">First-Pass QA Yield</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{data.quality.passRate}%</p>
              <p className="mt-1 text-xs text-slate-500">Acceptable without rework</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Failed / Rejections</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{data.quality.rejectedInspections}</p>
              <p className="mt-1 text-xs text-slate-500">Resulted in rework or NCR</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Open NCR Count</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{data.quality.openNcrs}</p>
              <p className="mt-1 text-xs text-slate-500">Closed NCRs: {data.quality.closedNcrs}</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Inspection Log Details</h2>
                <p className="text-xs text-slate-500">Historical quality stage checkpoints</p>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">Inspection</th>
                      <th className="px-4 py-2.5">Stage</th>
                      <th className="px-4 py-2.5">Result</th>
                      <th className="px-4 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.quality.inspections.map((insp) => (
                      <tr key={insp.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{insp.number}</td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{insp.stage ?? "In-Process"}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${
                              insp.result === "accepted"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {insp.result}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{insp.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Non-Conformance Reports (NCR)</h2>
                <p className="text-xs text-slate-500">Defect tracking & disposition status</p>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">NCR #</th>
                      <th className="px-4 py-2.5">Title</th>
                      <th className="px-4 py-2.5">Severity</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.quality.ncrs.map((ncr) => (
                      <tr key={ncr.id}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{ncr.ncrNumber}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-700 max-w-xs truncate">{ncr.title}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${
                              ncr.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : ncr.severity === "major"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {ncr.severity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                              ncr.status === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {ncr.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: PROCUREMENT & MATERIALS REPORT */}
      {activeTab === "procurement" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Total Purchase Orders</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.procurement.totalPos}</p>
              <p className="mt-1 text-xs text-slate-500">Issued to steel & consumable suppliers</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Material Receipts (MRR)</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{data.procurement.totalReceipts}</p>
              <p className="mt-1 text-xs text-slate-500">Plates, pipes, electrodes delivered</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Accepted Material Lots</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{data.procurement.acceptedReceipts}</p>
              <p className="mt-1 text-xs text-slate-500">Passed incoming QA & MTC check</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Pending Incoming QA</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{data.procurement.pendingReceipts}</p>
              <p className="mt-1 text-xs text-slate-500">Awaiting metallurgical stamp test</p>
            </Card>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Incoming Materials & Traceability Heat Ledger</h2>
              <p className="text-xs text-slate-500">Raw steel heat numbers, batch numbers, and supplier verification status</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">MRR #</th>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Material Specification</th>
                    <th className="px-5 py-3">Quantity</th>
                    <th className="px-5 py-3">Heat / Batch #</th>
                    <th className="px-5 py-3">Receipt Date</th>
                    <th className="px-5 py-3">QA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.procurement.receipts.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{rec.receiptNumber}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{rec.supplier}</td>
                      <td className="px-5 py-3.5 text-slate-700">{rec.material}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{rec.quantity}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {rec.heatNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{rec.date}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            rec.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700"
                              : rec.status === "rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: DISPATCH & ORDER FULFILLMENT REPORT */}
      {activeTab === "dispatch" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Total Dispatch Lots</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.dispatch.totalDispatches}</p>
              <p className="mt-1 text-xs text-slate-500">Authorized post-final inspection</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Delivered to Site</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{data.dispatch.deliveredDispatches}</p>
              <p className="mt-1 text-xs text-slate-500">Customer proof of delivery confirmed</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">In Transit</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{data.dispatch.inTransitDispatches}</p>
              <p className="mt-1 text-xs text-slate-500">En route with vehicle & LR track</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase text-slate-400">Contracts Completed</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.dispatch.completedOrders}</p>
              <p className="mt-1 text-xs text-slate-500">In progress: {data.dispatch.inProgressOrders}</p>
            </Card>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Equipment Dispatch & Logistics Ledger</h2>
              <p className="text-xs text-slate-500">Trailer vehicle numbers, lorry receipt (LR) documents, and customer delivery points</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Dispatch #</th>
                    <th className="px-5 py-3">Order Ref</th>
                    <th className="px-5 py-3">Quantity</th>
                    <th className="px-5 py-3">Dispatch Date</th>
                    <th className="px-5 py-3">Vehicle #</th>
                    <th className="px-5 py-3">LR Number</th>
                    <th className="px-5 py-3">Destination</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.dispatch.dispatches.map((disp) => (
                    <tr key={disp.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{disp.dispatchNumber}</td>
                      <td className="px-5 py-3.5 font-medium text-orange-600">{disp.orderNumber}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{disp.quantity} nos</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{disp.date}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{disp.vehicleNumber}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{disp.lrNumber}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs truncate">{disp.destination}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            disp.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700"
                              : disp.status === "dispatched"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {disp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
