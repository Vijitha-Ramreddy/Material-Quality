import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","logistics"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params;const body=await request.json();
  const status=String(body.status||"");
  if(!["planned","packed","dispatched","delivered","cancelled"].includes(status))return NextResponse.json({error:"Invalid dispatch status."},{status:400});
  const supabase=await createClient();const updates:{status:string;delivered_at?:string;remarks?:string}= {status};
  if(status==="delivered")updates.delivered_at=new Date().toISOString();
  if(body.remarks)updates.remarks=body.remarks;
  const {error}=await supabase.from("dispatches").update(updates).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({success:true});
}
