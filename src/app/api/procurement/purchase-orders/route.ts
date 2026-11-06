import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "planning_procurement"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!body.project_id || !body.supplier_id || !body.po_number?.trim() || !body.expected_delivery_date || !items.length) {
    return NextResponse.json({ error: "Project, supplier, PO number, delivery date and items are required." }, { status: 400 });
  }
  if (items.some((item: {bom_item_id:string; ordered_quantity:number; unit:string; unit_price:number}) =>
    !item.bom_item_id || !item.unit || Number(item.ordered_quantity) <= 0 || !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0)) {
    return NextResponse.json({ error: "PO quantities must be positive, units and valid prices are required." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: plan } = await supabase.from("quality_plans").select("id,status").eq("project_id", body.project_id).eq("status","approved").limit(1);
  const { data: bom } = await supabase.from("bom_items").select("id").eq("project_id",body.project_id).eq("status","approved");
  if (!plan?.length || !bom?.length) return NextResponse.json({ error: "PO blocked: approved BOM and quality plan are required." }, { status: 409 });

  const { data: po, error } = await supabase.from("purchase_orders").insert({
    po_number: body.po_number.trim().toUpperCase(), supplier_id: body.supplier_id, project_id: body.project_id,
    requisition_id: body.requisition_id || null, status: body.status || "draft",
    expected_delivery_date: body.expected_delivery_date, notes: body.notes || null, created_by: auth.user.id,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const rows = items.map((item: {bom_item_id:string; item_code:string; description:string; ordered_quantity:number; unit:string; unit_price:number}) => ({
    purchase_order_id: po.id, bom_item_id:item.bom_item_id, item_code:item.item_code,
    description:item.description, ordered_quantity:Number(item.ordered_quantity),
    unit:item.unit, unit_price:Number(item.unit_price),
  }));
  const itemError = (await supabase.from("purchase_order_items").insert(rows)).error;
  if (itemError) {
    await supabase.from("purchase_orders").delete().eq("id",po.id);
    return NextResponse.json({ error:itemError.message }, { status:400 });
  }
  return NextResponse.json({ id:po.id }, { status:201 });
}
