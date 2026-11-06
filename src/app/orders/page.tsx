import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { connection } from "next/server";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function customerName(relation: unknown) {
  if (Array.isArray(relation)) {
    const customer = relation[0] as { name?: string } | undefined;
    return customer?.name ?? "-";
  }
  const customer = relation as { name?: string } | null;
  return customer?.name ?? "-";
}

export default async function OrdersPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const page = Math.max(1, Number(one("page") || 1));
  const search = one("search");
  const status = one("status");
  const customer = one("customer");
  const sort = one("sort") === "required_delivery_date" ? "required_delivery_date" : "created_at";

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  let query = supabase
    .from("orders")
    .select("id,order_number,description,status,priority,order_date,required_delivery_date,total_value,created_at,customer_id,customers(id,name)", { count: "exact" });

  if (search) {
    query = query.or(`order_number.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (status) query = query.eq("status", status);
  if (customer) query = query.eq("customer_id", customer);

  const from = (page - 1) * 20;
  const { data: orders, count, error } = await query
    .order(sort, { ascending: one("dir") === "asc" })
    .range(from, from + 19);

  const { data: customers } = await supabase.from("customers").select("id,name").eq("active", true).order("name");
  const pages = Math.max(1, Math.ceil((count ?? 0) / 20));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-600">Sales & Production Contracts</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Customer Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Fabrication and equipment manufacturing purchase orders</p>
        </div>
        <Link href="/orders/new">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">Create New Order</Button>
        </Link>
      </div>

      <Card className="p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-4">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by order number or description..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
          <select
            name="customer"
            defaultValue={customer}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
          >
            <option value="">All Customers</option>
            {customers?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
          >
            <option value="">All Statuses</option>
            {["draft", "confirmed", "in_progress", "completed", "cancelled", "on_hold"].map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              name="sort"
              defaultValue={sort}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="created_at">Order Date</option>
              <option value="required_delivery_date">Delivery Date</option>
            </select>
            <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <Card className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Order Number</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Product / Scope</th>
                <th className="px-5 py-3">Required Delivery</th>
                <th className="px-5 py-3">Order Value</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders && orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <Link href={`/orders/${order.id}`} className="font-semibold text-orange-600 hover:text-orange-700">
                        {order.order_number}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString() : "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {customerName(order.customers)}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-700">{order.description}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {order.required_delivery_date ? new Date(order.required_delivery_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {order.total_value != null ? `₹${Number(order.total_value).toLocaleString("en-IN")}` : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          order.status === "completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : order.status === "in_progress"
                            ? "bg-blue-50 text-blue-700"
                            : order.status === "on_hold"
                            ? "bg-amber-50 text-amber-700"
                            : order.status === "cancelled"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {String(order.status).replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                        <span
                          className={`size-2 rounded-full ${
                            order.priority === 1
                              ? "bg-red-500"
                              : order.priority === 2
                              ? "bg-orange-500"
                              : order.priority === 3
                              ? "bg-blue-500"
                              : "bg-slate-300"
                          }`}
                        />
                        Priority {order.priority}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    No customer orders found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Total: {count ?? 0} orders</span>
        <div className="flex gap-1.5">
          {Array.from({ length: Math.min(pages, 7) }, (_, index) => index + 1).map((item) => (
            <Link
              key={item}
              href={`/orders?page=${item}&search=${encodeURIComponent(search)}&status=${status}&customer=${customer}&sort=${sort}`}
              className={`grid size-9 place-items-center rounded-md border text-xs font-medium ${
                item === page ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              {item}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
