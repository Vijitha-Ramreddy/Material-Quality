import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin","quality_assurance","production"]);
  if (auth.status !== 200) return NextResponse.json({error:"Forbidden"},{status:auth.status});
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({error:"Malformed JSON request."},{status:400}); }
  const recordType=String(body.record_type||"");
  const jobId=String(body.production_job_id||"");
  if(!jobId || !["weld","ndt","hydrostatic","traceability"].includes(recordType)) {
    return NextResponse.json({error:"Production job and a supported machinery QA record type are required."},{status:400});
  }
  const supabase=await createClient();
  let error;
  if(recordType==="weld") {
    const weldNumber=String(body.weld_number||"").trim();
    if(!weldNumber||!String(body.welding_process||"").trim()) return NextResponse.json({error:"Weld number and welding process are required."},{status:400});
    ({error}=await supabase.from("weld_records").insert({
      weld_number:weldNumber,production_job_id:jobId,production_stage_id:body.production_stage_id||null,
      joint_number:body.joint_number||null,welder_id:String(body.welder_id||"").trim()||null,
      welding_process:String(body.welding_process),welding_position:body.welding_position||null,
      filler_material:body.filler_material||null,filler_heat_or_batch:body.filler_heat_or_batch||null,
      base_material_grade:body.base_material_grade||null,wps_number:body.wps_number||null,
      weld_date:body.weld_date||null,result:body.result||"pending",remarks:body.remarks||null,created_by:auth.user.id,
    }));
  } else if(recordType==="ndt") {
    const method=String(body.ndt_method||"");
    const ndtNumber=String(body.ndt_number||"").trim();
    if(!ndtNumber||!["VT","UT","RT","MT","PT","PAUT","TOFD"].includes(method)) return NextResponse.json({error:"NDT number and supported method are required."},{status:400});
    ({error}=await supabase.from("ndt_records").insert({
      ndt_number:ndtNumber,production_job_id:jobId,weld_record_id:body.weld_record_id||null,
      ndt_method:method,acceptance_standard:body.acceptance_standard||null,procedure_number:body.procedure_number||null,
      technician:body.technician||null,test_date:body.test_date||null,indications:body.indications||[],
      result:body.result||"pending",remarks:body.remarks||null,
    }));
  } else if(recordType==="hydrostatic") {
    const pressure=Number(body.test_pressure), time=Number(body.holding_time_minutes);
    if(!String(body.test_number||"").trim()||!Number.isFinite(pressure)||pressure<=0||!Number.isFinite(time)||time<=0) {
      return NextResponse.json({error:"Hydrostatic test number, pressure and holding time are required."},{status:400});
    }
    ({error}=await supabase.from("hydrostatic_tests").insert({
      test_number:String(body.test_number).trim(),production_job_id:jobId,equipment_tag:body.equipment_tag||null,
      test_medium:body.test_medium||"Water",test_pressure:pressure,pressure_unit:body.pressure_unit||"bar",
      holding_time_minutes:time,test_temperature:body.test_temperature||null,calibrated_gauge_numbers:body.calibrated_gauge_numbers||null,
      test_date:body.test_date||null,result:body.result||"pending",witnessed_by:body.witnessed_by||null,
      witness_organization:body.witness_organization||null,remarks:body.remarks||null,recorded_by:auth.user.id,
    }));
  } else {
    const consumed=Number(body.consumed_quantity), scrap=Number(body.scrap_quantity||0);
    if(!body.material_receipt_id||!Number.isFinite(consumed)||consumed<=0||!Number.isFinite(scrap)||scrap<0||!String(body.unit||"").trim()) {
      return NextResponse.json({error:"Receipt, positive consumed quantity, non-negative scrap and unit are required."},{status:400});
    }
    ({error}=await supabase.from("manufacturing_traceability").insert({
      production_job_id:jobId,production_stage_id:body.production_stage_id||null,
      material_receipt_id:body.material_receipt_id,bom_item_id:body.bom_item_id||null,
      finished_equipment_serial:body.finished_equipment_serial||null,component_identification:body.component_identification||null,
      heat_number:body.heat_number||null,batch_number:body.batch_number||null,consumed_quantity:consumed,
      scrap_quantity:scrap,unit:String(body.unit),created_by:auth.user.id,
    }));
  }
  if(error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({success:true},{status:201});
}
