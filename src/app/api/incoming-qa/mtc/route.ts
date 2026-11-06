import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const auth = await requireUser(["admin", "quality_assurance"]);
  if (auth.status !== 200) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Malformed JSON request." }, { status: 400 }); }
  const mtcId = String(body.mtc_id || "");
  const status = String(body.status || "");
  if (!mtcId || !["verified", "accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Valid MTC ID and verification status are required." }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("material_test_certificates").update({
    certificate_status: status,
    verified_by: auth.user.id,
    verified_at: status === "rejected" ? null : new Date().toISOString(),
    remarks: body.remarks ? String(body.remarks) : null,
  }).eq("id", mtcId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
