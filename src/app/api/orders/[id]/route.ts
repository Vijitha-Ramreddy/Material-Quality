import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin", "sales_projects"]);
  if (auth.status !== 200 || !auth.user) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    supabase = await createClient();
  }

  const { data: currentOrder } = await supabase
    .from("orders")
    .select("id,status,description")
    .eq("id", id)
    .single();

  if (!currentOrder) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Construct description update preserving product info if supplied
  let updatedDescription = body.description ? String(body.description).trim() : currentOrder.description;
  if (body.product_name) {
    const qtyStr = body.quantity ? `(Qty: ${body.quantity} ${body.unit || "nos"})` : "";
    if (!updatedDescription.includes(String(body.product_name))) {
      updatedDescription = `${body.product_name} ${qtyStr} - ${updatedDescription}`.trim();
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.customer_id) updates.customer_id = body.customer_id;
  if (body.customer_po_number !== undefined) updates.customer_po_number = body.customer_po_number || null;
  if (updatedDescription) updates.description = updatedDescription;
  if (body.required_delivery_date !== undefined) updates.required_delivery_date = body.required_delivery_date || null;
  if (body.priority !== undefined && Number.isFinite(Number(body.priority))) updates.priority = Number(body.priority);
  if (body.total_value !== undefined) {
    updates.total_value = body.total_value === "" || body.total_value == null ? null : Number(body.total_value);
  }
  if (body.status) updates.status = body.status;

  const { error } = await supabase.from("orders").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If status changed, write workflow audit trail
  if (body.status && currentOrder.status !== body.status) {
    await supabase.from("workflow_history").insert({
      workflow_stage: "order_received",
      entity_type: "orders",
      entity_id: id,
      from_status: currentOrder.status,
      to_status: body.status,
      result: "approved",
      remarks: `Order status updated from ${currentOrder.status} to ${body.status}`,
      performed_by: auth.user.id,
      performed_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ id, success: true });
}
