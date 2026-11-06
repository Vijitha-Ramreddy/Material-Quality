import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","production"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params;
  let body: Record<string, unknown>;
  try { body=await request.json(); } catch { return NextResponse.json({error:"Malformed JSON request."},{status:400}); }
  const allowed=["planned","released","in_progress","paused","completed","on_hold","rework","cancelled"];
  if(!allowed.includes(String(body.status)))return NextResponse.json({error:"Invalid stage status."},{status:400});
  const produced=body.produced_quantity===""||body.produced_quantity==null?0:Number(body.produced_quantity);
  if(!Number.isFinite(produced)||produced<0)return NextResponse.json({error:"Produced quantity cannot be negative."},{status:400});
  const supabase=await createClient();
  const updates={status:body.status,operator_id:body.operator_id||null,remarks:body.remarks||null,produced_quantity:produced,
    started_at:body.status==="in_progress"?new Date().toISOString():undefined,
    completed_at:body.status==="completed"?new Date().toISOString():undefined};
  const {error}=await supabase.from("production_stages").update(updates).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({success:true});
}
