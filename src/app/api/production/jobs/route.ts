import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","planning_procurement","production"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const body=await request.json();
  const quantity=Number(body.quantity);
  if(!body.project_id||!body.bom_item_id||!Number.isFinite(quantity)||quantity<=0) {
    return NextResponse.json({error:"Project, BOM requirement and positive planned quantity are required."},{status:400});
  }
  const supabase=await createClient();
  const {count}=await supabase.from("production_jobs").select("id",{count:"exact",head:true});
  const {data:project}=await supabase.from("projects").select("approved_at").eq("id",body.project_id).single();
  const [bom,quality,drawing]=await Promise.all([
    supabase.from("bom_items").select("id,status").eq("project_id",body.project_id).eq("status","approved"),
    supabase.from("quality_plans").select("id").eq("project_id",body.project_id).eq("status","approved").not("approved_at","is",null).limit(1),
    supabase.from("projects").select("order_id").eq("id",body.project_id).single(),
  ]);
  let approvedDrawing=false;
  if(drawing.data?.order_id){
    const drawings=await supabase.from("engineering_drawings").select("current_revision_id,drawing_revisions(status)").eq("order_id",drawing.data.order_id);
    approvedDrawing=(drawings.data as Array<{current_revision_id:string|null;drawing_revisions:Array<{status:string}>|null}>|null??[]).some((row)=>{
      const revisions=row.drawing_revisions as Array<{status:string}>|null;
      return revisions?.some((revision)=>revision.status==="approved")===true && row.current_revision_id!=null;
    });
  }
  if(!project?.approved_at||!bom.data?.length||!quality.data?.length||!approvedDrawing) {
    return NextResponse.json({error:"Production blocked: engineering, BOM, planning and quality approvals are incomplete."},{status:409});
  }
  const {data,error}=await supabase.from("production_jobs").insert({
    job_number:`PJ-${new Date().getUTCFullYear()}-${String((count??0)+1).padStart(4,"0")}`,
    project_id:body.project_id,bom_item_id:body.bom_item_id,quality_plan_id:body.quality_plan_id||quality.data[0].id,
    drawing_revision_id:body.drawing_revision_id||null,status:"planned",quantity,
    supervisor_id:body.supervisor_id||auth.user.id,planned_start_at:body.planned_start_at||null,
    planned_end_at:body.planned_end_at||null,remarks:body.remarks||null,
  }).select("id,job_number").single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  const stages=["Cutting","Fabrication","Welding","Machining","Assembly"];
  const stageRows=stages.map((name,index)=>({production_job_id:data.id,stage_sequence:index+1,name,status:"planned"}));
  await supabase.from("production_stages").insert(stageRows);
  await supabase.from("workflow_history").insert({workflow_stage:"production",entity_type:"production_jobs",entity_id:data.id,to_status:"planned",result:"pending",remarks:"Production job created",performed_by:auth.user.id});
  return NextResponse.json(data,{status:201});
}
