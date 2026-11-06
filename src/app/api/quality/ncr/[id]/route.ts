import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params; const body=await request.json();
  const supabase=await createClient();
  const {error}=await supabase.from("non_conformance_reports").update({
    defect_description:body.defect_description,containment_action:body.containment_action,
    rework_description:body.rework_description,reinspection_due_at:body.reinspection_due_at||null,
    disposition:body.disposition||null,status:body.status||undefined,
  }).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  if(body.action_title?.trim()){
    const count=(await supabase.from("corrective_actions").select("id",{count:"exact",head:true})).count??0;
    const action=await supabase.from("corrective_actions").insert({
      action_number:`CA-${new Date().getUTCFullYear()}-${String(count+1).padStart(4,"0")}`,
      ncr_id:id,title:body.action_title.trim(),description:body.action_description||body.action_title,
      root_cause:body.root_cause||null,corrective_measure:body.corrective_measure||null,
      preventive_measure:body.preventive_measure||null,owner_id:body.owner_id||null,due_date:body.due_date||null,
      status:"open",
    });
    if(action.error)return NextResponse.json({error:action.error.message},{status:400});
  }
  return NextResponse.json({success:true});
}
