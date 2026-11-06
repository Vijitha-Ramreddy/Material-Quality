import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin", "stores", "planning_procurement", "production"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Malformed JSON request." }, { status: 400 }); }
  const receiptId = String(body.material_receipt_id || "");
  const jobId = String(body.production_job_id || "");
  const quantity = Number(body.quantity);
  const unit = String(body.unit || "").trim();
  if (!receiptId || !jobId || !Number.isFinite(quantity) || quantity <= 0 || !unit) {
    return NextResponse.json({ error: "Receipt, production job, positive quantity and unit are required." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: receipt, error: receiptError } = await supabase.from("material_receipts")
    .select("status,material_id,heat_number,batch_number,unit,received_quantity,materials(name)")
    .eq("id", receiptId).single();
  if (receiptError || !receipt) return NextResponse.json({ error: "Material receipt not found." }, { status: 404 });
  if (receipt.status !== "accepted") return NextResponse.json({ error: "Rejected, held and pending material cannot be allocated." }, { status: 409 });
  if (!receipt.heat_number || !receipt.batch_number) return NextResponse.json({ error: "Heat number and batch number are required before allocation." }, { status: 409 });
  const mtc = await supabase.from("material_test_certificates").select("id,certificate_status")
    .eq("material_receipt_id", receiptId).maybeSingle();
  if (mtc.error) return NextResponse.json({ error: mtc.error.message }, { status: 400 });
  if (!mtc.data || !["verified", "accepted"].includes(mtc.data.certificate_status)) {
    return NextResponse.json({ error: "Material Test Certificate must be verified before allocation." }, { status: 409 });
  }
  const allocated = await supabase.from("steel_material_allocations").select("allocated_quantity")
    .eq("material_receipt_id", receiptId).neq("status", "cancelled");
  const totalAllocated = (allocated.data ?? []).reduce((sum, row) => sum + Number(row.allocated_quantity), 0);
  if (totalAllocated + quantity > Number(receipt.received_quantity)) {
    return NextResponse.json({ error: "Allocation exceeds the accepted received quantity." }, { status: 409 });
  }
  const { error } = await supabase.from("steel_material_allocations").insert({
    material_receipt_id: receiptId,
    production_job_id: jobId,
    production_stage_id: body.production_stage_id ? String(body.production_stage_id) : null,
    bom_item_id: body.bom_item_id ? String(body.bom_item_id) : null,
    allocated_quantity: quantity,
    unit,
    finished_equipment_serial: body.finished_equipment_serial ? String(body.finished_equipment_serial) : null,
    component_identification: body.component_identification ? String(body.component_identification) : null,
    remarks: body.remarks ? String(body.remarks) : null,
    allocated_by: auth.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}
