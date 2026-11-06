import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "sales_projects"]);
  if (auth.status !== 200 || !auth.user) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: auth.status });
  }

  const form = await request.formData();
  const customerId = String(form.get("customer_id") ?? "");
  const description = String(form.get("description") ?? "").trim();
  const productName = String(form.get("product_name") ?? "").trim();
  const quantity = Number(form.get("quantity") || 1);
  const unit = String(form.get("unit") ?? "nos").trim() || "nos";
  const deliveryDate = String(form.get("required_delivery_date") ?? "");
  const projectId = String(form.get("project_id") ?? "") || null;
  const projectName = String(form.get("project_name") ?? "").trim();
  const totalValue = form.get("total_value") ? Number(form.get("total_value")) : null;
  const priority = Number(form.get("priority") ?? 3);
  const customerPo = String(form.get("customer_po_number") ?? "").trim() || null;

  if (!customerId || !description) {
    return NextResponse.json(
      { error: "Customer and order description are required." },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  // 1. Generate Order Number reliably (RPC or sequence fallback)
  let orderNumber: string | null = null;
  try {
    const { data: numberData } = await supabase.rpc("generate_order_number");
    if (numberData) orderNumber = String(numberData);
  } catch {
    // RPC not available
  }

  if (!orderNumber) {
    const year = new Date().getFullYear();
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true });
    orderNumber = `ORD-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  // Build combined description containing product details
  const fullDescription = productName
    ? `${productName} (Qty: ${quantity} ${unit}) - ${description}`
    : description;

  // 2. Insert into orders table
  const insertPayload: Record<string, unknown> = {
    order_number: orderNumber,
    customer_id: customerId,
    customer_po_number: customerPo,
    description: fullDescription,
    required_delivery_date: deliveryDate || null,
    priority: Number.isFinite(priority) ? priority : 3,
    currency: "INR",
    total_value: Number.isFinite(totalValue) ? totalValue : null,
    status: "draft",
    created_by: auth.user.id,
  };

  const { data: newOrder, error: insertError } = await supabase
    .from("orders")
    .insert(insertPayload)
    .select("id,order_number")
    .single();

  if (insertError || !newOrder) {
    return NextResponse.json({ error: insertError?.message ?? "Unable to create order." }, { status: 400 });
  }

  // 3. Link or create project
  let linkedProjectId = projectId;
  if (!linkedProjectId && projectName) {
    const projectCode = `PRJ-${orderNumber.replace("ORD-", "")}`;
    const { data: newProj } = await supabase
      .from("projects")
      .insert({
        project_code: projectCode,
        order_id: newOrder.id,
        name: projectName,
        planned_end_date: deliveryDate || null,
        status: "planned",
        project_manager_id: auth.user.id,
      })
      .select("id")
      .single();
    if (newProj) linkedProjectId = newProj.id;
  } else if (linkedProjectId) {
    await supabase.from("projects").update({ order_id: newOrder.id }).eq("id", linkedProjectId);
  }

  // 4. Record Initial Workflow History
  await supabase.from("workflow_history").insert({
    workflow_stage: "order_received",
    entity_type: "orders",
    entity_id: newOrder.id,
    from_status: null,
    to_status: "draft",
    result: "approved",
    remarks: `Customer order ${orderNumber} created. Scope: ${productName || "Equipment fabrication"}`,
    performed_by: auth.user.id,
    performed_at: new Date().toISOString(),
  });

  return NextResponse.json(newOrder, { status: 201 });
}
