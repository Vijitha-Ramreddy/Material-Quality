import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireUser(["admin","planning_procurement"]);
  if (auth.status !== 200) return NextResponse.json({error:"Forbidden"}, {status:auth.status});
  const body=await request.json();
  if (!body.code?.trim() || !body.name?.trim()) return NextResponse.json({error:"Supplier code and name are required."},{status:400});
  const supabase=await createClient();
  const {error}=await supabase.from("suppliers").insert({code:body.code.trim().toUpperCase(),name:body.name.trim(),email:body.email||null,phone:body.phone||null,contact_person:body.contact_person||null,address:body.address||null,gst_number:body.gst_number||null,approved:Boolean(body.approved),active:true});
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({success:true},{status:201});
}
