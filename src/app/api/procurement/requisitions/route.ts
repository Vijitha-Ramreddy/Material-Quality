import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "planning_procurement"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!body.project_id || !items.length) return NextResponse.json({ error: "Project and at least one material requirement are required." }, { status: 400 });
  if (items.some((item: {bom_item_id:string; quantity:number; unit:string}) => !item.bom_item_id || !item.quantity || Number(item.quantity) <= 0 || !item.unit)) {
    return NextResponse.json({ error: "Requisition quantities must be positive and units are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: numberData, error: numberError } = await supabase.rpc("requisition_number");
  if (numberError || !numberData) return NextResponse.json({ error: "Could not generate requisition number." }, { status: 500 });
  const { data: requisition, error } = await supabase.from("purchase_requisitions").insert({
    requisition_number: numberData, project_id: body.project_id, notes: body.notes || null,
    status: body.submit_for_approval ? "pending_approval" : "draft", requested_by: auth.user.id,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const itemRows = items.map((item: {bom_item_id:string; quantity:number; unit:string; material_id?:string}) => ({
    requisition_id: requisition.id, bom_item_id: item.bom_item_id,
    material_id: item.material_id || null, requested_quantity: Number(item.quantity), unit: item.unit,
  }));
  const itemError = (await supabase.from("purchase_requisition_items").insert(itemRows)).error;
  if (itemError) {
    await supabase.from("purchase_requisitions").delete().eq("id", requisition.id);
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }
  return NextResponse.json({ id: requisition.id, requisition_number: numberData }, { status: 201 });
}
