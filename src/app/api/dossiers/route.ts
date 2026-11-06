import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const body=await request.json();
  if(!body.production_job_id)return NextResponse.json({error:"Production job is required."},{status:400});
  const supabase=await createClient();
  const count=(await supabase.from("quality_dossiers").select("id",{count:"exact",head:true})).count??0;
  const {data:final}=await supabase.from("final_inspections").select("id,result").eq("production_job_id",body.production_job_id).eq("result","accepted").maybeSingle();
  if(!final)return NextResponse.json({error:"An accepted final inspection is required before dossier creation."},{status:409});
  const {data,error}=await supabase.from("quality_dossiers").upsert({
    dossier_number:`QD-${new Date().getUTCFullYear()}-${String(count+1).padStart(4,"0")}`,
    production_job_id:body.production_job_id,final_inspection_id:final.id,status:"draft",remarks:body.remarks||null,created_by:auth.user.id,
  },{onConflict:"production_job_id"}).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json(data,{status:201});
}
