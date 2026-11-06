import { getReportsData } from "@/lib/services/reports";
import { ReportsView } from "@/components/reports/reports-view";
import { connection } from "next/server";

type ReportsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await connection();
  const params = await searchParams;
  const single = (name: string) => (typeof params[name] === "string" ? (params[name] as string) : undefined);

  const data = await getReportsData({
    from: single("from"),
    to: single("to"),
  });

  return <ReportsView data={data} />;
}
