import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params;const supabase=await createClient();
  const dossier=await supabase.from("quality_dossiers").select("required_documents,status,pdf_storage_path,production_job_id").eq("id",id).single();
  if(dossier.error||!dossier.data)return NextResponse.json({error:"Dossier not found."},{status:404});
  const required=dossier.data.required_documents as Record<string,boolean>;
  if(!dossier.data.pdf_storage_path||!Object.values(required).every(Boolean))return NextResponse.json({error:"All mandatory dossier documents must be available and the consolidated PDF generated."},{status:409});
  const ncr=await supabase.from("non_conformance_reports").select("id").eq("production_job_id",dossier.data.production_job_id).neq("status","closed").limit(1);
  if(ncr.data?.length)return NextResponse.json({error:"Open NCRs must be closed before dossier approval."},{status:409});
  const {error}=await supabase.from("quality_dossiers").update({status:"approved",approved_by:auth.user.id,approved_at:new Date().toISOString()}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({success:true});
}
