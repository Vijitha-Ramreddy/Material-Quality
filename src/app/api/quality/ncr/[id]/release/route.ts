import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(["admin","quality_assurance"]);
  if(auth.status!==200)return NextResponse.json({error:"Forbidden"},{status:auth.status});
  const {id}=await params; const body=await request.json();
  const supabase=await createClient();
  const {error}=await supabase.rpc("release_held_stage",{ncr_id:id,acceptance_remarks:body.remarks||null});
  if(error)return NextResponse.json({error:error.message},{status:409});
  return NextResponse.json({success:true});
}
