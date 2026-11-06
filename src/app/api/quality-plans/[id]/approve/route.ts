import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin", "quality_assurance"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  const { id } = await context.params;
  const supabase = await createClient();
  const { error } = await supabase.from("quality_plans").update({ status: "approved", approved_by: auth.user.id, approved_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
