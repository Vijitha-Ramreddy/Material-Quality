import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  let body: Record<string, unknown>;
  try { body=await request.json(); } catch { return NextResponse.json({error:"Malformed JSON request."},{status:400}); }
  const inspected=Number(body.inspected_quantity);
  const accepted=Number(body.accepted_quantity||0);
  const rejected=Number(body.rejected_quantity||0);
  if(!body.receipt_id||!Number.isFinite(inspected)||inspected<=0||accepted<0||rejected<0||accepted+rejected>inspected) {
    return NextResponse.json({error:"Inspection quantities are invalid."},{status:400});
  }
  const supabase=await createClient();
  const receipt=(await supabase.from("material_receipts").select("status").eq("id",body.receipt_id).single()).data;
  if(receipt?.status==="accepted"||receipt?.status==="rejected") return NextResponse.json({error:"This receipt inspection is already finalized."},{status:409});
  const count=(await supabase.from("incoming_inspections").select("id",{count:"exact",head:true})).count??0;
  const result=body.result==="accepted"?"accepted":body.result==="rejected"?"rejected":body.result==="on_hold"?"on_hold":"pending";
  if(result==="accepted"){
    const mtc=await supabase.from("material_test_certificates").select("certificate_status")
      .eq("material_receipt_id",body.receipt_id).maybeSingle();
    if(mtc.error)return NextResponse.json({error:mtc.error.message},{status:400});
    if(!mtc.data||!["verified","accepted"].includes(mtc.data.certificate_status)){
      return NextResponse.json({error:"Incoming material cannot be accepted before its MTC is verified."},{status:409});
    }
  }
  const {data,error}=await supabase.from("incoming_inspections").insert({
    inspection_number:`II-${new Date().getUTCFullYear()}-${String(count+1).padStart(4,"0")}`,
    material_receipt_id:body.receipt_id, result, observations:body.observations||{},
    inspected_quantity:inspected,accepted_quantity:accepted,rejected_quantity:rejected,
    inspector_id:auth.user.id,remarks:String(body.remarks||""),completed_at:["accepted","rejected","on_hold"].includes(result)?new Date().toISOString():null,
  }).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  await supabase.from("material_receipts").update({status:result==="accepted"?"accepted":result==="rejected"?"rejected":result==="on_hold"?"on_hold":"under_inspection"}).eq("id",body.receipt_id);
  await supabase.from("incoming_inspection_history").insert({incoming_inspection_id:data.id,action:result==="accepted"?"accepted":result==="rejected"?"rejected":result==="on_hold"?"on_hold":"under_inspection",to_result:result,remarks:body.remarks||null,performed_by:auth.user.id});
  if(result==="rejected"){
    const ncrCount=(await supabase.from("non_conformance_reports").select("id",{count:"exact",head:true})).count??0;
    await supabase.from("non_conformance_reports").insert({ncr_number:`NCR-${new Date().getUTCFullYear()}-${String(ncrCount+1).padStart(4,"0")}`,incoming_inspection_id:data.id,title:"Rejected incoming material",description:String(body.remarks||"Incoming material rejected during inspection"),severity:["critical","major","minor"].includes(String(body.severity))?String(body.severity):"major",reported_by:auth.user.id});
  }
  return NextResponse.json({id:data.id},{status:201});
}
