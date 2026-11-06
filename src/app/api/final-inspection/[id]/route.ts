import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params;
  let body: Record<string, unknown>;
  try { body=await request.json(); } catch { return NextResponse.json({error:"Malformed JSON request."},{status:400}); }
  const result=String(body.result||"");
  if(!["under_inspection","accepted","rejected","reinspection_required"].includes(result))return NextResponse.json({error:"Invalid final inspection status."},{status:400});
  const supabase=await createClient();
  const {data:inspection,error:findError}=await supabase.from("final_inspections").select("id,production_job_id").eq("id",id).single();
  if(findError||!inspection)return NextResponse.json({error:"Final inspection not found."},{status:404});
  if(result==="accepted"){
    const ready=await supabase.rpc("final_acceptance_ready",{job_id:inspection.production_job_id}).single();
    const readiness=ready.data as {job_ready:boolean;reason:string}|null;
    if(ready.error||!readiness?.job_ready)return NextResponse.json({error:readiness?.reason??ready.error?.message??"Acceptance prerequisites incomplete."},{status:409});
  }
  const {error}=await supabase.from("final_inspections").update({result,remarks:body.remarks||null}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({success:true});
}
