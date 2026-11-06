import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request) {
  const auth=await requireUser(["admin","logistics"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  let body: Record<string, unknown>;
  try { body=await request.json(); } catch { return NextResponse.json({error:"Malformed JSON request."},{status:400}); }
  const quantity=Number(body.quantity);
  if(!body.order_id||!body.final_inspection_id||!Number.isFinite(quantity)||quantity<=0)return NextResponse.json({error:"Order, final inspection and positive dispatch quantity are required."},{status:400});
  const supabase=await createClient();
  const final=await supabase.from("final_inspections").select("production_job_id,result").eq("id",body.final_inspection_id).single();
  if(final.error||final.data?.result!=="accepted")return NextResponse.json({error:"Final inspection must be accepted before dispatch."},{status:409});
  const job=(await supabase.from("production_jobs").select("id").eq("id",final.data.production_job_id).single()).data;
  if(!job)return NextResponse.json({error:"Production job not found."},{status:404});
  const ready=await supabase.rpc("dispatch_release_ready",{job_id:final.data.production_job_id,dispatch_quantity:quantity}).single();
  const readiness=ready.data as {ready:boolean;reason:string}|null;
  if(ready.error||!readiness?.ready)return NextResponse.json({error:readiness?.reason??ready.error?.message??"Dispatch prerequisites are incomplete."},{status:409});
  const count=(await supabase.from("dispatches").select("id",{count:"exact",head:true})).count??0;
  const {data,error}=await supabase.from("dispatches").insert({
    dispatch_number:`DSP-${new Date().getUTCFullYear()}-${String(count+1).padStart(4,"0")}`,
    order_id:body.order_id,final_inspection_id:body.final_inspection_id,status:"planned",quantity,
    dispatch_date:body.dispatch_date||null,vehicle_number:body.vehicle_number||null,
    transporter_name:body.transporter_name||null,transporter_contact:body.transporter_contact||null,
    lr_number:body.lr_number||null,eway_bill_number:body.eway_bill_number||null,destination:body.destination||null,
    delivery_contact:body.delivery_contact||null,delivery_address:body.delivery_address||null,
    remarks:body.remarks||null,dispatched_by:auth.user.id,
  }).select("id").single();
  if(error)return NextResponse.json({error:error.message},{status:400});
  await supabase.from("manufacturing_traceability").update({dispatch_id:data.id}).eq("production_job_id",final.data.production_job_id);
  await supabase.from("dispatch_history").insert({dispatch_id:data.id,to_status:"planned",remarks:"Dispatch created",performed_by:auth.user.id});
  return NextResponse.json(data,{status:201});
}
