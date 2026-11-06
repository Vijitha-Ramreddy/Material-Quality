import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const body=await request.json();
  const jobId=String(body.production_job_id||"");
  const inspected=Number(body.inspected_quantity);
  const accepted=Number(body.accepted_quantity||0);
  const rejected=Number(body.rejected_quantity||0);
  if(!jobId||!Number.isFinite(inspected)||inspected<=0||accepted<0||rejected<0||accepted+rejected>inspected) {
    return NextResponse.json({error:"Final inspection quantity is invalid."},{status:400});
  }
  const supabase=await createClient();
  const ready=await supabase.rpc("final_acceptance_ready",{job_id:jobId}).single();
  const readiness=ready.data as {job_ready:boolean;reason:string}|null;
  if(ready.error||!readiness?.job_ready)return NextResponse.json({error:readiness?.reason??ready.error?.message??"Acceptance prerequisites are incomplete."},{status:409});
  const count=(await supabase.from("final_inspections").select("id",{count:"exact",head:true})).count??0;
  const result=["under_inspection","accepted","rejected","reinspection_required"].includes(String(body.result))?String(body.result):"under_inspection";
  const measurements=Array.isArray(body.measurements)?body.measurements:[];
  const dimensional=measurements.filter((item:{inspection_type:string})=>item.inspection_type==="dimensional");
  const functional=measurements.filter((item:{inspection_type:string})=>item.inspection_type==="functional");
  const failed=measurements.some((item:{minimum_limit?:number|null;maximum_limit?:number|null;measured_value?:number|null})=>{
    const value=Number(item.measured_value);
    const min=item.minimum_limit==null?null:Number(item.minimum_limit);
    const max=item.maximum_limit==null?null:Number(item.maximum_limit);
    return !Number.isFinite(value)||(min!==null&&value<min)||(max!==null&&value>max);
  });
  if(result==="accepted"&&failed)return NextResponse.json({error:"Final acceptance cannot be recorded while dimensional or functional measurements fail."},{status:409});
  const {data,error}=await supabase.from("final_inspections").insert({
    inspection_number:`FI-${new Date().getUTCFullYear()}-${String(count+1).padStart(4,"0")}`,
    production_job_id:jobId,result,inspection_date:new Date().toISOString().slice(0,10),
    certificate_number:body.certificate_number||null,inspected_quantity:inspected,accepted_quantity:accepted,rejected_quantity:rejected,
    observations:{functional:body.functional_observations||null,dimensional:body.dimensional_observations||null},
    dimensional_results:{summary:"Recorded during final inspection",tests:dimensional.length},
    functional_results:{summary:"Recorded during final inspection",tests:functional.length},
    measurements,
    customer_inspection_required:Boolean(body.customer_inspection_required),
    customer_inspector_name:body.customer_inspector_name||null,customer_inspector_company:body.customer_inspector_company||null,
    third_party_inspector_name:body.third_party_inspector_name||null,third_party_inspector_company:body.third_party_inspector_company||null,
    inspector_id:auth.user.id,remarks:body.remarks||null,
  }).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  const measurementRows=measurements.map((measurement:{inspection_type:string;characteristic:string;unit?:string;minimum_limit?:number|string|null;maximum_limit?:number|string|null;measured_value?:number|string|null;remarks?:string})=>{
    const value=measurement.measured_value===null||measurement.measured_value===undefined||String(measurement.measured_value)===""?null:Number(measurement.measured_value);
    const min=measurement.minimum_limit===null||measurement.minimum_limit===undefined||String(measurement.minimum_limit)===""?null:Number(measurement.minimum_limit);
    const max=measurement.maximum_limit===null||measurement.maximum_limit===undefined||String(measurement.maximum_limit)===""?null:Number(measurement.maximum_limit);
    const measurementResult=value===null?"pending":min!==null&&value<min||max!==null&&value>max?"fail":"pass";
    return {...measurement,final_inspection_id:data.id,minimum_limit:min,maximum_limit:max,measured_value:value,result:measurementResult};
  });
  if(measurementRows.length){
    const measurementError=(await supabase.from("final_inspection_measurements").insert(measurementRows)).error;
    if(measurementError)return NextResponse.json({error:measurementError.message},{status:400});
  }
  await supabase.from("workflow_history").insert({workflow_stage:"final_inspection",entity_type:"final_inspections",entity_id:data.id,to_status:result,result,remarks:body.remarks||null,performed_by:auth.user.id});
  return NextResponse.json({id:data.id},{status:201});
}
