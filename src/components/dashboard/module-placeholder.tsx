import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">JSPL Manufacturing Workflow</p>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </div>
      <Card className="p-6">
        <Badge className="bg-orange-50 text-orange-700">Module foundation</Badge>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">{title} management</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          This module is ready for implementation in the next development phase.
        </p>
      </Card>
    </div>
  );
}
