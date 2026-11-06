"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const STAGE_LABELS: Record<string, string> = {
  order_received: "Engineering Review",
  engineering_review: "Project Planning",
  project_planning: "Procurement",
  procurement: "Material Receipt",
  material_receipt: "Incoming QA",
  incoming_inspection: "Production",
  production: "Quality Inspection",
  quality_inspection: "Final Inspection & Dispatch",
  final_inspection_dispatch: "Order Delivery",
};

export function WorkflowControls({ orderId, stage }: { orderId: string; stage: string }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [pending, setPending] = useState(false);

  const nextStageLabel = STAGE_LABELS[stage] ?? "Next Stage";

  async function act(action: "approve" | "reject" | "hold" | "rework" | "reinspect") {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/workflow/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, action, remarks }),
      });
      const payload = await response.json();
      if (response.ok) {
        setMessage({
          text: `Action "${action}" processed successfully. Stage updated.`,
          type: "success",
        });
        setRemarks("");
        router.refresh();
      } else {
        setMessage({
          text: payload.error || "Action could not be completed.",
          type: "error",
        });
      }
    } catch {
      setMessage({ text: "Network error while submitting transition.", type: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="mb-3">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
          placeholder="Add transition notes or inspection remarks (optional)..."
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => act("approve")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {pending ? "Processing..." : `Approve & Advance to ${nextStageLabel}`}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => act("reinspect")}
          className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
        >
          Reinspect
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => act("rework")}
          className="bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100"
        >
          Rework
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => act("hold")}
        >
          Put on Hold
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => act("reject")}
          className="text-red-600 hover:bg-red-50"
        >
          Reject
        </Button>
      </div>
      {message && (
        <p className={`mt-2 text-xs font-medium ${message.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
