import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const body=await request.json();
  const checkpoints=Array.isArray(body.checkpoints)?body.checkpoints:[];
  if(!body.production_job_id||!body.production_stage_id||checkpoints.length===0) {
    return NextResponse.json({error:"Job, stage and at least one checkpoint are required."},{status:400});
  }
  const supabase=await createClient();
  const count=(await supabase.from("quality_inspections").select("id",{count:"exact",head:true})).count??0;
  const measuredCheckpoints=checkpoints.map((checkpoint: {checkpoint_name:string;inspection_method?:string;unit?:string;minimum_limit?:number|string|null;maximum_limit?:number|string|null;measured_value?:number|string|null;remarks?:string})=>{
    const measured=checkpoint.measured_value === null || checkpoint.measured_value === undefined || String(checkpoint.measured_value)===""
      ?null:Number(checkpoint.measured_value);
    const minimum=checkpoint.minimum_limit === null || checkpoint.minimum_limit === undefined || String(checkpoint.minimum_limit)===""
      ?null:Number(checkpoint.minimum_limit);
    const maximum=checkpoint.maximum_limit === null || checkpoint.maximum_limit === undefined || String(checkpoint.maximum_limit)===""
      ?null:Number(checkpoint.maximum_limit);
    if(!checkpoint.checkpoint_name?.trim())throw new Error("Checkpoint names are required.");
    if(minimum!==null&&maximum!==null&&maximum<minimum)throw new Error("Maximum limit cannot be below minimum limit.");
    if(measured!==null&&!Number.isFinite(measured))throw new Error("Measured values must be numeric.");
    const result=measured===null?"pending":minimum!==null&&measured<minimum||maximum!==null&&measured>maximum?"fail":"pass";
    return {...checkpoint,checkpoint_name:checkpoint.checkpoint_name.trim(),measured_value:measured,minimum_limit:minimum,maximum_limit:maximum,result};
  });
  let result: "pending"|"accepted"|"rejected";
  if(measuredCheckpoints.some((checkpoint:{result:string})=>checkpoint.result==="fail"))result="rejected";
  else if(measuredCheckpoints.every((checkpoint:{result:string})=>checkpoint.result==="pass"))result="accepted";
  else result="pending";
  const {data:inspection,error}=await supabase.from("quality_inspections").insert({
    inspection_number:`IP-${new Date().getUTCFullYear()}-${String(count+1).padStart(4,"0")}`,
    production_job_id:body.production_job_id,production_stage_id:body.production_stage_id,
    quality_plan_id:body.quality_plan_id||null,inspection_date:new Date().toISOString().slice(0,10),
    result,measured_values:Object.fromEntries(measuredCheckpoints.map((checkpoint:{checkpoint_name:string;measured_value:number|null})=>[checkpoint.checkpoint_name,checkpoint.measured_value])),
    observations:{checkpoints:measuredCheckpoints.length,pass:measuredCheckpoints.filter((checkpoint:{result:string})=>checkpoint.result==="pass").length,fail:measuredCheckpoints.filter((checkpoint:{result:string})=>checkpoint.result==="fail").length},
    ndt_results:body.ndt_results||{},inspector_id:auth.user.id,remarks:String(body.remarks||""),
    completed_at:result==="pending"?null:new Date().toISOString(),
  }).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  const checkpointRows=measuredCheckpoints.map((checkpoint:{checkpoint_name:string})=>({...checkpoint,production_job_id:body.production_job_id,production_stage_id:body.production_stage_id,quality_inspection_id:inspection.id}));
  const checkpointError=(await supabase.from("in_process_checkpoints").insert(checkpointRows)).error;
  if(checkpointError){await supabase.from("quality_inspections").delete().eq("id",inspection.id);return NextResponse.json({error:checkpointError.message},{status:400});}
  await supabase.from("workflow_history").insert({workflow_stage:"quality_inspection",entity_type:"quality_inspections",entity_id:inspection.id,to_status:result,result,remarks:body.remarks||null,performed_by:auth.user.id});
  return NextResponse.json({id:inspection.id,result},{status:201});
}
