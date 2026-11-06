import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const body=await request.json(); if(!body.ncr_id||!["accepted","rejected","pending"].includes(body.result))return NextResponse.json({error:"NCR and valid result are required."},{status:400});
  const supabase=await createClient();
  const count=(await supabase.from("reinspection_records").select("id",{count:"exact",head:true})).count??0;
  const {error}=await supabase.from("reinspection_records").insert({
    reinspection_number:`RI-${new Date().getUTCFullYear()}-${String(count+1).padStart(4,"0")}`,
    ncr_id:body.ncr_id,corrective_action_id:body.corrective_action_id||null,
    inspection_date:body.inspection_date||new Date().toISOString().slice(0,10),result:body.result,
    observations:body.observations||{},inspector_id:auth.user.id,remarks:body.remarks||null,
  });
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({success:true},{status:201});
}
