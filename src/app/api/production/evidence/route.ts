import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","production"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const form=await request.formData(); const file=form.get("evidence"); const stageId=String(form.get("stage_id"));
  if(!(file instanceof File)||file.size<=0||!stageId)return NextResponse.json({error:"Evidence file and stage are required."},{status:400});
  const supabase=await createClient();
  const {data:stage,error:stageError}=await supabase.from("production_stages").select("production_job_id").eq("id",stageId).single();
  if(stageError||!stage)return NextResponse.json({error:"Production stage not found."},{status:400});
  const path=`${stage.production_job_id}/${stageId}/${Date.now()}-${file.name}`;
  const upload=await supabase.storage.from("production-evidence").upload(path,file,{contentType:file.type||"application/octet-stream"});
  if(upload.error)return NextResponse.json({error:upload.error.message},{status:400});
  const {error}=await supabase.from("production_evidence").insert({production_job_id:stage.production_job_id,production_stage_id:stageId,storage_path:path,file_name:file.name,evidence_type:String(form.get("evidence_type")||"production_photo"),remarks:String(form.get("remarks")||""),uploaded_by:auth.user.id});
  if(error){await supabase.storage.from("production-evidence").remove([path]);return NextResponse.json({error:error.message},{status:400});}
  return NextResponse.json({success:true},{status:201});
}
