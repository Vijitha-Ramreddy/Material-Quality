"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ApprovalAction({ id, type, status }: { id: string; type: "bom" | "quality-plan"; status: string }) {
  const router = useRouter();
  if (status === "approved") return <span className="text-xs font-semibold text-green-700">Approved</span>;
  return <Button type="button" variant="secondary" onClick={async () => {
    const response = await fetch(type === "bom" ? `/api/bom/${id}/approve` : `/api/quality-plans/${id}/approve`, { method: "POST" });
    if (response.ok) router.refresh();
  }} className="h-8 px-3">Approve</Button>;
}
