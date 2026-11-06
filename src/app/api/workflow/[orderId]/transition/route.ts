import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { transitionManufacturingWorkflow, WORKFLOW_STAGES } from "@/lib/services/workflow";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = await requireUser();
  if (auth.status !== 200 || !auth.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: auth.status });
  }

  const { orderId } = await params;
  const body = await request.json();
  const stage = String(body.stage || "");
  const action = String(body.action || "");

  if (!WORKFLOW_STAGES.includes(stage as (typeof WORKFLOW_STAGES)[number])) {
    return NextResponse.json({ error: "Invalid workflow stage." }, { status: 400 });
  }
  if (!["approve", "reject", "hold", "rework", "reinspect"].includes(action)) {
    return NextResponse.json({ error: "Invalid workflow action." }, { status: 400 });
  }

  const result = await transitionManufacturingWorkflow(
    orderId,
    stage as (typeof WORKFLOW_STAGES)[number],
    action as "approve" | "reject" | "hold" | "rework" | "reinspect",
    String(body.remarks || ""),
    auth.user.id,
  );

  if (result.error) {
    return NextResponse.json({ error: (result.error as { message?: string }).message || "Workflow transition failed" }, { status: 409 });
  }
  return NextResponse.json(result.data);
}
