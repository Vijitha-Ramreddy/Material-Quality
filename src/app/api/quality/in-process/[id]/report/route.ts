import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params; const form=await request.formData();
  const file=form.get("report");
  if(!(file instanceof File)||file.size===0)return NextResponse.json({error:"Inspection report file is required."},{status:400});
  const supabase=await createClient();
  const path=`${id}/${Date.now()}-${file.name}`;
  const uploaded=await supabase.storage.from("quality-inspection-reports").upload(path,file,{contentType:file.type||"application/octet-stream"});
  if(uploaded.error)return NextResponse.json({error:uploaded.error.message},{status:400});
  const {error}=await supabase.from("quality_inspections").update({
    report_storage_bucket:"quality-inspection-reports",report_storage_path:path,report_file_name:file.name,
  }).eq("id",id);
  if(error){await supabase.storage.from("quality-inspection-reports").remove([path]);return NextResponse.json({error:error.message},{status:400});}
  await supabase.from("quality_documents").insert({
    document_number:`QD-${Date.now()}`,document_type:"inspection_report",title:file.name,project_id:null,quality_inspection_id:id,
    storage_bucket:"quality-inspection-reports",storage_object_path:path,file_name:file.name,file_size:file.size,
  });
  return NextResponse.json({success:true},{status:201});
}
