"use client";

import { useSyncExternalStore } from "react";
import {
  BarChart, Bar, CartesianGrid, Cell, Legend, LineChart, Line,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const colors = ["#475569", "#2563eb", "#ea580c", "#d97706", "#16a34a", "#dc2626"];

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

type ChartItem = { name?: string; status?: string; month?: string; value?: number; jobs?: number };

export function StatusChart({ data, nameKey = "name" }: { data: ChartItem[]; nameKey?: string }) {
  const mounted = useIsMounted();

  if (!mounted) {
    return <div className="h-[280px] w-full animate-pulse rounded-lg bg-slate-50" />;
  }
  if (!data || data.length === 0 || data.every((d) => (d.value ?? 0) === 0)) {
    return <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No active production records</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey={nameKey} tick={{ fill: "#64748b", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={68} />
        <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" name="Records" radius={[5, 5, 0, 0]}>
          {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrderPieChart({ data }: { data: ChartItem[] }) {
  const mounted = useIsMounted();

  if (!mounted) {
    return <div className="h-[280px] w-full animate-pulse rounded-lg bg-slate-50" />;
  }
  if (!data || data.length === 0 || data.every((d) => (d.value ?? 0) === 0)) {
    return <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No orders recorded</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
          {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RejectionChart({ data }: { data: ChartItem[] }) {
  const mounted = useIsMounted();

  if (!mounted) {
    return <div className="h-[280px] w-full animate-pulse rounded-lg bg-slate-50" />;
  }
  if (!data || data.length === 0) {
    return <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No quality rejections in this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" name="Rejected inspections" fill="#dc2626" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProductionTrendChart({ data }: { data: ChartItem[] }) {
  const mounted = useIsMounted();

  if (!mounted) {
    return <div className="h-[280px] w-full animate-pulse rounded-lg bg-slate-50" />;
  }
  if (!data || data.length === 0) {
    return <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No completed jobs in this period</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="jobs" name="Completed jobs" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
