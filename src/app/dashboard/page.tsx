import {
  Activity, AlertTriangle, ClipboardCheck, Factory, PackageCheck,
  ShoppingCart, Truck, Wrench, CheckCircle2, CircleDollarSign, CalendarClock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardFilters } from "@/components/dashboard/dashboard-filter";
import { OrderPieChart, ProductionTrendChart, RejectionChart, StatusChart } from "@/components/charts/dashboard-charts";
import { getDashboardData } from "@/lib/services/dashboard";
import { connection } from "next/server";

type DashboardPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await connection();
  const params = await searchParams;
  const single = (name: string) => typeof params[name] === "string" ? params[name] as string : undefined;
  const data = await getDashboardData({
    from: single("from"), to: single("to"), order: single("order"),
    customer: single("customer"), status: single("status"),
  });
  const metrics = [
    { label: "Total customer orders", value: data.metrics.totalOrders, icon: ShoppingCart, tone: "blue" },
    { label: "Orders in progress", value: data.metrics.ordersInProgress, icon: Activity, tone: "orange" },
    { label: "Pending engineering", value: data.metrics.pendingEngineeringApprovals, icon: Wrench, tone: "amber" },
    { label: "Pending procurement", value: data.metrics.pendingProcurement, icon: CircleDollarSign, tone: "purple" },
    { label: "Awaiting incoming QA", value: data.metrics.awaitingIncomingInspection, icon: PackageCheck, tone: "blue" },
    { label: "Active production jobs", value: data.metrics.activeProductionJobs, icon: Factory, tone: "orange" },
    { label: "Failed inspections", value: data.metrics.failedQualityInspections, icon: AlertTriangle, tone: "red" },
    { label: "Pending final inspections", value: data.metrics.pendingFinalInspections, icon: ClipboardCheck, tone: "amber" },
    { label: "Ready for dispatch", value: data.metrics.ordersReadyForDispatch, icon: CalendarClock, tone: "blue" },
    { label: "Completed dispatches", value: data.metrics.completedDispatches, icon: Truck, tone: "green" },
  ];
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700", orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700", purple: "bg-violet-50 text-violet-700",
    red: "bg-red-50 text-red-700", green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-600">Manufacturing control tower</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Operations Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Live view of JSPL Raipur manufacturing performance</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700"><span className="mr-1.5 size-2 rounded-full bg-emerald-500" />Supabase live</Badge>
      </div>
      <DashboardFilters customers={data.customers} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{metric.value}</p>
              </div>
              <div className={`grid size-10 place-items-center rounded-lg ${tones[metric.tone]}`}>
                <metric.icon className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="min-w-0 p-5"><h2 className="font-semibold text-slate-900">Production status</h2><p className="mt-1 text-sm text-slate-500">Active jobs by lifecycle status</p><div className="mt-4"><StatusChart data={data.productionStatuses} /></div></Card>
        <Card className="min-w-0 p-5"><h2 className="font-semibold text-slate-900">Order status</h2><p className="mt-1 text-sm text-slate-500">Customer order distribution</p><div className="mt-4"><OrderPieChart data={data.orderStatuses} /></div></Card>
        <Card className="min-w-0 p-5"><h2 className="font-semibold text-slate-900">Quality rejection trend</h2><p className="mt-1 text-sm text-slate-500">Failed inspections by month</p><div className="mt-4"><RejectionChart data={data.rejectionTrend} /></div></Card>
        <Card className="min-w-0 p-5"><h2 className="font-semibold text-slate-900">Monthly production</h2><p className="mt-1 text-sm text-slate-500">Completed jobs by month</p><div className="mt-4"><ProductionTrendChart data={data.monthlyTrend} /></div></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.7fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Recent orders</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Value</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentOrders.length > 0 ? data.recentOrders.map((order) => <tr key={order.id}><td className="px-5 py-3"><p className="font-medium text-slate-900">{order.number}</p><p className="max-w-xs truncate text-xs text-slate-500">{order.description}</p></td><td className="px-5 py-3 text-slate-700">{order.customer}</td><td className="px-5 py-3 text-slate-600">{order.date}</td><td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{order.status.replaceAll("_", " ")}</span></td><td className="px-5 py-3 text-right font-medium text-slate-900">₹{order.value.toLocaleString("en-IN")}</td></tr>) : <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-500">No orders match the selected filters.</td></tr>}</tbody></table></div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Workflow bottlenecks</h2>
          <div className="mt-4 space-y-3">{data.bottlenecks.map((item) => <div key={item.stage} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">{item.stage}</span><span className={`text-xs font-semibold ${item.severity === "High" ? "text-red-600" : "text-slate-500"}`}>{item.severity}</span></div><div className="mt-2 flex items-end justify-between"><span className="text-xs text-slate-500">Pending records</span><span className="text-xl font-semibold text-slate-900">{item.count}</span></div></div>)}</div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Recent inspection failures</h2></div>
        <div className="divide-y divide-slate-100">{data.recentFailures.length ? data.recentFailures.map((failure) => <div key={failure.id} className="flex items-start gap-3 px-5 py-4"><div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-slate-900">{failure.number}</p><span className="text-xs text-slate-500">{failure.date}</span></div><p className="mt-1 truncate text-sm text-slate-600">{failure.remarks}</p></div></div>) : <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500"><CheckCircle2 className="size-5 text-emerald-600" />No failed quality inspections in this period.</div>}</div>
      </Card>
    </div>
  );
}
