import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","production"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const body=await request.json(); const quantity=Number(body.quantity);
  if(!body.production_job_id||!body.stage_id||!Number.isFinite(quantity)||quantity<=0||!body.unit?.trim())return NextResponse.json({error:"Stage, positive quantity and unit are required."},{status:400});
  const supabase=await createClient();
  const scrap=Number(body.scrap_quantity||0);
  if(!Number.isFinite(scrap)||scrap<0)return NextResponse.json({error:"Scrap quantity cannot be negative."},{status:400});
  const allocationId=String(body.allocation_id||"");
  if(!allocationId)return NextResponse.json({error:"An accepted material allocation is required."},{status:400});
  const {data:allocation,error:allocationError}=await supabase.from("steel_material_allocations")
    .select("id,material_receipt_id,allocated_quantity,consumed_quantity,scrap_quantity,status,production_job_id")
    .eq("id",allocationId).eq("production_job_id",body.production_job_id).neq("status","cancelled").single();
  if(allocationError||!allocation)return NextResponse.json({error:"Material allocation not found for this production job."},{status:404});
  const available=Number(allocation.allocated_quantity)-Number(allocation.consumed_quantity)-Number(allocation.scrap_quantity);
  if(quantity+scrap>available)return NextResponse.json({error:"Consumption exceeds the allocated material quantity."},{status:409});
  const receipt=await supabase.from("material_receipts").select("status,heat_number,batch_number")
    .eq("id",allocation.material_receipt_id).single();
  if(receipt.error||receipt.data?.status!=="accepted")return NextResponse.json({error:"Only accepted material batches can be consumed."},{status:409});
  const {data:trace, error:traceError}=await supabase.from("manufacturing_traceability").insert({
    production_job_id:body.production_job_id,production_stage_id:body.stage_id,
    material_receipt_id:allocation.material_receipt_id,consumed_quantity:quantity,scrap_quantity:scrap,
    unit:body.unit.trim(),heat_number:receipt.data?.heat_number,batch_number:receipt.data?.batch_number,
    finished_equipment_serial:body.finished_equipment_serial?String(body.finished_equipment_serial):null,
    component_identification:body.component_identification?String(body.component_identification):null,
    created_by:auth.user.id,
  }).select("id").single();
  if(traceError)return NextResponse.json({error:traceError.message},{status:400});
  const {error}=await supabase.from("production_material_consumption").insert({
    production_job_id:body.production_job_id,production_stage_id:body.stage_id,
    bom_item_id:body.bom_item_id||null,material_id:body.material_id||null,quantity,unit:body.unit.trim(),
    heat_number:receipt.data?.heat_number,batch_number:receipt.data?.batch_number,scrap_quantity:scrap,
    material_receipt_id:allocation.material_receipt_id,material_traceability_id:trace.id,
    remarks:body.remarks||null,recorded_by:auth.user.id,
  });
  if(error)return NextResponse.json({error:error.message},{status:400});
  const consumed=Number(allocation.consumed_quantity)+quantity;
  const allocationScrap=Number(allocation.scrap_quantity)+scrap;
  await supabase.from("steel_material_allocations").update({
    consumed_quantity:consumed,scrap_quantity:allocationScrap,
    status: consumed+allocationScrap >= Number(allocation.allocated_quantity) ? "consumed":"partially_consumed",
    finished_equipment_serial:body.finished_equipment_serial?String(body.finished_equipment_serial):undefined,
    component_identification:body.component_identification?String(body.component_identification):undefined,
  }).eq("id",allocationId);
  return NextResponse.json({success:true},{status:201});
}
