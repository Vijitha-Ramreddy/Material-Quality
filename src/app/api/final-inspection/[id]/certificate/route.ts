import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params;const form=await request.formData();const file=form.get("certificate");
  if(!(file instanceof File)||file.size===0)return NextResponse.json({error:"Certificate file is required."},{status:400});
  const supabase=await createClient();
  const path=`${id}/${Date.now()}-${file.name}`;
  const upload=await supabase.storage.from("final-inspection-certificates").upload(path,file,{contentType:file.type||"application/octet-stream"});
  if(upload.error)return NextResponse.json({error:upload.error.message},{status:400});
  const {error}=await supabase.from("final_inspections").update({
    certificate_storage_bucket:"final-inspection-certificates",certificate_storage_path:path,certificate_file_name:file.name,
  }).eq("id",id);
  if(error){await supabase.storage.from("final-inspection-certificates").remove([path]);return NextResponse.json({error:error.message},{status:400});}
  return NextResponse.json({success:true},{status:201});
}
